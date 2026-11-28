"""Verify byte preservation and disabled live collection on the integrated draft."""
import argparse
import hashlib
import json
from pathlib import Path
import subprocess


ROOT = Path(__file__).resolve().parents[4]
DRAFT = 'e4d461399f39f5bddd0a4b686de68281c11c9088'
MAIN = '13d730a621790d5f6125b16818856b645e612992'
ORIGINAL = 'e2ec193c195c68e8a3337ccd7e2c7cfb59c6ae51'
ARCHIVE_MANIFEST_SHA256 = 'ab0aafcf01ca6098f43a4368d720d157947583af765d1d14c851690a7b751b9e'
ARCHIVES = ('research/horse-context-archive/v1', 'research/horse-form-archive/v1',
            'research/horse-challenger/archive')
FIXED = ('research/horse-ab-phase3-master-20261115', 'research/phase3-evidence',
         'research/phase3-transactional', 'research/horse-challenger/model-v1.json')
PRIOR_PACKAGE = 'research/reviews/phase3-independent-review/'
RESULTS = 'research/horse-challenger/results-v1.json'
INTAKE_COMMANDS = (b'collect_research.py', b'phase3_ab.py capture',
                   b'phase3_ab.py inspect-feed', b'phase3_ab.py verify-result')


def git(*args):
    return subprocess.check_output(['git', *args], cwd=ROOT)


def blobs(revision, *paths):
    tree = git('ls-tree', '-rz', revision, '--', *paths)
    items = (record.split(b'\t', 1) for record in tree.rstrip(b'\0').split(b'\0') if record)
    return {path.decode(): meta for meta, path in items}


def integrated_main(pr_merge):
    """Resolve the immutable upstream of a GitHub pull-request test merge."""
    if not pr_merge:
        return MAIN
    parents = git('show', '-s', '--format=%P', 'HEAD').decode().split()
    if len(parents) != 2:
        raise ValueError('Expected a two-parent pull-request test merge')
    upstream, draft = parents
    git('merge-base', '--is-ancestor', MAIN, upstream)
    git('merge-base', '--is-ancestor', DRAFT, draft)
    return upstream


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--archive-manifest', type=Path)
    parser.add_argument('--pr-merge', action='store_true',
                        help='Use the first parent of the GitHub pull-request test merge')
    args = parser.parse_args()
    for baseline in DRAFT, MAIN:
        git('merge-base', '--is-ancestor', baseline, 'HEAD')
    upstream_commit = integrated_main(args.pr_merge)
    frozen = blobs(ORIGINAL, *ARCHIVES)
    assert len(frozen) == 612
    for baseline in MAIN, 'HEAD':
        got = blobs(baseline, *ARCHIVES)
        assert all(got.get(path) == digest for path, digest in frozen.items())
    manifest = ''.join(f'{hashlib.sha256((ROOT/path).read_bytes()).hexdigest()}  {path}\n'
                       for path in sorted(frozen)).encode('utf-8')
    assert hashlib.sha256(manifest).hexdigest() == ARCHIVE_MANIFEST_SHA256
    if args.archive_manifest:
        with args.archive_manifest.open('xb') as output:
            output.write(manifest)
    draft_frozen = blobs(DRAFT, *ARCHIVES)
    assert all(frozen.get(path) == digest for path, digest in draft_frozen.items())
    assert blobs(DRAFT, *FIXED) == blobs('HEAD', *FIXED)

    historical = blobs(DRAFT, PRIOR_PACKAGE, 'research/horse-reference-archive',
                       'research/horse-market-archive', 'research/horse-evidence-receipts',
                       'research/forecast-receipts')
    assert blobs('HEAD', *historical) == historical

    before = json.loads(git('show', f'{DRAFT}:{RESULTS}'))
    upstream = json.loads(git('show', f'{upstream_commit}:{RESULTS}'))
    current = json.loads(git('show', f'HEAD:{RESULTS}'))
    assert current == upstream, f'Challenger results differ from upstream {upstream_commit}'
    assert current['model_validation'] == 'UNVALIDATED' and current['publication_gate'] == 'BLOCKED'
    assert all(row in current['entries'] for row in before['entries'])
    assert all(row in current['amendments'] for row in before['amendments'])
    assert all(current['result_attempt_counts'].get(key, -1) >= count
               for key, count in before['result_attempt_counts'].items())
    assert all(current['result_rechecks'][key]['checked_at_utc'] >= entry['checked_at_utc']
               for key, entry in before['result_rechecks'].items())

    workflows = blobs('HEAD', '.github/workflows')
    for path in workflows:
        body = git('show', f'HEAD:{path}')
        assert not any(command in body for command in INTAKE_COMMANDS), path
        if path.endswith('/phase3-final-lifecycle.yml'):
            assert b'schedule:' not in body, path
            assert b'contents: read' in body, path

    print(json.dumps(dict(head=git('rev-parse', 'HEAD').decode().strip(),
                          settlement_upstream=upstream_commit,
                          pinned_forecasts_verified=len(frozen), archive_manifest_sha256=ARCHIVE_MANIFEST_SHA256,
                          draft_archive_files=len(draft_frozen),
                          integrated_archive_files=len(blobs('HEAD', *ARCHIVES)), fixed_phase3_files=len(blobs(DRAFT, *FIXED)),
                          historical_files_verified=len(historical), prior_result_rows=len(before['entries']),
                          integrated_result_rows=len(current['entries']), live_phase3_workflow_references=0),
                     sort_keys=True))


if __name__ == '__main__':
    main()
