#!/usr/bin/env python3
"""Experiment 16: inspect 2026/27 fixture feed; DO NOT assert kickoff times as verified.
The provider documents a CET-1 convention with possible summer offset errors.
Produces candidates for cross-check, not the verified fixture manifest.
"""
import csv,datetime as dt,io,json,pathlib,urllib.request
BASE="https://raw.githubusercontent.com/oladeeayo/open-matchday/master/data/"
LEAGUES={"E0":"ENG_1_premier-league","E1":"ENG_2_championship"}
def fetch(url):
    request=urllib.request.Request(url,headers={"User-Agent":"ValueWatchResearch/1.0"})
    with urllib.request.urlopen(request,timeout=25) as response:
        if response.status!=200:raise ValueError("feed unavailable")
        return response.read(2_000_000).decode("utf-8-sig")
def candidates(now=None,fetcher=fetch):
    now=now or dt.datetime.now(dt.timezone.utc)
    out=[];seen=set()
    for div,folder in LEAGUES.items():
        url=BASE+folder+"/fixtures_2627.csv"
        rows=list(csv.DictReader(io.StringIO(fetcher(url))))
        if not rows:raise ValueError(f"{div}: no fixture rows")
        if not {"date","time","home","away"}.issubset(rows[0]):raise ValueError("missing fixture columns")
        for row in rows:
            day=dt.date.fromisoformat(row["date"])
            if not now.date()<=day<=now.date()+dt.timedelta(days=7):continue
            home=row["home"].strip();away=row["away"].strip()
            if not home or not away or home==away:raise ValueError("invalid team")
            key=(div,day,home,away)
            if key in seen:raise ValueError("duplicate fixture")
            seen.add(key)
            out.append({"league":div,"date":day.isoformat(),"provider_time_unverified":row["time"],"home":home,"away":away,"source_url":url,"status":"CANDIDATE_REQUIRES_INDEPENDENT_KICKOFF_VERIFICATION","kickoff_utc":None})
    return out
if __name__=="__main__":
    import argparse
    p=argparse.ArgumentParser();p.add_argument("--output",type=pathlib.Path,required=True)
    args=p.parse_args()
    data={"mode":"CANDIDATES_ONLY","created_utc":dt.datetime.now(dt.timezone.utc).isoformat(),"source":"open-matchday; verify independently against official league","fixtures":candidates()}
    args.output.parent.mkdir(parents=True,exist_ok=True)
    args.output.write_text(json.dumps(data,indent=2)+"\n")
    print("Fixture candidates:",len(data["fixtures"]),"| verified kickoff times: 0 | predictions published: 0")
