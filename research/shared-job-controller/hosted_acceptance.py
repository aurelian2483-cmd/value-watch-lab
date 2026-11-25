"""Actual hosted fixed-QA CPU dispatch through the loopback TLS controller.

CI-only acceptance harness. No remote connections, arbitrary commands, GPU
execution, production scheduling or protected evaluation.
"""
import hashlib
import json
import os
import secrets
import subprocess
import sys
import tempfile
import threading
from pathlib import Path
from controller import Controller, need
from service import Service
from transport import LoopbackServer, WorkerClient

ROOT=Path(__file__).resolve().parents[2]
DISPATCH=ROOT/"research/approved-dispatch/dispatch.py"
FIXED={"probe":("cpu-probe",15),"local":("local-qa",180)}

def sha(raw):
    return hashlib.sha256(raw).hexdigest()

def run_lease(root,lease,revision):
    need(type(lease) is dict and set(lease)=={"id","revision","kind","token","expires"},"Invalid lease")
    job=lease["id"]
    need(job in FIXED and lease["revision"]==revision,"Unapproved job or revision")
    kind,timeout=FIXED[job]
    need(lease["kind"]==kind,"Job kind mismatch")
    work=root/job
    work.mkdir()
    store=work/"store"
    store.mkdir()
    plan=work/"plan.json"
    raw=json.dumps({"kind":"APPROVED_FIXED_QA_DISPATCH","schemaVersion":1,"revision":revision,
                    "jobs":[{"id":job,"kind":kind,"backend":"CPU","timeoutSeconds":timeout}]},
                   sort_keys=True,separators=(",",":")).encode()
    plan.write_bytes(raw)
    anchor=sha(raw)
    def call(action,*args):
        return json.loads(subprocess.check_output([sys.executable,"-B",str(DISPATCH),action,str(store),str(plan),anchor,*args],cwd=ROOT,timeout=210))
    initial=call("init")
    need(initial["eventSha256"] is None,"Unexpected initial event")
    final=call("advance","NEW")
    need(final["status"]=="FIXED_QA_QUEUE_TERMINAL" and final["eventCount"]==2,"Unexpected dispatch state")
    need(final["jobs"]==[{"id":job,"kind":kind,"backend":"CPU","timeoutSeconds":timeout,"status":"PASSED"}],"Fixed job failed")
    need(final["productionDispatchAuthorized"] is False and final["gpuDispatchAuthorized"] is False,"Dispatch gate mismatch")
    need(call("status")==final,"Persistent result mismatch")
    result=(store/"outputs"/(job+".json")).read_bytes()
    need(0<len(result)<=2*1024*1024,"Invalid receipt bytes")
    if kind=="local-qa":
        report=json.loads(result)
        need(report["producers"][1]["metrics"]["passed"]==250 and report["producers"][2]["metrics"]["passed"]==250,"Fixed checks mismatch")
    return sha(result)

def main():
    need(sys.platform=="linux" and os.environ.get("GITHUB_ACTIONS")=="true" and os.environ.get("GITHUB_REPOSITORY")=="aurelian2483-cmd/value-watch-lab","Hosted QA context required")
    revision=subprocess.check_output(["git","rev-parse","HEAD"],cwd=ROOT,text=True).strip()
    need(not subprocess.check_output(["git","status","--porcelain","--untracked-files=all"],cwd=ROOT),"Clean checkout required")
    with tempfile.TemporaryDirectory(dir=os.environ["RUNNER_TEMP"]) as folder:
        root=Path(folder)
        cert,key=root/"cert.pem",root/"key.pem"
        subprocess.run(["openssl","req","-x509","-newkey","rsa:2048","-nodes","-keyout",str(key),"-out",str(cert),"-days","1","-subj","/CN=localhost","-addext","subjectAltName=IP:127.0.0.1"],check=True,capture_output=True,timeout=20)
        tokens={r:secrets.token_hex(32) for r in ("operator","hosted-qa","observer")}
        service=Service(Controller(root/"queue.db"),{k:sha(v.encode()) for k,v in tokens.items()},revision)
        for job,(kind,_) in FIXED.items():
            service.enqueue(tokens["operator"],job,kind)
        service.enqueue(tokens["operator"],"gpu","gpu-qa")
        server=LoopbackServer(service,cert,key)
        thread=threading.Thread(target=server.serve_forever,kwargs={"poll_interval":0.02},daemon=True)
        thread.start()
        try:
            client=WorkerClient(server.server_port,str(cert),tokens["hosted-qa"])
            observer=WorkerClient(server.server_port,str(cert),tokens["observer"])
            for job in FIXED:
                lease=client.request("/qa/claim",{})
                need(lease is not None and lease["id"]==job,"Unexpected assignment")
                result_hash=run_lease(root,lease,revision)
                payload={"job":job,"lease":lease["token"],"receipt_hash":result_hash}
                need(client.request("/qa/submit",payload) is True,"Result not recorded")
                need(client.request("/qa/submit",payload) is False,"Replay accepted")
            need(client.request("/qa/claim",{}) is None,"Unexpected additional job")
            snapshot=observer.request("/qa/status",{})
            need([j["state"] for j in snapshot["jobs"]]==["RECEIPT_PENDING_REVIEW","RECEIPT_PENDING_REVIEW","BLOCKED_GPU"],"Queue state mismatch")
            need(snapshot["productionDispatchAuthorized"] is False and snapshot["publicationGate"]=="BLOCKED","Controller gates")
        finally:
            server.shutdown()
            server.server_close()
            thread.join(timeout=5)
        # Evidence stays aggregate; no credential, lease, database or certificate bytes exported.
        print("PASS TLS controller: two actual fixed CPU jobs, 500 fixed synthetic checks, duplicate submissions rejected, GPU blocked")
        print("Receipt hashes remain pending independent review; production and publication blocked")

if __name__=="__main__":
    main()
