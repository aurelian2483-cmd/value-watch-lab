"""Read-only scientific compute status adapter; never starts a workload."""
import html
import json
import re
import sys
from pathlib import Path
from acceptance_receipt import verify_receipt

MAX_RECEIPT_BYTES=1024*1024

def read_receipt(root,mode):
    path=root/f"local-{mode}-receipt.json"
    try:
        if path.is_symlink():
            return None,"UNSAFE_RECEIPT"
        if not path.exists():
            return None,"NOT_SUPPLIED"
        if not path.is_file() or path.stat().st_size>MAX_RECEIPT_BYTES:
            return None,"UNSAFE_RECEIPT"
        with path.open("rb") as stream:
            content=stream.read(MAX_RECEIPT_BYTES+1)
        if len(content)>MAX_RECEIPT_BYTES:
            return None,"UNSAFE_RECEIPT"
        def reject_constant(value):
            raise ValueError("Nonfinite JSON constant")
        def unique_object(pairs):
            obj={}
            for key,value in pairs:
                if key in obj:
                    raise ValueError("Duplicate JSON key")
                obj[key]=value
            return obj
        return json.loads(content,parse_constant=reject_constant,object_pairs_hook=unique_object),"READ"
    except (OSError,ValueError,UnicodeError,RecursionError):
        return None,"INVALID_RECEIPT"

def inspect_mode(receipt,read_state,mode,revision):
    base={"mode":mode,"status":read_state,"receiptSha256":None,"passedWorkloads":None,
          "benchmarkRows":None,"hostPlatform":None,"deviceName":None,"hardwareIndependentlyVerified":False}
    if read_state!="READ":
        return base
    try:
        if not isinstance(receipt,dict) or receipt.get("mode")!=mode or receipt.get("declaredRevision")!=revision:
            return {**base,"status":"MODE_OR_REVISION_MISMATCH"}
        if not verify_receipt(receipt):
            return {**base,"status":"INVALID_RECEIPT"}
        result={**base,"receiptSha256":receipt["receiptSha256"],
                "status":"RECORDED_LOCAL_PASS" if receipt["status"]=="LOCAL_SYNTHETIC_CHECKS_PASSED" else "RECORDED_LOCAL_FAILURE",
                "passedWorkloads":sum(c["status"]=="PASS" for c in receipt["checks"])}
        if result["status"]=="RECORDED_LOCAL_PASS":
            smoke=receipt["reports"]["smoke"]["report"]
            bench=receipt["reports"]["benchmark"]["report"]
            hardware=smoke.get("hardware")
            if isinstance(hardware,dict) and isinstance(hardware.get("platform"),str):
                result["hostPlatform"]=hardware["platform"][:80]
            result["benchmarkRows"]=len(bench["results"])
            if mode=="gpu":
                device=bench.get("gpu",{}).get("device")
                if isinstance(device,dict) and isinstance(device.get("name"),str):
                    result["deviceName"]=device["name"][:128]
        return result
    except (KeyError,TypeError,ValueError,OverflowError,AttributeError,RecursionError):
        return {**base,"status":"INVALID_RECEIPT"}

def read_status(directory,revision):
    if not isinstance(revision,str) or not re.fullmatch(r"[a-f0-9]{40}",revision):
        raise ValueError("Full expected revision required")
    root=Path(directory)
    if root.is_symlink() or not root.is_dir():
        raise ValueError("Expected existing nonsymlink artifact directory")
    root=root.resolve(strict=True)
    entries={}
    for mode in ("cpu","gpu"):
        receipt,state=read_receipt(root,mode)
        entries[mode]=inspect_mode(receipt,state,mode,revision)
    return {"kind":"SCIENTIFIC_COMPUTE_CONTROL_CENTRE_STATUS","schemaVersion":1,
            "declaredRevision":revision,"status":"CPU_LOCAL_EVIDENCE_AVAILABLE" if entries["cpu"]["status"]=="RECORDED_LOCAL_PASS" else "CPU_EVIDENCE_INCOMPLETE",
            "cpu":entries["cpu"],"gpu":entries["gpu"],"hardwareIndependentlyVerified":False,
            "researchOnly":True,"publicationGate":"BLOCKED","executionAuthorized":False,"validationAuthorized":False,
            "limitations":["Read-only inspection of unsigned local receipts; no hardware or revision authentication.",
                           "CPU and GPU receipts may come from different hosts; no cross-host speed comparison.",
                           "A GPU result, even if supplied, is a recorded local synthetic check, not independent hardware acceptance.",
                           "No workload execution, production integration or real-data qualification."]}

def render(status):
    def esc(value):
        return html.escape("Unavailable" if value is None else str(value),quote=True)
    parts=[]
    for mode in ("cpu","gpu"):
        row=status[mode]
        parts.append("<section><h2>"+mode.upper()+"</h2><p class='state'>"+esc(row["status"])+"</p><dl>"+
                     "".join("<dt>"+esc(label)+"</dt><dd>"+esc(row[key])+"</dd>" for label,key in
                        (("Passed workloads","passedWorkloads"),("Benchmark rows","benchmarkRows"),
                         ("Reported platform","hostPlatform"),("Reported device","deviceName"),
                         ("Receipt fingerprint","receiptSha256")))+"</dl></section>")
    return ("<!doctype html><html lang='en-GB'><head><meta charset='utf-8'><meta name='viewport' content='width=device-width,initial-scale=1'>"
            "<meta http-equiv='Content-Security-Policy' content=\"default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'\">"
            "<title>Scientific Compute Status</title><style>*{box-sizing:border-box}body{margin:0;background:#101827;color:#edf3fc;font:16px/1.5 system-ui,sans-serif}"
            "main{width:100%;max-width:1100px;min-width:0;margin:auto;padding:24px 16px;overflow-wrap:anywhere}h1,h2,dd,.state,code{overflow-wrap:anywhere}"
            ".grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(280px,100%),1fr));gap:16px}section{min-width:0;padding:16px;background:#19273b;border:1px solid #394b62;border-radius:10px}"
            "dt{color:#bfccdc}dd{margin:0 0 12px}.state{font-weight:700}</style></head><body><main><p>RESEARCH CONTROL CENTRE / SCIENTIFIC COMPUTE</p>"
            "<h1>Scientific CPU/GPU status</h1><p>PUBLICATION BLOCKED · NO EXECUTION AUTHORISED</p><p>Declared revision: <code>"+esc(status["declaredRevision"])+"</code></p><div class='grid'>"
            +"".join(parts)+"</div><h2>Limitations</h2><ul>"+"".join("<li>"+esc(x)+"</li>" for x in status["limitations"])+"</ul></main></body></html>")

if __name__=="__main__":
    if len(sys.argv)!=4 or sys.argv[3] not in ("json","html"):
        sys.exit("Usage: python -B status.py <artifact-directory> <revision> json|html")
    result=read_status(sys.argv[1],sys.argv[2])
    print(json.dumps(result,indent=2,allow_nan=False) if sys.argv[3]=="json" else render(result))
    sys.exit(0 if result["cpu"]["status"]=="RECORDED_LOCAL_PASS" and result["gpu"]["status"] in ("NOT_SUPPLIED","RECORDED_LOCAL_PASS") else 1)
