#!/usr/bin/env python3
"""Experiment 54: evidence classification of source availability, read-only."""
import datetime as dt,json,pathlib,sys
from experiment44_anchor_integrity_audit import validate
from experiment47_append_only_enforcement import check_chain
from experiment43_proposed_evidence_ledger import digest
OUT=pathlib.Path("/tmp/experiment54")
def utc(s):return dt.datetime.fromisoformat(s.replace("Z","+00:00"))
def main():
 OUT.mkdir(parents=True,exist_ok=True)
 report={"experiment":54,"status":"BLOCKED_PENDING","publication_gate":"BLOCKED","challenge_eligible":0,"ledger_modified":False}
 try:
  rows=json.loads(pathlib.Path("research/persistent-forecast-ledger.json").read_text())
  anchor=json.loads(pathlib.Path("research/experiment44-ledger-anchor.json").read_text())
  if len(rows)!=5:raise ValueError("unexpected ledger length")
  validate(rows[:4],anchor);check_chain(rows)
  findings=[]
  for row in rows[:4]:
   kickoff=utc(row["fixture_identity"][3])
   run_created=utc(row["github_server_run_created_at_utc"])
   uploaded=utc(row["github_artifact_uploaded_at_utc"])
   completed=utc(row["github_run_completed_at_utc"])
   if not (run_created<=uploaded<=completed<kickoff):raise ValueError("invalid workflow time ordering")
   first_seen=row.get("input_first_available_at_utc")
   if first_seen is not None:raise ValueError("unexpected unsupported first availability field")
   findings.append({"fixture_identity":row["fixture_identity"],
     "github_run_created_before_kickoff":True,"artifact_uploaded_before_kickoff":True,
     "source_snapshot_hashes_present":bool(row.get("training_input_snapshot_sha256")),
     "source_first_available_before_forecast_verified":False,
     "historical_result_completion_before_forecast_verified":False,
     "independent_source_receipt_present":False,
     "historical_cutoff_verified":False,
     "classification":"CUTOFF_UNVERIFIED_REVIEW_ONLY"})
  report.update(status="PREKICKOFF_RUN_TIMING_VERIFIED_SOURCE_AVAILABILITY_BLOCKED",
    original_fixtures=len(findings),synthetic_records_excluded=1,
    ledger_sha256=digest(rows),findings=findings,
    all_source_cutoffs_verified=False,model_data_leakage_excluded=False,
    missing_requirements=["Independently timestamp first availability of each source snapshot",
     "Prove each included result was final and available before forecast cutoff",
     "Reconstruct model inputs from immutable as-of snapshots"])
 except Exception as e:report.update(status="BLOCKED_AUDIT_ERROR",error=str(e))
 (OUT/"report.json").write_text(json.dumps(report,indent=2)+"\n")
 print(json.dumps({k:report.get(k) for k in ("status","original_fixtures","error")}))
 if report["status"]=="BLOCKED_AUDIT_ERROR":sys.exit(1)
if __name__=="__main__":main()
