#!/usr/bin/env python3
"""Experiment 82: research dashboard JSON, never a public betting signal."""
import datetime as dt,hashlib,json,pathlib
from experiment79_espn_coverage import main as collect_espn
ROOT=pathlib.Path(__file__).resolve().parents[1]
OUT=pathlib.Path("/tmp/experiment82")
def main():
 OUT.mkdir(parents=True,exist_ok=True)
 collect_espn()
 source=json.loads(pathlib.Path("/tmp/experiment79/coverage-report.json").read_text())
 if source["status"]!="COVERAGE_AUDIT_READY":raise RuntimeError("Incomplete ESPN coverage")
 archived=[];invalid=[]
 for path in sorted((ROOT/"research/forecast-archive/v1").glob("*.json")):
  try:
   obj=json.loads(path.read_text())
   digest=obj.get("record_sha256")
   canonical=json.dumps({k:v for k,v in obj.items() if k!="record_sha256"},sort_keys=True,separators=(",",":")).encode()
   if digest!=path.stem or hashlib.sha256(canonical).hexdigest()!=digest:raise ValueError("integrity failure")
   archived.append({"league":obj["league"],"home":obj["home"],"away":obj["away"],
     "kickoff_utc":obj["kickoff_utc"],"record_sha256":digest,
     "label":"PAPER FORECAST — UNVALIDATED"})
  except Exception as exc:invalid.append({"filename":path.name,"reason":str(exc)})
 if invalid:raise RuntimeError("Archived forecast integrity error: "+json.dumps(invalid))
 fixtures=[{"home":f["home"],"away":f["away"],"kickoff_utc":f["kickoff_utc"],
  "espn_event_id":f["espn_event_id"],"verification":"ESPN ONLY — UNCORROBORATED"}
  for f in source["fixtures"]]
 feed={"schema":"value-watch-research-dashboard-v1","generated_at_utc":dt.datetime.now(dt.timezone.utc).isoformat(),
  "status":"RESEARCH_ONLY","model_validation":"UNVALIDATED","publication_gate":"BLOCKED",
  "official_challenge":{"eligible":0,"target":100},
  "source":"ESPN schedule (unverified) + integrity-checked research archive",
  "upcoming_fixtures":fixtures,"archived_paper_forecasts":archived,
  "accuracy":{"status":"NOT_ESTABLISHED","verified_scored_count":0,"value":None},
  "live_scores":{"status":"NOT_CONNECTED","matches":[]},
  "warnings":["Fixture source corroboration pending","Archived paper forecasts are not betting recommendations",
    "No verified betting odds or expected-value claims"]}
 (OUT/"research-dashboard-feed.json").write_text(json.dumps(feed,indent=2)+"\n")
 print(json.dumps({"status":feed["status"],"fixtures":len(fixtures),"archived_paper_forecasts":len(archived),"publication_gate":"BLOCKED"}))
if __name__=="__main__":main()
