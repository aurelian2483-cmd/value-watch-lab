"""Build and verify an offline-first portable presence client package."""
import hashlib
import io
import json
import stat
import subprocess
import sys
import zipfile
from pathlib import Path

ROOT=Path(__file__).resolve().parent
CLIENT=ROOT.parent/"pc-presence-client"/"client.py"
CLIENT_BLOB="dcb6d1d378e840da9a142bcff7dac1097ac33536"
REVISION="d2010dd4bbf241a3f49a9b9b0b5786f98d808c6f"
FILES={"client.py","Run-PC-Client.cmd","START-HERE.txt"}
MAX=65536
def need(ok,msg):
    if not ok: raise ValueError(msg)
def sha(b): return hashlib.sha256(b).hexdigest()
def build():
    def tracked(path):
        rel=path.relative_to(ROOT.parents[1]).as_posix()
        return subprocess.check_output(["git","show","HEAD:"+rel],cwd=ROOT,timeout=15)
    data={"client.py":tracked(CLIENT)}
    raw=data["client.py"]
    need(hashlib.sha1(b"blob "+str(len(raw)).encode()+b"\0"+raw).hexdigest()==CLIENT_BLOB,"Accepted client blob changed")
    for name in sorted(FILES-{"client.py"}):
        raw=tracked(ROOT/name)
        data[name]=raw.replace(b"\r\n",b"\n").replace(b"\n",b"\r\n") if name.endswith(".cmd") else raw
    manifest={"kind":"PC_PRESENCE_ENROLLMENT_KIT","schema":1,"acceptedClientRevision":REVISION,"networkDefault":False,
              "gpuDispatchAuthorized":False,"productionDispatchAuthorized":False,"publicationGate":"BLOCKED",
              "files":[{"path":name,"bytes":len(raw),"sha256":sha(raw)} for name,raw in sorted(data.items())]}
    data["manifest.json"]=(json.dumps(manifest,sort_keys=True,indent=2)+"\n").encode()
    out=io.BytesIO()
    with zipfile.ZipFile(out,"w",compression=zipfile.ZIP_STORED) as z:
        for name,raw in sorted(data.items()):
            need(0<len(raw)<=MAX,"Invalid member size")
            info=zipfile.ZipInfo(name,(2020,1,1,0,0,0))
            info.create_system=3
            info.external_attr=(stat.S_IFREG|0o600)<<16
            z.writestr(info,raw)
    return out.getvalue()
def verify(raw,expected):
    need(len(raw)<=4*MAX and sha(raw)==expected,"Archive digest mismatch")
    with zipfile.ZipFile(io.BytesIO(raw)) as z:
        infos=z.infolist()
        need(len(infos)==4 and set(z.namelist())==FILES|{"manifest.json"},"Archive member mismatch")
        for info in infos:
            need(0<info.file_size<=MAX and stat.S_IFMT(info.external_attr>>16)==stat.S_IFREG,"Unsafe member")
        m=json.loads(z.read("manifest.json"))
        need(set(m)=={"kind","schema","acceptedClientRevision","networkDefault","gpuDispatchAuthorized","productionDispatchAuthorized","publicationGate","files"},"Manifest fields")
        need(m["kind"]=="PC_PRESENCE_ENROLLMENT_KIT" and type(m["schema"]) is int and m["schema"]==1 and m["acceptedClientRevision"]==REVISION,"Manifest revision")
        need(m["networkDefault"] is False and m["gpuDispatchAuthorized"] is False and m["productionDispatchAuthorized"] is False and m["publicationGate"]=="BLOCKED","Unsafe manifest")
        rows=m["files"]
        need(type(rows) is list and len(rows)==3 and {r["path"] for r in rows}==FILES,"Manifest inventory")
        for row in rows:
            b=z.read(row["path"])
            need(set(row)=={"path","bytes","sha256"} and type(row["bytes"]) is int and row["bytes"]==len(b) and row["sha256"]==sha(b),"Member mismatch")
        b=z.read("client.py")
        need(hashlib.sha1(b"blob "+str(len(b)).encode()+b"\0"+b).hexdigest()==CLIENT_BLOB,"Client blob mismatch")
        return m
if __name__=="__main__":
    need(len(sys.argv)==2,"Usage: package.py <new-output-directory>")
    raw=build()
    need(raw==build(),"Non-deterministic kit")
    h=sha(raw)
    verify(raw,h)
    out=Path(sys.argv[1])
    out.mkdir(exist_ok=False)
    (out/"Sky-Research-PC-Presence.zip").write_bytes(raw)
    (out/"Sky-Research-PC-Presence.sha256").write_text(h+"  Sky-Research-PC-Presence.zip\n",encoding="ascii")
    print("PASS deterministic offline-first PC enrollment kit")
