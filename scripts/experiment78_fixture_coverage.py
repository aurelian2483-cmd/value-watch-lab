#!/usr/bin/env python3
"""Experiment 78: read-only fixture feed coverage diagnostic."""
import csv,datetime as dt,io,json,pathlib
ROOT=pathlib.Path("/tmp/experiment62")
def main():
 report=json.loads((ROOT/"report.json").read_text())
 rows=list(csv.DictReader(io.StringIO((ROOT/"football-data-fixtures.csv").read_text(encoding="utf-8-sig"))))
 e0=[x for x in rows if x.get("Div")=="E0"]
 dates=sorted({x.get("Date","") for x in e0})
 accepted=json.loads((ROOT/"discovered-fixtures.json").read_text()).get("accepted",[])
 out={"experiment":78,"status":"SOURCE_COVERAGE_DIAGNOSED",
      "source":"football-data.co.uk/fixtures.csv",
      "total_csv_rows":len(rows),"e0_rows":len(e0),
      "e0_dates":dates,"accepted_cross_source_fixtures":len(accepted),
      "discovery_window_utc":report.get("discovery_window_utc"),
      "finding":"Primary feed coverage limits discovery; extending window cannot create missing rows",
      "next_action":"Evaluate an additional future fixture source with independent ESPN verification",
      "model_validation":"UNVALIDATED","publication_gate":"BLOCKED","challenge_eligible":0}
 dest=pathlib.Path("/tmp/experiment78");dest.mkdir(exist_ok=True)
 (dest/"coverage-report.json").write_text(json.dumps(out,indent=2)+"\n")
 print(json.dumps(out))
if __name__=="__main__":main()
