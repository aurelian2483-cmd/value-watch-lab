#!/usr/bin/env python3
"""Experiment 46: reverify pinned Experiment 45 proof, never restamp."""
import base64,hashlib,json,pathlib,subprocess,sys
from experiment44_anchor_integrity_audit import main as verify44, OUT as OUT44
OUT=pathlib.Path("/tmp/experiment46")
PIN=pathlib.Path("research/experiment46-pinned-ots-evidence.json")
ANCHOR=pathlib.Path("research/experiment44-ledger-anchor.json")
def sha(raw):return hashlib.sha256(raw).hexdigest()
def main():
    OUT.mkdir(parents=True,exist_ok=True)
    report={"experiment":46,"status":"BLOCKED_PENDING","independent_timestamp_verified":False,
        "publication_gate":"BLOCKED","publishing_enabled":False,"challenge_eligible":0,
        "historical_cutoff_verified":False,"new_stamp_submitted":False}
    try:
        verify44()
        previous=json.loads((OUT44/"report.json").read_text())
        if previous.get("status")!="FIXED_COMMIT_ANCHOR_MATCHED_TAMPERING_REJECTED_REVIEW_ONLY":
            raise ValueError("Experiment 44 failed")
        pin=json.loads(PIN.read_text())
        witness=base64.b64decode(pin["witness_base64"],validate=True)
        proof=base64.b64decode(pin["proof_base64"],validate=True)
        if sha(witness)!=pin["witness_sha256"] or sha(proof)!=pin["proof_sha256"]:
            raise ValueError("pinned proof bytes hash mismatch")
        obj=json.loads(witness)
        if obj.get("ledger_sha256")!=previous.get("ledger_sha256") or obj.get("ledger_sha256")!=pin["ledger_sha256"]:
            raise ValueError("ledger identity mismatch")
        if obj.get("anchor_file_sha256")!=sha(ANCHOR.read_bytes()):
            raise ValueError("anchor file bytes mismatch")
        if pin.get("challenge_eligible")!=0 or pin.get("publication_gate")!="BLOCKED":
            raise ValueError("pin publication safety mismatch")
        target=OUT/"witness.json"
        target.write_bytes(witness)
        proof_file=OUT/"witness.json.ots"
        proof_file.write_bytes(proof)
        # Upgrade only the local working copy. Never replace the pinned original.
        upgrade=subprocess.run(["ots","upgrade",str(proof_file)],capture_output=True,text=True,timeout=180)
        report["upgrade_result"]={"code":upgrade.returncode,"stdout":upgrade.stdout[-1500:],
                                  "stderr":upgrade.stderr[-1500:]}
        verification=subprocess.run(["ots","verify",str(proof_file)],capture_output=True,text=True,timeout=180)
        report["verify_result"]={"code":verification.returncode,"stdout":verification.stdout[-1500:],
                                 "stderr":verification.stderr[-1500:]}
        report.update(original_proof_sha256=sha(proof),witness_sha256=sha(witness),
                      upgraded_proof_sha256=sha(proof_file.read_bytes()),
                      ledger_sha256=pin["ledger_sha256"])
        if verification.returncode==0 and "Success!" in verification.stdout:
            report["status"]="INDEPENDENT_TIMESTAMP_VERIFIED_REVIEW_ONLY"
            report["independent_timestamp_verified"]=True
        else:
            report["status"]="ORIGINAL_PROOF_INTACT_BITCOIN_ATTESTATION_PENDING"
        report["missing_requirements"]=["No independently verified historical first-availability timestamps",
            "No enforced persistent append-only ledger","No model validation or publication authority"]
    except Exception as exc:
        report.update(status="BLOCKED_AUDIT_ERROR",error=str(exc))
    finally:
        (OUT/"report.json").write_text(json.dumps(report,indent=2)+"\n")
        print(json.dumps({k:report.get(k) for k in ("status","independent_timestamp_verified","challenge_eligible","error")}))
    if report["status"]=="BLOCKED_AUDIT_ERROR":sys.exit(1)
if __name__=="__main__":main()
