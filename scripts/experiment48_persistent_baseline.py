#!/usr/bin/env python3
"""Experiment 48: guarded create-only persistent baseline, research branch only.
Create-only research write, triggered by an explicitly authorised workflow change.
"""
import base64,json,os,pathlib,subprocess,sys
from experiment44_anchor_integrity_audit import main as verify44,OUT as OUT44,validate
from experiment43_proposed_evidence_ledger import digest
from experiment39_training_inclusion_audit import canonical
REPO="aurelian2483-cmd/value-watch-lab"
BRANCH="research/prospective-100"
PATH="research/persistent-forecast-ledger.json"
OUT=pathlib.Path("/tmp/experiment48")
def gh(*args,input=None):
    p=subprocess.run(["gh","api",*args],input=input,text=True,capture_output=True,timeout=60)
    if p.returncode:raise ValueError("GitHub API rejected operation: "+p.stderr[-500:])
    return json.loads(p.stdout)
def main():
    OUT.mkdir(parents=True,exist_ok=True)
    report={"experiment":48,"status":"BLOCKED_PENDING","publication_gate":"BLOCKED",
            "challenge_eligible":0,"publishing_enabled":False,"persistent_ledger_created":False}
    try:
        if os.environ.get("GITHUB_REF")!="refs/heads/"+BRANCH or os.environ.get("GITHUB_EVENT_NAME") not in ("workflow_dispatch","push"):
            raise ValueError("research branch workflow trigger required")
        verify44()
        prior=json.loads((OUT44/"report.json").read_text())
        if prior.get("status")!="FIXED_COMMIT_ANCHOR_MATCHED_TAMPERING_REJECTED_REVIEW_ONLY":
            raise ValueError("upstream audit failed")
        ledger=json.loads((OUT44/"verified-ledger-review.json").read_text())
        anchor=json.loads(pathlib.Path("research/experiment44-ledger-anchor.json").read_text())
        validate(ledger,anchor)
        content=canonical(ledger)+b"\n"
        # Create-only: GitHub Contents API must reject an existing path without a blob SHA.
        # Check for existing ledger first; never update it in this workflow.
        p=subprocess.run(["gh","api","-X","GET",f"repos/{REPO}/contents/{PATH}","-f",f"ref={BRANCH}"],
                         text=True,capture_output=True,timeout=60)
        if p.returncode==0:
            raise ValueError("persistent ledger already exists; refusing overwrite")
        if "404" not in p.stderr and "Not Found" not in p.stderr:
            raise ValueError("cannot establish missing ledger path; refusing write")
        payload=json.dumps({"message":"Experiment 48: create-only reviewed baseline ledger",
            "branch":BRANCH,"content":base64.b64encode(content).decode()})
        result=gh("-X","PUT",f"repos/{REPO}/contents/{PATH}","--input","-",input=payload)
        if not result.get("commit",{}).get("sha"):
            raise ValueError("GitHub did not confirm baseline commit")
        report.update(status="PERSISTENT_RESEARCH_BASELINE_CREATED_REVIEW_ONLY",
            persistent_ledger_created=True,baseline_entries=len(ledger),
            baseline_ledger_sha256=digest(ledger),commit_sha=result["commit"]["sha"],
            content_blob_sha=result.get("content",{}).get("sha"),
            immutable_storage_verified=False,
            missing_requirements=["GitHub branch protections and independent append-only enforcement not verified",
             "No historical first-availability evidence or model validation"])
    except Exception as exc:
        report.update(status="BLOCKED_AUDIT_ERROR",error=str(exc))
    finally:
        (OUT/"report.json").write_text(json.dumps(report,indent=2)+"\n")
        print(json.dumps({k:report.get(k) for k in ("status","persistent_ledger_created","challenge_eligible","error")}))
    if report["status"]=="BLOCKED_AUDIT_ERROR":sys.exit(1)
if __name__=="__main__":main()
