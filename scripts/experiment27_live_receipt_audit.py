#!/usr/bin/env python3
"""Experiment 27: fetch actual GitHub API run and commit-file evidence.
Read-only. A successful run is NOT a trusted prediction receipt unless the
forecast bytes were already present at the run's exact head SHA.
"""
import argparse,datetime as dt,hashlib,json,os,pathlib,sys,urllib.error,urllib.request
from experiment26_server_receipt import verify_receipt
def get(url,token):
    if not url.startswith("https://api.github.com/"):raise ValueError("non-GitHub API URL")
    req=urllib.request.Request(url,headers={"Accept":"application/vnd.github+json","User-Agent":"value-watch-provenance-audit","X-GitHub-Api-Version":"2022-11-28",**({"Authorization":"Bearer "+token} if token else {})})
    with urllib.request.urlopen(req,timeout=20) as response:return json.load(response)
def audit(repo,run_id,path,expected_sha,record,token="",get_fn=get):
    if not repo or "/" not in repo or not path.startswith("records/") or ".." in pathlib.PurePosixPath(path).parts:raise ValueError("invalid repo or record path")
    run=get_fn(f"https://api.github.com/repos/{repo}/actions/runs/{int(run_id)}",token)
    result=verify_receipt(record,run,expected_sha)
    # The contents endpoint must be pinned to the SAME SHA as the workflow run.
    import urllib.parse
    file=get_fn(f"https://api.github.com/repos/{repo}/contents/{urllib.parse.quote(path,safe='/')}?ref={expected_sha}",token)
    if file.get("type")!="file" or file.get("path")!=path or not isinstance(file.get("content"),str):raise ValueError("forecast not present in immutable revision")
    import base64
    raw=base64.b64decode(file["content"],validate=False)
    stored=json.loads(raw)
    if stored!=record:raise ValueError("stored record differs from audited record")
    # GitHub run creation is server-generated but the forecast may have been committed
    # before run creation; this is evidence of existence by that run, not an independent fixture audit.
    return {**result,"record_path":path,"record_sha256":hashlib.sha256(raw).hexdigest(),"server_run_url":run["html_url"],"record_present_at_run_head":True,"challenge_eligible":False,"publication_enabled":False}
def main():
    p=argparse.ArgumentParser();p.add_argument("--repo",required=True);p.add_argument("--run-id",required=True,type=int);p.add_argument("--record-path",required=True);p.add_argument("--sha",required=True);p.add_argument("--record",required=True,type=pathlib.Path)
    a=p.parse_args();record=json.loads(a.record.read_text())
    print(json.dumps(audit(a.repo,a.run_id,a.record_path,a.sha,record,os.getenv("GITHUB_TOKEN","")),indent=2))
if __name__=="__main__":
    try:main()
    except Exception as e:sys.exit(f"BLOCKED: {e}")
