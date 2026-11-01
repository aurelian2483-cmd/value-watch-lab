#!/usr/bin/env python3
"""Experiment 51: read-only GitHub commit transition audit; no writes."""
import base64,copy,hashlib,json,os,pathlib,subprocess,sys
from experiment49_persistent_append_preflight import remote_file,REPO,BRANCH,PATH
from experiment44_anchor_integrity_audit import validate
from experiment47_append_only_enforcement import check_chain
from experiment43_proposed_evidence_ledger import digest
OUT=pathlib.Path("/tmp/experiment51")
COMMIT="a7a74f83f59b09b5f644216bd5444c19fc02bd01"
def api(endpoint):
 p=subprocess.run(["gh","api","-X","GET",endpoint],text=True,capture_output=True,timeout=60)
 if p.returncode:raise ValueError("GitHub read failed: "+p.stderr[-400:])
 return json.loads(p.stdout)
def blob_at(ref):
 data=api(f"repos/{REPO}/contents/{PATH}?ref={ref}")
 raw=base64.b64decode(data["content"])
 sha=hashlib.sha1(b"blob "+str(len(raw)).encode()+b"\0"+raw).hexdigest()
 if sha!=data.get("sha"):raise ValueError("blob SHA mismatch")
 return json.loads(raw),sha
def main():
 OUT.mkdir(parents=True,exist_ok=True)
 report={"experiment":51,"status":"BLOCKED_PENDING","publication_gate":"BLOCKED","challenge_eligible":0,
         "publishing_enabled":False,"persistent_ledger_modified":False}
 try:
  if os.environ.get("GITHUB_REF")!="refs/heads/"+BRANCH:raise ValueError("wrong branch")
  commit=api(f"repos/{REPO}/commits/{COMMIT}")
  parents=commit.get("parents",[])
  if commit.get("sha")!=COMMIT or len(parents)!=1:raise ValueError("unexpected commit or parent count")
  parent_sha=parents[0]["sha"]
  files=commit.get("files",[])
  if len(files)!=1 or files[0].get("filename")!=PATH or files[0].get("status")!="modified":
   raise ValueError("commit modified unexpected files")
  before,before_blob=blob_at(parent_sha)
  after,after_blob=blob_at(COMMIT)
  current,current_blob,_=remote_file()
  anchor=json.loads(pathlib.Path("research/experiment44-ledger-anchor.json").read_text())
  validate(before,anchor)
  if len(after)!=5 or after[:4]!=before:raise ValueError("history altered or unexpected record count")
  if after[-1].get("record_type")!="SYNTHETIC_TEST_ONLY_NOT_FORECAST" or after[-1].get("fixture_identity")!=["RESEARCH_TEST_ONLY","TEST_AWAY","2099-01-01T00:00:00Z","synthetic"]:
   raise ValueError("fifth record not explicitly synthetic")
  check_chain(after)
  if current!=after or current_blob!=after_blob:raise ValueError("research branch diverged from committed ledger")
  tests={}
  for name,modify in [
   ("alter_history",lambda a:a[0].__setitem__("forecast_record_sha256","0"*64)),
   ("remove_history",lambda a:a.pop(0)),
   ("reorder_history",lambda a:a.reverse()),
   ("duplicate_record",lambda a:a.append(copy.deepcopy(a[-1]))),
   ("forge_new_hash",lambda a:a[-1].__setitem__("entry_sha256","f"*64))]:
   candidate=copy.deepcopy(after);modify(candidate)
   try:
    if candidate[:4]!=before or len(candidate)!=5:raise ValueError("fixed baseline mismatch")
    check_chain(candidate)
   except ValueError:tests[name]="REJECTED"
   else:raise ValueError("tamper test accepted: "+name)
  report.update(status="GITHUB_COMMIT_FOUR_TO_FIVE_TRANSITION_VERIFIED_READ_ONLY",
    commit_sha=COMMIT,parent_commit_sha=parent_sha,changed_files=[PATH],
    before_entries=len(before),after_entries=len(after),before_blob_sha=before_blob,
    after_blob_sha=after_blob,baseline_ledger_sha256=digest(before),
    after_ledger_sha256=digest(after),negative_tests=tests,
    independent_external_witness_verified=False,
    missing_requirements=["GitHub history not independently immutable","No verified historical source availability or calibrated forecast performance"])
 except Exception as exc:report.update(status="BLOCKED_AUDIT_ERROR",error=str(exc))
 finally:
  (OUT/"report.json").write_text(json.dumps(report,indent=2)+"\n")
  print(json.dumps({k:report.get(k) for k in ("status","before_entries","after_entries","error")}))
 if report["status"]=="BLOCKED_AUDIT_ERROR":sys.exit(1)
if __name__=="__main__":main()
