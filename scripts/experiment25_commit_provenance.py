#!/usr/bin/env python3
"""Experiment 25: inspect GitHub commit provenance for a proposed immutable forecast.
Read-only: GitHub Actions run must supply commit metadata, not JSON self-report.
This is necessary but not sufficient for official challenge eligibility.
"""
import argparse,datetime as dt,json,pathlib,subprocess,sys
from experiment21_ledger import check_record
def parse(value):
    if not isinstance(value,str):raise ValueError("missing timestamp")
    x=dt.datetime.fromisoformat(value.replace("Z","+00:00"))
    if x.tzinfo is None:raise ValueError("naive timestamp")
    return x.astimezone(dt.timezone.utc)
def verify(record,commit,now):
    check_record(record,now)
    if not isinstance(commit,dict):raise ValueError("commit metadata missing")
    sha=commit.get("sha","")
    if len(sha)!=40 or any(c not in "0123456789abcdef" for c in sha):raise ValueError("invalid commit SHA")
    authored=parse(commit.get("author_date"));committed=parse(commit.get("committer_date"))
    generated=parse(record["generated_at_utc"]);kickoff=parse(record["kickoff_utc"])
    if authored>committed:raise ValueError("author date after committer date")
    if not generated<=committed<kickoff:raise ValueError("commit not pre-kickoff")
    # Git commit timestamps can be freely set; reject any suggestion these are trusted server times.
    return {"status":"COMMIT_TIMESTAMP_CONSISTENT_NOT_SERVER_VERIFIED","sha":sha,"challenge_eligible":False}
def main():
    p=argparse.ArgumentParser();p.add_argument("--record",type=pathlib.Path,required=True);p.add_argument("--commit",type=pathlib.Path,required=True);p.add_argument("--output",type=pathlib.Path,required=True)
    args=p.parse_args();r=json.loads(args.record.read_text());c=json.loads(args.commit.read_text())
    result=verify(r,c,dt.datetime.now(dt.timezone.utc))
    args.output.write_text(json.dumps(result,indent=2)+"\n")
    print("PASS commit timestamp consistency; trusted server receipt still required")
if __name__=="__main__":
    try:main()
    except Exception as exc:sys.exit(f"BLOCKED: {exc}")
