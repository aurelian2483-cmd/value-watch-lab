"""Build the exact pinned local acceptance kit; no downloads or dependency installation here."""
import hashlib
import io
import json
from pathlib import Path
import stat
import sys
import zipfile

ROOT=Path(__file__).resolve().parent
COMPUTE=ROOT.parent/"scientific-compute"
COMPUTE_REV="7c95c0bce1c428c0d9d24fd230f009304c289837"
PHASE3_REV="b2b7cfe832c8cacd1777ce992717f2d8a40390b8"
PREVIEW_SHA="0c1b27627f422b3534b47181cecfa804edbf2baa5a573f4a05edca5365b295c9"
BLOBS={
    "compute.py":"59774c438e0cb48dc1fcf9a9aa131efbb488643e",
    "benchmark.py":"d8e2a9138e364b308af191339d301ce1040c5740",
    "benchmark_contract.py":"a0c9758668eb945f5796bbac90b444ca66798846",
    "hardware_inventory.py":"9ccaf616646e869faaa0a19b3829afc791345ba4",
    "supervisor.py":"87b79444ea6832009adbfbbd74f8c0ff34e1a0e5",
    "acceptance_receipt.py":"eff23f2e256522dc6dba38086386b00eef0572ca",
    "status.py":"888b0e7e2500da2fe8ec281fc270a9d27497e2fb",
}
def need(ok,message):
    if not ok:raise ValueError(message)

def sha(b):return hashlib.sha256(b).hexdigest()

def build(preview):
    need(sha(preview)==PREVIEW_SHA,"Pinned Phase 3 preview mismatch")
    data={"phase3-preview.zip":preview}
    for name,expected in BLOBS.items():
        raw=(COMPUTE/name).read_bytes()
        actual=hashlib.sha1(b"blob "+str(len(raw)).encode()+b"\0"+raw).hexdigest()
        need(actual==expected,"Compute blob mismatch: "+name)
        data["compute/"+name]=raw
    for name in ("hardware_acceptance.py","preview-check.mjs","Run-Hardware-Acceptance.cmd","START-HERE.txt"):
        data[name]=(ROOT/name).read_bytes()
    manifest={"kind":"LOCAL_HARDWARE_ACCEPTANCE_PACKAGE","schemaVersion":1,
              "computeRevision":COMPUTE_REV,"phase3Revision":PHASE3_REV,
              "executionAuthorized":False,"publicationGate":"BLOCKED","modelValidation":"UNVALIDATED",
              "files":[{"path":k,"sha256":sha(v),"bytes":len(v)} for k,v in sorted(data.items())]}
    data["manifest.json"]=(json.dumps(manifest,indent=2,sort_keys=True)+"\n").encode()
    out=io.BytesIO()
    with zipfile.ZipFile(out,"w",compression=zipfile.ZIP_STORED) as z:
        for name,raw in sorted(data.items()):
            i=zipfile.ZipInfo(name,(2020,1,1,0,0,0))
            i.create_system=3
            i.external_attr=(stat.S_IFREG|0o600)<<16
            z.writestr(i,raw)
    return out.getvalue()

def verify(raw,expected):
    need(sha(raw)==expected,"Outer archive mismatch")
    with zipfile.ZipFile(io.BytesIO(raw)) as z:
        m=json.loads(z.read("manifest.json"))
        files=m["files"]
        expected_names={"manifest.json"}|{r["path"] for r in files}
        need(len(files)==12 and len(z.infolist())==13 and set(z.namelist())==expected_names,"Archive inventory mismatch")
        for r in files:
            b=z.read(r["path"])
            need(sha(b)==r["sha256"] and len(b)==r["bytes"],"Member fingerprint mismatch")
        need(sha(z.read("phase3-preview.zip"))==PREVIEW_SHA,"Nested preview mismatch")
        return len(files)

if __name__=="__main__":
    need(len(sys.argv)==3,"Usage: package.py <pinned-preview-zip> <new-output-directory>")
    preview=Path(sys.argv[1]).read_bytes()
    out=Path(sys.argv[2])
    out.mkdir()
    raw=build(preview)
    need(raw==build(preview),"Non-deterministic package")
    h=sha(raw);count=verify(raw,h)
    try:verify(raw+b"tampered",h)
    except ValueError:pass
    else:raise ValueError("Tamper accepted")
    (out/"Sky-Research-Hardware-Acceptance.zip").write_bytes(raw)
    (out/"package-receipt.json").write_text(json.dumps({"archiveSha256":h,"filesVerified":count,"deterministic":True,
        "tamperRejected":True,"computeRevision":COMPUTE_REV,"phase3Revision":PHASE3_REV,
        "executionAuthorized":False,"publicationGate":"BLOCKED"},indent=2)+"\n",encoding="utf-8")
    print("PASS pinned deterministic hardware acceptance package")
