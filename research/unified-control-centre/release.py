"""Build and verify a portable, read-only preview of accepted historical reports."""
import argparse
import hashlib
import io
import json
from pathlib import Path
import stat
import zipfile

FILES = ("index.html", "overview.json", "archive-receipts.json", "acceptance.json",
         "browser-1440.png", "browser-390.png", "browser-320.png", "START-HERE.txt")
LIMIT = 16 * 1024 * 1024
README = """Unified Research Control Centre -- historical evidence preview
Extract the ZIP to a new directory and open index.html in Edge, Chrome or Firefox.
No server, network connection, installation, login or AI service is required.
The JSON reports and screenshots are evidence of the accepted CI preview.
Research is UNVALIDATED. Publication and execution are BLOCKED.
This is not a live service; source snapshots are from different revisions.
The manifest detects corruption when checked against a trusted copy; it is not a signature.
For stronger provenance compare the ZIP SHA-256 with the accepted private CI receipt.
Keep this package private. Do not publish or treat it as a research result.
"""

def need(condition, message):
    if not condition:
        raise ValueError(message)

def digest(raw):
    return hashlib.sha256(raw).hexdigest()

def gates(files):
    snapshot = json.loads(files["overview.json"])
    accept = json.loads(files["acceptance.json"])
    receipts = json.loads(files["archive-receipts.json"])
    need(snapshot["kind"] == "UNIFIED_RESEARCH_CONTROL_CENTRE"
         and snapshot["modelValidation"] == "UNVALIDATED"
         and snapshot["publicationGate"] == "BLOCKED"
         and snapshot["executionAuthorized"] is False
         and snapshot["validationAuthorized"] is False
         and snapshot["counts"] == {"modules": 6, "available": 6, "unavailable": 0},
         "Unsafe or incomplete snapshot")
    need(accept["kind"] == "UNIFIED_CONTROL_CENTRE_ACCEPTANCE"
         and accept["snapshotSha256"] == snapshot["snapshotSha256"]
         and accept["publicationGate"] == "BLOCKED"
         and accept["modelValidation"] == "UNVALIDATED"
         and accept["executionAuthorized"] is False
         and accept["sourceSummariesReconciled"] == 6
         and accept["archiveReceiptsReconciled"] == 5
         and accept["malformedInputsRejected"] == 6
         and accept["unsafeGateInputsRejected"] == 6,
         "Acceptance evidence mismatch")
    checks = accept["browserChecks"]
    need(len(checks) == 9 and {(x["scenario"], x["width"], x["status"]) for x in checks}
         == {(s,w,"PASS") for s in ("complete","missing","partial") for w in (1440,390,320)},
         "Browser evidence incomplete")
    need(receipts["kind"] == "PINNED_ARCHIVE_VERIFICATION"
         and receipts["publicationGate"] == "BLOCKED"
         and receipts["researchValidation"] == "UNVALIDATED"
         and len(receipts["archives"]) == 5, "Archive receipts incomplete")
    modules = {x["id"]: x for x in snapshot["modules"]}
    need(len(snapshot["modules"]) == 6 and set(modules) ==
         {"catalogue","data","lab","compute","supervisor","references"}, "Module identity mismatch")
    need({x["id"] for x in receipts["archives"]} == set(modules) - {"catalogue"}, "Receipt identity mismatch")
    for a in receipts["archives"]:
        m = modules[a["id"]]
        need((a["artifactId"],a["runId"],a["head"],a["summarySha256"]) ==
             (m["source"]["artifact"],m["source"]["run"],m["source"]["head"],m["receiptSha256"]),
             "Receipt not bound to module")
    need(b"UNVALIDATED" in files["index.html"] and b"PUBLICATION BLOCKED" in files["index.html"],
         "Missing visible restrictions")
    return snapshot["snapshotSha256"]

def pack(files):
    snapshot = gates(files)
    manifest = {"kind":"UNIFIED_LOCAL_PREVIEW_MANIFEST","snapshotSha256":snapshot,
                "files":{name:{"bytes":len(files[name]),"sha256":digest(files[name])} for name in FILES}}
    stream = io.BytesIO()
    with zipfile.ZipFile(stream,"w",compression=zipfile.ZIP_DEFLATED,compresslevel=9) as z:
        for name, raw in [*((n,files[n]) for n in FILES),
                          ("manifest.json",(json.dumps(manifest,sort_keys=True,indent=2)+"\n").encode())]:
            info = zipfile.ZipInfo(name,date_time=(1980,1,1,0,0,0))
            info.compress_type = zipfile.ZIP_DEFLATED
            info.external_attr = (stat.S_IFREG | 0o644) << 16
            z.writestr(info,raw)
    return stream.getvalue()

def verify(raw):
    need(len(raw)<=LIMIT,"Oversized release")
    with zipfile.ZipFile(io.BytesIO(raw)) as z:
        infos=z.infolist()
        need(len(infos)==len(FILES)+1 and {i.filename for i in infos}==set(FILES)|{"manifest.json"},
             "Unexpected, duplicate or missing ZIP entry")
        need(all(not i.is_dir() and stat.S_IFMT(i.external_attr>>16)==stat.S_IFREG
                 and 0<i.file_size<=LIMIT for i in infos)
             and sum(i.file_size for i in infos)<=LIMIT, "Unsafe entry")
        data={i.filename:z.read(i) for i in infos}
    manifest=json.loads(data.pop("manifest.json"))
    need(manifest["kind"]=="UNIFIED_LOCAL_PREVIEW_MANIFEST" and set(manifest["files"])==set(FILES),
         "Invalid manifest")
    for n,b in data.items():
        need(manifest["files"][n]=={"bytes":len(b),"sha256":digest(b)},"File fingerprint mismatch: "+n)
    need(gates(data)==manifest["snapshotSha256"],"Snapshot mismatch")
    return manifest

def build(directory):
    files={}
    for name in FILES:
        if name=="START-HERE.txt":
            files[name]=README.encode()
            continue
        p=directory/name
        need(p.is_file() and not p.is_symlink() and 0<p.stat().st_size<=LIMIT,"Unsafe release input: "+name)
        files[name]=p.read_bytes()
    raw=pack(files)
    need(raw==pack(files),"Non-deterministic package")
    manifest=verify(raw)
    # Tamper with an entry while retaining the original manifest.
    bad=io.BytesIO()
    with zipfile.ZipFile(io.BytesIO(raw)) as src, zipfile.ZipFile(bad,"w") as dst:
        for entry in src.infolist():
            dst.writestr(entry,src.read(entry)+(b"tampered" if entry.filename=="index.html" else b""))
    try:
        verify(bad.getvalue())
    except ValueError as e:
        need("fingerprint mismatch" in str(e),"Unexpected tamper rejection")
    else:
        raise ValueError("Tampered archive accepted")
    target=directory/"local-preview.zip"
    with target.open("xb") as f:
        f.write(raw)
    need(verify(target.read_bytes())==manifest,"Saved package verification failed")
    (directory/"local-preview.sha256").write_text(digest(raw)+"  local-preview.zip\n",encoding="ascii")
    print("PASS deterministic local preview, eight file fingerprints and tamper rejection")

if __name__=="__main__":
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument("mode",choices=["build","verify"])
    parser.add_argument("path",type=Path)
    args=parser.parse_args()
    if args.mode=="build":
        build(args.path)
    else:
        verify(args.path.read_bytes())
        print("PASS internal release integrity; compare archive SHA-256 with trusted CI receipt")
