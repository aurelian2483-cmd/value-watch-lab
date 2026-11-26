"""One-shot, read-only acquisition of the pinned public context feed."""
import argparse
from collections import Counter
import hashlib
import json
from pathlib import Path
import re
import shutil
import sys
from tempfile import TemporaryDirectory
import urllib.error
import urllib.request

import phase3_ab as ab


REPOSITORY = 'aurelian2483-cmd/value-watch-lab'
FEED_PATH = 'horse-predictions-data.json'
MAX_FEED_BYTES = 16 * 1024 * 1024


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, *args, **kwargs):
        return None


def git_blob_sha1(raw):
    return hashlib.sha1(b'blob ' + str(len(raw)).encode() + b'\x00' + raw).hexdigest()


def bounded_read(stream, limit):
    raw = stream.read(limit + 1)
    ab.require(len(raw) <= limit, 'INPUT_TOO_LARGE')
    return raw


def acquire(ref, local, local_receipt):
    ab.require(re.fullmatch(r'[0-9a-f]{40}', ref) is not None, 'COMMIT_REF_REQUIRED')
    ab.require((local is None) == (local_receipt is None), 'LOCAL_FEED_AND_RECEIPT_REQUIRED_TOGETHER')
    url = f'https://raw.githubusercontent.com/{REPOSITORY}/{ref}/{FEED_PATH}'
    if local is None:
        request = urllib.request.Request(url, headers={'User-Agent': 'ValueWatchResearchAB/1.0'})
        with urllib.request.build_opener(NoRedirect()).open(request, timeout=20) as response:
            raw = bounded_read(response, MAX_FEED_BYTES)
        transport = 'PUBLIC_HTTPS_READ_ONLY'
        local_receipt_sha = None
    else:
        with local.open('rb') as stream:
            raw = bounded_read(stream, MAX_FEED_BYTES)
        with local_receipt.open('rb') as stream:
            receipt_raw = bounded_read(stream, 16384)
        receipt = ab.strict_json(receipt_raw)
        ab.require(isinstance(receipt, dict) and receipt.get('repository') == REPOSITORY
                   and receipt.get('commit') == ref and receipt.get('path') == FEED_PATH,
                   'LOCAL_RECEIPT_IDENTITY_MISMATCH')
        ab.require(receipt.get('raw_sha256') == hashlib.sha256(raw).hexdigest()
                   and receipt.get('git_blob_sha1') == git_blob_sha1(raw), 'LOCAL_RECEIPT_BYTES_MISMATCH')
        transport = 'LOCAL_BYTES_MATCH_SUPPLIED_RECEIPT'
        local_receipt_sha = hashlib.sha256(receipt_raw).hexdigest()
    return raw, url, transport, local_receipt_sha


def collect(root, ref, local=None, local_receipt=None):
    ab.registration(root)
    raw, url, transport, local_receipt_sha = acquire(ref, local, local_receipt)
    received = ab.utcnow()
    receipt = {
        'source_url': url, 'source_ref': ref, 'observed_at_utc': received.isoformat(),
        'transport': transport, 'raw_sha256': hashlib.sha256(raw).hexdigest(),
        'git_blob_sha1': git_blob_sha1(raw),
        'local_receipt_sha256': local_receipt_sha,
        'independent_timestamp_attested': False,
        'note': 'A matching local receipt binds bytes to the supplied claims. Check its origin separately.',
        **ab.GUARDS,
    }
    digest = ab.store_object(root, 'snapshots', receipt)
    feed = ab.strict_json(raw)
    # The pinned inspector checks skipped rows after writing forecasts. Reject
    # that malformed envelope before handing any of its races to the inspector.
    ab.require(isinstance(feed, dict), 'WRONG_FEED_MODEL')
    skipped = feed.get('skipped', [])
    ab.require(isinstance(skipped, list), 'SKIP_LIST_INVALID')
    ab.require(all(isinstance(row, dict) and isinstance(row.get('reason'), str)
                   for row in skipped), 'SKIP_RECORD_INVALID')
    ab.event(root, 'PINNED_FEED_RECEIVED', received, acquisition_receipt_sha256=digest,
             source_snapshot_sha256=ab.sha(feed), source_ref=ref)
    inspected = ab.utcnow()
    ab.require(inspected >= received, 'COLLECTION_CLOCK_MOVED_BACKWARDS')
    result = ab.inspect_feed(feed, root, inspected)
    return {
        'acquisition_receipt_sha256': digest,
        'source_ref': ref,
        'source_raw_sha256': receipt['raw_sha256'],
        'source_git_blob_sha1': receipt['git_blob_sha1'],
        'intake_checked_at_utc': inspected.isoformat(),
        'capture_failure_counts': dict(Counter(row['reason'] for row in result['capture_failures'])),
        'upstream_exclusion_counts': dict(Counter(row['reason'] for row in skipped)),
        **result,
    }


def probe(root, ref, local=None, local_receipt=None):
    """Rehearse intake against the registration in an empty, disposable ledger."""
    registration = ab.registration(root)
    model_name = registration['model_bundle_sha256'] + '.json'
    with TemporaryDirectory(prefix='intake-probe-', dir=ab.ROOT / 'state') as directory:
        target = Path(directory)
        (target / 'snapshots').mkdir()
        shutil.copyfile(root / 'registration.json', target / 'registration.json')
        shutil.copyfile(root / 'snapshots' / model_name, target / 'snapshots' / model_name)
        result = collect(target, ref, local, local_receipt)
    return {
        'status': 'DISPOSABLE_INTAKE_PROBE',
        'persisted_in_registered_ledger': False,
        'independent_timestamp_attested': False,
        **result,
    }


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('--ref', required=True, help='Exact 40-hex Git commit')
    p.add_argument('--local', type=Path)
    p.add_argument('--local-receipt', type=Path)
    p.add_argument('--store', type=Path, default=ab.ROOT / 'state')
    p.add_argument('--probe', action='store_true', help='Use a disposable ledger and retain no pairs')
    a = p.parse_args()
    try:
        root = a.store.resolve(strict=True) if a.probe else ab.safe_root(a.store)
        action = probe if a.probe else collect
        result = action(root, a.ref, a.local, a.local_receipt)
    except (ab.ResearchError, OSError, urllib.error.URLError) as e:
        if not a.probe and 'root' in locals():
            ab.event(root, 'ACQUISITION_BLOCKED', ab.utcnow(), reason=str(e), source_ref=a.ref)
        print(json.dumps({'status': 'BLOCKED', 'reason': str(e), **ab.GUARDS}), file=sys.stderr)
        return 2
    print(json.dumps(result, indent=2))
    return 0


if __name__ == '__main__':
    sys.exit(main())
