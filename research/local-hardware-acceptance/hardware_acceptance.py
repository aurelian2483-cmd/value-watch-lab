"""Single-launch, fixed local hardware diagnostics. No installation, live data or producer dispatch."""
import argparse
import hashlib
import json
import os
import platform
import re
import shutil
import stat
import subprocess
import sys
import tempfile
import time
import zipfile
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent
COMPUTE_REV = "7c95c0bce1c428c0d9d24fd230f009304c289837"
PHASE3_REV = "b2b7cfe832c8cacd1777ce992717f2d8a40390b8"
PREVIEW_SHA = "0c1b27627f422b3534b47181cecfa804edbf2baa5a573f4a05edca5365b295c9"
FLAGS = {"researchOnly": True, "executionAuthorized": False,
         "dispatchAuthorized": False, "repairAuthorized": False,
         "accessAuthorized": False, "sourceMutationAuthorized": False,
         "validationAuthorized": False, "modelValidation": "UNVALIDATED",
         "publicationGate": "BLOCKED", "measurementFreshness": "UNKNOWN"}
FILES = {"hardware_acceptance.py", "preview-check.mjs", "Run-Hardware-Acceptance.cmd",
         "START-HERE.txt", "phase3-preview.zip"} | {
             "compute/"+x for x in ("compute.py","benchmark.py","benchmark_contract.py",
                                     "hardware_inventory.py","supervisor.py","acceptance_receipt.py","status.py")}
MAX = 4*1024*1024

def require(ok, message):
    if not ok:
        raise ValueError(message)

def sha(raw):
    return hashlib.sha256(raw).hexdigest()

def read(path, limit=MAX):
    require(path.is_file() and not path.is_symlink() and path.resolve()==path.absolute(), "Unsafe package file")
    require(0<path.stat().st_size<=limit, "Invalid file size")
    raw=path.read_bytes()
    require(0<len(raw)<=limit,"Invalid file bytes")
    return raw

def verify_package():
    raw=read(ROOT/"manifest.json",65536)
    m=json.loads(raw)
    require(m.get("kind")=="LOCAL_HARDWARE_ACCEPTANCE_PACKAGE" and m.get("schemaVersion")==1
            and m.get("computeRevision")==COMPUTE_REV and m.get("phase3Revision")==PHASE3_REV
            and m.get("publicationGate")=="BLOCKED" and m.get("executionAuthorized") is False,
            "Unexpected package manifest")
    rows=m["files"]
    require(len(rows)==len(FILES) and {r["path"] for r in rows}==FILES,"Package inventory mismatch")
    for row in rows:
        b=read(ROOT/row["path"])
        require(len(b)==row["bytes"] and sha(b)==row["sha256"],"Package fingerprint mismatch")
    require(sha(read(ROOT/"phase3-preview.zip"))==PREVIEW_SHA,"Pinned preview fingerprint mismatch")
    return sha(raw)

def process(args, timeout, cwd):
    start=time.monotonic()
    try:
        p=subprocess.run(args,cwd=cwd,stdin=subprocess.DEVNULL,capture_output=True,
                         timeout=timeout,check=False,shell=False)
        if len(p.stdout)>MAX or len(p.stderr)>MAX:
            return {"status":"FAILED","reason":"OUTPUT_TOO_LARGE","elapsedSeconds":time.monotonic()-start},None
        return {"status":"RETURNED","exitCode":p.returncode,"elapsedSeconds":time.monotonic()-start},p.stdout
    except subprocess.TimeoutExpired:
        return {"status":"FAILED","reason":"TIMEOUT_DIRECT_CHILD_KILLED","elapsedSeconds":time.monotonic()-start},None
    except OSError:
        return {"status":"UNAVAILABLE","reason":"PROCESS_START_FAILED","elapsedSeconds":time.monotonic()-start},None

def compute_mode(mode):
    from acceptance_receipt import verify_receipt
    outcome, raw=process([sys.executable,"-B",str(ROOT/"compute"/"acceptance_receipt.py"),mode,COMPUTE_REV],120,ROOT/"compute")
    if raw is None:
        return outcome,None
    try:
        receipt=json.loads(raw)
        require(receipt.get("declaredRevision")==COMPUTE_REV and receipt.get("mode")==mode and verify_receipt(receipt),"Receipt contract rejected")
        passed=receipt["status"]=="LOCAL_SYNTHETIC_CHECKS_PASSED" and outcome["exitCode"]==0
        return {**outcome,"status":"PASS" if passed else "NOT_PASSED","receiptSha256":receipt["receiptSha256"]},receipt
    except (ValueError,TypeError,KeyError,OverflowError,AttributeError):
        return {**outcome,"status":"FAILED","reason":"INVALID_RECEIPT"},None

def nvidia_inventory():
    tool=shutil.which("nvidia-smi")
    if not tool:
        return {"status":"UNAVAILABLE","reason":"NVIDIA_SMI_NOT_FOUND"}
    p,raw=process([tool,"--query-gpu=name,driver_version,memory.total,memory.used,utilization.gpu",
                   "--format=csv,noheader,nounits"],10,ROOT)
    if raw is None or p.get("exitCode")!=0:
        return {"status":"UNAVAILABLE","reason":"NVIDIA_SMI_QUERY_FAILED"}
    try:
        import csv
        rows=[]
        for fields in csv.reader(raw.decode("utf-8").splitlines()):
            require(len(fields)==5 and len(rows)<16,"Invalid NVIDIA inventory")
            name,driver,*values=[x.strip() for x in fields]
            require(0<len(name)<=128 and 0<len(driver)<=32,"Invalid GPU metadata")
            nums=[int(x) if re.fullmatch(r"\d+",x) else None for x in values]
            rows.append({"name":name,"driverVersion":driver,"totalMemoryMiB":nums[0],
                         "usedMemoryMiB":nums[1],"utilizationPercent":nums[2]})
        require(bool(rows),"No reported device")
        return {"status":"REPORTED","devices":rows,"expectedFamilyReported":any("RTX 4070" in r["name"].upper() for r in rows)}
    except (ValueError,UnicodeError):
        return {"status":"UNAVAILABLE","reason":"INVALID_NVIDIA_INVENTORY"}

def preview_check():
    node=shutil.which("node")
    if not node:
        return {"status":"NOT_TESTED","reason":"NODE_22_NOT_FOUND"}
    raw=read(ROOT/"phase3-preview.zip")
    require(sha(raw)==PREVIEW_SHA,"Preview hash mismatch")
    with tempfile.TemporaryDirectory(prefix="sky-hardware-preview-") as tmp:
        target=Path(tmp).resolve()
        with zipfile.ZipFile(ROOT/"phase3-preview.zip") as z:
            manifest=json.loads(z.read("manifest.json"))
            rows=manifest["files"]
            expected={r["path"] for r in rows}|{"manifest.json"}
            require(len(rows)==19 and len(z.infolist())==20 and set(z.namelist())==expected,"Preview inventory mismatch")
            for info in z.infolist():
                p=target/info.filename
                require(p.resolve().is_relative_to(target) and not info.is_dir() and stat.S_IFMT(info.external_attr>>16)==stat.S_IFREG
                        and 0<info.file_size<=MAX,"Unsafe preview member")
                b=z.read(info)
                if info.filename!="manifest.json":
                    row=next(r for r in rows if r["path"]==info.filename)
                    require(sha(b)==row["sha256"] and len(b)==row["bytes"],"Preview member mismatch")
                p.parent.mkdir(parents=True,exist_ok=True)
                with p.open("xb") as f:f.write(b)
        outcome,data=process([node,str(ROOT/"preview-check.mjs"),str(target)],30,target)
        if data is None or outcome.get("exitCode")!=0:
            return {**outcome,"status":"FAILED","reason":"PREVIEW_HTTP_CHECK_FAILED"}
        try:
            report=json.loads(data)
            require(report.get("kind")=="LOCAL_PHASE3_HTTP_ACCEPTANCE" and report.get("status")=="PASS"
                    and report.get("metadataReviews")==7 and report.get("contractReviews")==6
                    and report.get("filesUnchanged") is True and report.get("dispatchRejected") is True
                    and report.get("executionAuthorized") is False and report.get("publicationGate")=="BLOCKED",
                    "Preview report rejected")
            return report
        except (ValueError,TypeError,AttributeError):
            return {"status":"FAILED","reason":"INVALID_PREVIEW_REPORT"}

def recovery_check():
    first,_=process([sys.executable,"-I","-B","-c","import time; time.sleep(30)"],1,ROOT)
    second,raw=process([sys.executable,"-I","-B","-c","print(sum(i*i for i in range(1,101)))"],5,ROOT)
    passed=first.get("reason")=="TIMEOUT_DIRECT_CHILD_KILLED" and second.get("exitCode")==0 and raw and raw.strip()==b"338350"
    return {"status":"PASS" if passed else "FAILED","timedOutChild":first,"subsequentFixedCheck":second,
            "limitation":"Direct fixed child termination and subsequent execution only; not GPU cancellation or a Windows Job Object quota."}

def comparisons(receipt):
    if not receipt or receipt["status"]!="LOCAL_SYNTHETIC_CHECKS_PASSED":
        return []
    rows=receipt["reports"]["benchmark"]["report"]["results"]
    cpu={r["fixtureSha256"]:r for r in rows if r["backend"]=="PYTHON_FSUM"}
    return [{"case":r["case"],"size":r["size"],"precision":r["precision"],
             "fixtureSha256":r["fixtureSha256"],"cpuFloat64MedianSeconds":cpu[r["fixtureSha256"]]["medianSeconds"],
             "gpuMedianSeconds":r["medianSeconds"],"cpuReferencePassed":cpu[r["fixtureSha256"]]["status"]=="PASS",
             "gpuReferencePassed":r["status"]=="PASS"}
            for r in rows if r["backend"]=="CUPY" and r["fixtureSha256"] in cpu]

def main():
    ap=argparse.ArgumentParser()
    ap.add_argument("--cpu-only",action="store_true",help="Explicitly omit GPU checks (hosted CI)")
    ap.add_argument("--output",type=Path)
    args=ap.parse_args()
    require(sys.version_info>=(3,10),"Python 3.10 or newer required")
    manifest_hash=verify_package()
    sys.path.insert(0,str(ROOT/"compute"))
    from hardware_inventory import cpu_inventory
    out=(args.output or ROOT/("Hardware-Acceptance-"+datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%S%fZ"))).absolute()
    require(out.parent.is_dir() and out.parent.resolve()==out.parent,"Unsafe output parent")
    out.mkdir()
    print("Checking local CPU and memory...",flush=True)
    cpu,cr=compute_mode("cpu")
    if cr is not None:(out/"local-cpu-receipt.json").write_text(json.dumps(cr,indent=2,allow_nan=False),encoding="utf-8")
    gpu={"status":"NOT_REQUESTED"};gr=None;nvidia={"status":"NOT_REQUESTED"}
    if not args.cpu_only:
        print("Checking NVIDIA inventory and existing CUDA/CuPy runtime...",flush=True)
        nvidia=nvidia_inventory()
        gpu,gr=compute_mode("gpu")
        if gr is not None:(out/"local-gpu-receipt.json").write_text(json.dumps(gr,indent=2,allow_nan=False),encoding="utf-8")
    print("Checking process recovery and Phase 3 read-only HTTP integration...",flush=True)
    recovery=recovery_check()
    try: preview=preview_check()
    except (ValueError,OSError,KeyError,TypeError,zipfile.BadZipFile):preview={"status":"FAILED","reason":"PREVIEW_INTEGRITY_OR_EXTRACTION_FAILED"}
    core=all(x.get("status")=="PASS" for x in (cpu,recovery,preview))
    windows=platform.system()=="Windows"
    gpu_pass=gpu.get("status")=="PASS"
    result={"kind":"LOCAL_HARDWARE_ACCEPTANCE_REPORT","schemaVersion":1,
            "observedAt":datetime.now(timezone.utc).isoformat(),"computeRevision":COMPUTE_REV,"phase3Revision":PHASE3_REV,
            "packageManifestSha256":manifest_hash,"platform":platform.system(),"windowsHost":windows,
            "hardware":cpu_inventory(),"cpu":cpu,"gpu":gpu,"nvidiaInventory":nvidia,"recovery":recovery,"phase3":preview,
            "numericalComparisons":comparisons(gr),"gpuRequested":not args.cpu_only,
            "status":"LOCAL_FIXED_CHECKS_PASSED" if core and (args.cpu_only or gpu_pass) else "REVIEW_REQUIRED",
            "hardwareIndependentlyVerified":False,"productionHardwareAccepted":False,
            "limitations":["Unsigned local observations only; no independent hardware attestation.",
                           "CPU and GPU timings are not a fair speedup comparison; Python reference versus GPU transfers.",
                           "Memory is sampled, not peak utilization or an enforced GPU quota.",
                           "No GPU scheduler, GPU cancellation, browser visual inspection or maximum-load stress acceptance.",
                           "No software installation, driver changes, network fetching or real research tasks."],**FLAGS}
    with (out/"hardware-acceptance-report.json").open("x",encoding="utf-8") as f:
        json.dump(result,f,indent=2,allow_nan=False)
    print("Result: "+result["status"])
    print("Report: "+str(out/"hardware-acceptance-report.json"))
    return 0 if result["status"]=="LOCAL_FIXED_CHECKS_PASSED" else 1

if __name__=="__main__":
    try: sys.exit(main())
    except (ValueError,OSError,KeyError,TypeError) as e:
        print("Acceptance package could not complete: "+type(e).__name__,file=sys.stderr)
        sys.exit(2)
