#!/usr/bin/env python3
"""Read-only inspection of effective research branch rules."""
import json,os,pathlib,subprocess,sys
from experiment49_persistent_append_preflight import remote_file,REPO,BRANCH
from experiment44_anchor_integrity_audit import validate
from experiment47_append_only_enforcement import check_chain
OUT=pathlib.Path("/tmp/experiment53")
def main():
 OUT.mkdir(parents=True,exist_ok=True)
 report={"experiment":53,"status":"PENDING","challenge_eligible":0,"publication_gate":"BLOCKED","ledger_modified":False}
 try:
  if os.getenv("GITHUB_REF")!="refs/heads/"+BRANCH:raise ValueError("unexpected branch")
  rows,blob,_=remote_file()
  anchor=json.loads(pathlib.Path("research/experiment44-ledger-anchor.json").read_text())
  if len(rows)!=5:raise ValueError("unexpected ledger size")
  validate(rows[:4],anchor);check_chain(rows)
  p=subprocess.run(["gh","api","-X","GET",f"repos/{REPO}/rules/branches/{BRANCH}"],capture_output=True,text=True,timeout=60)
  if p.returncode:raise ValueError("effective rules endpoint unavailable: "+p.stderr[-300:])
  rules=json.loads(p.stdout)
  if not isinstance(rules,list):raise ValueError("unexpected rules response")
  types={r.get("type") for r in rules if isinstance(r,dict)}
  required={"deletion","non_fast_forward","required_linear_history"}
  missing=sorted(required-types)
  report.update(status="RULES_VERIFIED" if not missing else "RULES_INCOMPLETE",
    ledger_entries=5,ledger_blob_sha=blob,rule_types=sorted(str(t) for t in types),
    missing_rules=missing,independent_immutability_verified=False)
 except Exception as e:report.update(status="AUDIT_ERROR",error=str(e))
 (OUT/"report.json").write_text(json.dumps(report,indent=2)+"\n")
 print(json.dumps(report))
 if report["status"]=="AUDIT_ERROR":sys.exit(1)
if __name__=="__main__":main()
