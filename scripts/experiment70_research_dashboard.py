#!/usr/bin/env python3
"""Experiment 70: read-only, evidence-gated research performance dashboard."""
import datetime as dt,hashlib,html,json,math,pathlib,sys
BASE=pathlib.Path("/tmp/experiment70");BASE.mkdir(parents=True,exist_ok=True)
HISTORY=pathlib.Path("/tmp/experiment68-history")
SCORE=pathlib.Path("/tmp/experiment70-score")
def canonical(v):return json.dumps(v,sort_keys=True,separators=(",",":")).encode()
def sha(v):return hashlib.sha256(v).hexdigest()
def main():
 report={"experiment":70,"status":"BLOCKED_PENDING","model_validation":"UNVALIDATED",
 "publication_gate":"BLOCKED","challenge_progress":"0/100","challenge_eligible":0,
 "persistent_ledger_modified":False}
 try:
  registry=json.loads((HISTORY/"registry.json").read_text())
  if registry.get("complete") is not True or registry.get("experiment63_artifact_count",0)<1:
   raise ValueError("incomplete verified registry")
  rows=[];scores=[];unmatched=[]
  score_candidates=list(SCORE.glob("*/score.json"))
  verified_scores={}
  for path in score_candidates:
   score=json.loads(path.read_text())
   raw=path.read_bytes()
   report_path=path.parent/"report.json"
   if not report_path.exists():raise ValueError("score report missing")
   sr=json.loads(report_path.read_text())
   if sr.get("status")!="POST_MATCH_SCORE_CAPTURED_REVIEW_ONLY" or sr.get("score_sha256")!=sha(canonical(score)):
    raise ValueError("score evidence mismatch")
   fixture=score["fixture"]
   key=(fixture["home"].strip().lower(),fixture["away"].strip().lower(),fixture["kickoff_utc"])
   if key in verified_scores:raise ValueError("multiple scored artifacts for fixture")
   verified_scores[key]=score
  for r in registry["forecasts"]:
   key=(r["home"].strip().lower(),r["away"].strip().lower(),r["kickoff_utc"])
   score=verified_scores.pop(key,None)
   row={"home":r["home"],"away":r["away"],"kickoff_utc":r["kickoff_utc"],
    "original_experiment":r["experiment"],"original_record_sha256":r["record_sha256"],
    "status":"AWAITING_VERIFIED_RESULT"}
   if score:
    if score["frozen_record_sha256"]!=r["record_sha256"]:
     raise ValueError("score does not reference original forecast")
    p=score["frozen_probabilities"];outcome=score["actual_outcome"]
    if len(p)!=3 or any(not isinstance(x,(int,float)) or not math.isfinite(x) or x<=0 or x>=1 for x in p) or abs(sum(p)-1)>1e-8:
     raise ValueError("invalid probabilities")
    idx={"H":0,"D":1,"A":2}[outcome]
    brier=sum((v-int(i==idx))**2 for i,v in enumerate(p))
    loss=-math.log(p[idx])
    if abs(brier-score["multiclass_brier_score"])>1e-10 or abs(loss-score["log_loss"])>1e-10:
     raise ValueError("score arithmetic mismatch")
    row.update(status="SCORED_REVIEW_ONLY",actual_outcome=outcome,
     final_score=score["final_score"],probabilities=p,brier_score=brier,log_loss=loss)
    scores.append((brier,loss))
   rows.append(row)
  if verified_scores:raise ValueError("score for unknown fixture")
  summary={"original_forecasts":len(rows),"scored":len(scores),"awaiting_result":len(rows)-len(scores),
   "duplicates_excluded":len(registry.get("duplicate_records",[])),
   "mean_brier_score":sum(x[0] for x in scores)/len(scores) if scores else None,
   "mean_log_loss":sum(x[1] for x in scores)/len(scores) if scores else None}
  payload={"summary":summary,"fixtures":rows,"limitations":[
   "Historical artifact retention does not prove source first availability",
   "A GitHub receipt alone is not an independently trusted timestamp",
   "Scores are research-only; no profitability or betting value is established"]}
  (BASE/"dashboard.json").write_bytes(canonical(payload)+b"\n")
  def fmt(x):return "—" if x is None else f"{x:.4f}"
  tr=[]
  for r in rows:
   final=r.get("final_score")
   result=f"{final['home']}–{final['away']}" if final else "Pending"
   tr.append("<tr>"+"".join("<td>"+html.escape(str(v))+"</td>" for v in [
    r["home"]+" vs "+r["away"],r["kickoff_utc"],r["original_experiment"],
    r["status"],result,fmt(r.get("brier_score")),fmt(r.get("log_loss"))])+"</tr>")
  page="""<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Value Watch — Research performance</title>
<style>body{font:16px system-ui,sans-serif;max-width:1050px;margin:30px auto;padding:0 18px;background:#101827;color:#edf2f7}h1{font-size:1.8rem}.muted{color:#b6c5d8}.stats{display:flex;flex-wrap:wrap;gap:12px}.stat{background:#202e42;padding:18px;border-radius:12px;min-width:145px}.stat strong{display:block;font-size:1.5rem}table{width:100%;border-collapse:collapse;min-width:700px}th,td{padding:12px;text-align:left;border-bottom:1px solid #34445c}.scroll{overflow-x:auto}.warning{border-left:4px solid #e9ad48;padding:12px;background:#253044}</style>
<h1>Value Watch — Research performance</h1><p class="warning">UNVALIDATED · PUBLICATION BLOCKED · OFFICIAL CHALLENGE 0/100 · PAPER ONLY</p>
<div class="stats">"""
  for label,value in [("Original forecasts",summary["original_forecasts"]),("Scored",summary["scored"]),("Pending",summary["awaiting_result"]),("Duplicates excluded",summary["duplicates_excluded"]),("Mean Brier",fmt(summary["mean_brier_score"])),("Mean log loss",fmt(summary["mean_log_loss"]))]:
   page+=f'<div class="stat"><span class="muted">{html.escape(label)}</span><strong>{value}</strong></div>'
  page+='</div><h2>Original fixtures</h2><div class="scroll"><table><thead><tr><th>Fixture</th><th>Kickoff UTC</th><th>Origin experiment</th><th>Status</th><th>Final score</th><th>Brier</th><th>Log loss</th></tr></thead><tbody>'+''.join(tr)+'</tbody></table></div><p class="muted">Read-only research artifact. No odds, EV, or profitability claim. Missing final evidence remains pending.</p></html>'
  (BASE/"dashboard.html").write_text(page)
  report.update(status="RESEARCH_DASHBOARD_READY",summary=summary,
   dashboard_sha256=sha(canonical(payload)),score_artifacts_reviewed=len(score_candidates))
 except Exception as e:report.update(status="BLOCKED_AUDIT_ERROR",error=str(e))
 (BASE/"report.json").write_text(json.dumps(report,indent=2)+"\n")
 print(json.dumps(report))
 if report["status"]=="BLOCKED_AUDIT_ERROR":sys.exit(1)
if __name__=="__main__":main()
