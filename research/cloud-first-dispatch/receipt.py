"""Portable aggregate receipt reader. No network, remote commands or credential handling."""
import json,re,sys,html
from pathlib import Path
from hosted import digest,FLAGS,require
from producers import safe_read,validate as validate_batch
def verify(r):
    expected={"kind","schemaVersion","observedAt","revision","runId","worker","queue","producers","syntheticCases","empiricallyQualifiedMethods","optionalWorker","productionDispatchAuthorized","measurementFreshness","receiptSha256",*FLAGS}
    require(isinstance(r,dict) and set(r)==expected,"Receipt fields")
    require(r["kind"]=="HOSTED_FIXED_QA_RECEIPT" and type(r["schemaVersion"]) is int and r["schemaVersion"]==1,"Receipt kind")
    require(all(type(r[k]) is type(v) and r[k]==v for k,v in FLAGS.items()),"Receipt gates")
    require(r["productionDispatchAuthorized"] is False and r["measurementFreshness"]=="UNKNOWN","Production gate")
    require(re.fullmatch(r"[a-f0-9]{40}",r["revision"]) is not None and re.fullmatch(r"[0-9]{1,20}",r["runId"]) is not None,"Source identity")
    from dispatch import ts,hex64
    ts(r["observedAt"])
    require(r["worker"]=={"kind":"HOSTED_LINUX_CPU","homePcRequired":False,"gpuAvailable":False,"identityAttestation":"CI_CONTEXT_NOT_WORKER_SIGNATURE"},"Worker mismatch")
    require(r["optionalWorker"]=={"state":"NOT_CONNECTED","backend":"GPU","dispatchAuthorized":False},"Optional worker gate")
    q=r["queue"];require(set(q)=={"planSha256","eventSha256","eventCount","jobs"} and hex64(q["planSha256"]) and hex64(q["eventSha256"]) and type(q["eventCount"]) is int and q["eventCount"]==5,"Queue provenance")
    require(q["jobs"]==[{"id":"probe","kind":"cpu-probe","backend":"CPU","timeoutSeconds":15,"status":"PASSED"},{"id":"local","kind":"local-qa","backend":"CPU","timeoutSeconds":180,"status":"PASSED"},{"id":"gpu","kind":"gpu-qa","backend":"GPU","timeoutSeconds":0,"status":"BLOCKED_GPU"}],"Unexpected jobs")
    require(r["syntheticCases"]==500 and type(r["syntheticCases"]) is int and r["empiricallyQualifiedMethods"]==0 and type(r["empiricallyQualifiedMethods"]) is int,"Case counts")
    # Reuse PR188's full producer-row validator, with explicitly reconstructed envelope.
    validate_batch({"kind":"LOCAL_FIXED_QA_PRODUCER_BATCH","schemaVersion":1,"sequence":1,"previousSha256":None,
       "revision":r["revision"],"observedAt":r["observedAt"],"status":"FIXED_QA_COMPLETE_RESEARCH_BLOCKED","producers":r["producers"],**FLAGS})
    require(not any(x["status"]=="FAILED" for x in r["producers"]),"Producer failure")
    require(digest({k:v for k,v in r.items() if k!="receiptSha256"})==r["receiptSha256"],"Receipt fingerprint mismatch")
    return r
def read(path,expected):
    from dispatch import sha
    raw=safe_read(Path(path).absolute(),65536)
    require(sha(raw)==expected,"External byte anchor mismatch")
    return verify(json.loads(raw))
def render(r):
    verify(r)
    esc=lambda x:html.escape(str(x),quote=True)
    rows="".join("<tr><td>"+esc(j["id"])+"</td><td>"+esc(j["backend"])+"</td><td>"+esc(j["status"])+"</td></tr>" for j in r["queue"]["jobs"])
    producers="".join("<li>"+esc(p["id"])+": "+esc(p["status"])+"</li>" for p in r["producers"])
    return """<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'"><title>Sky Research — Cloud worker receipt</title><style>*{box-sizing:border-box}body{background:#101827;color:#eef4ff;font:16px/1.5 system-ui;margin:0}main{max-width:920px;margin:auto;padding:24px;overflow-wrap:anywhere}section{background:#19273b;padding:16px;border:1px solid #40516a;border-radius:12px;margin:12px 0}table{width:100%;border-collapse:collapse}td,th{text-align:left;padding:6px;border-bottom:1px solid #40516a;overflow-wrap:anywhere}code{overflow-wrap:anywhere}.gate{color:#ffd89f;font-weight:700}a{color:#c7e2ff}</style></head><body><main><h1>Cloud research worker</h1><p class="gate">UNVALIDATED · PUBLICATION BLOCKED · PRODUCTION DISPATCH BLOCKED</p><section><h2>Hosted CPU acceptance</h2><p>Home PC required: No</p><p>500 / 500 fixed synthetic reference checks passed. No empirical qualification.</p><p>Optional home GPU: NOT CONNECTED — dispatch blocked.</p><p>Measurement freshness: UNKNOWN. Historical receipt, not current worker heartbeat.</p></section><section><h2>Approved fixed QA queue</h2><table><thead><tr><th>Job</th><th>Backend</th><th>Status</th></tr></thead><tbody>"""+rows+"""</tbody></table></section><section><h2>Producer observations</h2><ul>"""+producers+"""</ul></section><section><h2>Evidence</h2><p>Observed: """+esc(r["observedAt"])+"""</p><p>Revision: <code>"""+esc(r["revision"])+"""</code></p><p>Receipt fingerprint: <code>"""+esc(r["receiptSha256"])+"""</code></p><p>Workflow: <a rel="noopener noreferrer" href="https://github.com/aurelian2483-cmd/value-watch-lab/actions/runs/"""+esc(r["runId"])+"""">"""+esc(r["runId"])+"""</a></p></section><p>No remote worker registration, live service, automatic research dispatch, real data or publication. This receipt can be hosted as static HTML without running a local computer.</p></main></body></html>\n"""
if __name__=="__main__":
    try:
        require(len(sys.argv)==4,"Usage: receipt.py <receipt.json> <trusted-byte-sha> <new-html-file>")
        r=read(sys.argv[1],sys.argv[2])
        with Path(sys.argv[3]).open("x",encoding="utf-8") as f:f.write(render(r))
        print("PASS portable receipt and static cloud status page")
    except (ValueError,OSError,KeyError,TypeError,AttributeError) as e:
        print("Receipt rejected: "+type(e).__name__,file=sys.stderr);sys.exit(1)
