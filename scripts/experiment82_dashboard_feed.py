#!/usr/bin/env python3
"""Experiment 82: research dashboard feed; never infer validation or betting value."""
import datetime as dt,json,pathlib
OUT=pathlib.Path("/tmp/experiment82")
def read(path):
 try:return json.loads(pathlib.Path(path).read_text())
 except (FileNotFoundError,ValueError):return None
def main():
 OUT.mkdir(parents=True,exist_ok=True)
 coverage=read("/tmp/experiment79/coverage-report.json")
 verification=read("/tmp/experiment80/verification-report.json")
 probe=read("/tmp/experiment81/source-feasibility-report.json")
 fixtures=[]
 if coverage and coverage.get("status")=="COVERAGE_AUDIT_READY":
  matched={(x["home"].casefold(),x["away"].casefold(),x["kickoff_utc"]) for x in (verification or {}).get("verified_schedule_only",[]) if (verification or {}).get("status")=="CROSS_SOURCE_AUDIT_READY"}
  for f in coverage.get("fixtures",[]):
   key=(f["home"].casefold(),f["away"].casefold(),f["kickoff_utc"])
   fixtures.append({"home":f["home"],"away":f["away"],"kickoff_utc":f["kickoff_utc"],
    "verification":"SCHEDULE_CROSS_CHECK" if key in matched else "UNVERIFIED",
    "paper_prediction":None,"result":None,"forecast_eligible":False})
 data={"schema_version":1,"experiment":82,"generated_at_utc":dt.datetime.now(dt.timezone.utc).isoformat(),
  "research_only":True,"model_validation":"UNVALIDATED","publication_gate":"BLOCKED",
  "official_challenge":{"completed":0,"target":100,"status":"NOT_STARTED"},
  "upcoming_fixtures":fixtures,
  "paper_forecasts":[],"completed_results":[],
  "accuracy":{"status":"INSUFFICIENT_VERIFIED_SCORED_DATA","sample_size":0,"value":None},
  "source_audits":{"espn":(coverage or {}).get("status","NOT_AVAILABLE"),
    "football_data_cross_check":(verification or {}).get("status","NOT_AVAILABLE"),
    "third_source":(probe or {}).get("status","NOT_AVAILABLE")},
  "limitations":["This feed does not certify fixture availability timestamps.",
    "Fixture schedule corroboration is not forecast validation.",
    "No odds, expected value, or betting recommendations are published.",
    "Forecasts and results remain empty until verified historical records are explicitly integrated."]}
 (OUT/"dashboard-data.json").write_text(json.dumps(data,indent=2)+"\n")
 print(json.dumps({"status":"RESEARCH_FEED_GENERATED","fixtures":len(fixtures),
  "paper_forecasts":0,"completed_results":0,"publication_gate":"BLOCKED"}))
if __name__=="__main__":main()
