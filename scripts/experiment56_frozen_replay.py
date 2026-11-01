#!/usr/bin/env python3
"""Experiment 56: reproduce model probabilities from Experiment 55's archived bytes.
Read-only, never counts as an official prospective prediction.
"""
import datetime as dt,hashlib,io,json,os,pathlib,sys,urllib.request,zipfile
from model_integration_smoke import fit,predict
from experiment23_pipeline import parse
from experiment18_team_check import FIXTURES,ALIASES
OUT=pathlib.Path("/tmp/experiment56")
EXPECTED={"E0_2526.csv":"3e3a8352f9ada6789c508d6ca184424421fed56a30400904a4a327c583407e62",
"E0_2627.csv":"4cd9d41c75bdaafce0657cb97ce76438f8016605957af80896b60a0f21955ab2"}
EXPECTED_ROWS="448c116fb5f28bba922b62bb7e41251da38a4cfbb077c056ec48a3780eebb967"
def canonical(x):return json.dumps(x,sort_keys=True,separators=(",",":")).encode()
def sha(x):return hashlib.sha256(x).hexdigest()
def github(path):
 token=os.environ["GH_TOKEN"]
 req=urllib.request.Request("https://api.github.com/"+path,headers={"Authorization":"Bearer "+token,"Accept":"application/vnd.github+json","X-GitHub-Api-Version":"2022-11-28"})
 with urllib.request.urlopen(req,timeout=45) as r:return r.read(3000000)
def main():
 OUT.mkdir(parents=True,exist_ok=True)
 report={"experiment":56,"status":"BLOCKED_PENDING","publication_gate":"BLOCKED","challenge_eligible":0,"ledger_modified":False}
 try:
  listing=json.loads(github("repos/aurelian2483-cmd/value-watch-lab/actions/artifacts?per_page=100"))
  candidates=[a for a in listing.get("artifacts",[]) if a["name"]=="experiment55-input-snapshot-review" and not a["expired"] and a.get("workflow_run",{}).get("head_branch")=="research/prospective-100"]
  if not candidates:raise ValueError("Experiment 55 archived artifact unavailable")
  artifact=max(candidates,key=lambda a:a["created_at"])
  raw=github("repos/aurelian2483-cmd/value-watch-lab/actions/artifacts/"+str(artifact["id"])+"/zip")
  with zipfile.ZipFile(io.BytesIO(raw)) as z:
   names=set(z.namelist())
   if not set(EXPECTED)|{"snapshot-manifest.json","training-rows.json"}<=names:raise ValueError("archive missing required files")
   manifest=json.loads(z.read("snapshot-manifest.json"))
   rows=json.loads(z.read("training-rows.json"))
   if sha(canonical(rows))!=EXPECTED_ROWS or manifest["training_rows_sha256"]!=EXPECTED_ROWS:raise ValueError("training row hash mismatch")
   if len(rows)!=460 or manifest["training_row_count"]!=460:raise ValueError("training row count mismatch")
   rebuilt=[]
   for name,weight in (("E0_2526.csv",0.5),("E0_2627.csv",1.0)):
    raw_csv=z.read(name)
    if sha(raw_csv)!=EXPECTED[name]:raise ValueError("source byte hash mismatch: "+name)
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
  report.update(status="FROZEN_INPUT_REPLAY_REPRODUCIBLE_REVIEW_ONLY",artifact_id=artifact["id"],
    artifact_created_at=artifact["created_at"],input_hashes=EXPECTED,training_rows_sha256=EXPECTED_ROWS,
    training_rows=460,fixtures=len(outputs[0]),max_probability_difference=max_difference,
    predictions=outputs[0],source_first_availability_verified=False,model_accuracy_validated=False,
    limitations=["Reproducibility does not establish prediction accuracy or profitability",
      "Historical first-availability and result-completion timestamps remain unverified",
      "GitHub-hosted artifact is not independently witnessed immutable evidence"])
 except Exception as e:report.update(status="BLOCKED_AUDIT_ERROR",error=str(e))
 (OUT/"report.json").write_text(json.dumps(report,indent=2)+"\n")
 print(json.dumps({k:report.get(k) for k in ("status","fixtures","max_probability_difference","error")}))
 if report["status"]=="BLOCKED_AUDIT_ERROR":sys.exit(1)
if __name__=="__main__":main()
