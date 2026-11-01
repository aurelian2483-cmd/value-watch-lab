#!/usr/bin/env python3
"""Experiment 52: fail-closed, read-only history protection and external witness audit."""
import json,os,pathlib,subprocess,sys
from experiment49_persistent_append_preflight import remote_file,REPO,BRANCH
from experiment44_anchor_integrity_audit import validate
from experiment47_append_only_enforcement import check_chain
from experiment43_proposed_evidence_ledger import digest
OUT=pathlib.Path("/tmp/experiment52")
APPEND="a7a74f83f59b09b5f644216bd5444c19fc02bd01"
def request(path):
 p=subprocess.run(["gh","api","-X","GET",f"repos/{REPO}/{path}"],capture_output=True,text=True,timeout=60)
 if p.returncode:return {"http_error":p.stderr[-500:],"verified":False}
 return json.loads(p.stdout)
def main():
 OUT.mkdir(parents=True,exist_ok=True)
 report={"experiment":52,"status":"BLOCKED_PENDING","publication_gate":"BLOCKED",
  "challenge_eligible":0,"publishing_enabled":False,"ledger_modified":False,
  "independent_immutability_verified":False}
 try:
  if os.environ.get("GITHUB_REF")!="refs/heads/"+BRANCH:raise ValueError("wrong branch")
  rows,blob,_=remote_file()
  anchor=json.loads(pathlib.Path("research/experiment44-ledger-anchor.json").read_text())
  if len(rows)!=5:raise ValueError("unexpected ledger length")
  validate(rows[:4],anchor)
  check_chain(rows)
  if rows[-1].get("record_type")!="SYNTHETIC_TEST_ONLY_NOT_FORECAST":raise ValueError("synthetic marker missing")
  branch=request("branches/"+BRANCH.replace("/","%2F"))
  protection=request("branches/"+BRANCH.replace("/","%2F")+"/protection")
  rules=request("rules/branches/"+BRANCH.replace("/","%2F"))
  commit=request("commits/"+APPEND)
  if commit.get("sha")!=APPEND:raise ValueError("append commit unavailable")
  parents=commit.get("parents",[])
  if len(parents)!=1:raise ValueError("unexpected parent count")
  branch_protected=branch.get("protected") is True
  protection_readable="http_error" not in protection
  protection_required=protection_readable and bool(protection.get("required_pull_request_reviews") or protection.get("required_status_checks"))
  rules_count=len(rules) if isinstance(rules,list) else None
  # Protection visibility is not proof that administrators cannot rewrite history.
  report.update(status="HISTORY_PROTECTION_REVIEW_COMPLETE_IMMUTABILITY_UNVERIFIED",
    append_commit_sha=APPEND,parent_commit_sha=parents[0]["sha"],
    ledger_entries=5,ledger_sha256=digest(rows),ledger_blob_sha=blob,
    branch_protected_flag=branch.get("protected"),
    protection_endpoint_readable=protection_readable,
    protection_controls_reported=protection_required,
    matching_ruleset_count=rules_count,
    ruleset_details_verified=False,
    open_timestamps_bitcoin_confirmation_verified=False,
    external_independent_witness_verified=False,
    force_push_prevention_verified=False,
    protections_access_limited=("http_error" in protection or "http_error" in rules),
    missing_requirements=["Independent externally anchored immutable evidence not verified",
     "Cannot establish effective force-push and administrator bypass protections from this read-only inspection",
     "Historical source timing and model validation remain unverified"])
 except Exception as exc:report.update(status="BLOCKED_AUDIT_ERROR",error=str(exc))
 finally:
  (OUT/"report.json").write_text(json.dumps(report,indent=2)+"\n")
  print(json.dumps({k:report.get(k) for k in ("status","branch_protected_flag","error")}))
 if report["status"]=="BLOCKED_AUDIT_ERROR":sys.exit(1)
if __name__=="__main__":main()
