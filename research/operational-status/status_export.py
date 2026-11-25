"""Redacted static evidence from completed hosted fixed QA. Not live telemetry."""
import hashlib
import html
import json
import os
import re
from pathlib import Path
from controller import FLAGS,HEX,REV,need
from scheduler import digest

EXPECTED_JOBS=[("probe","cpu-probe","CPU","RECEIPT_PENDING_REVIEW"),("local","local-qa","CPU","RECEIPT_PENDING_REVIEW"),("gpu","gpu-qa","GPU","BLOCKED_GPU")]
EXPECTED_EVENTS=[("probe","ENQUEUED"),("local","ENQUEUED"),("gpu","ENQUEUED"),("probe","LEASED"),("probe","UNVERIFIED_RECEIPT_RECORDED"),("local","LEASED"),("local","UNVERIFIED_RECEIPT_RECORDED")]
def encode(x):
    return json.dumps(x,sort_keys=True,separators=(",",":"),allow_nan=False).encode()
def project(snapshot,admission,revision,run_id,attempt):
    need(isinstance(revision,str) and REV.fullmatch(revision),"Invalid revision")
    need(all(isinstance(x,str) and re.fullmatch(r"[1-9][0-9]{0,19}",x) for x in (run_id,attempt)),"Invalid run identity")
    need(type(snapshot) is dict and set(snapshot)=={"kind","jobs","events","freshness",*FLAGS},"Snapshot fields")
    need(snapshot["kind"]=="LOCAL_CONTROLLER_QA_SNAPSHOT" and snapshot["freshness"]=="STORED_STATE_ONLY" and all(type(snapshot[k]) is type(v) and snapshot[k]==v for k,v in FLAGS.items()),"Unsafe controller state")
    need(type(admission) is dict and set(admission)=={"kind","approvalSha256","revision","opensAt","closesAt","state","decidedAt","homePcRequired","gpuDispatchAuthorized","productionDispatchAuthorized","publicationGate","researchStatus"},"Admission fields")
    need(admission["kind"]=="FIXED_QA_ADMISSION" and admission["revision"]==revision and admission["state"]=="ADMITTED","Admission mismatch")
    need(admission["homePcRequired"] is False and admission["gpuDispatchAuthorized"] is False and admission["productionDispatchAuthorized"] is False and admission["publicationGate"]=="BLOCKED" and admission["researchStatus"]=="UNVALIDATED","Unsafe admission")
    start,end,decided=(admission[k] for k in ("opensAt","closesAt","decidedAt"))
    need(all(type(x) is int for x in (start,end,decided)) and 0<=start<=decided<end and end-start<=3600,"Invalid admission time")
    need(digest({"schema":1,"revision":revision,"opensAt":start,"closesAt":end,"scope":"FIXED_QA_ONLY"})==admission["approvalSha256"],"Admission digest mismatch")
    need(type(snapshot["jobs"]) is list and len(snapshot["jobs"])==3,"Queue length")
    hashes=[]
    for job,expected in zip(snapshot["jobs"],EXPECTED_JOBS):
        need(type(job) is dict and set(job)=={"id","revision","kind","backend","state","worker","expires","receipt_hash"},"Queue fields")
        need(tuple(job[k] for k in ("id","kind","backend","state"))==expected and job["revision"]==revision,"Queue mismatch")
        if job["backend"]=="CPU":
            need(job["worker"]=="hosted-qa" and type(job["expires"]) is int and isinstance(job["receipt_hash"],str) and HEX.fullmatch(job["receipt_hash"]),"Invalid receipt reference")
            hashes.append(job["receipt_hash"])
        else:
            need(all(job[k] is None for k in ("worker","expires","receipt_hash")),"GPU unexpectedly allocated")
    need(len(set(hashes))==2,"Duplicate receipt")
    events=snapshot["events"]
    need(type(events) is list and len(events)==len(EXPECTED_EVENTS),"Event count")
    last=decided
    for i,(event,expected) in enumerate(zip(events,EXPECTED_EVENTS),1):
        need(type(event) is dict and set(event)=={"seq","job","action","at"} and type(event["seq"]) is int and event["seq"]==i,"Invalid event")
        need((event["job"],event["action"])==expected and type(event["at"]) is int and event["at"]>=last,"Event mismatch")
        last=event["at"]
    return {"kind":"HOSTED_SCHEDULED_FIXED_QA_EVIDENCE","schema":1,"revision":revision,"runId":run_id,"runAttempt":attempt,
            "observedAtEpoch":last,"admission":"ADMITTED","hostedCpuJobs":2,"syntheticChecks":500,"receiptReview":"PENDING_INDEPENDENT_REVIEW",
            "physicalPc":"NOT_CONNECTED_IN_THIS_TEST","measurementFreshness":"UNKNOWN","homePcRequired":False,
            "gpuDispatchAuthorized":False,"productionDispatchAuthorized":False,"publicationGate":"BLOCKED","researchStatus":"UNVALIDATED"}
def render(record):
    # Only the strict projected shape reaches the renderer.
    esc=lambda x:html.escape(str(x),quote=True)
    url="https://github.com/aurelian2483-cmd/value-watch-lab/actions/runs/"+esc(record["runId"])+"/attempts/"+esc(record["runAttempt"])
    return """<!doctype html><html lang="en-GB"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="referrer" content="no-referrer"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'"><title>Sky Research — operational QA evidence</title><style>*{box-sizing:border-box}body{margin:0;background:#101827;color:#eef4ff;font:16px/1.5 system-ui}main{max-width:920px;margin:auto;padding:clamp(12px,4vw,32px);overflow-wrap:anywhere}section{background:#19273b;border:1px solid #40516a;border-radius:12px;padding:16px;margin:12px 0}h1{font-size:clamp(1.5rem,5vw,2.2rem)}h2{font-size:1.15rem}.gate{color:#ffd89f;font-weight:700}a{color:#c7e2ff}code{overflow-wrap:anywhere}</style></head><body><main><h1>Operational QA evidence</h1><p class="gate">UNVALIDATED · PUBLICATION BLOCKED · PRODUCTION DISPATCH BLOCKED</p><p>Historical hosted test snapshot — not live telemetry.</p><section><h2>Cloud CPU</h2><p>2 fixed CPU jobs completed; 500 fixed synthetic checks passed. Home PC required: No.</p><p>Receipt verification: pending independent review.</p></section><section><h2>Schedule</h2><p>One fixed QA admission window accepted. No recurring production scheduling.</p></section><section><h2>Optional PC</h2><p>Physical PC not connected in this test. Current availability unknown. GPU dispatch blocked.</p></section><section><h2>Evidence</h2><p>Revision: <code>"""+esc(record["revision"])+"""</code></p><p>Observed UTC epoch: """+esc(record["observedAtEpoch"])+"""</p><p><a href=""""+url+"""" rel="noopener noreferrer">Source CI workflow</a></p></section></main></body></html>\n"""
def export(snapshot,admission,revision,destination,run_id,attempt):
    record=project(snapshot,admission,revision,run_id,attempt)
    dest=Path(destination)
    dest.mkdir(exist_ok=False)
    raw=encode(record)
    (dest/"status.json").write_bytes(raw)
    (dest/"index.html").write_text(render(record),encoding="utf-8")
    (dest/"status.sha256").write_text(hashlib.sha256(raw).hexdigest()+"  status.json\n",encoding="ascii")
    return record
