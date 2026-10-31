#!/usr/bin/env python3
"""Fetch and validate current-season results. No predictions or commits.
Fail closed on missing network, malformed CSV, wrong league or implausible dates.
"""
import argparse,csv,datetime as dt,io,pathlib,urllib.request
URL="https://www.football-data.co.uk/mmz4281/2627/{division}.csv"
REQUIRED={"Date","HomeTeam","AwayTeam","FTHG","FTAG","FTR"}
def validate(payload,division,now,max_age_days=None):
    if not payload or len(payload)<100: raise ValueError("empty/short feed")
    content=payload.decode("utf-8-sig")
    reader=csv.DictReader(io.StringIO(content))
    if not reader.fieldnames or not REQUIRED.issubset(reader.fieldnames):raise ValueError("missing mandatory result columns")
    if "Div" not in reader.fieldnames:raise ValueError("division column missing")
    seen=set();dates=[];completed=0
    for row in reader:
        if not row.get("Date") or not row.get("HomeTeam"):continue
        if row.get("Div")!=division:raise ValueError("wrong division")
        try: date=dt.datetime.strptime(row["Date"],"%d/%m/%Y").date()
        except ValueError: date=dt.datetime.strptime(row["Date"],"%d/%m/%y").date()
        if not dt.date(2026,7,1)<=date<=now:raise ValueError("outside expected season or future")
        key=(date,row["HomeTeam"],row["AwayTeam"])
        if key in seen:raise ValueError("duplicate fixture")
        seen.add(key)
        if all(row.get(x) not in (None,"") for x in ("FTHG","FTAG","FTR")):
            h,a=int(row["FTHG"]),int(row["FTAG"])
            if h<0 or a<0 or row["FTR"]!=("H" if h>a else "A" if a>h else "D"):raise ValueError("invalid score")
            dates.append(date);completed+=1
    if completed<20:raise ValueError("too few completed results")
    latest=max(dates)
    if max_age_days is not None and (now-latest).days>max_age_days:raise ValueError(f"results feed stale: latest={latest}, age={(now-latest).days} days, limit={max_age_days}")
    return {"division":division,"completed":completed,"latest":latest.isoformat(),"age_days":(now-latest).days,"prediction_ready_at_2_days":(now-latest).days<=2,"bytes":len(payload)}
def fetch(division,timeout=20):
    req=urllib.request.Request(URL.format(division=division),headers={"User-Agent":"ValueWatchResearch/1.0"})
    with urllib.request.urlopen(req,timeout=timeout) as r:
        if r.status!=200:raise RuntimeError("feed unavailable")
        return r.read(2_000_001)
def run(directory,now,fetcher=fetch):
    # Two-phase: validate both before writing either. Existing files untouched on failure.
    pending={}
    for div in ("E0","E1"):
        data=fetcher(div)
        pending[div]=(data,validate(data,div,now))
    directory.mkdir(parents=True,exist_ok=True)
    for div,(data,_) in pending.items():
        (directory/f"value_watch_2026_27_{div}.csv").write_bytes(data)
    return {div:metadata for div,(_,metadata) in pending.items()}
if __name__=="__main__":
    p=argparse.ArgumentParser()
    p.add_argument("--output-dir",type=pathlib.Path,required=True)
    args=p.parse_args()
    try: print(run(args.output_dir,dt.datetime.now(dt.timezone.utc).date()))
    except Exception as exc: p.exit(1,f"REFRESH BLOCKED: {exc}\n")
