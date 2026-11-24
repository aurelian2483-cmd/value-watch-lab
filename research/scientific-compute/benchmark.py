"""Repeated fixed numerical benchmarks; no external workloads or datasets."""
import hashlib
import json
import math
import statistics
import sys
import time
from fractions import Fraction
from compute import cpu_matmul, fixture, SHAPES
from hardware_inventory import cpu_inventory, gpu_inventory

REPEATS=3
WARMUPS=1
PRECISIONS=("float32","float64")
TOLERANCES={"float32":(2e-5,2e-6),"float64":(1e-11,1e-12)}

def cases():
    for size in SHAPES:
        a,b,e=fixture(size)
        yield "structured",size,a,b,e
    # Dyadic values, signs and unequal scales. Independent exact rational oracle.
    n=8
    a=[[Fraction(((i*7+j*3)%17)-8, 2**(j%4)) for j in range(n)] for i in range(n)]
    b=[[Fraction(((i*5+j*11)%19)-9, 2**(i%5)) for j in range(n)] for i in range(n)]
    e=[[sum((a[i][k]*b[k][j] for k in range(n)),Fraction(0)) for j in range(n)] for i in range(n)]
    yield "mixed-sign-dyadic",n,*([[float(x) for x in row] for row in m] for m in (a,b,e))

def fingerprint(a,b,e):
    return hashlib.sha256(json.dumps([a,b,e],separators=(",",":"),allow_nan=False).encode()).hexdigest()

def assess(result,expected,precision):
    atol,rtol=TOLERANCES[precision]
    if not isinstance(result,list) or len(result)!=len(expected):
        return {"status":"FAIL","maxAbsoluteError":None,"maxScaledError":None}
    absolute=[]
    scaled=[]
    for row,ref in zip(result,expected):
        if not isinstance(row,list) or len(row)!=len(ref):
            return {"status":"FAIL","maxAbsoluteError":None,"maxScaledError":None}
        for x,y in zip(row,ref):
            if type(x) not in (int,float) or not math.isfinite(x):
                return {"status":"FAIL","maxAbsoluteError":None,"maxScaledError":None}
            err=abs(x-y)
            absolute.append(err)
            scaled.append(err/(atol+rtol*abs(y)))
    return {"status":"PASS" if max(scaled)<=1 else "FAIL","maxAbsoluteError":max(absolute),"maxScaledError":max(scaled)}

def measure(operation,expected,precision):
    # Warmup and every timed repetition must satisfy the predetermined oracle.
    timings=[]
    errors=[]
    for index in range(WARMUPS+REPEATS):
        start=time.perf_counter_ns()
        result=operation()
        elapsed=(time.perf_counter_ns()-start)/1e9
        errors.append(assess(result,expected,precision))
        if index>=WARMUPS:
            timings.append(elapsed)
    passed=all(e["status"]=="PASS" for e in errors)
    return {"status":"PASS" if passed else "FAIL","warmups":WARMUPS,"repeats":REPEATS,
            "samplesSeconds":timings,"medianSeconds":statistics.median(timings),
            "minSeconds":min(timings),"maxSeconds":max(timings),
            "checks":errors}

def run(mode):
    if mode not in ("cpu","gpu"):
        raise ValueError("Unsupported fixed mode")
    rows=[]
    hardware=cpu_inventory()
    gpu={"status":"NOT_REQUESTED"}
    for name,n,a,b,e in cases():
        rows.append({"case":name,"size":n,"backend":"PYTHON_FSUM","precision":"float64",
                     "fixtureSha256":fingerprint(a,b,e),
                     "timingScope":"host matrix operation and result materialization",
                     **measure(lambda:cpu_matmul(a,b),e,"float64")})
    if mode=="gpu":
        try:
            import cupy as cp
            if cp.cuda.runtime.getDeviceCount()<1:
                gpu={"status":"NO_DEVICE"}
            else:
                with cp.cuda.Device(0):
                    gpu={"status":"MEASURED","backendVersion":str(cp.__version__),"device":gpu_inventory(cp.cuda.runtime)}
                    for name,n,a,b,e in cases():
                        for precision in PRECISIONS:
                            dtype=getattr(cp,precision)
                            def operation():
                                result=(cp.asarray(a,dtype=dtype)@cp.asarray(b,dtype=dtype)).get().tolist()
                                cp.cuda.get_current_stream().synchronize()
                                return result
                            rows.append({"case":name,"size":n,"backend":"CUPY","precision":precision,
                                         "fixtureSha256":fingerprint(a,b,e),
                                         "timingScope":"host-to-device transfer, matrix operation, device-to-host transfer and result materialization",
                                         **measure(operation,e,precision)})
        except ImportError:
            gpu={"status":"BACKEND_UNAVAILABLE"}
        except Exception as error:
            gpu={"status":"BACKEND_ERROR","errorType":type(error).__name__}
    expected_count=4 if mode=="cpu" else 12
    passed=len(rows)==expected_count and all(r["status"]=="PASS" for r in rows) and (mode=="cpu" or gpu["status"]=="MEASURED")
    return {"kind":"FIXED_SCIENTIFIC_BENCHMARK_REPORT","schemaVersion":1,"mode":mode,
            "status":"PASS" if passed else "FAIL","hardware":hardware,"gpu":gpu,"results":rows,
            "expectedRows":expected_count,"researchOnly":True,"publicationGate":"BLOCKED",
            "executionAuthorized":False,"validationAuthorized":False,
            "limitations":["Fixed small matrices only; not a general workload or stress test of maximum capacity.",
                           "CPU reference is Python fsum, not an optimized BLAS baseline; no speedup or backend selection claim.",
                           "Timings are local wall-clock samples including materialization and, on GPU, transfers; no cross-host comparison.",
                           "GPU float32 and float64 have separate predefined tolerances. Physical GPU acceptance remains required."]}

if __name__=="__main__":
    if len(sys.argv)!=2 or sys.argv[1] not in ("cpu","gpu"):
        sys.exit("Usage: python -B benchmark.py cpu|gpu")
    result=run(sys.argv[1])
    print(json.dumps(result,indent=2,allow_nan=False))
    sys.exit(0 if result["status"]=="PASS" else 1)
