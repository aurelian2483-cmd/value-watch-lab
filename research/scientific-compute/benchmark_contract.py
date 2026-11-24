"""Structural checks for the fixed repeated benchmark contract; not hardware attestation."""
import math
import statistics
from benchmark import cases, fingerprint, REPEATS, WARMUPS

def finite_nonnegative(value):
    return type(value) in (int,float) and math.isfinite(value) and value>=0

def verify_benchmark(report, mode):
    if mode not in ("cpu","gpu") or not isinstance(report,dict):
        return False
    if (report.get("kind")!="FIXED_SCIENTIFIC_BENCHMARK_REPORT" or report.get("schemaVersion")!=1
        or report.get("mode")!=mode or report.get("status")!="PASS"
        or report.get("researchOnly") is not True or report.get("publicationGate")!="BLOCKED"
        or report.get("executionAuthorized") is not False or report.get("validationAuthorized") is not False):
        return False
    gpu=report.get("gpu")
    if not isinstance(gpu,dict) or gpu.get("status")!=("MEASURED" if mode=="gpu" else "NOT_REQUESTED"):
        return False
    expected={}
    for name,n,a,b,e in cases():
        digest=fingerprint(a,b,e)
        expected[(name,n,"PYTHON_FSUM","float64")]=digest
        if mode=="gpu":
            for precision in ("float32","float64"):
                expected[(name,n,"CUPY",precision)]=digest
    rows=report.get("results")
    if not isinstance(rows,list) or len(rows)!=len(expected) or report.get("expectedRows")!=len(expected):
        return False
    seen=set()
    for row in rows:
        if not isinstance(row,dict):
            return False
        key=tuple(row.get(k) for k in ("case","size","backend","precision"))
        if any(type(v) not in (str,int) for v in key) or key in seen or key not in expected:
            return False
        seen.add(key)
        if (row.get("fixtureSha256")!=expected[key] or row.get("status")!="PASS"
            or row.get("warmups")!=WARMUPS or row.get("repeats")!=REPEATS):
            return False
        samples=row.get("samplesSeconds")
        checks=row.get("checks")
        if not isinstance(samples,list) or len(samples)!=REPEATS or not all(finite_nonnegative(x) for x in samples):
            return False
        if not all(finite_nonnegative(row.get(k)) for k in ("minSeconds","medianSeconds","maxSeconds")):
            return False
        if (row["minSeconds"],row["medianSeconds"],row["maxSeconds"])!=(min(samples),statistics.median(samples),max(samples)):
            return False
        if not isinstance(checks,list) or len(checks)!=WARMUPS+REPEATS:
            return False
        for check in checks:
            if (not isinstance(check,dict) or check.get("status")!="PASS"
                or not finite_nonnegative(check.get("maxAbsoluteError"))
                or not finite_nonnegative(check.get("maxScaledError"))
                or check["maxScaledError"]>1):
                return False
    return seen==set(expected)
