#!/usr/bin/env python3
"""Experiment 59: retrospective, margin-adjusted closing-odds benchmark.
Closing market prices are comparator ONLY, never training/prediction inputs.
"""
import collections,csv,datetime as dt,hashlib,io,json,math,pathlib,random,sys
OUT=pathlib.Path("/tmp/experiment59")
SOURCE=pathlib.Path("/tmp/experiment55-downloaded")
PRED=pathlib.Path("/tmp/experiment57-downloaded")
CANDIDATES=[("AvgCH","AvgCD","AvgCA"),("B365CH","B365CD","B365CA")]
def canonical(x):return json.dumps(x,sort_keys=True,separators=(",",":")).encode()
def sha(x):return hashlib.sha256(x).hexdigest()
def score(p,y):return (-math.log(max(1e-15,p[y])),sum((p[i]-(i==y))**2 for i in range(3)))
def mean(xs):return sum(xs)/len(xs)
def quantile(values,q):
 s=sorted(values);pos=(len(s)-1)*q;i=int(pos)
 return s[i]+(s[min(i+1,len(s)-1)]-s[i])*(pos-i)
def main():
 OUT.mkdir(parents=True,exist_ok=True)
 report={"experiment":59,"status":"BLOCKED_PENDING","challenge_eligible":0,"publication_gate":"BLOCKED","ledger_modified":False,"market_odds_used_as_model_inputs":False}
 try:
  manifest=json.loads((SOURCE/"snapshot-manifest.json").read_bytes())
  training=json.loads((SOURCE/"training-rows.json").read_bytes())
  if sha(canonical(training))!=manifest["training_rows_sha256"]:raise ValueError("frozen training hash invalid")
  snapshot={s["filename"]:s for s in manifest["source_snapshots"]}
  if set(snapshot)!={"E0_2526.csv","E0_2627.csv"}:raise ValueError("unexpected snapshot list")
  for name,s in snapshot.items():
   if sha((SOURCE/name).read_bytes())!=s["sha256"]:raise ValueError("snapshot hash mismatch: "+name)
  predictions=json.loads((PRED/"retrospective-predictions.json").read_bytes())
  upstream=json.loads((PRED/"report.json").read_bytes())
  if upstream["status"]!="RETROSPECTIVE_CHRONOLOGICAL_SCORING_REVIEW_ONLY" or len(predictions)!=upstream["evaluation_count"] or len(predictions)!=77:raise ValueError("unverified Experiment 57 records")
  with (SOURCE/"E0_2627.csv").open(encoding="utf-8-sig",newline="") as fh:
   reader=csv.DictReader(fh);headers=set(reader.fieldnames or []);csvrows=list(reader)
  present=[cols for cols in CANDIDATES if set(cols)<=headers]
  if not present:raise ValueError("no documented closing 1X2 columns present")
  odds_by_key={}
  for r in csvrows:
   if not all(r.get(k) for k in ("Date","HomeTeam","AwayTeam")):continue
   key=(dt.datetime.strptime(r["Date"],"%d/%m/%Y").date().isoformat(),r["HomeTeam"],r["AwayTeam"])
   if key in odds_by_key:raise ValueError("duplicate source fixture key")
   odds_by_key[key]=r
  matched=[];excluded=[];counts=collections.Counter()
  for pred in predictions:
   key=(pred["date"],pred["home"],pred["away"])
   if key not in odds_by_key:raise ValueError("missing fixture identity: "+str(key))
   row=odds_by_key[key]
   selected=None
   # Average closing market is preferred; Bet365 closing used only if average absent/invalid.
   for cols in present:
    try:odds=[float(row[c]) for c in cols]
    except (ValueError,TypeError):continue
    if not all(math.isfinite(v) and 1.01<=v<=1000 for v in odds):continue
    implied=[1/x for x in odds];overround=sum(implied)
    if not .95<=overround<=1.5:continue
    selected=(cols,odds,[x/overround for x in implied],overround)
    break
   if selected is None:
    excluded.append({"fixture":list(key),"reason":"no complete plausible 1X2 closing prices"})
    continue
   cols,odds,market,overround=selected
   y=pred["outcome_index"];model=pred["model_probabilities"]
   if y not in (0,1,2) or abs(sum(model)-1)>1e-8:raise ValueError("invalid model prediction")
   ms=score(model,y);bs=score(market,y)
   counts["/".join(cols)]+=1
   matched.append({"fixture":list(key),"outcome_index":y,
    "model_probabilities":model,"closing_market_probabilities":market,
    "closing_odds":odds,"closing_columns":list(cols),"overround":overround,
    "model_log_loss":ms[0],"market_log_loss":bs[0],
    "model_brier":ms[1],"market_brier":bs[1]})
  if len(matched)+len(excluded)!=len(predictions):raise ValueError("coverage reconciliation failed")
  if len(matched)<30:raise ValueError("insufficient comparable closing odds")
  by_day=collections.defaultdict(list)
  for r in matched:by_day[r["fixture"][0]].append(r)
  days=sorted(by_day);rng=random.Random(590059)
  diffs={"log_loss":[],"brier":[]}
  for _ in range(3000):
   sample=[r for day in rng.choices(days,k=len(days)) for r in by_day[day]]
   for metric in diffs:diffs[metric].append(mean([r["model_"+metric]-r["market_"+metric] for r in sample]))
  metric_report={}
  for metric,simulations in diffs.items():
   delta=mean([r["model_"+metric]-r["market_"+metric] for r in matched])
   ci=[quantile(simulations,.025),quantile(simulations,.975)]
   metric_report[metric]={"model_mean":mean([r["model_"+metric] for r in matched]),
    "closing_market_mean":mean([r["market_"+metric] for r in matched]),
    "model_minus_market":delta,"bootstrap_matchday_95pct_ci":ci,
    "ci_excludes_zero":ci[0]>0 or ci[1]<0}
  (OUT/"matched-closing-odds.json").write_text(json.dumps(matched,indent=2)+"\n")
  report.update(status="CLOSING_MARKET_RETROSPECTIVE_BENCHMARK_REVIEW_ONLY",
   evaluated_predictions=len(predictions),matched_fixtures=len(matched),unmatched_fixtures=len(excluded),
   excluded=excluded,closing_column_usage=dict(counts),
   margin_adjustment="normalize_inverse_decimal_odds",
   source="football-data.co.uk archived E0 2026-27 CSV from Experiment 55",
   source_snapshot_sha256=snapshot["E0_2627.csv"]["sha256"],
   reference_predictions_sha256=sha((PRED/"retrospective-predictions.json").read_bytes()),
   overround_mean=mean([r["overround"] for r in matched]),
   results=metric_report,bootstrap_replicates=3000,bootstrap_clusters=len(days),
   bookmaker_prices_independently_verified=False,
   actual_market_closing_time_independently_verified=False,
   model_accuracy_validated=False,positive_ev_validated=False,prospective_challenge_eligible=0,
   limitations=["Closing odds are retrospective post-forecast comparison only, never features or tradable pre-forecast prices",
    "Historical odds and their exact closing times are not independently corroborated",
    "Closing market prices do not establish value against earlier available prices or Sky Bet odds",
    "Exploratory small sample; bootstrap approximate and no profit/EV validation"])
 except Exception as exc:report.update(status="BLOCKED_AUDIT_ERROR",error=str(exc))
 (OUT/"report.json").write_text(json.dumps(report,indent=2)+"\n")
 print(json.dumps({k:report.get(k) for k in ("status","matched_fixtures","unmatched_fixtures","error")}))
 if report["status"]=="BLOCKED_AUDIT_ERROR":sys.exit(1)
if __name__=="__main__":main()
