#!/usr/bin/env python3
"""Experiment 80: fail-closed ESPN vs Football-Data fixture corroboration audit.
Read-only; no forecasts, ledger edits, or publication.
"""
import csv,datetime as dt,io,json,pathlib,urllib.request,hashlib,sys
from zoneinfo import ZoneInfo
from experiment62_fixture_discovery import norm,stamp,FIXTURE_URL
from experiment79_espn_coverage import main as collect_espn
OUT=pathlib.Path("/tmp/experiment80")
def main():
 OUT.mkdir(parents=True,exist_ok=True)
 collect_espn()
 es=json.loads(pathlib.Path("/tmp/experiment79/coverage-report.json").read_text())
 if es["status"]!="COVERAGE_AUDIT_READY":raise ValueError("ESPN coverage incomplete")
 req=urllib.request.Request(FIXTURE_URL,headers={"User-Agent":"ValueWatchResearch/1.0"})
 with urllib.request.urlopen(req,timeout=35) as response:
  if response.status!=200:raise ValueError("Football-Data HTTP failure")
  raw=response.read(3000001)
 if not raw or len(raw)>3000000:raise ValueError("Football-Data missing or oversized")
 rows=list(csv.DictReader(io.StringIO(raw.decode("utf-8-sig"))))
 index={}
 for row in rows:
  if row.get("Div")!="E0":continue
  try:
   when=dt.datetime.combine(dt.datetime.strptime(row["Date"],"%d/%m/%Y").date(),
      dt.time.fromisoformat(row["Time"]),tzinfo=ZoneInfo("Europe/London"))
   key=(norm(row["HomeTeam"]),norm(row["AwayTeam"]))
   index.setdefault(key,[]).append(stamp(when))
  except (ValueError,KeyError):continue
 verified=[];unverified=[];reason_counts={}
 for fixture in es["fixtures"]:
  key=(norm(fixture["home"]),norm(fixture["away"]))
  target=dt.datetime.fromisoformat(fixture["kickoff_utc"].replace("Z","+00:00"))
  matches=[t for t in index.get(key,[]) if abs((dt.datetime.fromisoformat(t.replace("Z","+00:00"))-target).total_seconds())<=60]
  item={"home":fixture["home"],"away":fixture["away"],"kickoff_utc":fixture["kickoff_utc"],
   "espn_event_id":fixture["espn_event_id"],"forecast_eligible":False}
  if len(matches)==1:
   item["cross_source_schedule_match"]=True
   verified.append(item)
  else:
   item["cross_source_schedule_match"]=False
   item["reason"]="No unique matching Football-Data fixture within 60 seconds"
   unverified.append(item)
   reason_counts[item["reason"]]=reason_counts.get(item["reason"],0)+1
 report={"experiment":80,"status":"CROSS_SOURCE_AUDIT_READY",
  "espn_fixture_count":len(es["fixtures"]),"matched_count":len(verified),
  "unmatched_count":len(unverified),"verified_schedule_only":verified,
  "unverified":unverified,"unverified_reason_counts":reason_counts,"football_data_snapshot_sha256":hashlib.sha256(raw).hexdigest(),
  "source_first_availability_verified":False,"independent_timestamp_attested":False,
  "forecast_eligible_count":0,"new_forecasts":0,"model_validation":"UNVALIDATED",
  "publication_gate":"BLOCKED","challenge_eligible":0,
  "limitation":"Football-Data coverage is incomplete; matching schedules is not proof of independently attested first availability"}
 (OUT/"verification-report.json").write_text(json.dumps(report,indent=2)+"\n")
 print(json.dumps({k:report[k] for k in ("status","espn_fixture_count","matched_count","unmatched_count","forecast_eligible_count")}))
if __name__=="__main__":
 try:main()
 except Exception as e:
  OUT.mkdir(parents=True,exist_ok=True)
  (OUT/"verification-report.json").write_text(json.dumps({"experiment":80,"status":"BLOCKED_AUDIT_ERROR","error":str(e),"publication_gate":"BLOCKED","challenge_eligible":0},indent=2)+"\n")
  raise
