"""Verify the scheduler inventory and preservation at the review HEAD."""
import hashlib
import json
from pathlib import Path
import subprocess


PACKAGE = Path(__file__).resolve().parent
REPO = PACKAGE.parents[2]
PHASE3 = 'research/horse-ab-phase3-master-20261115/'
ARCHIVES = ('research/horse-context-archive/v1', 'research/horse-form-archive/v1',
            'research/horse-challenger/archive')
ORIGINAL = 'e2ec193c195c68e8a3337ccd7e2c7cfb59c6ae51'


def git(*args):
    return subprocess.check_output(['git', *args], cwd=REPO)


def blobs(revision, paths):
    return dict((path, meta.split()[-1]) for meta, path in (
        line.split('\t', 1) for line in git('ls-tree', '-r', revision, '--', *paths).decode().splitlines()
    ))


def audit_workflows(record):
    commit = record['commit']
    names = git('ls-tree', '-r', '--name-only', commit, '--', '.github/workflows').decode().splitlines()
    scheduled, intake = [], []
    for name in names:
        body = git('show', f'{commit}:{name}')
        key = name.rsplit('/', 1)[-1]
        if b'  schedule:' in body.splitlines():
            scheduled.append(key)
        if any(marker in body for marker in (
            b'collect_research.py', b'phase3_ab.py capture', b'phase3_ab.py inspect-feed', b'phase3_ab.py verify-result'
        )):
            intake.append(key)
        expected = record['reviewed_workflow_sha256'].get(name)
        if expected is not None:
            assert hashlib.sha256(body).hexdigest() == expected, name
    assert len(names) == record['workflow_file_count'] and len(scheduled) == record['scheduled_workflow_count']
    assert scheduled == record['scheduled_workflows']
    assert intake == record['phase3_collection_references'] == []


def main():
    inventory = json.loads((PACKAGE/'scheduler-inventory.json').read_bytes())
    for field in ('draft_start', 'main_scheduler_audit'):
        audit_workflows(inventory[field])
    feed = inventory['pinned_feed']
    spec = f"{feed['commit']}:{feed['path']}"
    raw = git('show', spec)
    assert hashlib.sha256(raw).hexdigest() == feed['sha256']
    assert git('rev-parse', spec).decode().strip() == feed['git_blob']
    data = json.loads(raw)
    assert data['generated_at_utc'] == feed['generated_at_utc']
    assert len(data['forecasts']) == feed['listed_forecasts']

    draft, main_pin = (inventory[field]['commit'] for field in ('draft_start', 'main_scheduler_audit'))
    protected = ARCHIVES + (PHASE3, 'research/horse-reference-archive', 'research/horse-market-archive',
                            'research/horse-challenger/model-v1.json')
    assert blobs(draft, protected) == blobs('HEAD', protected)
    earlier = blobs(ORIGINAL, ARCHIVES)
    pinned_main = blobs(main_pin, ARCHIVES)
    draft_head = blobs('HEAD', ARCHIVES)
    assert len(earlier) == 612 and all(pinned_main.get(path) == oid for path, oid in earlier.items())
    assert all(earlier.get(path) == oid for path, oid in draft_head.items())
    merged_tree = git('merge-tree', '--write-tree', main_pin, 'HEAD').decode().strip()
    merged = blobs(merged_tree, ARCHIVES)
    assert all(merged.get(path) == oid for path, oid in earlier.items())
    print(json.dumps(dict(head=git('rev-parse', 'HEAD').decode().strip(), integrated_tree=merged_tree,
                          pinned_forecasts_verified=len(earlier), phase3_active_workflows=0)))


if __name__ == '__main__':
    main()
