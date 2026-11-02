#!/usr/bin/env python3
"""Experiment 90: score SHA-verified archived paper forecasts against two independent final-result feeds.
Read-only, paper-only; does not modify the official challenge or website.
"""
import csv,datetime as dt,hashlib,io,json,math,pathlib,urllib.parse,urllib.request
from experiment62_fixture_discovery import norm
ROOT=pathlib.Path(__file__).resolve().parents[1]
OUT=pathlib.Path("/tmp/experiment90");OUT.mkdir(parents=True,exist_ok=True)
UTC=dt.timezone.utc
def canon(v):return json.dumps(v,sort_keys=True,separators=(",",":")).encode()
def sha(b):return hashlib.sha256(b).hexdigest()
def fetch(url):
 req=urllib.request.Request(url,headers={"User-Agent":"ValueWatchResearch/1.0"})
 with urllib.request.urlopen(req,timeout=35) as response:
  if response.status!=200:raise ValueError("Result source HTTP error")
  raw=response.read(3000001)
 if not raw or len(raw)>3000000:raise ValueError("Result source empty or oversized")
 return raw,{"url":url,"sha256":sha(raw),"received_at_utc":dt.datetime.now(UTC).isoformat()}
def main():
 now=dt.datetime.now(UTC)
 report={"experiment":90,"status":"READ_ONLY_AUDIT","publication_gate":"BLOCKED",
  "model_validation":"UNVALIDATED","challenge_eligible":0,"official_challenge":"0/100",
  "scored":[],"pending":[],"errors":[],"persistent_ledger_modified":False}
 ledger_path=ROOT/"research/results-ledger/v1/verified-results.json"
 ledger=json.loads(ledger_path.read_text()) if ledger_path.exists() else {"entries":[]}
 already_scored={entry["record_sha256"] for entry in ledger["entries"]}
 paths=sorted((ROOT/"research/forecast-archive/v1").glob("*.json"))+sorted((ROOT/"research/forecast-archive/v2").glob("*.json"))
 for path in paths:
  try:
   f=json.loads(path.read_text());unsigned=dict(f);digest=unsigned.pop("record_sha256")
   if digest!=path.stem or sha(canon(unsigned))!=digest:raise ValueError("Archive SHA mismatch")
   if f.get("publication_gate")!="BLOCKED" or f.get("challenge_eligible")!=0:raise ValueError("Unsafe archive")
   kickoff=dt.datetime.fromisoformat(f["kickoff_utc"].replace("Z","+00:00"))
   created=dt.datetime.fromisoformat(f["generated_at_utc"].replace("Z","+00:00"))
   if kickoff.tzinfo is None or created.tzinfo is None or created>=kickoff:raise ValueError("Not a valid pre-event record")
   if digest in already_scored:continue
   fixture={"model":f.get("model","LEGACY_ARCHIVE"),"home":f["home"],"away":f["away"],"kickoff_utc":f["kickoff_utc"],"record_sha256":digest}
   if now<kickoff+dt.timedelta(hours=3):
    report["pending"].append({**fixture,"reason":"WAITING_FOR_KICKOFF_PLUS_3_HOURS"});continue
   day=kickoff.strftime("%Y%m%d")
   espn_url="https://site.api.espn.com/apis/site/v2/sports/soccer/eng.1/scoreboard?"+urllib.parse.urlencode({"dates":day,"limit":100})
   year=kickoff.year if kickoff.month>=7 else kickoff.year-1
   csv_url=f"https://www.football-data.co.uk/mmz4281/{year%100:02d}{(year+1)%100:02d}/E0.csv"
   er,ereceipt=fetch(espn_url);cr,creceipt=fetch(csv_url)
   matches=[]
   for event in json.loads(er).get("events",[]):
    comps=event.get("competitions") or []
    if not comps:continue
    teams=comps[0].get("competitors",[])
    h=next((v for v in teams if v.get("homeAway")=="home"),None)
    a=next((v for v in teams if v.get("homeAway")=="away"),None)
    if not h or not a:continue
    if norm(h.get("team",{}).get("displayName",""))!=norm(f["home"]) or norm(a.get("team",{}).get("displayName",""))!=norm(f["away"]):continue
    eventtime=dt.datetime.fromisoformat(event["date"].replace("Z","+00:00"))
    if abs((eventtime-kickoff).total_seconds())>60:continue
    status=event.get("status",{}).get("type",{})
    if status.get("state")!="post" or status.get("completed") is not True:continue
    matches.append((int(h["score"]),int(a["score"]),event.get("id")))
   if len(matches)!=1:
    report["pending"].append({**fixture,"reason":"ESPN_FINAL_MISSING_OR_AMBIGUOUS"});continue
   hg,ag,event_id=matches[0]
   csvmatches=[]
   for row in csv.DictReader(io.StringIO(cr.decode("utf-8-sig"))):
    if row.get("Div")!="E0" or norm(row.get("HomeTeam",""))!=norm(f["home"]) or norm(row.get("AwayTeam",""))!=norm(f["away"]):continue
    if dt.datetime.strptime(row["Date"],"%d/%m/%Y").date()!=kickoff.date():continue
    if not all(row.get(k) for k in ("FTHG","FTAG","FTR")):continue
    ch,ca=int(row["FTHG"]),int(row["FTAG"])
    if row["FTR"]!=("H" if ch>ca else "A" if ca>ch else "D"):raise ValueError("Football-Data inconsistent result")
    csvmatches.append((ch,ca))
   if csvmatches!=[(hg,ag)]:
    report["pending"].append({**fixture,"reason":"INDEPENDENT_FINAL_DISAGREEMENT_OR_MISSING"});continue
   outcome="H" if hg>ag else "A" if ag>hg else "D"
   probabilities=[f[k] for k in ("prob_home","prob_draw","prob_away")]
   if any(not isinstance(p,(int,float)) or not math.isfinite(p) or not 0<p<1 for p in probabilities) or abs(sum(probabilities)-1)>1e-8:raise ValueError("Invalid frozen probabilities")
   idx={"H":0,"D":1,"A":2}[outcome]
   brier=sum((p-int(i==idx))**2 for i,p in enumerate(probabilities))
   logloss=-math.log(probabilities[idx])
   report["scored"].append({**fixture,"score_home":hg,"score_away":ag,"actual_outcome":outcome,
    "multiclass_brier_score":brier,"log_loss":logloss,"espn_event_id":event_id,
    "source_receipts":[ereceipt,creceipt],"timestamp_independently_attested":False,
    "challenge_eligible":0,"publication_gate":"BLOCKED"})
  except Exception as exc:report["errors"].append({"file":path.name,"error":str(exc)})
 report["status"]="AUDIT_ERROR" if report["errors"] else ("RESEARCH_SCORES_READY" if report["scored"] else "PENDING_VERIFIED_FINALS")
 (OUT/"report.json").write_text(json.dumps(report,indent=2)+"\n")
 print(json.dumps({"status":report["status"],"scored":len(report["scored"]),"pending":len(report["pending"]),"errors":len(report["errors"])}))
 if report["errors"]:raise SystemExit(1)
if __name__=="__main__":main()

