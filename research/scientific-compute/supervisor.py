"""Fixed synthetic compute subprocess supervisor. No arbitrary commands or datasets."""
import json
import hashlib
import math
import os
import platform
import subprocess
import sys
import time
from pathlib import Path

SHAPES = (8, 32, 64)
LIMIT_BYTES = 256 * 1024
ROOT = Path(__file__).resolve().parent

def limits():
    if sys.platform != "linux":
        return {"status":"UNSUPPORTED_PLATFORM","cpuSeconds":None,"addressSpaceBytes":None}
    try:
        import resource
        return {"status":"LINUX_RLIMIT_REQUESTED","cpuSeconds":10,"addressSpaceBytes":512*1024*1024}
    except ImportError:
        return {"status":"UNAVAILABLE","cpuSeconds":None,"addressSpaceBytes":None}

def apply_cpu_limits():
    import resource
    actual={}
    for name,key, value in (("cpuSeconds",resource.RLIMIT_CPU,10),("addressSpaceBytes",resource.RLIMIT_AS,512*1024*1024)):
        old_soft, old_hard = resource.getrlimit(key)
        cap = min(v for v in (value,old_soft,old_hard) if v != resource.RLIM_INFINITY)
        resource.setrlimit(key,(cap,cap))
        actual[name]=resource.getrlimit(key)[0]
    return {"status":"LINUX_RLIMIT_APPLIED",**actual}

def valid_rows(rows):
    from compute import fixture
    expected={size:hashlib.sha256(json.dumps(fixture(size),separators=(',',':')).encode()).hexdigest() for size in SHAPES}
    return isinstance(rows,list) and len(rows)==len(SHAPES) and all(
        isinstance(row,dict) and row.get("size")==size and row.get("precision")=="float64"
        and row.get("fixtureSha256")==expected[size]
        and type(row.get("elapsedSeconds")) in (int,float) and math.isfinite(row["elapsedSeconds"]) and row["elapsedSeconds"]>=0
        and row.get("status")=="PASS" and type(row.get("maxAbsoluteError")) in (int,float)
        and math.isfinite(row["maxAbsoluteError"]) and 0<=row["maxAbsoluteError"]<=1e-10
        for row,size in zip(rows,SHAPES))

def verify_report(report,mode):
    if mode not in ("cpu","gpu") or not isinstance(report,dict) or report.get("kind")!="GENERAL_SCIENTIFIC_COMPUTE_SMOKE" or report.get("schemaVersion")!=1:
        return False
    if report.get("requestedMode")!=mode or report.get("researchOnly") is not True or report.get("publicationGate")!="BLOCKED" or report.get("executionAuthorized") is not False or report.get("validationAuthorized") is not False:
        return False
    gpu=report.get("gpu")
    return (report.get("status")=="PASS" and valid_rows(report.get("cpu"))
            and isinstance(gpu,dict) and
            (gpu.get("status")=="NOT_REQUESTED" and gpu.get("results")==[] and gpu.get("deviceCount") is None if mode=="cpu" else
             gpu.get("status")=="SYNTHETIC_GPU_SMOKE_PASSED" and valid_rows(gpu.get("results"))
             and type(gpu.get("deviceCount")) is int and gpu["deviceCount"]>0))

def supervise(mode="cpu",timeout=30,workload="smoke"):
    if workload not in ("smoke","benchmark"):
        raise ValueError("Unsupported workload")
    if mode not in ("cpu","gpu") or type(timeout) not in (int,float) or not math.isfinite(timeout) or not 1<=timeout<=120:
        raise ValueError("Invalid fixed workload or timeout")
    policy=limits() if mode=="cpu" else {"status":"NOT_APPLIED_GPU_RUNTIME","cpuSeconds":None,"addressSpaceBytes":None}
    command=[sys.executable,"-I","-B",str(ROOT/"supervisor.py"),"--child",mode,workload]
    started=time.monotonic()
    outcome={"status":"FAIL","reason":"UNKNOWN","report":None,"exitCode":None}
    try:
        # Fixed trusted child emits bounded JSON. Timeout kills and waits for the direct child.
        result=subprocess.run(command,cwd=ROOT,stdin=subprocess.DEVNULL,capture_output=True,
                              timeout=timeout,check=False,shell=False)
        outcome["exitCode"]=result.returncode
        if len(result.stdout)>LIMIT_BYTES or len(result.stderr)>LIMIT_BYTES:
            outcome["reason"]="OUTPUT_TOO_LARGE"
        else:
            try:
                report=json.loads(result.stdout)
                outcome["report"]=report if isinstance(report,dict) else None
                if workload=="benchmark":
                    from benchmark_contract import verify_benchmark
                    valid=verify_benchmark(report,mode)
                else:
                    valid=verify_report(report,mode)
                applied=report.get("appliedResourcePolicy") if isinstance(report,dict) else None
                if policy["status"]=="LINUX_RLIMIT_REQUESTED":
                    valid=valid and isinstance(applied,dict) and applied.get("status")=="LINUX_RLIMIT_APPLIED" and all(
                        type(applied.get(k)) is int and 0<applied[k]<=policy[k] for k in ("cpuSeconds","addressSpaceBytes"))
                else:
                    valid=valid and applied==policy
                if result.returncode==0 and valid:
                    outcome.update(status="PASS",reason="FIXED_SMOKE_PASSED" if workload=="smoke" else "FIXED_BENCHMARK_PASSED")
                else:
                    outcome["reason"]="CHILD_FAILED_OR_INVALID_EVIDENCE"
            except (ValueError,UnicodeError,TypeError,OverflowError,RecursionError):
                outcome["reason"]="INVALID_CHILD_OUTPUT"
    except subprocess.TimeoutExpired:
        outcome["reason"]="TIMEOUT"
    except OSError:
        outcome["reason"]="PROCESS_START_FAILED"
    return {"kind":"SCIENTIFIC_COMPUTE_PROCESS_REPORT","schemaVersion":1,"mode":mode,"workload":workload,
            "timeoutSeconds":timeout,"elapsedSeconds":time.monotonic()-started,
            "resourcePolicy":policy,"appliedResourcePolicy":outcome["report"].get("appliedResourcePolicy") if isinstance(outcome["report"],dict) else None,**outcome,"researchOnly":True,"publicationGate":"BLOCKED",
            "executionAuthorized":False,"validationAuthorized":False,
            "limitations":["Separate process is not a security sandbox; timeout controls direct child only.",
                           "Linux CPU mode applies address-space and CPU-time limits; GPU and other platforms do not.",
                           "Output length is checked after capture, not a streaming memory quota.",
                           "Only fixed synthetic smoke and repeated benchmarks; no GPU or production qualification."]}

def child(mode,workload="smoke"):
    if workload not in ("smoke","benchmark"):
        raise ValueError("Unsupported workload")
    if mode not in ("cpu","gpu"):
        raise ValueError("Invalid child mode")
    policy=limits() if mode=="cpu" else {"status":"NOT_APPLIED_GPU_RUNTIME","cpuSeconds":None,"addressSpaceBytes":None}
    if policy["status"]=="LINUX_RLIMIT_REQUESTED":
        policy=apply_cpu_limits()
    # Isolated interpreter omits script directory; explicitly load this trusted local module.
    sys.path.insert(0,str(ROOT))
    if workload=="benchmark":
        from benchmark import run
    else:
        from compute import run
    report=run(mode)
    report["appliedResourcePolicy"]=policy
    print(json.dumps(report,allow_nan=False))
    return 0 if report["status"]=="PASS" else 1

if __name__=="__main__":
    if len(sys.argv)==4 and sys.argv[1]=="--child":
        sys.exit(child(sys.argv[2],sys.argv[3]))
    if len(sys.argv) not in (2,3) or sys.argv[1] not in ("cpu","gpu"):
        sys.exit("Usage: python -B supervisor.py cpu|gpu [smoke|benchmark]")
    report=supervise(sys.argv[1],workload=sys.argv[2] if len(sys.argv)==3 else "smoke")
    print(json.dumps(report,indent=2,allow_nan=False))
    sys.exit(0 if report["status"]=="PASS" else 1)
