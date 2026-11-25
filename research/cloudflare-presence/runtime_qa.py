"""Exercise the actual local workerd SQLite Durable Object; no cloud account."""
import concurrent.futures
import hashlib
import json
import os
from pathlib import Path
import shutil
import signal
import socket
import subprocess
import tempfile
import time
import urllib.error
import urllib.request

ROOT=Path(__file__).resolve().parent
REVISION="a"*40
ROLES=("operator","hosted-qa","observer","pc-qa")
KEYS=("SKY_OPERATOR_DIGEST","SKY_CPU_DIGEST","SKY_OBSERVER_DIGEST","SKY_PC_DIGEST")
TOKENS={role:hashlib.sha256(("disposable-local-qa-"+role).encode()).hexdigest() for role in ROLES}
def check(ok,message):
    if not ok: raise AssertionError(message)
def free_port():
    with socket.socket() as sock:
        sock.bind(("127.0.0.1",0))
        return sock.getsockname()[1]

def run():
    with tempfile.TemporaryDirectory(prefix="sky-cloudflare-qa-") as folder:
        root=Path(folder)
        for name in ("worker.mjs","queue.mjs","wrangler.json"):
            shutil.copyfile(ROOT/name,root/name)
        port=free_port()
        base=f"http://127.0.0.1:{port}"
        log=root/"runtime.log"
        state=root/"state"
        binary=os.environ["WRANGLER_BIN"]
        proc=None
        def request(route,role="pc-qa",body=b"{}",method="POST",content_type="application/json",token=None):
            req=urllib.request.Request(base+route,data=body,method=method,headers={
                "Authorization":"Bearer "+(TOKENS[role] if token is None else token),
                "Content-Type":content_type})
            try:
                response=urllib.request.urlopen(req,timeout=5)
            except urllib.error.HTTPError as e:
                response=e
            with response:
                data=json.loads(response.read())
                check(response.headers.get("Cache-Control")=="no-store","cache contract")
                return response.status,data
        def start(*,provision=False,revision=REVISION,mode="LOCAL_PRESENCE_QA",queue_plan=None,lease="240",bad_anchor=False):
            nonlocal proc
            values={"SKY_MODE":mode,"SKY_APPROVED_HOST":f"127.0.0.1:{port}",
                    "SKY_APPROVED_REVISION":revision,"SKY_PROVISION_ENABLED":str(provision).lower()}
            values.update({key:hashlib.sha256(TOKENS[role].encode()).hexdigest() for role,key in zip(ROLES,KEYS)})
            if queue_plan is not None:
                values.update({"SKY_QUEUE_ENABLED":"true","SKY_QUEUE_OPENS_AT":str(queue_plan["opensAt"]),
                               "SKY_QUEUE_CLOSES_AT":str(queue_plan["closesAt"]),"SKY_LOCAL_LEASE_SECONDS":lease,
                               "SKY_QUEUE_PLAN_SHA256":"f"*64 if bad_anchor else hashlib.sha256(json.dumps(queue_plan,sort_keys=True,separators=(",",":")).encode()).hexdigest()})
            (root/".dev.vars").write_text("".join(f"{k}={v}\n" for k,v in values.items()),encoding="ascii")
            with log.open("ab") as output:
                proc=subprocess.Popen([binary,"dev","--local","--ip","127.0.0.1","--port",str(port),
                    "--persist-to",str(state),"--config",str(root/"wrangler.json")],
                    cwd=root,stdout=output,stderr=subprocess.STDOUT,start_new_session=True,
                    env={**os.environ,"CI":"true","WRANGLER_SEND_METRICS":"false"})
            for _ in range(120):
                if proc.poll() is not None: break
                try:
                    request("/missing")
                    return
                except (OSError,ValueError):
                    time.sleep(.25)
            raise RuntimeError("Local runtime failed to start")
        def stop():
            nonlocal proc
            if proc is None: return
            if proc.poll() is None:
                os.killpg(proc.pid,signal.SIGTERM)
                try: proc.wait(timeout=10)
                except subprocess.TimeoutExpired:
                    os.killpg(proc.pid,signal.SIGKILL)
                    proc.wait(timeout=5)
            proc=None
        def status(route,expected,**kwargs):
            code,data=request(route,**kwargs)
            check(code==expected,f"{route}: expected {expected}, received {code}")
            return data
        try:
            start()
            status("/qa/pc-cursor",503)
            status("/qa/operator/provision",403,role="operator")
            stop()
            start(provision=True)
            status("/qa/operator/provision",403)
            status("/qa/operator/provision",200,role="operator")
            status("/qa/operator/provision",403,role="operator")
            check(status("/qa/pc-cursor",200)["result"]["sequence"]==0,"initial cursor")
            status("/qa/pc-cursor",403,role="observer")
            status("/qa/pc-status",403)
            status("/qa/claim",404)
            status("/qa/submit",404)
            status("/qa/pc-cursor?x=1",404)
            status("/qa/pc-cursor",405,method="GET",body=None)
            status("/qa/pc-cursor",415,content_type="text/plain")
            status("/qa/pc-cursor",403,token="f"*64)
            status("/qa/pc-heartbeat",403,body=b'{"sequence":true,"gpu":"UNKNOWN"}')
            status("/qa/pc-heartbeat",403,body=b'{"sequence":1,"sequence":1,"gpu":"UNKNOWN"}')
            status("/qa/pc-heartbeat",403,body=b'{"sequence":1,"gpu":"UNKNOWN","command":"test"}')
            status("/qa/pc-heartbeat",413,body=b"x"*1025)
            body=b'{"sequence":1,"gpu":"UNKNOWN"}'
            with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
                results=list(pool.map(lambda _:request("/qa/pc-heartbeat",body=body)[0],range(2)))
            check(sorted(results)==[200,409],"duplicate heartbeat race")
            r=status("/qa/pc-status",200,role="observer")["result"]
            check(r["sequence"]==1 and r["state"]=="REPORTED_RECENT","reported state")
            check(r["hardwareAttested"] is False and r["gpuDispatchAuthorized"] is False and
                  r["productionDispatchAuthorized"] is False and r["publicationGate"]=="BLOCKED","safety gates")
            stop()
            start()
            check(status("/qa/pc-cursor",200)["result"]["sequence"]==1,"restart persistence")
            status("/qa/operator/provision",403,role="operator")
            status("/qa/pc-heartbeat",409,body=body)
            time.sleep(1.1)
            status("/qa/pc-heartbeat",200,body=b'{"sequence":2,"gpu":"AVAILABLE_REPORTED"}')
            stop()
            start(revision="b"*40)
            status("/qa/pc-cursor",503)
            stop()
            start()
            check(status("/qa/pc-cursor",200)["result"]["sequence"]==2,"policy preserved")
            status("/qa/operator/revoke",200,role="operator")
            status("/qa/pc-cursor",403)
            status("/qa/pc-heartbeat",403,body=b'{"sequence":3,"gpu":"UNKNOWN"}')
            stop()
            start()
            check(status("/qa/pc-status",200,role="observer")["result"]["state"]=="REVOKED","durable revocation")
            status("/qa/pc-cursor",403)
            stop()
            start(mode="DISABLED")
            status("/qa/pc-cursor",503)
            print("PASS local Cloudflare workerd SQLite presence: provisioning, auth, schema, concurrent replay, restart, policy mismatch and revocation")
            stop()
            # A fresh object state tests CPU independence from PC provisioning.
            state=root/"queue-state"
            now=int(time.time())
            plan={"schema":1,"revision":REVISION,"scope":"FIXED_QA_ONLY","opensAt":now-10,"closesAt":now+600}
            start(queue_plan=plan,bad_anchor=True)
            status("/qa/queue/admit",503,role="operator")
            stop()
            start(queue_plan=plan)
            status("/qa/pc-cursor",503)
            status("/qa/queue/admit",403)
            status("/qa/queue/claim",409,role="hosted-qa")
            status("/qa/queue/status",403)
            check(status("/qa/queue/status",200,role="observer")["result"]["state"]=="WAITING","unadmitted queue")
            with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
                admission=list(pool.map(lambda _:request("/qa/queue/admit",role="operator"),range(2)))
            check(all(code==200 and len(data["result"]["events"])==3 for code,data in admission),"atomic admission")
            status("/qa/queue/claim",403)
            with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
                claims=list(pool.map(lambda _:request("/qa/queue/claim",role="hosted-qa"),range(2)))
            check(all(code==200 for code,_ in claims),"claim status")
            leases=[data["result"] for _,data in claims if data["result"] is not None]
            check(len(leases)==1 and leases[0]["id"]=="probe","exclusive lease")
            first=leases[0]
            def submit(job,token,receipt):
                return json.dumps({"job":job,"lease":token,"receipt_hash":receipt},separators=(",",":")).encode()
            def result(body):
                return status("/qa/queue/submit",200,role="hosted-qa",body=body)["result"]
            check(result(submit("probe","0"*64,"a"*64)) is False,"wrong lease")
            check(result(submit("probe",first["token"],"a"*64)) is True,"record unverified receipt")
            check(result(submit("probe",first["token"],"a"*64)) is False,"receipt replay")
            status("/qa/queue/submit",403,role="hosted-qa",body=b'{"job":"gpu","lease":"x","receipt_hash":"x"}')
            stop()
            start(queue_plan=plan)
            snap=status("/qa/queue/status",200,role="observer")["result"]
            check([r["state"] for r in snap["jobs"]]==["RECEIPT_PENDING_REVIEW","QUEUED","BLOCKED_GPU"],"durable queue")
            check(first["token"] not in json.dumps(snap) and "lease_hash" not in json.dumps(snap),"lease redaction")
            second=status("/qa/queue/claim",200,role="hosted-qa")["result"]
            check(second["id"]=="local","second fixed CPU job")
            check(result(submit("local",second["token"],"a"*64)) is False,"duplicate receipt digest")
            status("/qa/queue/revoke",200,role="operator")
            status("/qa/queue/submit",403,role="hosted-qa",body=submit("local",second["token"],"b"*64))
            stop()
            start(queue_plan=plan)
            snap=status("/qa/queue/status",200,role="observer")["result"]
            check(snap["workerRevoked"] and snap["jobs"][1]["state"]=="QUARANTINED" and not snap["gpuDispatchAuthorized"] and not snap["productionDispatchAuthorized"],"durable revoke")
            status("/qa/queue/claim",403,role="hosted-qa")
            stop()
            start(queue_plan=plan|{"closesAt":plan["closesAt"]+1})
            status("/qa/queue/status",503,role="observer")
            stop()
            state=root/"expiry-state"
            start(queue_plan=plan,lease="2")
            status("/qa/queue/admit",200,role="operator")
            first=status("/qa/queue/claim",200,role="hosted-qa")["result"]
            time.sleep(2.2)
            check(result(submit("probe",first["token"],"c"*64)) is False,"expired lease")
            snap=status("/qa/queue/status",200,role="observer")["result"]
            check(snap["jobs"][0]["state"]=="QUARANTINED","no automatic retry")
            stop()
            state=root/"missed-state"
            missed=plan|{"opensAt":now-60,"closesAt":now-1}
            start(queue_plan=missed)
            check(status("/qa/queue/admit",200,role="operator")["result"]["state"]=="MISSED","missed window")
            status("/qa/queue/claim",409,role="hosted-qa")
            stop()
            start()
            status("/qa/queue/status",404,role="observer")
            print("PASS local Cloudflare fixed QA queue: admission, concurrency, durable leases, expiry, revocation, missed window and GPU blocking")
            stop()
            # Run real fixed producers using the previously accepted Python dispatch
            # contract. No remote worker endpoint, no live data and no GPU execution.
            import sys
            checkout=ROOT.parents[1]
            check(os.environ.get("GITHUB_ACTIONS")=="true" and os.environ.get("GITHUB_REPOSITORY")=="aurelian2483-cmd/value-watch-lab","Hosted QA context required")
            revision=subprocess.check_output(["git","rev-parse","HEAD"],cwd=checkout,text=True).strip()
            check(not subprocess.check_output(["git","status","--porcelain","--untracked-files=all"],cwd=checkout),"Clean checkout required")
            sys.path.insert(0,str(checkout/"research/shared-job-controller"))
            from hosted_acceptance import run_lease
            state=root/"actual-cpu-state"
            now=int(time.time())
            actual_plan={"schema":1,"revision":revision,"scope":"FIXED_QA_ONLY","opensAt":now-5,"closesAt":now+600}
            start(queue_plan=actual_plan,revision=revision)
            status("/qa/queue/admit",200,role="operator")
            actual_root=root/"actual-producers"
            actual_root.mkdir()
            expected_hashes={}
            for job in ("probe","local"):
                lease=status("/qa/queue/claim",200,role="hosted-qa")["result"]
                check(lease["id"]==job and lease["revision"]==revision,"Fixed job mismatch")
                receipt=run_lease(actual_root,lease,revision)
                expected_hashes[job]=receipt
                payload=submit(job,lease["token"],receipt)
                check(result(payload) is True,"Actual receipt not recorded")
                check(result(payload) is False,"Actual receipt replay")
            check(status("/qa/queue/claim",200,role="hosted-qa")["result"] is None,"Unexpected additional job")
            snap=status("/qa/queue/status",200,role="observer")["result"]
            check([r["state"] for r in snap["jobs"]]==["RECEIPT_PENDING_REVIEW","RECEIPT_PENDING_REVIEW","BLOCKED_GPU"],"Actual producer state")
            check({r["id"]:r["receipt_hash"] for r in snap["jobs"] if r["backend"]=="CPU"}==expected_hashes,"Receipt reconciliation")
            check(not snap["homePcRequired"] and not snap["gpuDispatchAuthorized"] and not snap["productionDispatchAuthorized"] and snap["publicationGate"]=="BLOCKED","Actual QA gates")
            stop()
            start(queue_plan=actual_plan,revision=revision)
            check(status("/qa/queue/status",200,role="observer")["result"]==snap,"Actual QA persistence")
            print("PASS Cloudflare queue with actual hosted CPU producers: two fixed jobs and 500 synthetic checks; receipt digests pending review; GPU blocked")
        finally:
            stop()
            # Runtime logs are not uploaded: dev variables and request details stay disposable.
if __name__=="__main__":
    run()
