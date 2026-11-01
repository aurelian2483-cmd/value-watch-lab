#!/usr/bin/env python3
"""Experiment 50: one synthetic append, research only; fail closed."""
import base64,json,os,pathlib,subprocess,sys
from experiment49_persistent_append_preflight import remote_file,guarded_append,REPO,BRANCH,PATH
from experiment44_anchor_integrity_audit import validate
from experiment47_append_only_enforcement import check_chain,make_new
from experiment43_proposed_evidence_ledger import digest
from experiment39_training_inclusion_audit import canonical
OUT=pathlib.Path("/tmp/experiment50")
def main():
 OUT.mkdir(parents=True,exist_ok=True)
 report={"experiment":50,"status":"BLOCKED_PENDING","publication_gate":"BLOCKED","challenge_eligible":0,"publishing_enabled":False,"append_committed":False}
 try:
  if os.environ.get("GITHUB_REF")!="refs/heads/"+BRANCH or os.environ.get("GITHUB_EVENT_NAME")!="push":raise ValueError("wrong trigger")
  old,blob,raw=remote_file()
  anchor=json.loads(pathlib.Path("research/experiment44-ledger-anchor.json").read_text())
  if len(old)!=4:raise ValueError("ledger not exactly original four entries; no write")
  validate(old,anchor)
  if raw!=pathlib.Path(PATH).read_bytes():raise ValueError("checkout mismatch")
  new=make_new(old)
  new[-1]["record_type"]="SYNTHETIC_TEST_ONLY_NOT_FORECAST"
  new[-1]["entry_sha256"]=digest({k:v for k,v in new[-1].items() if k!="entry_sha256"})
  guarded_append(old,new,blob,blob,old)
  payload=json.dumps({"message":"Experiment 50 synthetic ledger test append","branch":BRANCH,"sha":blob,"content":base64.b64encode(canonical(new)+b"\n").decode()})
  p=subprocess.run(["gh","api","-X","PUT",f"repos/{REPO}/contents/{PATH}","--input","-"],input=payload,text=True,capture_output=True,timeout=60)
  if p.returncode:raise ValueError("GitHub rejected guarded update: "+p.stderr[-400:])
  commit=json.loads(p.stdout).get("commit",{}).get("sha")
  if not commit:raise ValueError("missing commit receipt")
  report.update(append_committed=True,commit_sha=commit,status="WRITE_RECORDED_READBACK_PENDING")
  stored,stored_blob,_=remote_file()
  if stored!=new:raise ValueError("post-write readback differs")
  validate(stored[:4],anchor)
  check_chain(stored)
  report.update(status="SYNTHETIC_APPEND_COMMITTED_AND_READBACK_VERIFIED",ledger_entries=5,new_blob_sha=stored_blob,ledger_sha256=digest(stored),immutable_storage_verified=False)
 except Exception as exc:report.update(status="BLOCKED_AUDIT_ERROR",error=str(exc))
 finally:
  (OUT/"report.json").write_text(json.dumps(report,indent=2)+"\n")
  print(json.dumps({k:report.get(k) for k in ("status","append_committed","commit_sha","error")}))
 if report["status"]=="BLOCKED_AUDIT_ERROR":sys.exit(1)
if __name__=="__main__":main()
