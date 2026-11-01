#!/usr/bin/env python3
"""Experiment 60: fail-closed prospective challenge readiness audit, read-only.
The output is a diagnostic checklist, never an authorization to publish or count.
"""
import datetime as dt,hashlib,json,os,pathlib,sys
from experiment44_anchor_integrity_audit import validate
from experiment47_append_only_enforcement import check_chain

ROOT=pathlib.Path(__file__).resolve().parents[1]
OUT=pathlib.Path("/tmp/experiment60")
LEDGER=ROOT/"research/persistent-forecast-ledger.json"
ANCHOR=ROOT/"research/experiment44-ledger-anchor.json"
MODEL=ROOT/"scripts/model_integration_smoke.py"
PIPELINE=ROOT/"scripts/experiment23_pipeline.py"

def sha(path):return hashlib.sha256(path.read_bytes()).hexdigest()
def gate(name,passed,reason,evidence):
 return {"gate":name,"passed":bool(passed),"reason":reason,"evidence":evidence}
def main():
 OUT.mkdir(parents=True,exist_ok=True)
 report={"experiment":60,"mode":"READ_ONLY_FAIL_CLOSED","status":"BLOCKED_PENDING",
 "challenge_eligible":0,"publication_gate":"BLOCKED","challenge_progress":"0/100",
 "persistent_ledger_modified":False,"model_validated":False,
 "independent_immutability_verified":False}
 try:
  if os.environ.get("GITHUB_REF")!="refs/heads/research/prospective-100":
   raise ValueError("wrong GitHub branch; fail closed")
  rows=json.loads(LEDGER.read_bytes())
  anchor=json.loads(ANCHOR.read_bytes())
  if not isinstance(rows,list) or len(rows)!=5:raise ValueError("unexpected ledger size")
  validate(rows[:4],anchor)
  check_chain(rows)
  if any(row.get("publication_gate")!="BLOCKED" or row.get("challenge_eligible")!=0 for row in rows):
   raise ValueError("ledger publication contract violation")
  if any(row.get("historical_cutoff_verified") is not False for row in rows[:4]):
   raise ValueError("review-only cutoff status changed")
  if rows[-1].get("record_type")!="SYNTHETIC_TEST_ONLY_NOT_FORECAST":
   raise ValueError("expected synthetic fifth entry missing")
  code=PIPELINE.read_text()
  model_code=MODEL.read_text()
  if "commit_enabled" not in code or "PROSPECTIVE_RESEARCH_UNVALIDATED" not in code:
   raise ValueError("pipeline review-only contract no longer recognizable")
  if "fit(" not in model_code or "predict(" not in model_code:
   raise ValueError("model implementation unavailable")
  gates=[
   gate("Ledger chain and anchored baseline",True,
    "Five review-only records structurally reconciled; does not establish immutable external witnessing",
    {"ledger_sha256":sha(LEDGER),"ledger_entries":len(rows)}),
   gate("Pre-kickoff GitHub receipts for four original records",all(
     dt.datetime.fromisoformat(row["github_artifact_uploaded_at_utc"].replace("Z","+00:00")) <
     dt.datetime.fromisoformat(row["fixture_identity"][3].replace("Z","+00:00"))
     for row in rows[:4]),"Existing GitHub artifact receipts precede listed kickoffs; not proof of source availability",
     {"original_records":4}),
   gate("Independent proof of training-data as-of availability",False,
    "Existing snapshots have hashes and retrieval timestamps, not independently corroborated first-availability/completion times",
    {"historical_cutoff_verified":[row["historical_cutoff_verified"] for row in rows[:4]]}),
   gate("Genuinely new prospective forecast commitment",False,
    "Four historical review-only records and one synthetic entry are ineligible",{"eligible_records":0}),
   gate("Independently witnessed, unalterable publication receipt",False,
    "GitHub branch protection and history do not independently establish immutable pre-kickoff receipts",{}),
   gate("Fixture identity and schedule as-of cutoff independently established",False,
    "Fixture time identity is recorded but original data freshness is not independently established",{}),
   gate("Time-stamped, independently verified Sky Bet offer",False,
    "Closing historical market odds do not document a contemporaneous executable Sky Bet offer",{}),
   gate("Prospective probability calibration and accuracy",False,
    "Retrospective exploratory scores cannot validate future predictions or betting value",{}),
   gate("Positive EV evidence against a reliable market baseline",False,
    "Experiment 59 market benchmark was not beaten in point estimates; independently defensible positive EV absent",{}),
   gate("No data contamination from training/post-event updates",False,
    "Frozen dataset replay is reproducible, but historical first-availability proof is missing",{})
  ]
  blockers=[g["gate"] for g in gates if not g["passed"]]
  report.update(status="READINESS_AUDIT_COMPLETE_GATES_BLOCKED",gates=gates,
   passed_gates=sum(g["passed"] for g in gates),total_gates=len(gates),
   blocking_gates=blockers,blocker_count=len(blockers),
   code_sha256={"model":sha(MODEL),"pipeline":sha(PIPELINE)},
   prospective_challenge_authorized=False,
   next_engineering_priority="Build a new-future-fixture capture pipeline with independently timestamped as-of data, model and odds snapshots, plus append-only third-party witnessed receipts before kickoff.",
   limitations=["This is a strict readiness audit, not a proof of impossibility",
   "No historical tests or synthetic entries qualify for the 100-prediction challenge",
   "Every publication and challenge gate remains disabled"])
 except Exception as exc:report.update(status="BLOCKED_AUDIT_ERROR",error=str(exc))
 (OUT/"report.json").write_text(json.dumps(report,indent=2)+"\n")
 print(json.dumps({k:report.get(k) for k in ("status","passed_gates","blocker_count","error")}))
 if report["status"]=="BLOCKED_AUDIT_ERROR":sys.exit(1)
if __name__=="__main__":main()
