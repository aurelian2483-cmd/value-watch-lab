"""One-shot outbound presence client. No inbound listener, job execution or secret persistence."""
import argparse
import getpass
import http.client
import json
import re
import ssl
import sys

HEX=re.compile(r"[a-f0-9]{64}")
REV=re.compile(r"[a-f0-9]{40}")
HOST=re.compile(r"(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z](?:[a-z0-9-]{0,61}[a-z0-9])?")
STATES=("UNKNOWN","AVAILABLE_REPORTED","UNAVAILABLE_REPORTED")
MAX_SEQUENCE=2**31-1
MAX_RESPONSE=4096
ROUTES={"/qa/pc-cursor":set(),"/qa/pc-heartbeat":{"sequence","gpu"}}

def need(ok,message):
    if not ok:
        raise ValueError(message)

def strict_object(pairs):
    out={}
    for k,v in pairs:
        need(k not in out,"Duplicate response key")
        out[k]=v
    return out

def endpoint(host,port,allow_remote):
    need(isinstance(host,str) and type(port) is int and 1<=port<=65535,"Invalid endpoint")
    if host=="127.0.0.1":
        return
    need(allow_remote is True and HOST.fullmatch(host) and port==443,"Remote HTTPS requires explicit approved hostname and port 443")

class PresenceClient:
    def __init__(self,host,port,revision,token,*,cafile=None,allow_remote=False):
        endpoint(host,port,allow_remote)
        need(isinstance(revision,str) and REV.fullmatch(revision),"Pinned revision required")
        need(isinstance(token,str) and HEX.fullmatch(token),"Invalid PC credential")
        self.host,self.port,self.revision=host,port,revision
        self._token=token
        self.context=ssl.create_default_context(cafile=cafile)
        self.context.minimum_version=ssl.TLSVersion.TLSv1_2
    def request(self,path,payload):
        need(path in ROUTES and type(payload) is dict and set(payload)==ROUTES[path],"Unapproved request")
        raw=json.dumps(payload,separators=(",",":"),allow_nan=False).encode()
        conn=http.client.HTTPSConnection(self.host,self.port,context=self.context,timeout=5)
        try:
            conn.request("POST",path,body=raw,headers={"Authorization":"Bearer "+self._token,"Content-Type":"application/json","Connection":"close"})
            response=conn.getresponse()
            need(response.status==200,"Presence request rejected")
            need(response.getheader("Content-Type")=="application/json","Invalid response type")
            body=response.read(MAX_RESPONSE+1)
            need(len(body)<=MAX_RESPONSE,"Response too large")
            data=json.loads(body.decode("utf-8"),object_pairs_hook=strict_object,
                            parse_constant=lambda _: (_ for _ in ()).throw(ValueError("Invalid constant")))
            need(type(data) is dict and set(data)=={"result"},"Unexpected response envelope")
            return data["result"]
        finally:
            conn.close()
    def cursor(self):
        r=self.request("/qa/pc-cursor",{})
        need(type(r) is dict and set(r)=={"kind","revision","sequence","gpuDispatchAuthorized"},"Invalid cursor")
        need(r["kind"]=="PC_HEARTBEAT_CURSOR" and r["revision"]==self.revision and r["gpuDispatchAuthorized"] is False,"Unsafe cursor")
        need(type(r["sequence"]) is int and 0<=r["sequence"]<MAX_SEQUENCE,"Invalid or exhausted cursor")
        return r["sequence"]
    def report_once(self,gpu="UNKNOWN"):
        need(isinstance(gpu,str) and gpu in STATES,"Invalid report")
        seq=self.cursor()+1
        # Never automatically repeat an ambiguous request. A new explicitly
        # invoked report first reads the server's durable sequence again.
        r=self.request("/qa/pc-heartbeat",{"sequence":seq,"gpu":gpu})
        need(type(r) is dict and set(r)=={"sequence","accepted","gpuDispatchAuthorized"} and
             type(r["sequence"]) is int and r["sequence"]==seq and r["accepted"] is True and r["gpuDispatchAuthorized"] is False,"Invalid acknowledgement")
        return {"kind":"PC_PRESENCE_CLIENT_RESULT","sequence":seq,"reportedGpu":gpu,
                "hardwareAttested":False,"gpuDispatchAuthorized":False,"productionDispatchAuthorized":False}

def main():
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument("--send",action="store_true",help="Explicitly send one presence report")
    p.add_argument("--host",default="127.0.0.1")
    p.add_argument("--port",type=int,default=443)
    p.add_argument("--revision")
    p.add_argument("--ca-file")
    p.add_argument("--allow-remote",action="store_true")
    args=p.parse_args()
    if not args.send:
        print(json.dumps({"kind":"PC_PRESENCE_CLIENT_DRY_RUN","networkUsed":False,"gpuDispatchAuthorized":False,"productionDispatchAuthorized":False}))
        return
    try:
        endpoint(args.host,args.port,args.allow_remote)
        need(isinstance(args.revision,str) and REV.fullmatch(args.revision),"Pinned revision required")
        token=getpass.getpass("PC-only credential (not saved): ")
        result=PresenceClient(args.host,args.port,args.revision,token,cafile=args.ca_file,allow_remote=args.allow_remote).report_once()
        print(json.dumps(result,sort_keys=True))
    except (ValueError,OSError,http.client.HTTPException,UnicodeError,RecursionError,EOFError):
        print("Presence report not confirmed; no automatic retry. Verify endpoint and credentials before another explicit run.",file=sys.stderr)
        sys.exit(1)

if __name__=="__main__":
    main()
