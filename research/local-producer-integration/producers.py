"""Local fixed QA producers; no real-data jobs, GPU dispatch or external requests."""
import hashlib,json,os,re,subprocess,sys,tempfile
from datetime import datetime,timezone
from pathlib import Path

ROOT=Path(__file__).resolve().parents[2]
LIMIT=2*1024*1024
MAX_CYCLES=20
FLAGS={"researchOnly":True,"modelValidation":"UNVALIDATED","publicationGate":"BLOCKED","executionAuthorized":False,"dispatchAuthorized":False,"validationAuthorized":False,"protectedEvaluationAuthorized":False,"sourceMutationAuthorized":False,"repairAuthorized":False,"accessAuthorized":False}
IDS=("catalogue","numerical","forecast","cpu","references")
def need(x,m):
    if not x:raise ValueError(m)
def sha(b):return hashlib.sha256(b).hexdigest()
def encode(x):return (json.dumps(x,sort_keys=True,indent=2,allow_nan=False)+"\n").encode()
def now():return datetime.now(timezone.utc).isoformat(timespec="milliseconds").replace("+00:00","Z")
def hex64(s):return isinstance(s,str) and re.fullmatch("[0-9a-f]{64}",s) is not None
def natural(x):return type(x) is int and x>=0
def safe_read(path,limit=LIMIT):
    need(path.is_file() and not path.is_symlink() and path.resolve()==path.absolute(),"Unsafe file")
    with path.open("rb") as f:
        b=f.read(limit+1)
    need(0<len(b)<=limit,"Invalid file length")
    return b
def store_root(path):
    p=Path(path).absolute()
    need(p.is_dir() and not p.is_symlink() and p.resolve()==p,"Unsafe store")
    need(p!=ROOT and ROOT not in p.parents and p not in ROOT.parents,"Separate operator-owned store required")
    return p
def validate(record):
    need(set(record)=={"kind","schemaVersion","sequence","previousSha256","revision","observedAt","producers","status",*FLAGS},"Unexpected receipt fields")
    need(record["kind"]=="LOCAL_FIXED_QA_PRODUCER_BATCH" and type(record["schemaVersion"]) is int and record["schemaVersion"]==1 and all(record[k]==v and type(record[k]) is type(v) for k,v in FLAGS.items()),"Unsafe receipt")
    need(type(record["sequence"]) is int and 1<=record["sequence"]<=MAX_CYCLES and (record["previousSha256"] is None or hex64(record["previousSha256"])),"Bad sequence")
    need(re.fullmatch("[0-9a-f]{40}",record["revision"]) is not None,"Bad revision")
    dt=datetime.fromisoformat(record["observedAt"].replace("Z","+00:00"))
    need(dt.tzinfo==timezone.utc and record["observedAt"].endswith("Z"),"Bad observation time")
    rows=record["producers"]
    need(isinstance(rows,list) and [x.get("id") for x in rows]==list(IDS),"Incomplete producers")
    for row in rows:
        need(set(row)=={"id","status","metrics","reportSha256"} and row["status"] in ("PASS","REVIEW_REQUIRED","FAILED"),"Bad producer state")
        m=row["metrics"];p=row["id"]
        if row["status"]=="FAILED":
            need(m=={} and row["reportSha256"] is None,"Failed producer must withhold metrics")
            continue
        need(hex64(row["reportSha256"]) and isinstance(m,dict) and all(natural(x) for x in m.values()),"Bad producer metrics")
        if p=="catalogue":need(set(m)=={"registered","target","qualified"} and m["target"]==1000 and m["registered"]<=1000 and m["qualified"]==0 and row["status"]=="PASS","Catalogue mismatch")
        elif p in ("numerical","forecast"):
            need(m=={"total":250,"passed":250,"methods":4 if p=="numerical" else 8} and row["status"]=="PASS","Campaign mismatch")
        elif p=="cpu":need(m=={"workloadsPassed":2,"benchmarkRows":4} and row["status"]=="PASS","CPU mismatch")
        else:need(set(m)=={"sources","claims","independentlyReviewed","rightsVerified"} and m["independentlyReviewed"]==m["rightsVerified"]==0 and row["status"]=="REVIEW_REQUIRED","Reference mismatch")
    need(record["status"]==("QA_FAILURE_REVIEW_REQUIRED" if any(x["status"]=="FAILED" for x in rows) else "FIXED_QA_COMPLETE_RESEARCH_BLOCKED"),"Contradictory receipt")
    return record
def history(path):
    root=store_root(path)
    files=sorted(root.iterdir())
    # A lock means an in-progress writer; only committed files are displayed. Pending files are not accepted.
    entries=[p for p in files if re.fullmatch(r"batch-\d{3}\.json",p.name)]
    need(len(entries)<=MAX_CYCLES,"Receipt limit exceeded")
    need(all(p.name==".writer-lock" or p in entries for p in files),"Unexpected state member")
    prior=None;last=None
    for i,p in enumerate(entries,1):
        need(p.name==f"batch-{i:03d}.json","Missing sequence")
        raw=safe_read(p,65536);r=validate(json.loads(raw))
        need(r["sequence"]==i and r["previousSha256"]==prior,"Broken receipt chain")
        if last:
            need(r["revision"]==last["revision"] and r["observedAt"]>=last["observedAt"],"Revision or time changed")
        prior=sha(raw);last=r
    return last,prior

def call(args,timeout=90):
    env={k:v for k,v in os.environ.items() if k not in ("NODE_OPTIONS","NODE_PATH","PYTHONPATH","PYTHONHOME","PYTHONSTARTUP")}
    p=subprocess.run(args,cwd=ROOT,env=env,stdout=subprocess.PIPE,stderr=subprocess.PIPE,timeout=timeout,check=False)
    need(p.returncode==0 and 0<len(p.stdout)<=LIMIT,"Fixed producer failed")
    return p.stdout
def node(path,*args):return call(["node",str(ROOT/path),*args])
def python(path,*args):return call([sys.executable,"-B",str(ROOT/path),*args])
def gate(r):
    need(r.get("researchOnly") is True and r.get("executionAuthorized") is False and r.get("validationAuthorized") is False and r.get("publicationGate")=="BLOCKED","Unsafe producer result")
def collect(revision):
    rows=[]
    def run(id,fn):
        try:
            status,m,raw=fn()
            rows.append({"id":id,"status":status,"metrics":m,"reportSha256":sha(raw)})
        except (ValueError,KeyError,TypeError,OSError,subprocess.SubprocessError):
            rows.append({"id":id,"status":"FAILED","metrics":{},"reportSha256":None})
    def catalogue():
        raw=node("research/mathematical-library/catalogue.mjs","summary")
        c=json.loads(raw)
        need(c["registered"]+c["remaining"]==c["target"]==1000 and c["qualified"]==0,"Catalogue counts")
        for k in ("byClassification","byStatus","byFamily","byBatch"):need(sum(c[k].values())==c["registered"],"Catalogue counts")
        return "PASS",{k:c[k] for k in ("registered","target","qualified")},raw
    def campaign(directory,count):
        raw=node(directory+"/campaign.mjs",revision);r=json.loads(raw);gate(r)
        with tempfile.TemporaryDirectory() as temp:
            p=Path(temp)/"campaign.json";p.write_bytes(raw)
            proof=python(directory+"/reference.py",str(p))
        v=json.loads(proof);gate(v)
        need(v["declaredCodeRevision"]==revision and r["declaredCodeRevision"]==revision and v["campaignSha256"]==r["campaignSha256"],"Campaign binding")
        need(v["counts"]=={"total":250,"passed":250,"failed":0,"distinctMethods":count},"Reference checks")
        return "PASS",{"total":250,"passed":250,"methods":count},encode({"campaignSha256":sha(raw),"referenceSha256":sha(proof)})
    def cpu():
        raw=python("research/scientific-compute/acceptance_receipt.py","cpu",revision)
        with tempfile.TemporaryDirectory() as temp:
            (Path(temp)/"local-cpu-receipt.json").write_bytes(raw)
            proof=python("research/scientific-compute/status.py",temp,revision,"json")
        v=json.loads(proof);gate(v)
        need(v["cpu"]["status"]=="RECORDED_LOCAL_PASS" and v["gpu"]["status"]=="NOT_SUPPLIED","CPU scope")
        return "PASS",{"workloadsPassed":v["cpu"]["passedWorkloads"],"benchmarkRows":v["cpu"]["benchmarkRows"]},encode({"receiptBytesSha256":sha(raw),"reviewBytesSha256":sha(proof)})
    def refs():
        raw=node("research/scientific-reference/dashboard.mjs",now()[:10],"json");v=json.loads(raw);gate(v)
        return "REVIEW_REQUIRED",{k:v["counts"][k] for k in ("sources","claims","independentlyReviewed","rightsVerified")},raw
    run("catalogue",catalogue)
    run("numerical",lambda:campaign("research/automated-mathematical-research",4))
    run("forecast",lambda:campaign("research/forecast-verification-synthetic",8))
    run("cpu",cpu)
    run("references",refs)
    return rows
def cycle(path,revision):
    root=store_root(path)
    need(re.fullmatch("[0-9a-f]{40}",revision) is not None,"Explicit checkout revision required")
    need(call(["git","rev-parse","HEAD"]).decode().strip()==revision,"Checkout revision mismatch")
    # No mutable tracked source; untracked code must be excluded by using a trusted checkout.
    def clean():
        p=subprocess.run(["git","status","--porcelain","--untracked-files=no"],cwd=ROOT,stdout=subprocess.PIPE,check=True,timeout=20)
        need(not p.stdout,"Tracked checkout changed")
    clean()
    lock=root/".writer-lock";lock.mkdir()
    try:
        previous,anchor=history(root)
        seq=1 if previous is None else previous["sequence"]+1
        need(seq<=MAX_CYCLES and (previous is None or previous["revision"]==revision),"Store full or revision changed")
        rows=collect(revision);clean()
        r=validate({"kind":"LOCAL_FIXED_QA_PRODUCER_BATCH","schemaVersion":1,"sequence":seq,"previousSha256":anchor,"revision":revision,"observedAt":now(),"producers":rows,
          "status":"QA_FAILURE_REVIEW_REQUIRED" if any(x["status"]=="FAILED" for x in rows) else "FIXED_QA_COMPLETE_RESEARCH_BLOCKED",**FLAGS})
        if previous:need(r["observedAt"]>=previous["observedAt"],"Clock moved backwards")
        need(history(root)==(previous,anchor),"State changed during execution")
        tmp=lock/"pending.json";dest=root/f"batch-{seq:03d}.json"
        need(not dest.exists(),"Receipt already exists")
        with tmp.open("xb") as f:
            f.write(encode(r));f.flush();os.fsync(f.fileno())
        os.replace(tmp,dest)
        need(history(root)==(r,sha(encode(r))),"Receipt verification failed")
        return r
    finally:
        # Never remove unknown files or take over an interrupted lock.
        tmp=lock/"pending.json"
        if tmp.exists():tmp.unlink()
        lock.rmdir()
if __name__=="__main__":
    try:
        need(len(sys.argv)==4 and sys.argv[1]=="--fixed-qa-only","Usage: producers.py --fixed-qa-only <store> <full-checkout-sha>")
        r=cycle(sys.argv[2],sys.argv[3]);print(encode(r).decode(),end="")
        sys.exit(1 if r["status"]=="QA_FAILURE_REVIEW_REQUIRED" else 0)
    except (ValueError,OSError,KeyError,TypeError,subprocess.SubprocessError) as e:
        print("Local fixed-QA cycle rejected: "+type(e).__name__,file=sys.stderr);sys.exit(2)
