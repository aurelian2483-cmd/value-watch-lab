#!/usr/bin/env python3
"""Experiment 21: append-only prospective ledger validation and dry-run planning.
Never writes the ledger, never counts dry-run forecasts, never backdates entries.
"""
import argparse,datetime as dt,hashlib,json,pathlib,sys
UTC=dt.timezone.utc
def timestamp(value):
    if not isinstance(value,str) or not value.endswith("Z"):raise ValueError("timestamp must be UTC Z")
    t=dt.datetime.fromisoformat(value.replace("Z","+00:00"))
    if t.tzinfo!=UTC:raise ValueError("invalid UTC")
    return t
def identity(r):
    return (r["league"],r["home"],r["away"],r["kickoff_utc"])
def check_record(r,now):
    required={"league","home","away","kickoff_utc","generated_at_utc","prob_home","prob_draw","prob_away","model_sha256","data_sha256","fixture_source","source_verified_at_utc","status"}
    if not required.issubset(r):raise ValueError("missing audit fields")
    if r["league"] not in ("E0","E1"):raise ValueError("invalid league")
    if not r["home"] or not r["away"] or r["home"]==r["away"]:raise ValueError("invalid teams")
    gen=timestamp(r["generated_at_utc"]);kick=timestamp(r["kickoff_utc"]);verified=timestamp(r["source_verified_at_utc"])
    if not verified<=gen<kick:raise ValueError("timestamp ordering invalid")
    if gen>now+dt.timedelta(minutes=5):raise ValueError("future-dated generation")
    if not isinstance(r["fixture_source"],str) or not r["fixture_source"].startswith("https://"):raise ValueError("fixture source invalid")
    if r["status"]!="PROSPECTIVE_RESEARCH_UNVALIDATED":raise ValueError("wrong record type")
    if any(not isinstance(r[k],str) or len(r[k])!=64 or any(c not in "0123456789abcdef" for c in r[k]) for k in ("model_sha256","data_sha256")):raise ValueError("invalid hashes")
    ps=[r[k] for k in ("prob_home","prob_draw","prob_away")]
    if any(type(x) not in (float,int) or not 0<=x<=1 for x in ps) or abs(sum(ps)-1)>0.00001:raise ValueError("invalid probabilities")
def validate_ledger(rows,now):
    seen=set()
    for r in rows:
        check_record(r,now)
        k=identity(r)
        if k in seen:raise ValueError("duplicate fixture in ledger")
        seen.add(k)
    return seen
def propose(ledger,new,now):
    existing=validate_ledger(ledger,now);added=[]
    for r in new:
        check_record(r,now)
        key=identity(r)
        if key in existing:raise ValueError("duplicate or overwrite attempt")
        existing.add(key);added.append(r)
    return ledger+added
def main():
    p=argparse.ArgumentParser();p.add_argument("--ledger",type=pathlib.Path,required=True);p.add_argument("--candidate",type=pathlib.Path,required=True);p.add_argument("--output",type=pathlib.Path,required=True)
    args=p.parse_args();now=dt.datetime.now(UTC)
    ledger=json.loads(args.ledger.read_text()) if args.ledger.exists() else []
    if not isinstance(ledger,list):raise ValueError("ledger must be JSON array")
    candidate=json.loads(args.candidate.read_text())
    if not isinstance(candidate,list):raise ValueError("candidate must be JSON array")
    proposed=propose(ledger,candidate,now)
    args.output.write_text(json.dumps({"mode":"DRY_RUN_NO_LEDGER_MUTATION","existing":len(ledger),"proposed":len(proposed),"new":len(candidate),"challenge_eligible":0},indent=2)+"\n")
    print(f"PASS ledger planning: {len(ledger)} existing, {len(candidate)} new; nothing committed")
if __name__=="__main__":
    try:main()
    except Exception as exc:sys.exit(f"BLOCKED: {exc}")
