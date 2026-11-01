#!/usr/bin/env python3
"""Experiment 57: chronological retrospective scoring of frozen Experiment 55 CSVs.
No historical first-availability proof; no challenge eligibility or publication.
"""
import datetime as dt,hashlib,json,math,pathlib,sys,collections
from model_integration_smoke import fit,predict
from experiment23_pipeline import parse
OUT=pathlib.Path("/tmp/experiment57")
SRC=pathlib.Path("/tmp/experiment55-downloaded")
def canonical(x):return json.dumps(x,sort_keys=True,separators=(",",":")).encode()
def sha(b):return hashlib.sha256(b).hexdigest()
def outcome(r):return 0 if r[3]>r[4] else 2 if r[3]<r[4] else 1
def loss(p,y):return -math.log(max(1e-15,p[y]))
def brier(p,y):return sum((v-(1 if k==y else 0))**2 for k,v in enumerate(p))
def metrics(rows,key):
 return {"count":len(rows),"mean_log_loss":sum(loss(x[key],x["outcome_index"]) for x in rows)/len(rows),
 "mean_multiclass_brier":sum(brier(x[key],x["outcome_index"]) for x in rows)/len(rows),
 "top_choice_accuracy":sum(max(range(3),key=lambda k:x[key][k])==x["outcome_index"] for x in rows)/len(rows)}
def main():
 OUT.mkdir(parents=True,exist_ok=True)
 report={"experiment":57,"status":"BLOCKED_PENDING","publication_gate":"BLOCKED","challenge_eligible":0,"ledger_modified":False}
 try:
  required={"E0_2526.csv","E0_2627.csv","snapshot-manifest.json","training-rows.json"}
  if any(not (SRC/n).is_file() for n in required):raise ValueError("frozen input artifact incomplete")
  manifest=json.loads((SRC/"snapshot-manifest.json").read_bytes())
  rows=json.loads((SRC/"training-rows.json").read_bytes())
  if sha(canonical(rows))!=manifest["training_rows_sha256"]:raise ValueError("training row hash mismatch")
  expected={r["filename"]:r["sha256"] for r in manifest["source_snapshots"]}
  if set(expected)!={"E0_2526.csv","E0_2627.csv"}:raise ValueError("unexpected file set")
  parsed={}
  for name in expected:
   raw=(SRC/name).read_bytes()
   if sha(raw)!=expected[name]:raise ValueError("snapshot source hash mismatch: "+name)
   parsed[name]=parse(raw)
  prior=parsed["E0_2526.csv"]
  current=parsed["E0_2627.csv"]
  cutoff=dt.date.fromisoformat(manifest["cutoff_utc"][:10])
  if len(prior)!=380 or len(current)!=80:raise ValueError("unexpected frozen sample counts")
  if any(r[0]>=cutoff for r in current):raise ValueError("current sample exceeds archive cutoff")
  if any(r[0]>=min(r[0] for r in current) for r in prior):raise ValueError("prior season overlaps evaluation")
  reconstructed=[[r[0].isoformat(),r[1],r[2],r[3],r[4],w]
   for group,w in ((prior,0.5),(current,1.0)) for r in group]
  if reconstructed!=rows:raise ValueError("training rows do not match archived source bytes")
  tests=[];train_group_counts=[]
  for day in sorted({r[0] for r in current}):
   historical=[r for r in current if r[0]<day]
   train=[(*r,0.5) for r in prior]+[(*r,1.0) for r in historical]
   if len(train)<100:raise ValueError("insufficient training")
   model=fit(train,2.0)
   raw_counts=[sum(r[5] for r in train if outcome(r)==i) for i in range(3)]
   # Weighted prior frequency baseline from training only, not future results.
   base=[x/sum(raw_counts) for x in raw_counts]
   train_group_counts.append({"evaluation_day":day.isoformat(),"prior_train":len(prior),"current_train":len(historical)})
   for r in current:
    if r[0]!=day:continue
    if r[1] not in model[0] or r[2] not in model[0]:raise ValueError("unseen team in evaluation")
    p=predict(r[1],r[2],model)
    if len(p)!=3 or not all(0<v<1 for v in p) or abs(sum(p)-1)>1e-8:raise ValueError("invalid probability")
    tests.append({"date":day.isoformat(),"home":r[1],"away":r[2],
     "outcome_index":outcome(r),"model_probabilities":p,"baseline_probabilities":base,
     "earlier_current_training_rows":len(historical),
     "training_excluded_same_day":True,"first_availability_verified":False})
  if len(tests)!=len(current):raise ValueError("not every held out result scored")
  model_metrics=metrics(tests,"model_probabilities")
  base_metrics=metrics(tests,"baseline_probabilities")
  bins=[]
  for lo,hi in ((0,0.4),(0.4,0.5),(0.5,0.6),(0.6,0.7),(0.7,1.00000001)):
   selected=[x for x in tests if lo<=max(x["model_probabilities"])<hi]
   bins.append({"confidence_min":lo,"confidence_max":min(hi,1),"count":len(selected),
    "mean_predicted_confidence":sum(max(x["model_probabilities"]) for x in selected)/len(selected) if selected else None,
    "observed_top_choice_accuracy":sum(max(range(3),key=lambda i:x["model_probabilities"][i])==x["outcome_index"] for x in selected)/len(selected) if selected else None})
  (OUT/"retrospective-predictions.json").write_text(json.dumps(tests,indent=2)+"\n")
  report.update(status="RETROSPECTIVE_CHRONOLOGICAL_SCORING_REVIEW_ONLY",
   input_sha256=expected,training_rows_sha256=manifest["training_rows_sha256"],
   evaluation_count=len(tests),date_groups=len(train_group_counts),
   first_evaluation_day=min(x["date"] for x in tests),
   last_evaluation_day=max(x["date"] for x in tests),
   model_metrics=model_metrics,baseline_metrics=base_metrics,
   model_minus_baseline_log_loss=model_metrics["mean_log_loss"]-base_metrics["mean_log_loss"],
   model_minus_baseline_brier=model_metrics["mean_multiclass_brier"]-base_metrics["mean_multiclass_brier"],
   confidence_calibration_bins=bins,chronological_date_split=True,
   same_day_matches_excluded_from_training=True,
   historical_source_first_availability_verified=False,model_calibration_validated=False,
   prospective_performance_validated=False,profitability_validated=False,
   limitations=["Retrospective as-of source availability cannot be independently verified",
     "Only 80 current-season results, insufficient for reliable fine-grained calibration",
     "No market odds or profit validation",
     "No prospective challenge records or publication eligibility"])
 except Exception as e:report.update(status="BLOCKED_AUDIT_ERROR",error=str(e))
 (OUT/"report.json").write_text(json.dumps(report,indent=2)+"\n")
 print(json.dumps({k:report.get(k) for k in ("status","evaluation_count","date_groups","model_minus_baseline_log_loss","error")}))
 if report["status"]=="BLOCKED_AUDIT_ERROR":sys.exit(1)
if __name__=="__main__":main()
