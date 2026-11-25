"""Deterministic deployment kit for the existing placeholder Worker.
No credentials, account access, remote calls or deployment in this builder.
"""
import hashlib
import io
import json
import stat
import subprocess
import sys
import zipfile
from pathlib import Path

ROOT=Path(__file__).resolve().parents[2]
REV="c91abd1cd13f03fbf1d71b75c7173a0811b0ccc4"
BLOBS={"worker.mjs":"77beb99316b7e265caf724256a2a90d36dcf37c5","queue.mjs":"248d273625af62ea59c0d8a45d8b250ae951ad10"}
HOST="sky-research-controller.aurelian2483.workers.dev"
FILES={"worker.mjs","queue.mjs","wrangler.json","START-HERE.txt"}
def need(ok,msg):
    if not ok: raise ValueError(msg)
def sha(raw):return hashlib.sha256(raw).hexdigest()
def encode(x):return (json.dumps(x,sort_keys=True,indent=2)+"\n").encode()
def tracked(path):
    return subprocess.check_output(["git","show","HEAD:"+path],cwd=ROOT,timeout=15)
def config():
    return {"name":"sky-research-controller","main":"worker.mjs","compatibility_date":"2026-11-01",
            "workers_dev":True,"preview_urls":False,"observability":{"enabled":False},
            "durable_objects":{"bindings":[{"name":"PRESENCE","class_name":"SkyPresence"}]},
            "migrations":[{"tag":"v1","new_sqlite_classes":["SkyPresence"]}],
            "vars":{"SKY_MODE":"DISABLED","SKY_PROVISION_ENABLED":"false","SKY_QUEUE_ENABLED":"false",
                    "SKY_APPROVED_HOST":HOST,"SKY_APPROVED_REVISION":REV}}
def build():
    data={}
    for name,blob in BLOBS.items():
        raw=tracked("research/cloudflare-presence/"+name)
        need(hashlib.sha1(b"blob "+str(len(raw)).encode()+b"\0"+raw).hexdigest()==blob,"Accepted source mismatch")
        data[name]=raw
    data["wrangler.json"]=encode(config())
    data["START-HERE.txt"]=tracked("research/cloudflare-deployment-kit/START-HERE.txt")
    data["manifest.json"]=encode({"kind":"DISABLED_CLOUDFLARE_DEPLOYMENT_KIT","revision":REV,"host":HOST,
        "activationAuthorized":False,"productionDispatchAuthorized":False,"publicationGate":"BLOCKED",
        "files":[{"path":name,"bytes":len(raw),"sha256":sha(raw)} for name,raw in sorted(data.items())]})
    out=io.BytesIO()
    with zipfile.ZipFile(out,"w",compression=zipfile.ZIP_STORED) as z:
        for name,raw in sorted(data.items()):
            need(0<len(raw)<=65536,"Invalid member size")
            info=zipfile.ZipInfo(name,(2020,1,1,0,0,0))
            info.create_system=3
            info.external_attr=(stat.S_IFREG|0o600)<<16
            z.writestr(info,raw)
    return out.getvalue()
def verify(raw,anchor):
    need(len(raw)<=5*65536 and sha(raw)==anchor,"Archive mismatch")
    with zipfile.ZipFile(io.BytesIO(raw)) as z:
        need(len(z.infolist())==5 and set(z.namelist())==FILES|{"manifest.json"},"Archive inventory")
        for info in z.infolist():
            need(0<info.file_size<=65536 and stat.S_IFMT(info.external_attr>>16)==stat.S_IFREG,"Invalid member")
        m=json.loads(z.read("manifest.json"))
        need(set(m)=={"kind","revision","host","activationAuthorized","productionDispatchAuthorized","publicationGate","files"},"Manifest fields")
        need(m["kind"]=="DISABLED_CLOUDFLARE_DEPLOYMENT_KIT" and m["revision"]==REV and m["host"]==HOST,"Manifest identity")
        need(m["activationAuthorized"] is False and m["productionDispatchAuthorized"] is False and m["publicationGate"]=="BLOCKED","Unsafe manifest")
        rows=m["files"]
        need(len(rows)==4 and {r["path"] for r in rows}==FILES,"Manifest inventory")
        for r in rows:
            b=z.read(r["path"])
            need(set(r)=={"path","bytes","sha256"} and r["bytes"]==len(b) and r["sha256"]==sha(b),"Member mismatch")
        need(json.loads(z.read("wrangler.json"))==config(),"Deployment policy changed")
        for name,blob in BLOBS.items():
            b=z.read(name)
            need(hashlib.sha1(b"blob "+str(len(b)).encode()+b"\0"+b).hexdigest()==blob,"Source mismatch")
        return m
if __name__=="__main__":
    need(len(sys.argv)==2,"Usage: package.py <new-output-directory>")
    raw=build()
    need(raw==build(),"Non-deterministic package")
    h=sha(raw);verify(raw,h)
    out=Path(sys.argv[1]);out.mkdir(exist_ok=False)
    (out/"Sky-Research-Cloudflare-Disabled.zip").write_bytes(raw)
    (out/"Sky-Research-Cloudflare-Disabled.sha256").write_text(h+"  Sky-Research-Cloudflare-Disabled.zip\n",encoding="ascii")
    print("PASS deterministic disabled Worker package",h)
