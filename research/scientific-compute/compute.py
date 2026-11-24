"""Bounded scientific compute smoke tests; fixed synthetic data only."""
import hashlib
import json
import math
import os
import platform
import sys
import time

MAX_N = 128
SHAPES = (8, 32, 64)
TOLERANCE = 1e-10

def hardware():
    affinity = getattr(os, "sched_getaffinity", None)
    slots = len(affinity(0)) if affinity else os.cpu_count()
    return {"platform": platform.system(), "architecture": platform.machine(),
            "python": platform.python_version(), "reportedCpuSlots": slots,
            "gpu": {"status": "NOT_PROBED", "devices": None}}

def fixture(n):
    if type(n) is not int or n not in SHAPES or n > MAX_N:
        raise ValueError("Unsupported fixed synthetic shape")
    # A = I + J, B = 2I - J. A B = 2I + (1-n)J exactly.
    a = [[float(1 + (i == j)) for j in range(n)] for i in range(n)]
    b = [[float(2*(i == j)-1) for j in range(n)] for i in range(n)]
    expected = [[float(2*(i == j)+1-n) for j in range(n)] for i in range(n)]
    return a, b, expected

def cpu_matmul(a, b):
    n = len(a)
    if n not in SHAPES or len(b) != n or any(len(row)!=n for row in a+b):
        raise ValueError("Unsupported matrix shape")
    columns = list(zip(*b))
    return [[math.fsum(x*y for x,y in zip(row,col)) for col in columns] for row in a]

def check_result(result, expected):
    n = len(expected)
    if not isinstance(result,list) or len(result)!=n or any(not isinstance(r,list) or len(r)!=n for r in result):
        return {"status":"FAIL","maxAbsoluteError":None}
    errors=[]
    for r,e in zip(result,expected):
        for x,y in zip(r,e):
            if type(x) not in (int,float) or not math.isfinite(x):
                return {"status":"FAIL","maxAbsoluteError":None}
            errors.append(abs(x-y))
    error=max(errors)
    return {"status":"PASS" if error<=TOLERANCE else "FAIL","maxAbsoluteError":error}

def cpu_suite():
    rows=[]
    for n in SHAPES:
        a,b,expected=fixture(n)
        started=time.perf_counter()
        observed=cpu_matmul(a,b)
        elapsed=time.perf_counter()-started
        rows.append({"size":n,"precision":"float64","elapsedSeconds":elapsed,
                     "fixtureSha256":hashlib.sha256(json.dumps([a,b,expected],separators=(",",":")).encode()).hexdigest(),
                     **check_result(observed,expected)})
    return rows

def gpu_suite():
    # Explicit opt-in, optional locally installed CuPy. No installation, network or fallback.
    try:
        import cupy as cp
    except ImportError:
        return {"status":"BACKEND_UNAVAILABLE","deviceCount":None,"results":[]}
    try:
        count=int(cp.cuda.runtime.getDeviceCount())
        if count<1:
            return {"status":"NO_DEVICE","deviceCount":count,"results":[]}
        rows=[]
        with cp.cuda.Device(0):
            for n in SHAPES:
                a,b,expected=fixture(n)
                started=time.perf_counter()
                ga=cp.asarray(a,dtype=cp.float64)
                gb=cp.asarray(b,dtype=cp.float64)
                result=(ga @ gb).get().tolist()
                cp.cuda.get_current_stream().synchronize()
                elapsed=time.perf_counter()-started
                rows.append({"size":n,"precision":"float64","elapsedSeconds":elapsed,
                             **check_result(result,expected)})
        return {"status":"SYNTHETIC_GPU_SMOKE_PASSED" if all(r["status"]=="PASS" for r in rows) else "SYNTHETIC_GPU_SMOKE_FAILED",
                "deviceCount":count,"results":rows,"backendVersion":str(cp.__version__)}
    except Exception as error:
        return {"status":"BACKEND_ERROR","errorType":type(error).__name__,"deviceCount":None,"results":[]}

def run(mode):
    if mode not in ("cpu","gpu"):
        raise ValueError("Choose cpu or explicit gpu mode")
    cpu=cpu_suite()
    gpu=gpu_suite() if mode=="gpu" else {"status":"NOT_REQUESTED","deviceCount":None,"results":[]}
    passed=all(r["status"]=="PASS" for r in cpu) and (mode=="cpu" or gpu["status"]=="SYNTHETIC_GPU_SMOKE_PASSED")
    return {"kind":"GENERAL_SCIENTIFIC_COMPUTE_SMOKE","schemaVersion":1,"requestedMode":mode,
            "hardware":hardware(),"cpu":cpu,"gpu":gpu,"status":"PASS" if passed else "FAIL",
            "researchOnly":True,"publicationGate":"BLOCKED","validationAuthorized":False,"executionAuthorized":False,
            "limitations":["Fixed small synthetic matrices only; no predictive or real-data jobs.",
                           "GPU status is a local smoke result, not authorization for other workloads.",
                           "Elapsed times include different overheads; not a fair speed comparison.",
                           "No process memory quota, GPU memory quota, or driver compatibility certification."]}

if __name__=="__main__":
    if len(sys.argv)!=2 or sys.argv[1] not in ("cpu","gpu"):
        sys.exit("Usage: python -B compute.py cpu|gpu")
    report=run(sys.argv[1])
    print(json.dumps(report,indent=2,allow_nan=False))
    sys.exit(0 if report["status"]=="PASS" else 1)
