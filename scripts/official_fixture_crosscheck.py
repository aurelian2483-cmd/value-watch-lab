#!/usr/bin/env python3
"""Experiment 17: independently cross-check EPL fixture candidates against official schedule.
This is a cross-check report, NOT a time-verified publishable forecast manifest.
"""
import argparse,datetime as dt,json,pathlib
from fixture_candidates import candidates
SOURCE="https://www.premierleague.com/en/news/4725574"
# Official Premier League November fixture amendments, 21 September 2026.
# GMT is UTC in November. Pinned fixture facts; recheck before publishing.
SCHEDULE=[
("2026-11-06","20:00","Everton","Coventry City"),
("2026-11-07","12:30","Leeds United","Tottenham Hotspur"),
("2026-11-07","15:00","Arsenal","Hull City"),
("2026-11-07","15:00","Fulham","Newcastle United"),
("2026-11-07","17:30","Nottingham Forest","Manchester City"),
("2026-11-08","14:00","Brighton & Hove Albion","Brentford"),
("2026-11-08","14:00","Crystal Palace","Liverpool"),
("2026-11-08","14:00","Ipswich Town","AFC Bournemouth"),
("2026-11-08","14:00","Sunderland","Chelsea"),
("2026-11-08","16:30","Manchester United","Aston Villa")]
ALIASES={"spurs":"tottenham hotspur","tottenham":"tottenham hotspur","man city":"manchester city","nott'm forest":"nottingham forest","nottm forest":"nottingham forest","brighton":"brighton & hove albion","bournemouth":"afc bournemouth","coventry":"coventry city","ipswich":"ipswich town","leeds":"leeds united","newcastle":"newcastle united","man utd":"manchester united"}
def norm(name):
    key=" ".join(name.casefold().split())
    return ALIASES.get(key,key)
def compare(rows,now):
    official={}
    for date,time,home,away in SCHEDULE:
        k=(date,norm(home),norm(away))
        official[k]=date+"T"+time+":00Z"
    results=[];seen=set()
    for row in rows:
        if row["league"]!="E0":continue
        key=(row["date"],norm(row["home"]),norm(row["away"]))
        if key in seen:raise ValueError("duplicate candidate")
        seen.add(key)
        kickoff=official.get(key)
        if not kickoff:continue
        parsed=dt.datetime.fromisoformat(kickoff.replace("Z","+00:00"))
        if parsed<=now:continue
        results.append({"league":"E0","home":row["home"],"away":row["away"],"kickoff_utc":kickoff,"official_schedule_source":SOURCE,"candidate_source":row["source_url"],"status":"CROSS_CHECK_MATCH_RECHECK_LIVE_BEFORE_PUBLISH"})
    return results
def main():
    p=argparse.ArgumentParser();p.add_argument("--output",type=pathlib.Path,required=True)
    args=p.parse_args();now=dt.datetime.now(dt.timezone.utc)
    rows=candidates(now)
    matches=compare(rows,now)
    report={"generated_at_utc":now.isoformat(),"status":"REVIEW_ONLY","official_source":SOURCE,"matched_epl_fixtures":matches,"count":len(matches),"challenge_eligible":0,"championship_verified":False}
    args.output.parent.mkdir(parents=True,exist_ok=True)
    args.output.write_text(json.dumps(report,indent=2)+"\n")
    print("EPL cross-check matches:",len(matches),"| challenge eligible: 0 | Championship: pending")
if __name__=="__main__":main()
