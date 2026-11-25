"""Approval-bound fixed QA dispatch pilot. Production and protected research remain blocked."""
import argparse, hashlib, json, os, re, signal, subprocess, sys, time
from datetime import datetime, timezone
from pathlib import Path

ROOT=Path(__file__).resolve().parents[2]
HERE=Path(__file__).resolve()
sys.path.insert(0,str(ROOT/"research/local-producer-integration"))
from producers import FLAGS, encode, safe_read, history as producer_history, validate as validate_batch
KINDS={"cpu-probe":("CPU",15),"local-qa":("CPU",180),"gpu-qa":("GPU",0)}
TERMINAL={"PASSED","FAILED","CANCELLED","TIMED_OUT","BLOCKED_GPU"}
def need(x,m):
    if not x:raise ValueError(m)
def sha(x):return hashlib.sha256(x).hexdigest()
def hex64(x):return isinstance(x,str) and re.fullmatch(r"[a-f0-9]{64}",x) is not None
def rev(x):return isinstance(x,str) and re.fullmatch(r"[a-f0-9]{40}",x) is not None
def utc():return datetime.now(timezone.utc).isoformat(timespec="milliseconds").replace("+00:00","Z")
def ts(x):
    need(isinstance(x,str) and re.fullmatch(r"\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z",x),"Invalid timestamp")
    return datetime.fromisoformat(x.replace("Z","+00:00"))
def outside(p):
    p=Path(p).absolute()
    need(p.resolve()==p and p!=ROOT and ROOT not in p.parents and p not in ROOT.parents,"Separate operator-owned path required")
    return p
def load_plan(path,anchor):
    p=outside(path);raw=safe_read(p,65536)
    need(hex64(anchor) and sha(raw)==anchor,"Plan fingerprint mismatch")
    v=json.loads(raw)
    need(set(v)=={"kind","schemaVersion","revision","jobs"} and v["kind"]=="APPROVED_FIXED_QA_DISPATCH" and type(v["schemaVersion"]) is int and v["schemaVersion"]==1 and rev(v["revision"]),"Invalid plan")
    jobs=v["jobs"]
    need(isinstance(jobs,list) and 1<=len(jobs)<=6,"Invalid queue size")
    seen=set()
    for j in jobs:
        need(isinstance(j,dict) and set(j)=={"id","kind","backend","timeoutSeconds"} and isinstance(j["id"],str) and re.fullmatch(r"[a-z][a-z0-9-]{0,31}",j["id"]) and j["id"] not in seen and j["kind"] in KINDS,"Invalid or duplicate job")
        backend,timeout=KINDS[j["kind"]]
        need(j["backend"]==backend and type(j["timeoutSeconds"]) is int and j["timeoutSeconds"]==timeout,"Unapproved backend or resource budget")
        seen.add(j["id"])
    return p,raw,v
def checkout(revision):
    need(sys.platform=="linux","Linux pilot only; no Windows or GPU production routing")
    env={**os.environ,"GIT_OPTIONAL_LOCKS":"0"}
    def git(*args):return subprocess.check_output(["git",*args],cwd=ROOT,env=env,timeout=20)
    need(git("rev-parse","HEAD").decode().strip()==revision,"Checkout revision mismatch")
    need(not git("status","--porcelain","--untracked-files=all"),"Checkout not clean")
def artifact_path(root,id):return root/"outputs"/(id+".json")
def validate_result(raw,job,revision,root):
    v=json.loads(raw)
    if job["kind"]=="cpu-probe":
        need(v["kind"]=="FIXED_SYNTHETIC_RESOURCE_QA" and v["passed"]==1 and len(v["checks"])==1 and v["checks"][0]["probe"]=="known-answer" and v["checks"][0]["observed"]=="KNOWN_ANSWER_AND_LIMITS_MATCHED" and v["checks"][0]["status"]=="PASS","Probe contract failed")
        need(v["executionAuthorized"] is False and v["publicationGate"]=="BLOCKED" and v["dispatchAuthorized"] is False,"Probe gates")
    else:
        validate_batch(v)
        need(v["revision"]==revision and v["sequence"]==1 and v["status"]=="FIXED_QA_COMPLETE_RESEARCH_BLOCKED","Producer cycle failed")
        stored,_=producer_history(root/"outputs"/(job["id"]+"-store"))
        need(stored==v,"Producer receipt does not match persistent store")
    return v
def read_state(root,plan,anchor):
    root=outside(root)
    need(root.is_dir() and not root.is_symlink(),"Store missing")
    events=root/"events";outputs=root/"outputs"
    for p in (events,outputs):need(p.is_dir() and not p.is_symlink() and p.resolve()==p,"Unsafe store member")
    need(set(p.name for p in root.iterdir())<={"events","outputs",".lock"},"Unexpected store member")
    files=sorted(events.iterdir())
    need(len(files)<=2*len(plan["jobs"]),"Too many events")
    states={j["id"]:"PENDING" for j in plan["jobs"]};active=None;prior=None;last_time=None
    for i,p in enumerate(files,1):
        need(p.name==f"{i:03d}.json","Broken event sequence")
        raw=safe_read(p,65536);e=json.loads(raw)
        need(set(e)=={"sequence","previousSha256","planSha256","jobId","status","at","resultSha256"} and type(e["sequence"]) is int and e["sequence"]==i and e["previousSha256"]==prior and e["planSha256"]==anchor,"Event chain mismatch")
        time=ts(e["at"]);need(last_time is None or time>=last_time,"Clock moved backwards");last_time=time
        id=e["jobId"];need(id in states,"Unknown job");job=next(j for j in plan["jobs"] if j["id"]==id)
        status=e["status"]
        if status=="STARTED":
            need(active is None and states[id]=="PENDING" and job["backend"]=="CPU" and e["resultSha256"] is None,"Invalid start")
            need(id==next(k for k,v in states.items() if v=="PENDING"),"Out of order start")
            active=id
        elif status=="BLOCKED_GPU":
            need(active is None and states[id]=="PENDING" and job["backend"]=="GPU" and e["resultSha256"] is None,"Invalid GPU gate")
        elif status=="CANCELLED" and states[id]=="PENDING":
            need(active is None and e["resultSha256"] is None,"Invalid pending cancellation")
        else:
            need(active==id and states[id]=="STARTED" and status in TERMINAL-{"BLOCKED_GPU"},"Invalid terminal transition")
            active=None
            if status=="PASSED":
                result=safe_read(artifact_path(root,id))
                need(hex64(e["resultSha256"]) and sha(result)==e["resultSha256"],"Result fingerprint mismatch")
                validate_result(result,job,plan["revision"],root)
            else:need(e["resultSha256"] is None,"Failed work cannot advertise a result")
        states[id]=status;prior=sha(raw)
    return {"kind":"FIXED_QA_DISPATCH_STATUS","schemaVersion":1,"planSha256":anchor,"eventSha256":prior,
            "eventCount":len(files),"active":active,"jobs":[{**j,"status":states[j["id"]]} for j in plan["jobs"]],
            "status":"INTERRUPTED_OR_RUNNING_REVIEW_REQUIRED" if active else "PENDING" if "PENDING" in states.values() else "FIXED_QA_QUEUE_TERMINAL",
            "productionDispatchAuthorized":False,"gpuDispatchAuthorized":False,**FLAGS}
def emit(root,plan,anchor,state,id,status,result=None):
    e={"sequence":state["eventCount"]+1,"previousSha256":state["eventSha256"],"planSha256":anchor,"jobId":id,"status":status,"at":utc(),"resultSha256":result}
    data=encode(e)
    tmp=root/".lock"/"event.tmp";dest=root/"events"/f"{e['sequence']:03d}.json"
    need(not dest.exists(),"Event already exists")
    with tmp.open("xb") as f:f.write(data);f.flush();os.fsync(f.fileno())
    os.replace(tmp,dest)
    updated=read_state(root,plan,anchor)
    need(updated["eventSha256"]==sha(data),"Event persistence failed")
    return updated
def worker(kind,store,revision):
    need(sys.platform=="linux" and kind in ("cpu-probe","local-qa"),"Unapproved worker")
    allowed=os.sched_getaffinity(0);need(bool(allowed),"No available CPU")
    os.sched_setaffinity(0,{min(allowed)})
    need(len(os.sched_getaffinity(0))==1,"CPU affinity failed")
    if kind=="cpu-probe":
        args=[sys.executable,"-I","-B",str(ROOT/"research/unified-orchestration/synthetic-resource-qa.py"),"--probe","known-answer"]
    else:
        args=[sys.executable,"-I","-B",str(ROOT/"research/local-producer-integration/producers.py"),"--fixed-qa-only",store,revision]
    os.execv(sys.executable,args)
def run_worker(root,job,revision):
    store=root/"outputs"/(job["id"]+"-store")
    if job["kind"]=="local-qa":store.mkdir()
    env={k:v for k,v in os.environ.items() if k in ("PATH","HOME","LANG","LC_ALL","TMPDIR","TEMP","SystemRoot")}
    cmd=[sys.executable,"-I","-B",str(HERE),"--worker",job["kind"],str(store),revision]
    p=subprocess.Popen(cmd,cwd=ROOT,env=env,start_new_session=True,stdout=subprocess.PIPE,stderr=subprocess.PIPE)
    try:
        out,_=p.communicate(timeout=job["timeoutSeconds"])
        if p.returncode!=0 or not 0<len(out)<=2*1024*1024:return "FAILED",None
        validate_result(out,job,revision,root)
        dest=artifact_path(root,job["id"])
        with dest.open("xb") as f:f.write(out);f.flush();os.fsync(f.fileno())
        return "PASSED",sha(out)
    except subprocess.TimeoutExpired:return "TIMED_OUT",None
    except KeyboardInterrupt:return "CANCELLED",None
    except (ValueError,OSError,KeyError,TypeError):return "FAILED",None
    finally:
        # A trusted fixed process group, not an OS sandbox or a hard aggregate memory quota.
        try:os.killpg(p.pid,signal.SIGKILL)
        except ProcessLookupError:pass
        p.communicate()
def operate(root_path,plan_path,anchor,previous,action,job_id=None):
    root=outside(root_path);path,raw,plan=load_plan(plan_path,anchor)
    need(root.is_dir() and path!=root and root not in path.parents and path not in root.parents,"Plan must be separate")
    checkout(plan["revision"])
    lock=root/".lock";lock.mkdir()
    try:
        s=read_state(root,plan,anchor)
        need(s["eventSha256"]==previous,"Previous event anchor mismatch")
        need(s["active"] is None,"Interrupted or running job requires review; no automatic retry")
        pending=[j for j in s["jobs"] if j["status"]=="PENDING"]
        if not pending:return s
        if action=="cancel":
            need(job_id in [j["id"] for j in pending],"Not a pending job")
            return emit(root,plan,anchor,s,job_id,"CANCELLED")
        need(action=="advance","Unsupported action")
        job=pending[0]
        if job["backend"]=="GPU":return emit(root,plan,anchor,s,job["id"],"BLOCKED_GPU")
        s=emit(root,plan,anchor,s,job["id"],"STARTED")
        outcome,result=run_worker(root,job,plan["revision"])
        need(safe_read(path,65536)==raw,"Plan changed during execution")
        checkout(plan["revision"])
        need(read_state(root,plan,anchor)==s,"Event history changed")
        return emit(root,plan,anchor,s,job["id"],outcome,result)
    finally:
        tmp=lock/"event.tmp"
        if tmp.exists():tmp.unlink()
        lock.rmdir()
def initialize(root):
    root=outside(root);need(root.is_dir() and not list(root.iterdir()),"Empty existing store required")
    (root/"events").mkdir();(root/"outputs").mkdir()
if __name__=="__main__":
    try:
        if len(sys.argv)==5 and sys.argv[1]=="--worker":
            worker(*sys.argv[2:]);sys.exit(0)
        parser=argparse.ArgumentParser(description=__doc__)
        parser.add_argument("action",choices=["init","status","advance","cancel"])
        parser.add_argument("store");parser.add_argument("plan");parser.add_argument("plan_sha")
        parser.add_argument("previous",nargs="?");parser.add_argument("job",nargs="?")
        args=parser.parse_args()
        _,_,plan=load_plan(args.plan,args.plan_sha)
        if args.action=="init":initialize(args.store)
        if args.action in ("init","status"):v=read_state(args.store,plan,args.plan_sha)
        else:
            need(args.previous=="NEW" or hex64(args.previous),"Explicit previous event anchor required")
            def stop(*_):raise KeyboardInterrupt()
            signal.signal(signal.SIGTERM,stop)
            v=operate(args.store,args.plan,args.plan_sha,None if args.previous=="NEW" else args.previous,args.action,args.job)
        print(encode(v).decode(),end="")
    except (ValueError,OSError,KeyError,TypeError,subprocess.SubprocessError,KeyboardInterrupt) as e:
        print("Dispatch refused: "+type(e).__name__,file=sys.stderr);sys.exit(1)
