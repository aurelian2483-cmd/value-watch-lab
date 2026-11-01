#!/usr/bin/env python3
"""Experiment 45: research-only independent timestamp witness; fail closed."""
import hashlib,json,pathlib,subprocess,sys
from experiment44_anchor_integrity_audit import main as verify44, OUT as OUT44
OUT=pathlib.Path("/tmp/experiment45")
ANCHOR=pathlib.Path("research/experiment44-ledger-anchor.json")
def run(args):
    p=subprocess.run(args,capture_output=True,text=True,timeout=150,check=False)
    return {"code":p.returncode,"stdout":p.stdout[-2000:],"stderr":p.stderr[-2000:]}
def main():
    OUT.mkdir(parents=True,exist_ok=True)
    report={"experiment":45,"status":"BLOCKED_PENDING","publication_gate":"BLOCKED",
            "publishing_enabled":False,"challenge_eligible":0,
            "independent_timestamp_verified":False,"historical_cutoff_verified":False}
    try:
        verify44()
        previous=json.loads((OUT44/"report.json").read_text())
        if previous.get("status")!="FIXED_COMMIT_ANCHOR_MATCHED_TAMPERING_REJECTED_REVIEW_ONLY":
            raise ValueError("upstream integrity audit failed")
        anchor=json.loads(ANCHOR.read_text())
        if anchor.get("ledger_sha256")!=previous.get("ledger_sha256"):
            raise ValueError("fixed anchor mismatch")
        evidence={"schema":"experiment45-witness-v1","ledger_sha256":anchor["ledger_sha256"],
                  "anchor_file_sha256":hashlib.sha256(ANCHOR.read_bytes()).hexdigest(),
                  "record_type":"REVIEW_ONLY","challenge_eligible":0}
        target=OUT/"witness.json"
        target.write_text(json.dumps(evidence,sort_keys=True,separators=(",",":"))+"\n")
        report["witness_file_sha256"]=hashlib.sha256(target.read_bytes()).hexdigest()
        stamped=run(["ots","stamp",str(target)])
        report["stamp_result"]=stamped
        proof=OUT/"witness.json.ots"
        if stamped["code"]!=0 or not proof.is_file() or not proof.stat().st_size:
            raise ValueError("no usable calendar submission proof")
        report["proof_sha256"]=hashlib.sha256(proof.read_bytes()).hexdigest()
        verified=run(["ots","verify",str(proof)])
        report["verify_result"]=verified
        if verified["code"]==0 and "Success!" in verified["stdout"]:
            report["status"]="INDEPENDENT_TIMESTAMP_VERIFIED_REVIEW_ONLY"
            report["independent_timestamp_verified"]=True
        else:
            report["status"]="CALENDAR_SUBMITTED_PENDING_INDEPENDENT_VERIFICATION"
        report["missing_requirements"]=["No independent historical first-availability evidence",
            "No enforced append-only persistent ledger","Model validation and publication approval absent"]
    except Exception as exc:
        report.update(status="BLOCKED_AUDIT_ERROR",error=str(exc))
    finally:
        (OUT/"report.json").write_text(json.dumps(report,indent=2)+"\n")
        print(json.dumps({k:report.get(k) for k in ("status","independent_timestamp_verified","challenge_eligible","error")}))
    if report["status"]=="BLOCKED_AUDIT_ERROR":sys.exit(1)
if __name__=="__main__":main()
