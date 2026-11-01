#!/usr/bin/env python3
"""Experiment 93: validate persistent result ledger for read-only public research display."""
import json,pathlib,sys,datetime as dt,math
source=pathlib.Path(sys.argv[1]);out=pathlib.Path(sys.argv[2])
d=json.loads(source.read_text())
required={"schema_version":1,"research_only":True,"model_validation":"UNVALIDATED","publication_gate":"BLOCKED","official_challenge":"0/100"}
if any(d.get(k)!=v for k,v in required.items()):raise ValueError("Unsafe ledger header")
rows=d.get("entries")
if not isinstance(rows,list) or len(rows)>10000:raise ValueError("Invalid result ledger")
seen=set()
for e in rows:
 digest=e.get("record_sha256")
 if not isinstance(digest,str) or len(digest)!=64 or any(c not in "0123456789abcdef" for c in digest) or digest in seen:raise ValueError("Invalid/duplicate digest")
 seen.add(digest)
 if e.get("publication_gate")!="BLOCKED" or e.get("challenge_eligible")!=0 or e.get("timestamp_independently_attested") is not False:raise ValueError("Unsafe result")
 h,a=e.get("score_home"),e.get("score_away")
 if type(h)!=int or type(a)!=int or min(h,a)<0 or e.get("actual_outcome")!=("H" if h>a else "A" if a>h else "D"):raise ValueError("Score mismatch")
 for k in ("multiclass_brier_score","log_loss"):
  v=e.get(k)
  if type(v) not in (int,float) or not math.isfinite(v) or v<0:raise ValueError("Invalid metric")
 receipts=e.get("source_receipts")
 if not isinstance(receipts,list) or len(receipts)!=2 or not any("espn.com" in x.get("url","") for x in receipts) or not any("football-data.co.uk" in x.get("url","") for x in receipts):raise ValueError("Missing two-source evidence")
 if any(not isinstance(x.get("sha256"),str) or len(x["sha256"])!=64 for x in receipts):raise ValueError("Invalid source digest")
 if not all(isinstance(e.get(k),str) and e[k] for k in ("home","away","kickoff_utc")):raise ValueError("Invalid fixture")
 dt.datetime.fromisoformat(e["kickoff_utc"].replace("Z","+00:00"))
payload={**required,"generated_at_utc":dt.datetime.now(dt.timezone.utc).isoformat(),"sample_size":len(rows),
 "metrics_status":"INSUFFICIENT_SAMPLE" if len(rows)<30 else "DESCRIPTIVE_ONLY_NOT_MODEL_VALIDATION",
 "mean_multiclass_brier_score":sum(x["multiclass_brier_score"] for x in rows)/len(rows) if rows else None,
 "mean_log_loss":sum(x["log_loss"] for x in rows)/len(rows) if rows else None,
 "entries":rows}
out.parent.mkdir(parents=True,exist_ok=True)
out.write_text(json.dumps(payload,indent=2)+"\n")
print(json.dumps({"status":"RESEARCH_HISTORY_VALIDATED","sample_size":len(rows)}))
