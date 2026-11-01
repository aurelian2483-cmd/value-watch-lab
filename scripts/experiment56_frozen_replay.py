#!/usr/bin/env python3
"""Experiment 56: reproduce model probabilities from Experiment 55's archived bytes.
Read-only, never counts as an official prospective prediction.
"""
import datetime as dt,hashlib,json,pathlib,sys
from model_integration_smoke import fit,predict
from experiment23_pipeline import parse
from experiment18_team_check import FIXTURES,ALIASES
OUT=pathlib.Path("/tmp/experiment56")
def canonical(x):return json.dumps(x,sort_keys=True,separators=(",",":")).encode()
def sha(x):return hashlib.sha256(x).hexdigest()
def main():
 OUT.mkdir(parents=True,exist_ok=True)
 report={"experiment":56,"status":"BLOCKED_PENDING","publication_gate":"BLOCKED","challenge_eligible":0,"ledger_modified":False}
 try:
  source_dir=pathlib.Path("/tmp/experiment55-downloaded")
  required={"E0_2526.csv","E0_2627.csv","snapshot-manifest.json","training-rows.json"}
  if not all((source_dir/n).is_file() for n in required):raise ValueError("Experiment 55 artifact files missing")
  manifest=json.loads((source_dir/"snapshot-manifest.json").read_bytes())
  rows=json.loads((source_dir/"training-rows.json").read_bytes())
  if sha(canonical(rows))!=manifest["training_rows_sha256"]:raise ValueError("training row hash mismatch")
  if len(rows)!=manifest["training_row_count"] or len(rows)<100:raise ValueError("training row count mismatch")
  expected={x["filename"]:x["sha256"] for x in manifest["source_snapshots"]}
  if set(expected)!={"E0_2526.csv","E0_2627.csv"}:raise ValueError("unexpected source list")
  rebuilt=[]
  for name,weight in (("E0_2526.csv",0.5),("E0_2627.csv",1.0)):
   raw_csv=(source_dir/name).read_bytes()
   if sha(raw_csv)!=expected[name]:raise ValueError("source byte hash mismatch: "+name)
   matches=parse(raw_csv)
   selected=[r for r in matches if r[0]<dt.date.fromisoformat(manifest["cutoff_utc"][:10])]
   rebuilt.extend([[r[0].isoformat(),r[1],r[2],r[3],r[4],weight] for r in selected])
  if rebuilt!=rows:raise ValueError("frozen source-to-training-row reconstruction differs")
  train=[(dt.date.fromisoformat(r[0]),*r[1:]) for r in rows]
  outputs=[]
  for trial in range(2):
   model=fit(train,2.0)
   forecasts=[]
   for home,away,kickoff in FIXTURES:
    h=home if home in model[0] else ALIASES.get(home,home)
    a=away if away in model[0] else ALIASES.get(away,away)
    if h not in model[0] or a not in model[0]:raise ValueError("unrecognized fixture team")
    forecasts.append({"home":home,"away":away,"kickoff_utc":kickoff,"probabilities":predict(h,a,model)})
   outputs.append(forecasts)
  max_difference=max(abs(a-b) for x,y in zip(outputs[0],outputs[1]) for a,b in zip(x["probabilities"],y["probabilities"]))
  if max_difference>1e-10:raise ValueError("non-reproducible probabilities")
  report.update(status="FROZEN_INPUT_REPLAY_REPRODUCIBLE_REVIEW_ONLY",artifact_source="downloaded GitHub Actions Experiment 55 artifact",
    input_hashes=expected,training_rows_sha256=manifest["training_rows_sha256"],
    training_rows=len(rows),fixtures=len(outputs[0]),max_probability_difference=max_difference,
    predictions=outputs[0],source_first_availability_verified=False,model_accuracy_validated=False,
    limitations=["Reproducibility does not establish prediction accuracy or profitability",
      "Historical first-availability and result-completion timestamps remain unverified",
      "GitHub-hosted artifact is not independently witnessed immutable evidence"])
 except Exception as e:report.update(status="BLOCKED_AUDIT_ERROR",error=str(e))
 (OUT/"report.json").write_text(json.dumps(report,indent=2)+"\n")
 print(json.dumps({k:report.get(k) for k in ("status","fixtures","max_probability_difference","error")}))
 if report["status"]=="BLOCKED_AUDIT_ERROR":sys.exit(1)
if __name__=="__main__":main()
