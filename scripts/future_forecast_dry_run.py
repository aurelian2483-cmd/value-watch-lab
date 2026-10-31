#!/usr/bin/env python3
"""Experiment 15: dry-run future fixture ingestion. NEVER commits or counts forecasts.
Fixtures require independently sourced UTC kickoffs; results feed is not a fixture authority.
"""
import argparse,csv,datetime as dt,json,pathlib,sys
from refresh_football_data import run as refresh
from model_integration_smoke import download,fit,predict

def parse_utc(value):
    value=value.strip()
    if not value.endswith("Z"):raise ValueError("kickoff must be UTC ISO8601 with Z")
    parsed=dt.datetime.fromisoformat(value.replace("Z","+00:00"))
    return parsed

def validate_fixtures(path,now):
    if not path.is_file():raise ValueError("verified fixture CSV missing; no forecast can be generated")
    rows=list(csv.DictReader(path.open(encoding="utf-8-sig",newline="")))
    needed={"league","home","away","kickoff_utc","source_url","verified_at_utc"}
    if not rows or not needed.issubset(rows[0]):raise ValueError("fixture fields missing")
    out=[];seen=set()
    for r in rows:
        league=r["league"].strip()
        if league not in ("E0","E1"):raise ValueError("unknown league")
        kickoff=parse_utc(r["kickoff_utc"]);verified=parse_utc(r["verified_at_utc"])
        if not now<kickoff<=now+dt.timedelta(days=7):raise ValueError("kickoff not upcoming within seven days")
        if not verified<=now or now-verified>dt.timedelta(hours=24):raise ValueError("fixture verification expired")
        if not r["source_url"].startswith("https://"):raise ValueError("fixture source missing")
        if not r["home"].strip() or not r["away"].strip() or r["home"]==r["away"]:raise ValueError("invalid teams")
        key=(league,r["home"],r["away"],kickoff.isoformat())
        if key in seen:raise ValueError("duplicate fixture")
        seen.add(key);out.append((r,league,kickoff))
    return out

def main():
    parser=argparse.ArgumentParser()
    parser.add_argument("--fixtures",type=pathlib.Path,required=True)
    parser.add_argument("--output",type=pathlib.Path,required=True)
    parser.add_argument("--data-dir",type=pathlib.Path,default=pathlib.Path("/tmp/value-watch-current"))
    args=parser.parse_args()
    now=dt.datetime.now(dt.timezone.utc)
    fixtures=validate_fixtures(args.fixtures,now)
    metadata=refresh(args.data_dir,now.date())
    outputs=[]
    for div,ridge in (("E0",2.0),("E1",8.0)):
        relevant=[(r,k) for r,d,k in fixtures if d==div]
        if not relevant:continue
        if not metadata[div]["prediction_ready_at_2_days"]:
            raise ValueError(f"{div} feed validated but not fresh enough for forecast")
        prior=download("2526",div);current=download("2627",div)
        training=[(*x,0.5) for x in prior]+[(*x,1.0) for x in current]
        model=fit(training,ridge)
        for r,k in relevant:
            if r["home"] not in model[0] or r["away"] not in model[0]:
                raise ValueError("unrecognised team: check fixture aliases")
            p=predict(r["home"],r["away"],model)
            outputs.append({"league":div,"home":r["home"],"away":r["away"],"kickoff_utc":r["kickoff_utc"],"fixture_source":r["source_url"],"verified_at_utc":r["verified_at_utc"],"prob_home":p[0],"prob_draw":p[1],"prob_away":p[2],"status":"DRY_RUN_NOT_PERSISTED_NOT_ELIGIBLE"})
    result={"mode":"DRY_RUN","generated_at_utc":now.isoformat(),"count":len(outputs),"forecasts":outputs}
    args.output.parent.mkdir(parents=True,exist_ok=True)
    args.output.write_text(json.dumps(result,indent=2)+"\n",encoding="utf-8")
    print(f"DRY RUN: {len(outputs)} forecasts; none published or counted")

if __name__=="__main__":
    try:main()
    except Exception as exc:sys.exit(f"BLOCKED (safe): {exc}")
