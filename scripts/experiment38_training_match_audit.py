#!/usr/bin/env python3
"""Experiment 38: independently audit EVERY training match against ESPN.
Fail closed on absent, duplicate, ambiguous, non-final, score/date/team mismatches.
Read-only: no forecasts, ledger writes, publication or challenge eligibility.
"""
import collections,csv,datetime as dt,hashlib,io,json,pathlib,sys,urllib.request
from zoneinfo import ZoneInfo
def fetch_csv(season):
    """Fetch training CSV directly; no numerical model dependencies."""
    url=f"https://www.football-data.co.uk/mmz4281/{season}/E0.csv"
    req=urllib.request.Request(url,headers={"User-Agent":"ValueWatchResearch/1.0"})
    with urllib.request.urlopen(req,timeout=30) as response:
        if response.status!=200:raise ValueError("CSV HTTP status not 200")
        return response.read(2000000)
from sky_espn_strict_crosscheck import parse_time
# Explicit identity mapping only; no fuzzy matching that could conflate clubs.
CLUB_ALIASES = {
    "manunited":"manchesterunited",
    "manutd":"manchesterunited",
    "manchesterutd":"manchesterunited",
    "mancity":"manchestercity",
    "wolves":"wolverhamptonwanderers",
    "wolverhampton":"wolverhamptonwanderers",
    "brighton":"brightonandhovealbion",
    "brightonhovealbion":"brightonandhovealbion",
    "westham":"westhamunited",
    "nottmforest":"nottinghamforest",
    "nottingham":"nottinghamforest",
    "newcastle":"newcastleunited",
    "tottenham":"tottenhamhotspur",
    "spurs":"tottenhamhotspur",
    "leeds":"leedsunited",
    "coventry":"coventrycity",
    "leicester":"leicestercity",
    "ipswich":"ipswichtown",
    "bournemouth":"afcbournemouth",
    "hull":"hullcity",
}
def normal(name):
    key="".join(c for c in str(name).casefold() if c.isalnum())
    return CLUB_ALIASES.get(key,key)

OUT=pathlib.Path("/tmp/experiment38")
LONDON=ZoneInfo("Europe/London")
def digest(raw):return hashlib.sha256(raw).hexdigest()
def get_espn(day):
    url="https://site.api.espn.com/apis/site/v2/sports/soccer/eng.1/scoreboard?dates="+day.strftime("%Y%m%d")+"&limit=100"
    request=urllib.request.Request(url,headers={"User-Agent":"ValueWatchResearch/1.0"})
    with urllib.request.urlopen(request,timeout=25) as response:
        if response.status!=200:raise ValueError("ESPN HTTP status not 200")
        raw=response.read(3000000)
    return json.loads(raw),digest(raw),url
def parse_csv(raw,season,now):
    reader=csv.DictReader(io.StringIO(raw.decode("utf-8-sig")))
    required={"Date","HomeTeam","AwayTeam","FTHG","FTAG","FTR"}
    if not reader.fieldnames or not required.issubset(reader.fieldnames):
        raise ValueError("missing required CSV columns")
    rows=[]
    for line,row in enumerate(reader,2):
        if not any(str(v or "").strip() for v in row.values()):continue
        if not all(row.get(k) not in (None,"") for k in required):
            raise ValueError(f"{season} incomplete row {line}")
        day=dt.datetime.strptime(row["Date"],"%d/%m/%Y").date()
        home,away=row["HomeTeam"].strip(),row["AwayTeam"].strip()
        h,a=int(row["FTHG"]),int(row["FTAG"])
        if h<0 or a<0 or row["FTR"]!=("H" if h>a else "A" if a>h else "D"):
            raise ValueError(f"{season} invalid final score at row {line}")
        if day>=now.date():raise ValueError(f"{season} same-day/future row {line}; no verified cutoff")
        rows.append({"season":season,"line":line,"date":day.isoformat(),"home":home,"away":away,"home_goals":h,"away_goals":a})
    return rows
def event_details(event):
    comp=event.get("competitions",[])
    if len(comp)!=1:raise ValueError("ESPN competition count not exactly one")
    competitors=comp[0].get("competitors",[])
    home=[x for x in competitors if x.get("homeAway")=="home"]
    away=[x for x in competitors if x.get("homeAway")=="away"]
    if len(home)!=1 or len(away)!=1:raise ValueError("ESPN home/away ambiguous")
    def name(x):return x.get("team",{}).get("displayName","")
    def score(x):
        value=x.get("score")
        if isinstance(value,dict):value=value.get("value") or value.get("displayValue")
        if value is None or str(value).strip()=="":raise ValueError("ESPN score missing")
        number=int(value)
        if number<0:raise ValueError("negative score")
        return number
    kickoff=parse_time(comp[0].get("date") or event.get("date"))
    return {"home":name(home[0]),"away":name(away[0]),
            "home_goals":score(home[0]),"away_goals":score(away[0]),
            "kickoff_utc":kickoff.isoformat(),"completed":event.get("status",{}).get("type",{}).get("completed") is True,
            "event_id":str(event.get("id",""))}
def main():
    OUT.mkdir(parents=True,exist_ok=True)
    now=dt.datetime.now(dt.timezone.utc)
    report={"experiment":38,"mode":"READ_ONLY_FAIL_CLOSED","checked_at_utc":now.isoformat(),
            "status":"BLOCKED_PENDING","challenge_eligible":0,"publishing_enabled":False,
            "publication_gate":"BLOCKED","server_receipt_gate":"BLOCKED_NO_IMMUTABLE_RECORD",
            "matched":0,"missing":0,"ambiguous":0,"score_mismatch":0,
            "date_mismatch":0,"not_completed":0,"source_error":0,"rows":[],"sources":[]}
    try:
        records=[]
        for season in ("2526","2627"):
            raw=fetch_csv(season)
            parsed=parse_csv(raw,season,now)
            records.extend(parsed)
            report["sources"].append({"url":f"https://www.football-data.co.uk/mmz4281/{season}/E0.csv",
                                      "sha256":digest(raw),"rows":len(parsed)})
        if len(records)<100:raise ValueError("insufficient training rows")
        # No duplicate team fixture on same date, and no repeated rows.
        keys=[(r["date"],normal(r["home"]),normal(r["away"])) for r in records]
        if len(set(keys))!=len(keys):raise ValueError("duplicate CSV date/home/away")
        dates=sorted({dt.date.fromisoformat(r["date"]) for r in records})
        # Query each distinct match date once, preserving source hashes.
        snapshots={}
        for day in dates:
            try:
                data,hash_value,url=get_espn(day)
                if not isinstance(data.get("events"),list):raise ValueError("ESPN events absent")
                snapshots[day.isoformat()]=data["events"]
                report["sources"].append({"url":url,"sha256":hash_value,"events":len(data["events"])})
            except Exception as exc:
                snapshots[day.isoformat()]=None
                report["sources"].append({"date":day.isoformat(),"error":str(exc)})
        for r in records:
            result={**r,"status":"MISSING"}
            events=snapshots[r["date"]]
            if events is None:
                result["status"]="SOURCE_ERROR"
            else:
                matches=[];date_variants=[]
                for event in events:
                    try:
                        e=event_details(event)
                    except Exception:
                        continue
                    if normal(e["home"])!=normal(r["home"]) or normal(e["away"])!=normal(r["away"]):
                        continue
                    date_variants.append(e)
                    if dt.datetime.fromisoformat(e["kickoff_utc"]).astimezone(LONDON).date().isoformat()==r["date"]:
                        matches.append(e)
                if len(matches)>1:result["status"]="AMBIGUOUS"
                elif len(matches)==0:
                    result["status"]="DATE_MISMATCH" if date_variants else "MISSING"
                else:
                    e=matches[0]
                    result["espn_event_id"]=e["event_id"]
                    result["espn_kickoff_utc"]=e["kickoff_utc"]
                    if not e["completed"]:result["status"]="NOT_COMPLETED"
                    elif (r["home_goals"],r["away_goals"])!=(e["home_goals"],e["away_goals"]):
                        result["status"]="SCORE_MISMATCH"
                        result["espn_score"]=[e["home_goals"],e["away_goals"]]
                    else:result["status"]="MATCHED"
            report["rows"].append(result)
            key={"MATCHED":"matched","MISSING":"missing","AMBIGUOUS":"ambiguous",
                 "SCORE_MISMATCH":"score_mismatch","DATE_MISMATCH":"date_mismatch",
                 "NOT_COMPLETED":"not_completed","SOURCE_ERROR":"source_error"}[result["status"]]
            report[key]+=1
        report["total_csv_rows"]=len(records)
        report["distinct_dates_checked"]=len(dates)
        report["rows_sha256"]=digest(json.dumps(report["rows"],sort_keys=True,separators=(",",":")).encode())
        report["status"]="ALL_TRAINING_MATCHES_CROSSCHECKED_REVIEW_ONLY" if report["matched"]==len(records) else "BLOCKED_TRAINING_MISMATCHES"
        report["independent_training_cutoff_established"]=False
        report["missing_requirements"]=["Per-match result completion timestamps still not independently established",
            "Model training inclusion and exact snapshot cutoff require separate verification",
            "No immutable forecast commit or server receipt; publication remains disabled"]
    except Exception as exc:
        report["status"]="BLOCKED_AUDIT_ERROR";report["error"]=str(exc)
    finally:
        (OUT/"report.json").write_text(json.dumps(report,indent=2)+"\n")
        print(json.dumps({k:report.get(k) for k in ("status","total_csv_rows","matched","missing","ambiguous","score_mismatch","date_mismatch","not_completed","source_error","challenge_eligible","error")}))
    if report["status"]!="ALL_TRAINING_MATCHES_CROSSCHECKED_REVIEW_ONLY":sys.exit(1)
if __name__=="__main__":main()
