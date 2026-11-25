"""Build a deterministic Phase 3 metadata-only local preview from verified isolated recovery."""
import hashlib
import io
import json
from pathlib import Path
import stat
import sys
import zipfile

ROOT = Path(__file__).resolve().parents[1]
FILES = [
    "unified-orchestration/registry.mjs", "unified-orchestration/control-ledger.mjs",
    "unified-orchestration/producer-queue.mjs", "unified-orchestration/dashboard.mjs",
    "unified-orchestration/operational-review.mjs", "unified-orchestration/README.md",
    "unified-live/sync.mjs", "unified-live/authentication.mjs",
    "unified-control-centre/overview.mjs", "unified-control-centre/source-pins.json",
    "scientific-reference/digest.mjs",
]
DATA = ["evidence/current.json", "registry/registry.json", "registry/control.json",
        "queue/queue.json", "orchestration-plan.json", "queue-plan.json"]
def need(ok, message):
    if not ok:
        raise ValueError(message)

def sha(raw):
    return hashlib.sha256(raw).hexdigest()

def read(path):
    need(path.is_file() and not path.is_symlink() and path.resolve() == path.absolute(), "Unsafe preview member")
    need(0 < path.stat().st_size <= 4*1024*1024, "Invalid preview member size")
    raw = path.read_bytes()
    need(0 < len(raw) <= 4*1024*1024, "Invalid preview bytes")
    return raw

def build(recovered):
    data = {"research/"+name: read(ROOT/name) for name in FILES}
    data.update({name: read(recovered/name) for name in DATA})
    state, registry, control, queue = [json.loads(data[name]) for name in DATA[:4]]
    for obj in (state, registry, control, queue):
        need(obj["executionAuthorized"] is False and obj["publicationGate"] == "BLOCKED"
             and obj["modelValidation"] == "UNVALIDATED", "Unsafe preview state")
    need(state["authentication"] is None and len(registry["events"]) == 7
         and len(queue["events"]) == 6 and control["events"][-1]["type"] == "RESUME", "Unexpected preview lifecycle")
    anchors = [registry["registrySha256"], control["controlSha256"], queue["queueSha256"]]
    need(all(isinstance(h,str) and len(h)==64 and all(c in "0123456789abcdef" for c in h) for h in anchors), "Invalid preview anchors")
    op, qp = sha(data[DATA[4]]), sha(data[DATA[5]])
    command = ("node research/unified-orchestration/dashboard.mjs evidence registry orchestration-plan.json "
               + op + " 8767 " + anchors[0] + " " + anchors[1] + " queue queue-plan.json " + qp + " " + anchors[2])
    guide = ("Unified Research Control Centre Phase 3 -- historical read-only software preview\n"
             "Requires Node.js 22. Extract all files into a new operator-owned directory.\n"
             "Open PowerShell or a terminal in that directory and run:\n\n" + command +
             "\n\nOpen http://127.0.0.1:8767. Ctrl+C stops the viewer.\n"
             "Historical summary metadata only; no research dispatch, signing keys, producer services, network fetching or automatic repair.\n"
             "UNVALIDATED; PUBLICATION BLOCKED; EXECUTION BLOCKED. Measurement freshness UNKNOWN.\n"
             "Windows/GPU acceptance and actual producer provisioning are outstanding. Verify ZIP fingerprint before extraction.\n")
    data["START-HERE.txt"] = guide.encode()
    # Launcher is explicit and read-only; no install, execution engine or automatic producer startup.
    data["Open-Control-Centre.cmd"] = ("@echo off\r\ncd /d \"%~dp0\"\r\n"+command+"\r\n").encode()
    manifest = {"kind":"PHASE3_HISTORICAL_PREVIEW","schemaVersion":1,"modelValidation":"UNVALIDATED",
                "publicationGate":"BLOCKED","executionAuthorized":False,"measurementFreshness":"UNKNOWN",
                "files":[{"path":k,"sha256":sha(v),"bytes":len(v)} for k,v in sorted(data.items())]}
    data["manifest.json"] = (json.dumps(manifest,sort_keys=True,indent=2)+"\n").encode()
    b=io.BytesIO()
    with zipfile.ZipFile(b,"w",compression=zipfile.ZIP_STORED) as z:
        for path,raw in sorted(data.items()):
            i=zipfile.ZipInfo(path,(2020,1,1,0,0,0))
            i.create_system=3
            i.external_attr=(stat.S_IFREG|0o600)<<16
            z.writestr(i,raw)
    return b.getvalue(), command

def verify(raw, trusted):
    need(sha(raw)==trusted,"Archive fingerprint mismatch")
    expected={"research/"+x for x in FILES}|set(DATA)|{"START-HERE.txt","Open-Control-Centre.cmd","manifest.json"}
    with zipfile.ZipFile(io.BytesIO(raw)) as z:
        members=z.infolist()
        need(len(members)==len(expected) and {m.filename for m in members}==expected,"Archive inventory mismatch")
        need(all(not m.is_dir() and stat.S_IFMT(m.external_attr>>16)==stat.S_IFREG and 0<m.file_size<=4*1024*1024 for m in members),"Unsafe archive member")
        manifest=json.loads(z.read("manifest.json"))
        need(manifest["kind"]=="PHASE3_HISTORICAL_PREVIEW" and manifest["executionAuthorized"] is False and manifest["publicationGate"]=="BLOCKED" and manifest["modelValidation"]=="UNVALIDATED","Unsafe manifest")
        rows=manifest["files"]
        need(len(rows)==len(expected)-1 and {r["path"] for r in rows}==expected-{"manifest.json"},"Manifest inventory mismatch")
        for r in rows:
            b=z.read(r["path"])
            need(sha(b)==r["sha256"] and len(b)==r["bytes"],"Archive member fingerprint mismatch")
        return len(rows)

def main():
    need(len(sys.argv)==3,"Usage: release.py <recovered-dir> <output-dir>")
    recovered,out=map(lambda x:Path(x).absolute(),sys.argv[1:])
    raw,command=build(recovered)
    need(raw==build(recovered)[0],"Non-deterministic release")
    fingerprint=sha(raw)
    count=verify(raw,fingerprint)
    try:
        verify(raw+b"tampered",fingerprint)
    except ValueError:
        pass
    else:
        raise ValueError("Tampered archive accepted")
    with (out/"phase3-local-preview.zip").open("xb") as f:f.write(raw)
    with (out/"phase3-release-receipt.json").open("x",encoding="utf-8") as f:
        json.dump({"archiveSha256":fingerprint,"filesVerified":count,"deterministic":True,"tamperRejected":True,
                   "command":command,"modelValidation":"UNVALIDATED","publicationGate":"BLOCKED",
                   "executionAuthorized":False},f,indent=2)
    print("PASS deterministic Phase 3 metadata preview and archive tamper rejection")
if __name__=="__main__":
    main()
