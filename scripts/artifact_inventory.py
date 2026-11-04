"""Accept forecast artifacts only from completed successful producer runs.
Failed producer artifacts remain diagnostic evidence, never forecast inputs.
Successful artifacts still undergo the registry's existing byte/digest checks.
"""
import json
import os
import subprocess

_RUNS = {}

def successful_artifact(artifact):
    run = artifact.get('workflow_run') or {}
    run_id = run.get('id')
    if type(run_id) is not int or run_id <= 0:
        raise ValueError('Artifact is missing a producer run identity')
    repo = os.environ['GITHUB_REPOSITORY']
    key = (repo, run_id)
    if key not in _RUNS:
        response = json.loads(subprocess.check_output(['gh','api',f'repos/{repo}/actions/runs/{run_id}'],text=True))
        if response.get('id') != run_id or response.get('head_sha') != run.get('head_sha'):
            raise ValueError('Artifact producer identity does not match run evidence')
        _RUNS[key] = response
    response = _RUNS[key]
    accepted = response.get('status') == 'completed' and response.get('conclusion') == 'success' and response.get('head_branch') in ('main','research/prospective-100')
    if not accepted:
        print(json.dumps({'artifact_excluded':artifact['id'],'producer_run':run_id,'reason':'PRODUCER_NOT_SUCCESSFUL','status':response.get('status'),'conclusion':response.get('conclusion')}))
    return accepted
