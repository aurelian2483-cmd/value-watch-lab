#!/usr/bin/env python3
"""Experiment 26: validate trusted GitHub Actions run receipt metadata.
Never creates/publishes a forecast. Run metadata must come from GitHub API,
not from a forecast's self-reported JSON fields.
"""
import datetime as dt,json,pathlib,sys,argparse
def stamp(s):
    if not isinstance(s,str):raise ValueError("timestamp missing")
    v=dt.datetime.fromisoformat(s.replace("Z","+00:00"))
    if v.tzinfo is None:raise ValueError("timestamp lacks timezone")
    return v.astimezone(dt.timezone.utc)
def verify_receipt(record,run,expected_sha):
    if not isinstance(run,dict):raise ValueError("run metadata missing")
    if run.get("head_sha")!=expected_sha:raise ValueError("run does not match immutable revision")
    if run.get("event") not in ("push","workflow_dispatch"):raise ValueError("untrusted workflow event")
    if run.get("conclusion")!="success" or run.get("status")!="completed":raise ValueError("run incomplete or failed")
    if not isinstance(run.get("id"),int) or run["id"]<=0:raise ValueError("run ID missing")
    if not isinstance(run.get("html_url"),str) or not run["html_url"].startswith("https://github.com/"):raise ValueError("run URL missing")
    kickoff=stamp(record["kickoff_utc"]);generated=stamp(record["generated_at_utc"])
    created=stamp(run.get("created_at"));updated=stamp(run.get("updated_at"))
    if not created<=updated:raise ValueError("run timestamps reversed")
    if not generated<=created<kickoff:raise ValueError("GitHub run not received before kickoff")
    # A passing workflow is only evidence of a run. Binding its SHA to an exact
    # forecast path and checking fixture validity remain separate obligations.
    return {"status":"GITHUB_RUN_RECEIPT_CHECKED_REQUIRES_FILE_BINDING","run_id":run["id"],"run_url":run["html_url"],"challenge_eligible":False}
def main():
    p=argparse.ArgumentParser();p.add_argument("--record",type=pathlib.Path,required=True);p.add_argument("--run",type=pathlib.Path,required=True);p.add_argument("--sha",required=True)
    a=p.parse_args()
    print(json.dumps(verify_receipt(json.loads(a.record.read_text()),json.loads(a.run.read_text()),a.sha),indent=2))
if __name__=="__main__":
    try:main()
    except Exception as e:sys.exit(f"BLOCKED: {e}")
