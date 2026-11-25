"""Package the browser-accepted read-only site; no installations or servers required."""
import hashlib
import io
import json
from pathlib import Path
import stat
import sys
import zipfile

def need(ok,message):
    if not ok:
        raise ValueError(message)
def sha(raw):
    return hashlib.sha256(raw).hexdigest()
def build(site, qa):
    html=(site/"index.html").read_bytes()
    raw=(site/"status.json").read_bytes()
    s=json.loads(raw)
    report=(qa/"browser-acceptance.json").read_bytes()
    b=json.loads(report)
    need(b["htmlSha256"]==sha(html) and b["snapshotSha256"]==s["snapshotSha256"]
         and len(b["checks"])==9 and all(x["status"]=="PASS" for x in b["checks"]),
         "Browser acceptance does not bind the website")
    need(s["executionAuthorized"] is False and s["publicationGate"]=="BLOCKED"
         and s["modelValidation"]=="UNVALIDATED" and s["protectedEvaluationAuthorized"] is False,
         "Unsafe website scope")
    files={"index.html":html,"status.json":raw,"browser-acceptance.json":report,
           "START-HERE.txt":("SKY RESEARCH - INTEGRATED CONTROL CENTRE\n\n"
             "Extract all files and open index.html in your browser. No Node.js, Python, "
             "network connection or installation is needed. Native navigation and evidence sections work offline.\n\n"
             "This is a pinned read-only evidence website, not a live research service or production deployment. "
             "Measurements are historical, source independence and predictive qualification remain outstanding. "
             "No producer execution, repair, dispatch or protected evaluation. Publication BLOCKED.\n").encode()}
    manifest={"kind":"INTEGRATED_RESEARCH_WEBSITE_RELEASE","schemaVersion":1,
              "snapshotSha256":s["snapshotSha256"],"htmlSha256":sha(html),
              "executionAuthorized":False,"publicationGate":"BLOCKED","modelValidation":"UNVALIDATED",
              "files":[{"path":p,"sha256":sha(v),"bytes":len(v)} for p,v in sorted(files.items())]}
    files["manifest.json"]=(json.dumps(manifest,indent=2,sort_keys=True)+"\n").encode()
    buf=io.BytesIO()
    with zipfile.ZipFile(buf,"w",compression=zipfile.ZIP_STORED) as z:
        for p,v in sorted(files.items()):
            i=zipfile.ZipInfo(p,(2020,1,1,0,0,0))
            i.create_system=3
            i.external_attr=(stat.S_IFREG|0o644)<<16
            z.writestr(i,v)
    return buf.getvalue(),manifest
def verify(raw,expected):
    need(sha(raw)==expected,"Release fingerprint mismatch")
    with zipfile.ZipFile(io.BytesIO(raw)) as z:
        entries=z.infolist()
        expected_names={"index.html","status.json","browser-acceptance.json","START-HERE.txt","manifest.json"}
        need(len(entries)==len(expected_names) and {i.filename for i in entries}==expected_names,
             "Release inventory mismatch")
        need(all(not i.is_dir() and stat.S_IFMT(i.external_attr>>16)==stat.S_IFREG for i in entries),"Unsafe release member")
        m=json.loads(z.read("manifest.json"))
        need(m["kind"]=="INTEGRATED_RESEARCH_WEBSITE_RELEASE" and m["executionAuthorized"] is False
             and m["publicationGate"]=="BLOCKED" and m["modelValidation"]=="UNVALIDATED","Unsafe manifest")
        need(len(m["files"])==4 and {i["path"] for i in m["files"]}==expected_names-{"manifest.json"},"Manifest inventory mismatch")
        for row in m["files"]:
            data=z.read(row["path"])
            need(sha(data)==row["sha256"] and len(data)==row["bytes"],"Release member changed")
        need(sha(z.read("index.html"))==m["htmlSha256"],"HTML fingerprint mismatch")
        return m
if __name__=="__main__":
    need(len(sys.argv)==3,"Usage: package.py <website-dir> <qa-dir>")
    site,qa=map(Path,sys.argv[1:])
    raw,manifest=build(site,qa)
    need(raw==build(site,qa)[0],"Non-deterministic package")
    fingerprint=sha(raw)
    need(verify(raw,fingerprint)==manifest,"Release verification failed")
    try:
        verify(raw+b"modified",fingerprint)
    except ValueError:
        pass
    else:
        raise ValueError("Tampered release accepted")
    with (qa/"Sky-Research-Integrated-Website.zip").open("xb") as f:
        f.write(raw)
    with (qa/"release-receipt.json").open("x",encoding="utf-8") as f:
        json.dump({"archiveSha256":fingerprint,"manifest":manifest,"browserScenarios":9,
                   "deterministic":True,"tamperRejected":True},f,indent=2)
    print("PASS deterministic verified website release and tamper rejection")
