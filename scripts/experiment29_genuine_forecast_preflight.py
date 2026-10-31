#!/usr/bin/env python3
"""Experiment 29: create auditable REAL model forecasts as unpublished artifacts.
Never auto-commits forecasts. Rejects missing independent fixture evidence.
"""
import datetime as dt,json,pathlib,sys
from experiment23_pipeline import main as build
def main():
    build()
    report_path=pathlib.Path("/tmp/experiment23/review.json")
    source=json.loads(report_path.read_text())
    if source.get("commit_enabled") is not False or source.get("challenge_eligible")!=0:
        raise ValueError("upstream safety contract changed")
    rows=source.get("records")
    if not isinstance(rows,list):raise ValueError("missing candidate list")
    now=dt.datetime.now(dt.timezone.utc)
    for r in rows:
        when=dt.datetime.fromisoformat(r["kickoff_utc"].replace("Z","+00:00"))
        if when<=now:raise ValueError("fixture already started")
        if r.get("status")!="PROSPECTIVE_RESEARCH_UNVALIDATED":raise ValueError("unexpected record status")
    result={"experiment":29,"status":"REAL_MODEL_FORECASTS_AWAIT_INDEPENDENT_FIXTURE_VERIFICATION","created_at_utc":now.isoformat(),"records":rows,"record_count":len(rows),"model_and_input_hashes":source.get("inputs"),"fixture_verification":"NOT_ESTABLISHED","github_permanent_record":"NOT_CREATED","challenge_eligible":0,"publishing_enabled":False,"next_required":"Independently verify kickoff/team/competition and retain original source evidence before immutable GitHub commit"}
    path=pathlib.Path("/tmp/experiment29-review.json")
    path.write_text(json.dumps(result,indent=2)+"\n")
    print(f"PASS: {len(rows)} real model-generated candidate forecasts; NO eligible or permanent records")
if __name__=="__main__":
    try:main()
    except Exception as exc:sys.exit(f"BLOCKED: {exc}")
