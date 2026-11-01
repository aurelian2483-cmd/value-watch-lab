#!/usr/bin/env python3
"""Experiment 92: append-only, conflict-rejecting research scoring ledger.
Requires a successful Experiment 90 audit; never grants official challenge credit.
"""
import datetime as dt,hashlib,json,math,pathlib,sys
ROOT=pathlib.Path(__file__).resolve().parents[1]
LEDGER=ROOT/"research/results-ledger/v1/verified-results.json"
AUDIT=pathlib.Path(sys.argv[1] if len(sys.argv)>1 else "/tmp/experiment90/report.json")
def canonical(v):return json.dumps(v,sort_keys=True,separators=(",",":"),ensure_ascii=False)
def fail(s):raise ValueError(s)
def main():
 report=json.loads(AUDIT.read_text())
 if report.get("experiment")!=90 or report.get("status")=="AUDIT_ERROR" or report.get("errors") or report.get("publication_gate")!="BLOCKED" or report.get("official_challenge")!="0/100":
  fail("Unsafe or failed upstream result audit")
 old=json.loads(LEDGER.read_text()) if LEDGER.exists() else {"schema_version":1,"research_only":True,"model_validation":"UNVALIDATED","publication_gate":"BLOCKED","official_challenge":"0/100","entries":[]}
 if any(old.get(k)!=v for k,v in {"schema_version":1,"research_only":True,"model_validation":"UNVALIDATED","publication_gate":"BLOCKED","official_challenge":"0/100"}.items()):fail("Unsafe ledger header")
 if not isinstance(old.get("entries"),list):fail("Invalid ledger entries")
 by_id={}
 for e in old["entries"]:
  key=e.get("record_sha256")
  if not isinstance(key,str) or key in by_id:fail("Invalid or duplicate ledger key")
  by_id[key]=e
 added=0
 for s in report.get("scored",[]):
  if s.get("challenge_eligible")!=0 or s.get("publication_gate")!="BLOCKED" or s.get("timestamp_independently_attested") is not False:fail("Unsafe scored record")
  if len(s.get("source_receipts",[]))!=2:fail("Missing independent receipts")
  receipts=s["source_receipts"]
  if not any("espn.com" in x.get("url","") for x in receipts) or not any("football-data.co.uk" in x.get("url","") for x in receipts):fail("Incorrect result sources")
  if any(len(x.get("sha256",""))!=64 for x in receipts):fail("Missing source digest")
  if s.get("actual_outcome") not in ("H","D","A") or not all(isinstance(s.get(k),int) and s[k]>=0 for k in ("score_home","score_away")):fail("Invalid result")
  h,a=s["score_home"],s["score_away"]
  if s["actual_outcome"]!=("H" if h>a else "A" if a>h else "D"):fail("Result mismatch")
  if any(not isinstance(s.get(k),(int,float)) or not math.isfinite(s[k]) or s[k]<0 for k in ("multiclass_brier_score","log_loss")):fail("Invalid score metrics")
  digest=s.get("record_sha256")
  if not isinstance(digest,str) or len(digest)!=64 or any(c not in "0123456789abcdef" for c in digest):fail("Invalid forecast digest")
  entry={k:s[k] for k in ("record_sha256","home","away","kickoff_utc","score_home","score_away","actual_outcome","multiclass_brier_score","log_loss")}
  entry["source_receipts"]=receipts
  entry["challenge_eligible"]=0
  entry["publication_gate"]="BLOCKED"
  entry["timestamp_independently_attested"]=False
  if digest in by_id:
   if canonical(by_id[digest])!=canonical(entry):fail("CONFLICT: immutable result differs from ledger")
  else:by_id[digest]=entry;added+=1
 old["entries"]=sorted(by_id.values(),key=lambda x:(x["kickoff_utc"],x["record_sha256"]))
 LEDGER.parent.mkdir(parents=True,exist_ok=True)
 LEDGER.write_text(json.dumps(old,indent=2,ensure_ascii=False)+"\n")
 summary={"experiment":92,"status":"LEDGER_VALIDATED","new_entries":added,"total_entries":len(by_id),"pending_forecasts":len(report.get("pending",[])),"official_challenge":"0/100","publication_gate":"BLOCKED"}
 print(json.dumps(summary))
if __name__=="__main__":main()
