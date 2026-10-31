#!/usr/bin/env python3
"""Experiment 31: diagnose schedule coverage without treating results CSV as fixture authority.
No publishing; no challenge eligibility. Requires two genuinely independent schedules later.
"""
import csv,datetime as dt,hashlib,io,json,pathlib,sys
from experiment30_fixture_crosscheck import get_espn,normal,parse_time
from experiment23_pipeline import fetch
from experiment18_team_check import FIXTURES
def diagnose(home,away,kickoff,espn_bytes,football_bytes):
    when=parse_time(kickoff)
    events=json.loads(espn_bytes).get("events")
    if not isinstance(events,list):raise ValueError("ESPN events unavailable")
    candidates=[]
    for e in events:
        for c in e.get("competitions",[]):
            teams=c.get("competitors",[])
            h=[t for t in teams if t.get("homeAway")=="home"]
            a=[t for t in teams if t.get("homeAway")=="away"]
            if len(h)==len(a)==1 and normal(h[0].get("team",{}).get("displayName",""))==normal(home) and normal(a[0].get("team",{}).get("displayName",""))==normal(away):
                candidates.append(parse_time(c.get("date") or e.get("date")))
    if not candidates:espn_status="NOT_FOUND"
    elif len(candidates)>1:espn_status="AMBIGUOUS"
    elif candidates[0]!=when:espn_status="KICKOFF_MISMATCH"
    else:espn_status="MATCHED"
    rows=list(csv.DictReader(io.StringIO(football_bytes.decode("utf-8-sig"))))
    found=[r for r in rows if normal(r.get("HomeTeam",""))==normal(home) and normal(r.get("AwayTeam",""))==normal(away)]
    if not found:csv_status="NOT_LISTED_RESULTS_FEED"
    elif len(found)>1:csv_status="AMBIGUOUS"
    else:csv_status="LISTED_DATE_NEEDS_REVIEW"
    return {"home":home,"away":away,"kickoff_utc":kickoff,"espn_status":espn_status,"football_data_status":csv_status,"independently_verified":False,"challenge_eligible":False}
def main():
    now=dt.datetime.now(dt.timezone.utc);football=fetch("2627");rows=[]
    for home,away,kickoff in FIXTURES:
        when=parse_time(kickoff)
        if when<=now:continue
        try:
            espn=get_espn(when)
            row=diagnose(home,away,kickoff,espn,football)
            row["espn_snapshot_sha256"]=hashlib.sha256(espn).hexdigest()
        except Exception as exc:row={"home":home,"away":away,"kickoff_utc":kickoff,"espn_status":"ERROR","error":str(exc),"independently_verified":False}
        rows.append(row)
    report={"experiment":31,"status":"SCHEDULE_COVERAGE_DIAGNOSTIC_ONLY","checked_at_utc":now.isoformat(),"results":rows,"verified":0,"challenge_eligible":0,"publishing_enabled":False}
    pathlib.Path("/tmp/experiment31-diagnostic.json").write_text(json.dumps(report,indent=2)+"\n")
    print(json.dumps({"total":len(rows),"espn_matched":sum(x.get("espn_status")=="MATCHED" for x in rows),"verified":0}))
if __name__=="__main__":
    try:main()
    except Exception as exc:sys.exit(f"BLOCKED: {exc}")
