#!/usr/bin/env python3
"""Append hash receipts for frozen racing evidence recoverable from CI artifacts.

No source HTML, authenticated API response, credential or fetched content is
published by this script. Raw artifacts expire; receipts are not timestamp
attestations and cannot reconstruct bytes after artifact expiry.
"""
import datetime as dt
import hashlib
import json
import os
import re
import urllib.parse
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
WORK = Path('/tmp/horse-research')
ARTIFACT = 'horse-research-source-snapshots'
RETENTION_DAYS = 90
MAX_SOURCE_BYTES = 3_000_000
MAX_SCAN_BYTES = 128_000_000
HEX = re.compile(r'[a-f0-9]{64}')


def digest(value):
    return hashlib.sha256(json.dumps(value, sort_keys=True, separators=(',', ':')).encode()).hexdigest()


def public_source(url):
    parsed = urllib.parse.urlsplit(str(url or ''))
    return (parsed.scheme == 'https' and parsed.hostname == 'www.sportinglife.com'
            and parsed.username is None and parsed.password is None
            and not parsed.query and not parsed.fragment)


def references(repo):
    """Only permanent forecast/result records supply eligible source receipts."""
    refs = {}

    def remember(sha, url, record):
        if HEX.fullmatch(str(sha or '')) and public_source(url):
            refs.setdefault(sha, {'sources': set(), 'records': set()})
            refs[sha]['sources'].add(url)
            refs[sha]['records'].add(record)

    def walk(value, record):
        if isinstance(value, dict):
            identity = value.get('record_sha256') or record
            remember(value.get('runner_source_sha256'), value.get('source'), identity)
            receipt = value.get('source_receipt')
            if isinstance(receipt, dict):
                remember(receipt.get('sha256'), receipt.get('url'), identity)
            for child in value.values():
                walk(child, identity)
        elif isinstance(value, list):
            for child in value:
                walk(child, record)

    patterns = ['research/horse-form-archive/v1/*.json',
                'research/horse-context-archive/v1/*.json',
                'research/horse-challenger/archive/v1/*.json',
                'research/horse-results/v1/*.json',
                'research/horse-context-results/v1/*.json',
                'research/horse-challenger/results-v1.json']
    for pattern in patterns:
        for path in sorted(repo.glob(pattern)):
            walk(json.loads(path.read_text()), str(path.relative_to(repo)))
    return refs


def verify_receipt(record, path):
    body = {k: v for k, v in record.items() if k != 'record_sha256'}
    if record.get('record_sha256') != path.stem or digest(body) != path.stem:
        raise ValueError('Evidence receipt integrity mismatch')
    if (record.get('research_only') is not True or record.get('publication_gate') != 'BLOCKED'
            or record.get('model_validation') != 'UNVALIDATED'):
        raise ValueError('Unsafe evidence receipt')


def preserve(repo=ROOT, work=WORK, now=None, environment=None):
    now = now or dt.datetime.now(dt.timezone.utc)
    if now.tzinfo is None:
        raise ValueError('Evidence receipt requires timezone')
    env = os.environ if environment is None else environment
    repository = env.get('GITHUB_REPOSITORY', '')
    run_id, attempt = env.get('GITHUB_RUN_ID', ''), env.get('GITHUB_RUN_ATTEMPT', '')
    if not re.fullmatch(r'[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+', repository) or not run_id.isdigit() or not attempt.isdigit():
        raise ValueError('Evidence receipts require GitHub workflow run identity')
    prefix = env.get('HORSE_EVIDENCE_ARTIFACT_PREFIX', '')
    if prefix and not re.fullmatch(r'cycle-[0-9]{2}', prefix):
        raise ValueError('Invalid evidence artifact prefix')
    directory = repo / 'research/horse-evidence-receipts/v1'
    for path in sorted(directory.glob('*.json')):
        verify_receipt(json.loads(path.read_text()), path)
    refs = references(repo)
    found, scanned_bytes, scan_limited = {}, 0, False
    # Explicit allowlist excludes authenticated second-publisher response bodies.
    for folder in ('runner-sources', 'result-sources'):
        for path in sorted((work / folder).glob('*.html')):
            size = path.stat().st_size
            if size <= 0 or size > MAX_SOURCE_BYTES:
                continue
            if scanned_bytes + size > MAX_SCAN_BYTES:
                scan_limited = True
                continue
            raw = path.read_bytes()
            scanned_bytes += len(raw)
            sha = hashlib.sha256(raw).hexdigest()
            if sha in refs:
                found.setdefault(sha, {'sha256': sha, 'byte_count': len(raw),
                                      'artifact_paths': [], 'source_urls': sorted(refs[sha]['sources']),
                                      'referenced_records': sorted(refs[sha]['records'])})
                found[sha]['artifact_paths'].append(('/'.join(filter(None, [prefix, str(path.relative_to(work))]))))
    body = {'schema_version': 1, 'kind': 'HORSE_SOURCE_ARTIFACT_RECEIPT',
            'research_only': True, 'model_validation': 'UNVALIDATED', 'publication_gate': 'BLOCKED',
            'independent_timestamp_attested': False,
            'workflow': {'repository': repository, 'run_id': run_id, 'run_attempt': attempt,
                         'run_url': f'https://github.com/{repository}/actions/runs/{run_id}'},
            'artifact_name': ARTIFACT, 'requested_raw_retention_days': RETENTION_DAYS,
            'sources': [found[k] for k in sorted(found)],
            'unavailable_referenced_source_count': len(set(refs) - set(found)),
            'scan_limit_reached': scan_limited,
            'limitation': 'Hash receipts persist in GitHub; raw source bytes remain only in the run artifact, '
                          'subject to upload success, repository retention policy and expiry. '
                          'The requested 90 days is not permanent raw evidence retention. '
                          'Missing historical source bytes are not reconstructed or refetched.'}
    # Idempotent for the same workflow run, even if a caller's wall clock changes.
    body['record_sha256'] = digest(body)
    directory.mkdir(parents=True, exist_ok=True)
    path = directory / (body['record_sha256'] + '.json')
    encoded = json.dumps(body, indent=2) + '\n'
    if path.exists():
        if json.loads(path.read_text()) != body:
            raise ValueError('Refusing to overwrite evidence receipt')
    else:
        with path.open('x') as target:
            target.write(encoded)
    return body


if __name__ == '__main__':
    result = preserve()
    print(json.dumps({'preserved_hash_receipts': len(result['sources']),
                      'unavailable_referenced_sources': result['unavailable_referenced_source_count'],
                      'requested_raw_artifact_retention_days': RETENTION_DAYS,
                      'publication_gate': 'BLOCKED'}))
