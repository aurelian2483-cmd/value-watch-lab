"""Independent Decimal and rational oracles for fixed synthetic forecast diagnostics."""
from decimal import Decimal, localcontext
from fractions import Fraction
from pathlib import Path
import json
import math
import re
import sys

METHODS=("brier","log-loss","rps","auc-roc","ece","pinball","interval-score","calibration-in-large")
FLAGS={"researchOnly":True,"executionAuthorized":False,"dispatchAuthorized":False,"validationAuthorized":False,
       "repairAuthorized":False,"accessAuthorized":False,"sourceMutationAuthorized":False,
       "modelValidation":"UNVALIDATED","publicationGate":"BLOCKED"}

def need(ok,msg):
    if not ok:raise ValueError(msg)

def dec(x):
    return Decimal(x.numerator)/Decimal(x.denominator) if isinstance(x,Fraction) else Decimal(str(x))

def cases():
    for method in METHODS:
        for i in range(26 if method=="calibration-in-large" else 32):
            k=i+1
            if method in ("brier","log-loss","rps"):
                x=Fraction(k,64);z=(1-x)/2
                p=[[x,z,z],[Fraction(1,4),Fraction(1,2),Fraction(1,4)],[z,x,z]]
                y=[i%3,(i+1)%3,(i+2)%3]
                data={"p":[[float(v) for v in row] for row in p],"y":y}
                if method=="brier":
                    exact=sum(1-2*row[label]+sum(v*v for v in row) for row,label in zip(p,y))/3
                elif method=="log-loss":
                    product=math.prod(row[label] for row,label in zip(p,y))
                    exact=-dec(product).ln()/3
                else:
                    exact=sum((sum(row[:j+1])-int(label<=j))**2 for row,label in zip(p,y) for j in (0,1))/3
            elif method=="auc-roc":
                scores=[k,16,16,32,0,24];labels=[1,0,1,0,0,1]
                data={"scores":scores,"labels":labels}
                pairs=[Fraction(1) if a>b else Fraction(1,2) if a==b else Fraction(0)
                       for a,y in zip(scores,labels) if y==1 for b,z in zip(scores,labels) if z==0]
                exact=sum(pairs)/len(pairs)
            elif method=="ece":
                p=[Fraction(0),Fraction(k,64),Fraction(1,4),Fraction(1,2),Fraction(3,4),Fraction(1)]
                y=[0,i%2,1,0,1,1];bins=4 if i%2 else 8
                data={"p":[float(v) for v in p],"y":y,"bins":bins}
                parts=[]
                for b in range(bins):
                    group=[(v,label) for v,label in zip(p,y) if Fraction(b,bins)<=v
                           and (v<Fraction(b+1,bins) or b==bins-1 and v==1)]
                    if group:
                        parts.append(abs(sum(v for v,_ in group)-sum(label for _,label in group)))
                exact=sum(parts)/len(p)
            elif method=="pinball":
                q=Fraction(k,4);y=i%7-2;tau=Fraction(1+i%7,8)
                data={"q":float(q),"y":y,"tau":float(tau)}
                exact=max(tau*(y-q),(1-tau)*(q-y))
            elif method=="interval-score":
                l=Fraction(k,4);u=l+2;y=i%11-1;alpha=Fraction(1+i%3,8)
                data={"l":float(l),"u":float(u),"y":y,"alpha":float(alpha)}
                exact=u-l+(2/alpha)*(l-y) if y<l else u-l+(2/alpha)*(y-u) if y>u else u-l
            else:
                p=Fraction(k,32);success=1+i%25;q=Fraction(success,32)
                data={"p":[float(p)]*32,"y":[int(j<success) for j in range(32)]}
                exact=dec(q*(1-p)/(p*(1-q))).ln()
            yield method+"-%03d"%k,method,data,dec(exact)

def verify(report):
    need(report.get("kind")=="SYNTHETIC_FORECAST_VERIFICATION_CAMPAIGN" and report.get("schemaVersion")==1,"Unexpected report kind")
    need(all(report.get(k)==v and type(report.get(k)) is type(v) for k,v in FLAGS.items()),"Unsafe research flags")
    need(report.get("catalogueSourceRevision")=="0b4773cd00f009416587aee6e95f058fb53026e5","Catalogue reference changed")
    need(re.fullmatch(r"[0-9a-f]{40}",report.get("declaredCodeRevision","")) is not None and re.fullmatch(r"[0-9a-f]{64}",report.get("campaignSha256","")) is not None,"Invalid revision or campaign hash")
    rows=report["rows"];need(isinstance(rows,list) and len(rows)==250,"Incomplete case list")
    need(len({r["fixtureSha256"] for r in rows})==250,"Duplicate fixture hash")
    result=[];counts={m:{"total":0,"passed":0,"failed":0} for m in METHODS}
    with localcontext() as ctx:
        ctx.prec=60
        for r,(ident,method,data,expected) in zip(rows,cases()):
            need(r["id"]==ident and r["method"]==method and r["input"]==data and r["tolerance"]==1e-9,"Case identity or tolerance changed")
            need(re.fullmatch(r"[0-9a-f]{64}",r["fixtureSha256"]) is not None,"Invalid fixture hash")
            need(r["status"] in ("COMPUTED_PENDING_REFERENCE","FAILED_COMPUTATION"),"Invalid compute status")
            v=r["value"]
            need((v is None and r["status"]=="FAILED_COMPUTATION") or (type(v) in (int,float) and math.isfinite(v) and r["status"]=="COMPUTED_PENDING_REFERENCE"),"Inconsistent computation status")
            error=None if v is None else abs(dec(v)-expected)
            ok=error is not None and error<=Decimal("1e-9")
            result.append({"id":ident,"method":method,"expected":str(expected),"absoluteError":None if error is None else str(error),"status":"PASS" if ok else "FAIL"})
            c=counts[method];c["total"]+=1;c["passed"]+=int(ok);c["failed"]+=int(not ok)
    computed=sum(r["status"]=="COMPUTED_PENDING_REFERENCE" for r in rows)
    need(report["counts"]=={"total":250,"computed":computed,"failed":250-computed,"distinctMethods":8},"Invalid computed counts")
    passed=sum(c["passed"] for c in counts.values())
    return {"kind":"SYNTHETIC_FORECAST_INDEPENDENT_REFERENCE_REVIEW","schemaVersion":1,"declaredCodeRevision":report["declaredCodeRevision"],
            "campaignSha256":report["campaignSha256"],"counts":{"total":250,"passed":passed,"failed":250-passed,"distinctMethods":8},
            "byMethod":counts,"rows":result,**FLAGS,
            "limitations":["Independent rational and Decimal references for fixed synthetic cases only.","No empirical validity, ranking of predictive models, or real-data execution."]}

if __name__=="__main__":
    try:
        need(len(sys.argv)==2,"Usage: reference.py <campaign.json>")
        p=Path(sys.argv[1]);need(p.is_file() and p.stat().st_size<=2*1024*1024,"Invalid input size")
        result=verify(json.loads(p.read_text(encoding="utf-8")))
        print(json.dumps(result,indent=2,allow_nan=False))
        sys.exit(1 if result["counts"]["failed"] else 0)
    except (ValueError,KeyError,TypeError,OSError,ArithmeticError) as e:
        print(str(e),file=sys.stderr);sys.exit(2)
