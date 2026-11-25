"""Hosted fixed-QA dispatch and portable receipt export, with no PC dependency."""
import hashlib,json,os,subprocess,sys
from pathlib import Path
from datetime import datetime,timezone
ROOT=Path(__file__).resolve().parents[2]
sys.path.insert(0,str(ROOT/"research/approved-dispatch"))
from dispatch import load_plan,read_state,sha,encode,FLAGS
from producers import safe_read
def require(x,m):
    if not x:raise ValueError(m)
def clock():return datetime.now(timezone.utc).isoformat(timespec="milliseconds").replace("+00:00","Z")
def canonical(x):return json.dumps(x,sort_keys=True,separators=(",",":"),ensure_ascii=True,allow_nan=False).encode()
def digest(x):return hashlib.sha256(canonical(x)).hexdigest()
def call(action,store,plan,anchor,*args):
    raw=subprocess.check_output([sys.executable,"-B",str(ROOT/"research/approved-dispatch/dispatch.py"),action,str(store),str(plan),anchor,*args],cwd=ROOT,timeout=210)
    return json.loads(raw)
def export(store,plan_path,anchor,run_id):
    _,_,plan=load_plan(plan_path,anchor);s=read_state(store,plan,anchor)
    require(s["status"]=="FIXED_QA_QUEUE_TERMINAL","Queue not terminal")
    require([j["kind"] for j in s["jobs"]]==["cpu-probe","local-qa","gpu-qa"],"Unexpected hosted queue")
    require([j["status"] for j in s["jobs"]]==["PASSED","PASSED","BLOCKED_GPU"],"Hosted QA failed")
    batch=json.loads(safe_read(store/"outputs"/"local.json"))
    rows=batch["producers"]
    require(len(rows)==5 and rows[1]["metrics"]["passed"]==250 and rows[2]["metrics"]["passed"]==250,"Fixed cases mismatch")
    result={"kind":"HOSTED_FIXED_QA_RECEIPT","schemaVersion":1,"observedAt":clock(),"revision":plan["revision"],"runId":run_id,
      "worker":{"kind":"HOSTED_LINUX_CPU","homePcRequired":False,"gpuAvailable":False,"identityAttestation":"CI_CONTEXT_NOT_WORKER_SIGNATURE"},
      "queue":{"planSha256":anchor,"eventSha256":s["eventSha256"],"eventCount":s["eventCount"],"jobs":s["jobs"]},
      "producers":rows,"syntheticCases":500,"empiricallyQualifiedMethods":0,
      "optionalWorker":{"state":"NOT_CONNECTED","backend":"GPU","dispatchAuthorized":False},
      "productionDispatchAuthorized":False,"measurementFreshness":"UNKNOWN",**FLAGS}
    return {**result,"receiptSha256":digest(result)}
def run(root,run_id):
    require(os.environ.get("GITHUB_ACTIONS")=="true" and os.environ.get("GITHUB_REPOSITORY")=="aurelian2483-cmd/value-watch-lab","Hosted acceptance context required")
    require(os.environ.get("GITHUB_RUN_ID")==run_id and run_id.isascii() and run_id.isdecimal(),"Run ID mismatch")
    root=Path(root).absolute();root.mkdir(exist_ok=False)
    store=root/"store";store.mkdir()
    revision=subprocess.check_output(["git","rev-parse","HEAD"],cwd=ROOT,text=True).strip()
    plan=root/"plan.json";plan.write_bytes(encode({"kind":"APPROVED_FIXED_QA_DISPATCH","schemaVersion":1,"revision":revision,"jobs":[
       {"id":"probe","kind":"cpu-probe","backend":"CPU","timeoutSeconds":15},
       {"id":"local","kind":"local-qa","backend":"CPU","timeoutSeconds":180},
       {"id":"gpu","kind":"gpu-qa","backend":"GPU","timeoutSeconds":0}]}))
    anchor=sha(plan.read_bytes())
    s=call("init",store,plan,anchor)
    for _ in range(3):
        s=call("advance",store,plan,anchor,s["eventSha256"] or "NEW")
    require(call("status",store,plan,anchor)==s,"Restart status mismatch")
    r=export(store,plan,anchor,run_id)
    with (root/"hosted-receipt.json").open("xb") as f:f.write(encode(r))
    return r
if __name__=="__main__":
    try:
        require(len(sys.argv)==3,"Usage: hosted.py <new-output-directory> <run-id>")
        r=run(sys.argv[1],sys.argv[2])
        print("PASS hosted CPU queue; 500 fixed reference checks; optional GPU withheld; no home PC required")
        print("Receipt SHA-256: "+r["receiptSha256"])
    except (ValueError,OSError,KeyError,TypeError,subprocess.SubprocessError) as e:
        print("Hosted QA rejected: "+type(e).__name__,file=sys.stderr);sys.exit(1)
