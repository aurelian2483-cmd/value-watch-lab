"""Independent rational reference verification of all fixed campaign cases."""
import hashlib
import json
import math
import re
import sys
from fractions import Fraction
from pathlib import Path

FLAGS={"researchOnly":True,"executionAuthorized":False,"dispatchAuthorized":False,
       "validationAuthorized":False,"repairAuthorized":False,"accessAuthorized":False,
       "sourceMutationAuthorized":False,"modelValidation":"UNVALIDATED","publicationGate":"BLOCKED"}

def require(ok,msg):
    if not ok:raise ValueError(msg)

def fixtures():
    for i in range(64):
        k=i+1
        yield ("BIS-%03d"%k,"bisection",
               {"k":k,"denominator":17,"a":0,"b":5,"rootTolerance":1e-12,"maxIterations":100},
               Fraction(k,17),Fraction(1,10**12))
    for i in range(64):
        k=i+1;b=1+i%4;n=16+2*(i%16);a2=i%9-4;a1=i%7-3;a0=i%5-2
        # Independent exact sum of the endpoint and interior weighted values.
        f=lambda j: a2*Fraction(j*b,n)**2+a1*Fraction(j*b,n)+a0
        exact=Fraction(b,2*n)*(f(0)+f(n)+2*sum(f(j) for j in range(1,n)))
        yield ("TRAP-%03d"%k,"composite-trapezoid",
               {"a":0,"b":b,"n":n,"quadratic":a2,"linear":a1,"constant":a0},exact,Fraction(1,10**10))
    for i in range(64):
        k=i+1;b=1+i%4;n=16+2*(i%16);a3=i%11-5;a2=i%9-4;a1=i%7-3;a0=i%5-2
        exact=Fraction(a3*b**4,4)+Fraction(a2*b**3,3)+Fraction(a1*b*b,2)+a0*b
        yield ("SIMP-%03d"%k,"composite-simpson",
               {"a":0,"b":b,"n":n,"cubic":a3,"quadratic":a2,"linear":a1,"constant":a0},exact,Fraction(1,10**10))
    for i in range(58):
        k=i+1;a=(-1 if i%2 else 1)*(5+i%13);b=(-1 if i%3==0 else 1)*(1+i%3)
        # Check exact characteristic polynomial at declared eigenvalue.
        m00=Fraction(9*a+16*b,25);m01=Fraction(12*(a-b),25);m11=Fraction(16*a+9*b,25)
        require((m00-a)*(m11-a)-m01*m01==0 and abs(a)>abs(b),"Invalid analytic eigenpair")
        yield ("POWER-%03d"%k,"power-iteration-eigenvector",
               {"dominant":a,"secondary":b,"start":[1,1],"residualTolerance":1e-10,"maxIterations":200},Fraction(a),Fraction(1,10**9))

def number(x):
    require(type(x) in (int,float) and math.isfinite(x),"Invalid finite number")
    return Fraction(str(x))

def check(report):
    require(report.get("kind")=="FIXED_NUMERICAL_CAMPAIGN" and report.get("schemaVersion")==1 and report.get("campaign")=="numerical-known-answer-v1","Invalid campaign")
    require(all(report.get(k)==v and type(report.get(k))==type(v) for k,v in FLAGS.items()),"Unsafe research flags")
    require(re.fullmatch(r"[0-9a-f]{40}",report.get("declaredCodeRevision","")) is not None,"Invalid revision")
    cases=list(fixtures());rows=report["rows"]
    require(isinstance(rows,list) and len(rows)==len(cases)==250,"Incomplete campaign")
    require(len({r.get("fixtureSha256") for r in rows})==250,"Duplicate fixture hashes")
    result=[]
    counts={}
    for r,(ident,method,params,expected,tolerance) in zip(rows,cases):
        require(r.get("id")==ident and r.get("method")==method and r.get("input")==params and r.get("backend")=="CPU_NODE","Fixture identity mismatch")
        require(re.fullmatch(r"[0-9a-f]{64}",r.get("fixtureSha256","")) is not None,"Invalid fixture hash")
        require(number(r["tolerance"])==tolerance,"Tolerance changed")
        error=None;passed=False
        if r["value"] is not None and r["expected"] is not None:
            observed=number(r["value"])
            error=abs(observed-expected)
            declared=number(r["expected"])
            require(abs(declared-expected)<=Fraction(1,10**12),"Declared reference mismatch")
            reported=number(r["absoluteError"])
            require(abs(reported-abs(observed-declared))<=Fraction(1,10**12),"Error field mismatch")
            passed=error<=tolerance and r.get("converged") is True
            d=r["diagnostics"]
            if method=="bisection":passed=passed and 0<=number(d["bracketWidth"])<=Fraction(1,10**12) and type(d["iterations"]) is int and 0<=d["iterations"]<=100
            elif method=="power-iteration-eigenvector":passed=passed and 0<=number(d["residual"])<=Fraction(1,10**10) and type(d["iterations"]) is int and 0<=d["iterations"]<=200
            else:passed=passed and d["subintervals"]==params["n"]
        require(r["status"] in ("PASS","FAIL"),"Unknown source verdict")
        passed=passed and r["status"]=="PASS"
        result.append({"id":ident,"status":"PASS" if passed else "FAIL","referenceAbsoluteError":None if error is None else str(error)})
        c=counts.setdefault(method,{"total":0,"passed":0,"failed":0})
        c["total"]+=1;c["passed"]+=int(passed);c["failed"]+=int(not passed)
    total=sum(c["passed"] for c in counts.values())
    declared=sum(r["status"]=="PASS" for r in rows)
    require(report["counts"]=={"total":250,"passed":declared,"failed":250-declared,"distinctMethods":4},"Inconsistent counts")
    for m in counts:
        rs=[r for r in rows if r["method"]==m];p=sum(r["status"]=="PASS" for r in rs)
        require(report["byMethod"][m]=={"total":len(rs),"passed":p,"failed":len(rs)-p},"Inconsistent per-method counts")
    return {"kind":"INDEPENDENT_RATIONAL_CAMPAIGN_REVIEW","schemaVersion":1,
            "declaredCodeRevision":report["declaredCodeRevision"],"campaignSha256":report["campaignSha256"],
            "counts":{"total":250,"passed":total,"failed":250-total,"distinctMethods":4},
            "byMethod":counts,"rows":result,**FLAGS,
            "limitations":["Independent exact rational references; not independent hardware attestation or predictive qualification.",
                           "Campaign canonical hashes are independently verified by the Node contract checks, not this Python verifier."]}

if __name__=="__main__":
    try:
        require(len(sys.argv)==2,"Usage: reference.py <campaign-report>")
        p=Path(sys.argv[1]);require(p.is_file() and p.stat().st_size<=2*1024*1024,"Invalid report size")
        result=check(json.loads(p.read_text(encoding="utf-8")))
        print(json.dumps(result,indent=2,allow_nan=False))
        sys.exit(1 if result["counts"]["failed"] else 0)
    except (ValueError,KeyError,TypeError,OSError,ArithmeticError) as e:
        print(str(e),file=sys.stderr);sys.exit(2)
