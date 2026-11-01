#!/usr/bin/env python3
"""Experiment 58: paired uncertainty and calibration diagnostics from frozen Exp57 records.
Retrospective research only. No predictions committed or gates opened.
"""
import collections,hashlib,json,math,pathlib,random,statistics,sys
OUT=pathlib.Path("/tmp/experiment58")
SOURCE=pathlib.Path("/tmp/experiment57-downloaded")
def canonical(x): return json.dumps(x,sort_keys=True,separators=(",",":")).encode()
def sha(x): return hashlib.sha256(x).hexdigest()
def scores(p,y):
 if not len(p)==3 or not all(0<v<1 and math.isfinite(v) for v in p) or abs(sum(p)-1)>1e-8:raise ValueError("invalid probabilities")
 return -math.log(p[y]),sum((v-(i==y))**2 for i,v in enumerate(p)),int(max(range(3),key=lambda i:p[i])==y)
def avg(values):return sum(values)/len(values)
def quantile(xs,q):
 s=sorted(xs);pos=(len(s)-1)*q;lo=int(pos);hi=min(lo+1,len(s)-1)
 return s[lo]+(s[hi]-s[lo])*(pos-lo)
def confidence_bins(rows):
 bins=[]
 for lower,upper in ((0,.4),(.4,.5),(.5,.6),(.6,.7),(.7,1.00000001)):
  members=[r for r in rows if lower<=max(r["model_probabilities"])<upper]
  bins.append({"min":lower,"max":min(upper,1),"count":len(members),
   "avg_confidence":avg([max(r["model_probabilities"]) for r in members]) if members else None,
   "observed_accuracy":avg([scores(r["model_probabilities"],r["outcome_index"])[2] for r in members]) if members else None})
 n=len(rows)
 ece=sum(b["count"]/n*abs(b["avg_confidence"]-b["observed_accuracy"]) for b in bins if b["count"])
 return bins,ece
def main():
 OUT.mkdir(parents=True,exist_ok=True)
 report={"experiment":58,"status":"BLOCKED_PENDING","challenge_eligible":0,
         "publication_gate":"BLOCKED","persistent_ledger_modified":False}
 try:
  pfile=SOURCE/"retrospective-predictions.json";rfile=SOURCE/"report.json"
  if not pfile.is_file() or not rfile.is_file():raise ValueError("Experiment 57 artifact missing")
  records=json.loads(pfile.read_bytes());upstream=json.loads(rfile.read_bytes())
  if upstream.get("status")!="RETROSPECTIVE_CHRONOLOGICAL_SCORING_REVIEW_ONLY":raise ValueError("Experiment 57 status invalid")
  if upstream.get("challenge_eligible")!=0 or upstream.get("publication_gate")!="BLOCKED":raise ValueError("upstream publication contract violated")
  if len(records)!=upstream["evaluation_count"] or len(records)!=77:raise ValueError("unexpected sample count")
  identities=[(r["date"],r["home"],r["away"]) for r in records]
  if len(set(identities))!=len(identities):raise ValueError("duplicate fixtures")
  pairs=[];uniform=[]
  for r in records:
   y=r["outcome_index"]
   if y not in (0,1,2) or not r["training_excluded_same_day"]:raise ValueError("leakage guard failed")
   m=scores(r["model_probabilities"],y)
   b=scores(r["baseline_probabilities"],y)
   u=scores([1/3]*3,y)
   pairs.append({"date":r["date"],"model":m,"baseline":b,"uniform":u})
   uniform.append(u)
  observed={metric:avg([r["model"][i]-r["baseline"][i] for r in pairs])
    for i,metric in enumerate(("log_loss","multiclass_brier","top_choice_accuracy"))}
  expected_dll=upstream["model_minus_baseline_log_loss"]
  expected_db=upstream["model_minus_baseline_brier"]
  if abs(observed["log_loss"]-expected_dll)>1e-10 or abs(observed["multiclass_brier"]-expected_db)>1e-10:raise ValueError("recomputed metrics differ from Experiment 57")
  by_day=collections.defaultdict(list)
  for p in pairs:by_day[p["date"]].append(p)
  days=sorted(by_day);rng=random.Random(580057);boot={k:[] for k in observed}
  for _ in range(3000):
   sample=[p for day in rng.choices(days,k=len(days)) for p in by_day[day]]
   for i,k in enumerate(observed):boot[k].append(avg([x["model"][i]-x["baseline"][i] for x in sample]))
  confidence_intervals={k:{"difference_model_minus_baseline":observed[k],
    "bootstrap_95pct_ci":[quantile(boot[k],.025),quantile(boot[k],.975)],
    "interval_excludes_zero":quantile(boot[k],.025)>0 or quantile(boot[k],.975)<0}
    for k in observed}
  bins,ece=confidence_bins(records)
  classwise=[]
  for outcome in range(3):
   classwise.append({"outcome":["home","draw","away"][outcome],
      "average_predicted_probability":avg([r["model_probabilities"][outcome] for r in records]),
      "observed_frequency":avg([int(r["outcome_index"]==outcome) for r in records])})
  report.update(status="RETROSPECTIVE_UNCERTAINTY_DIAGNOSTICS_REVIEW_ONLY",
   evaluation_count=len(records),matchday_clusters=len(days),
   upstream_predictions_sha256=sha(pfile.read_bytes()),
   bootstrap_replicates=3000,bootstrap_seed=580057,bootstrap_unit="matchday",
   paired_model_vs_historical_baseline=confidence_intervals,
   uniform_reference_metrics={"mean_log_loss":avg([r[0] for r in uniform]),"mean_multiclass_brier":avg([r[1] for r in uniform]),
     "top_choice_accuracy":avg([r[2] for r in uniform])},
   top_choice_calibration_bins=bins,top_choice_ece_descriptive=ece,
   classwise_probability_vs_frequency=classwise,
   source_first_availability_verified=False,calibration_validated=False,
   statistically_independent_sample_verified=False,model_validated=False,
   limitations=["Bootstrap intervals approximate uncertainty, do not independently prove calibration",
     "Matchday block bootstrap does not account for all temporal and team dependence",
     "Only 77 retrospective fixtures; comparisons are exploratory and no tuning on this sample is justified",
     "Historical source first-availability remains unverified",
     "Uniform reference is a naive control, not a stronger market-odds benchmark",
     "No verified market odds, EV, profitability or prospective validation"])
 except Exception as exc:report.update(status="BLOCKED_AUDIT_ERROR",error=str(exc))
 (OUT/"report.json").write_text(json.dumps(report,indent=2)+"\n")
 print(json.dumps({k:report.get(k) for k in ("status","evaluation_count","matchday_clusters","error")}))
 if report["status"]=="BLOCKED_AUDIT_ERROR":sys.exit(1)
if __name__=="__main__":main()
