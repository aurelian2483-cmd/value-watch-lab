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
        for name in ("worker.mjs","wrangler.json"):
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
        def start(*,provision=False,revision=REVISION,mode="LOCAL_PRESENCE_QA"):
            nonlocal proc
            values={"SKY_MODE":mode,"SKY_APPROVED_HOST":f"127.0.0.1:{port}",
                    "SKY_APPROVED_REVISION":revision,"SKY_PROVISION_ENABLED":str(provision).lower()}
            values.update({key:hashlib.sha256(TOKENS[role].encode()).hexdigest() for role,key in zip(ROLES,KEYS)})
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
        finally:
            stop()
            # Runtime logs are not uploaded: dev variables and request details stay disposable.
if __name__=="__main__":
    run()
