"""Local fixed-workload acceptance receipt; no automatic hardware trust."""
import hashlib
import json
import re
import sys
from supervisor import supervise, verify_report
from benchmark_contract import verify_benchmark

def digest(value):
    return hashlib.sha256(json.dumps(value,sort_keys=True,separators=(",",":"),allow_nan=False).encode()).hexdigest()

def make_receipt(mode,revision,smoke,benchmark):
    if mode not in ("cpu","gpu") or not isinstance(revision,str) or not re.fullmatch(r"[0-9a-f]{40}",revision):
        raise ValueError("Explicit mode and full declared revision required")
    checks=[]
    for workload,report,verify in (("smoke",smoke,verify_report),("benchmark",benchmark,verify_benchmark)):
        valid=(isinstance(report,dict) and report.get("kind")=="SCIENTIFIC_COMPUTE_PROCESS_REPORT"
               and report.get("schemaVersion")==1 and report.get("mode")==mode and report.get("workload")==workload
               and report.get("status")=="PASS" and type(report.get("exitCode")) is int and report.get("exitCode")==0
               and isinstance(report.get("appliedResourcePolicy"),dict)
               and isinstance(report.get("report"),dict)
               and report["appliedResourcePolicy"]==report["report"].get("appliedResourcePolicy")
               and report.get("researchOnly") is True and report.get("publicationGate")=="BLOCKED"
               and report.get("executionAuthorized") is False and report.get("validationAuthorized") is False
               and verify(report.get("report"),mode))
        checks.append({"workload":workload,"status":"PASS" if valid else "FAIL","reportSha256":digest(report)})
    payload={"kind":"LOCAL_SYNTHETIC_HARDWARE_ACCEPTANCE_RECEIPT","schemaVersion":1,"declaredRevision":revision,
             "mode":mode,"checks":checks,"reports":{"smoke":smoke,"benchmark":benchmark},
             "status":"LOCAL_SYNTHETIC_CHECKS_PASSED" if all(c["status"]=="PASS" for c in checks) else "LOCAL_SYNTHETIC_CHECKS_FAILED",
             "hardwareIndependentlyVerified":False,"researchOnly":True,"publicationGate":"BLOCKED",
             "validationAuthorized":False,"executionAuthorized":False,
             "limitations":["Unsigned local receipt; revision and hardware claims are not independently authenticated.",
                            "CPU-only success is not GPU acceptance. No real workload, capacity, performance or production qualification."]}
    return {**payload,"receiptSha256":digest(payload)}

def verify_receipt(receipt):
    if not isinstance(receipt,dict):
        return False
    try:
        expected=make_receipt(receipt["mode"],receipt["declaredRevision"],receipt["reports"]["smoke"],receipt["reports"]["benchmark"])
        return digest(receipt)==digest(expected)
    except (KeyError,TypeError,ValueError,OverflowError):
        return False

if __name__=="__main__":
    if len(sys.argv)!=3 or sys.argv[1] not in ("cpu","gpu") or not re.fullmatch(r"[0-9a-f]{40}",sys.argv[2]):
        sys.exit("Usage: python -B acceptance_receipt.py cpu|gpu <full-declared-revision>")
    mode,revision=sys.argv[1:]
    result=make_receipt(mode,revision,supervise(mode),supervise(mode,workload="benchmark"))
    print(json.dumps(result,indent=2,allow_nan=False))
    sys.exit(0 if result["status"]=="LOCAL_SYNTHETIC_CHECKS_PASSED" else 1)
