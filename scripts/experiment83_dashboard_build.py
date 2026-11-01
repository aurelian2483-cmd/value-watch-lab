#!/usr/bin/env python3
"""Build read-only research dashboard assets from a fresh Experiment 82 feed."""
import datetime as dt,json,pathlib
ROOT=pathlib.Path(__file__).resolve().parents[1]
SOURCE=pathlib.Path("/tmp/experiment82/dashboard-data.json")
OUT=pathlib.Path("/tmp/experiment83")
def main():
 OUT.mkdir(parents=True,exist_ok=True)
 data=json.loads(SOURCE.read_text())
 if data.get("research_only") is not True or data.get("publication_gate")!="BLOCKED" or data.get("model_validation")!="UNVALIDATED":
  raise ValueError("Dashboard feed failed research safety checks")
 if any(f.get("forecast_eligible") is not False for f in data.get("upcoming_fixtures",[])):
  raise ValueError("Unexpected forecast eligibility")
 (OUT/"dashboard-data.json").write_text(json.dumps(data,indent=2)+"\n")
 template=(ROOT/"research/dashboard/index.html").read_text()
 (OUT/"index.html").write_text(template)
 print(json.dumps({"status":"RESEARCH_DASHBOARD_BUILT","fixtures":len(data["upcoming_fixtures"]),"publication_gate":"BLOCKED","output":str(OUT)}))
if __name__=="__main__":main()
