#!/usr/bin/env python3
"""Experiment 67: read-only post-match scoring of the immutable Experiment 63 forecast.
Fail closed until ESPN final and Football-Data full-time score agree.
No ledger mutation, publication, betting claims, or challenge credit.
"""
import csv,datetime as dt,hashlib,io,json,math,pathlib,urllib.parse,urllib.request,sys
from experiment62_fixture_discovery import norm
OUT=pathlib.Path("/tmp/experiment67");OUT.mkdir(parents=True,exist_ok=True)
SRC=pathlib.Path("/tmp/experiment63-original/forecast.json")
def sha(b):return hashlib.sha256(b).hexdigest()
def canon(v):return json.dumps(v,sort_keys=True,separators=(",",":")).encode()
def fetch(url,name):
 start=dt.datetime.now(dt.timezone.utc).isoformat()
 req=urllib.request.Request(url,headers={"User-Agent":"ValueWatchResearch/1.0"})
 with urllib.request.urlopen(req,timeout=35) as r:
  if r.status!=200:raise ValueError(name+" HTTP error")
  raw=r.read(3000001)
 end=dt.datetime.now(dt.timezone.utc).isoformat()
 if not raw or len(raw)>3000000:raise ValueError(name+" empty or too large")
 (OUT/name).write_bytes(raw)
 return raw,{"url":url,"sha256":sha(raw),"request_started_utc":start,"response_received_utc":end}
def main():
 report={"experiment":67,"status":"BLOCKED_PENDING","model_validation":"UNVALIDATED",
 "publication_gate":"BLOCKED","challenge_eligible":0,"challenge_progress":"0/100",
 "persistent_ledger_modified":False}
 try:
  raw=SRC.read_bytes();forecast=json.loads(raw)
  claimed=forecast["record_sha256"];without=dict(forecast);without.pop("record_sha256")
  if sha(canon(without))!=claimed:raise ValueError("frozen forecast integrity failure")
  kickoff=dt.datetime.fromisoformat(forecast["kickoff_utc"].replace("Z","+00:00"))
  now=dt.datetime.now(dt.timezone.utc)
  report.update(forecast_sha256=sha(raw),forecast_record_sha256=claimed,
   kickoff_utc=forecast["kickoff_utc"],forecast_generated_at_utc=forecast["generated_at_utc"])
  if now<kickoff+dt.timedelta(hours=3):
   report.update(status="WAITING_FOR_POST_MATCH_WINDOW",reason="kickoff plus 3-hour safety buffer not elapsed")
  else:
   day=kickoff.strftime("%Y%m%d")
   espn_url="https://site.api.espn.com/apis/site/v2/sports/soccer/eng.1/scoreboard?"+urllib.parse.urlencode({"dates":day,"limit":"100"})
   csv_url="https://www.football-data.co.uk/mmz4281/2627/E0.csv"
   espn_raw,espn_receipt=fetch(espn_url,"espn-final.json")
   csv_raw,csv_receipt=fetch(csv_url,"football-data-results.csv")
   events=json.loads(espn_raw).get("events",[])
   matches=[]
   for event in events:
    comps=event.get("competitions") or []
    if not comps:continue
    teams=comps[0].get("competitors",[])
    home=next((x for x in teams if x.get("homeAway")=="home"),None)
    away=next((x for x in teams if x.get("homeAway")=="away"),None)
    if not home or not away:continue
    if norm(home.get("team",{}).get("displayName",""))!=norm(forecast["home"]):continue
    if norm(away.get("team",{}).get("displayName",""))!=norm(forecast["away"]):continue
    event_time=dt.datetime.fromisoformat(event["date"].replace("Z","+00:00"))
    if abs((event_time-kickoff).total_seconds())>60:continue
    if event.get("status",{}).get("type",{}).get("state")!="post":continue
    if not event.get("status",{}).get("type",{}).get("completed",False):continue
    matches.append((int(home["score"]),int(away["score"]),event.get("id")))
   if len(matches)!=1:
    report.update(status="WAITING_FOR_INDEPENDENT_FINAL_RESULT",reason="ESPN final missing or ambiguous")
   else:
    espn_home,espn_away,event_id=matches[0]
    rows=[]
    for row in csv.DictReader(io.StringIO(csv_raw.decode("utf-8-sig"))):
     if row.get("Div")!="E0":continue
     if norm(row.get("HomeTeam",""))!=norm(forecast["home"]) or norm(row.get("AwayTeam",""))!=norm(forecast["away"]):continue
     if dt.datetime.strptime(row["Date"],"%d/%m/%Y").date()!=kickoff.date():continue
     if not all(row.get(k) for k in ("FTHG","FTAG","FTR")):continue
     hg,ag=int(row["FTHG"]),int(row["FTAG"])
     outcome="H" if hg>ag else "A" if ag>hg else "D"
     if row["FTR"]!=outcome:raise ValueError("football-data score/result inconsistency")
     rows.append((hg,ag))
    if len(rows)!=1 or rows[0]!=(espn_home,espn_away):
     report.update(status="WAITING_FOR_CROSS_SOURCE_FINAL_AGREEMENT",
      espn_final_score=[espn_home,espn_away],football_data_matching_rows=rows)
    else:
     outcome=0 if espn_home>espn_away else 2 if espn_away>espn_home else 1
     probabilities=[float(forecast[k]) for k in ("prob_home","prob_draw","prob_away")]
     if any(not math.isfinite(x) or x<=0 or x>=1 for x in probabilities) or abs(sum(probabilities)-1)>1e-8:
      raise ValueError("invalid frozen probabilities")
     target=[int(i==outcome) for i in range(3)]
     brier=sum((p-y)**2 for p,y in zip(probabilities,target))
     loss=-math.log(probabilities[outcome])
     score={"fixture":{"home":forecast["home"],"away":forecast["away"],
       "kickoff_utc":forecast["kickoff_utc"],"espn_event_id":event_id},
      "final_score":{"home":espn_home,"away":espn_away},
      "actual_outcome":["H","D","A"][outcome],"frozen_probabilities":probabilities,
      "multiclass_brier_score":brier,"log_loss":loss,
      "scored_at_utc":dt.datetime.now(dt.timezone.utc).isoformat(),
      "frozen_forecast_sha256":sha(raw),"frozen_record_sha256":claimed,
      "source_receipts":[espn_receipt,csv_receipt],
      "source_first_availability_independently_verified":False,
      "timestamp_independently_trusted":False,
      "challenge_eligible":0,"publication_gate":"BLOCKED"}
     (OUT/"score.json").write_bytes(canon(score)+b"\n")
     report.update(status="POST_MATCH_SCORE_CAPTURED_REVIEW_ONLY",
      score_sha256=sha(canon(score)),brier_score=brier,log_loss=loss,
      actual_outcome=score["actual_outcome"],final_score=score["final_score"])
   report["source_receipts"]=[espn_receipt,csv_receipt]
 except Exception as exc:report.update(status="BLOCKED_AUDIT_ERROR",error=str(exc))
 (OUT/"report.json").write_text(json.dumps(report,indent=2)+"\n")
 print(json.dumps({k:report.get(k) for k in ("status","brier_score","log_loss","error")}))
 if report["status"]=="BLOCKED_AUDIT_ERROR":sys.exit(1)
if __name__=="__main__":main()
