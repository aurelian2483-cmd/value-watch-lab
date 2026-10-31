#!/usr/bin/env python3
"""Experiment 30: cross-check future EPL fixtures against ESPN live schedule and
football-data.co.uk current-season schedule. Fail closed on ambiguity or mismatch.
Never publish or count forecasts. Independent sources are fetched at run time.
"""
import csv,datetime as dt,hashlib,io,json,pathlib,sys,urllib.request
from experiment23_pipeline import fetch
from experiment18_team_check import FIXTURES
ESPN="https://site.api.espn.com/apis/site/v2/sports/soccer/eng.1/scoreboard"
def get_espn(day):
    url=ESPN+"?dates="+day.strftime("%Y%m%d")+"&limit=100"
    req=urllib.request.Request(url,headers={"User-Agent":"ValueWatchResearch/1.0"})
    with urllib.request.urlopen(req,timeout=25) as response:return response.read(3000000)
def normal(name):
    s="".join(ch for ch in name.casefold() if ch.isalnum())
    aliases={"tottenhamhotspur":"spurs","tottenham":"spurs","nottinghamforest":"nottmforest","manchestercity":"mancity","newcastleunited":"newcastle","leedsunited":"leeds","coventrycity":"coventry"}
    return aliases.get(s,s)
def parse_time(value):
    t=dt.datetime.fromisoformat(value.replace("Z","+00:00"))
    if t.tzinfo is None:raise ValueError("kickoff without timezone")
    return t.astimezone(dt.timezone.utc)
def verify(home,away,kickoff,espn_bytes,football_bytes):
    expected=parse_time(kickoff)
    events=json.loads(espn_bytes).get("events")
    if not isinstance(events,list):raise ValueError("ESPN events missing")
    matched=[]
    for event in events:
        for comp in event.get("competitions",[]):
            teams=comp.get("competitors",[])
            h=[x for x in teams if x.get("homeAway")=="home"]
            a=[x for x in teams if x.get("homeAway")=="away"]
            if len(h)!=1 or len(a)!=1:continue
            hname=h[0].get("team",{}).get("displayName","")
            aname=a[0].get("team",{}).get("displayName","")
            if normal(hname)==normal(home) and normal(aname)==normal(away):
                matched.append(parse_time(comp.get("date") or event.get("date")))
    if len(matched)!=1 or matched[0]!=expected:raise ValueError("ESPN fixture absent, ambiguous, or kickoff mismatch")
    rows=list(csv.DictReader(io.StringIO(football_bytes.decode("utf-8-sig"))))
    found=[r for r in rows if normal(r.get("HomeTeam",""))==normal(home) and normal(r.get("AwayTeam",""))==normal(away) and r.get("Date")]
    if len(found)!=1:raise ValueError("football-data fixture missing or ambiguous")
    rawdate=found[0]["Date"]
    try:matchdate=dt.datetime.strptime(rawdate,"%d/%m/%Y").date()
    except ValueError:matchdate=dt.datetime.strptime(rawdate,"%d/%m/%y").date()
    # Date is in local UK football calendar; account for possible UTC midnight conversion.
    from zoneinfo import ZoneInfo
    if matchdate!=expected.astimezone(ZoneInfo("Europe/London")).date():raise ValueError("football-data fixture date mismatch")
    return {"league":"E0","home":home,"away":away,"kickoff_utc":kickoff,"status":"TWO_SOURCE_SCHEDULE_MATCH_NOT_PUBLISHED"}
def main():
    now=dt.datetime.now(dt.timezone.utc)
    football=fetch("2627")
    out=[]
    for home,away,kickoff in FIXTURES:
        when=parse_time(kickoff)
        if when<=now:continue
        try:
            espn=get_espn(when)
            item=verify(home,away,kickoff,espn,football)
            item["checked_at_utc"]=dt.datetime.now(dt.timezone.utc).isoformat()
            item["espn_snapshot_sha256"]=hashlib.sha256(espn).hexdigest()
            item["football_data_snapshot_sha256"]=hashlib.sha256(football).hexdigest()
            item["espn_source"]=ESPN
            item["football_data_source"]="https://www.football-data.co.uk/mmz4281/2627/E0.csv"
            out.append(item)
        except Exception as exc:
            out.append({"home":home,"away":away,"kickoff_utc":kickoff,"status":"BLOCKED","reason":str(exc)})
    result={"experiment":30,"checked_at_utc":now.isoformat(),"results":out,"matched":sum(x["status"].startswith("TWO_SOURCE") for x in out),"challenge_eligible":0,"publishing_enabled":False}
    pathlib.Path("/tmp/experiment30-review.json").write_text(json.dumps(result,indent=2)+"\n")
    print(json.dumps({"matched":result["matched"],"blocked":sum(x["status"]=="BLOCKED" for x in out),"challenge_eligible":0}))
    if any(x["status"]=="BLOCKED" for x in out):print("REVIEW REQUIRED: at least one fixture could not be verified")
if __name__=="__main__":
    try:main()
    except Exception as e:sys.exit(f"BLOCKED: {e}")
