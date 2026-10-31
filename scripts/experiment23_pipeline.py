#!/usr/bin/env python3
"""Experiment 23: compute real forecasts, bind to exact input bytes, plan append-only ledger.
NO COMMIT and NO challenge eligibility. No unverified fixtures accepted as publishable.
"""
import csv,datetime as dt,hashlib,io,json,pathlib,urllib.request
from model_integration_smoke import fit,predict
from experiment18_team_check import FIXTURES,ALIASES
from experiment21_ledger import propose
from experiment22_provenance import check_manifest
ROOT=pathlib.Path(__file__).resolve().parents[1]
MODEL=ROOT/"scripts/model_integration_smoke.py"
SOURCE="https://www.premierleague.com/en/news/4725574"
def fetch(season):
    url=f"https://www.football-data.co.uk/mmz4281/{season}/E0.csv"
    req=urllib.request.Request(url,headers={"User-Agent":"ValueWatchResearch/1.0"})
    with urllib.request.urlopen(req,timeout=30) as r:return r.read(2000000)
def parse(data):
    out=[]
    for row in csv.DictReader(io.StringIO(data.decode("utf-8-sig"))):
        if not all(row.get(k) for k in ("Date","HomeTeam","AwayTeam","FTHG","FTAG","FTR")):continue
        day=dt.datetime.strptime(row["Date"],"%d/%m/%Y").date()
        h,a=int(row["FTHG"]),int(row["FTAG"])
        if row["FTR"]!=("H" if h>a else "A" if a>h else "D"):raise ValueError("bad result")
        out.append((day,row["HomeTeam"],row["AwayTeam"],h,a))
    return out
def main():
    now=dt.datetime.now(dt.timezone.utc)
    outdir=pathlib.Path("/tmp/experiment23");outdir.mkdir(exist_ok=True)
    priorfile=outdir/"E0_2526.csv";currentfile=outdir/"E0_2627.csv"
    priorfile.write_bytes(fetch("2526"));currentfile.write_bytes(fetch("2627"))
    previous=parse(priorfile.read_bytes());current=parse(currentfile.read_bytes())
    # Reject completed matches dated today: no verified individual match completion timestamps.
    training=[(*r,0.5) for r in previous]+[(*r,1.0) for r in current if r[0]<now.date()]
    if len(training)<100:raise ValueError("insufficient training")
    model=fit(training,2.0)
    model_hash=hashlib.sha256(MODEL.read_bytes()).hexdigest()
    evidence=[{"name":p.name,"sha256":hashlib.sha256(p.read_bytes()).hexdigest()} for p in (priorfile,currentfile)]
    data_hash=hashlib.sha256(json.dumps(sorted(evidence,key=lambda x:x["name"]),sort_keys=True,separators=(",",":")).encode()).hexdigest()
    rows=[]
    for home,away,kickoff in FIXTURES:
        when=dt.datetime.fromisoformat(kickoff.replace("Z","+00:00"))
        if when<=now:continue
        h=home if home in model[0] else ALIASES.get(home,home)
        a=away if away in model[0] else ALIASES.get(away,away)
        if h not in model[0] or a not in model[0]:raise ValueError(f"unknown team {home}/{away}")
        p=predict(h,a,model)
        # Evidence is timestamped at run-time, but source freshness is NOT independently proven.
        # Therefore this is deliberately not eligible for publication.
        rows.append({"league":"E0","home":home,"away":away,"kickoff_utc":kickoff,"generated_at_utc":now.strftime("%Y-%m-%dT%H:%M:%SZ"),"source_verified_at_utc":now.strftime("%Y-%m-%dT%H:%M:%SZ"),"fixture_source":SOURCE,"prob_home":p[0],"prob_draw":p[1],"prob_away":p[2],"model_sha256":model_hash,"data_sha256":data_hash,"status":"PROSPECTIVE_RESEARCH_UNVALIDATED"})
    for r in rows:check_manifest(r,MODEL,[priorfile,currentfile],now)
    planned=propose([],rows,now)
    result={"mode":"DRY_RUN_NOT_PUBLISHABLE","reason":"fixture source freshness and exact input cutoff not yet independently audited","candidate_count":len(planned),"challenge_eligible":0,"commit_enabled":False,"records":planned,"inputs":evidence}
    (outdir/"review.json").write_text(json.dumps(result,indent=2)+"\n")
    print(f"PASS: {len(planned)} candidate records validated against bytes; none committed")
if __name__=="__main__":main()
