#!/usr/bin/env python3
"""Experiment 68: paper-only batch fixture forecasts, immutable run artifacts.
Never rewrite prior captures, persistent ledger, website, or challenge.
"""
import datetime as dt,hashlib,json,pathlib,sys,urllib.request
from experiment62_fixture_discovery import main as discover,OUT as DISCOVERY,norm,stamp
from experiment23_pipeline import parse
from model_integration_smoke import fit,predict
OUT=pathlib.Path("/tmp/experiment68");OUT.mkdir(parents=True,exist_ok=True)
ROOT=pathlib.Path(__file__).resolve().parents[1]
URLS={"E0_2526.csv":"https://www.football-data.co.uk/mmz4281/2526/E0.csv",
"E0_2627.csv":"https://www.football-data.co.uk/mmz4281/2627/E0.csv"}
def canonical(x):return json.dumps(x,sort_keys=True,separators=(",",":")).encode()
def digest(x):return hashlib.sha256(x).hexdigest()
def main():
 report={"experiment":68,"status":"BLOCKED_PENDING","publication_gate":"BLOCKED",
 "model_validation":"UNVALIDATED","challenge_eligible":0,"challenge_progress":"0/100",
 "persistent_ledger_modified":False,"verified_sky_bet_odds":False}
 try:
  start=dt.datetime.now(dt.timezone.utc)
  discover()
  discovery=json.loads((DISCOVERY/"report.json").read_text())
  if discovery.get("status")=="BLOCKED_AUDIT_ERROR":raise ValueError("fixture discovery failed")
  fixtures=json.loads((DISCOVERY/"discovered-fixtures.json").read_text()).get("accepted",[])
  registry_path=pathlib.Path("/tmp/experiment68-history/registry.json")
  if not registry_path.is_file():raise ValueError("missing cross-experiment registry")
  registry=json.loads(registry_path.read_text())
  if registry.get("complete") is not True or registry.get("experiment63_artifact_count",0)<1 and registry.get("archive_record_count",0)<1:
   raise ValueError("incomplete cross-experiment registry")
  existing={(norm(r["home"]),norm(r["away"]),r["kickoff_utc"]) for r in registry["forecasts"]}
  pending=[x for x in fixtures if (norm(x["home"]),norm(x["away"]),x["kickoff_utc"]) not in existing]
  future=[x for x in pending if dt.datetime.fromisoformat(x["kickoff_utc"].replace("Z","+00:00"))>dt.datetime.now(dt.timezone.utc)+dt.timedelta(minutes=90)]
  training=[];receipts=[];records=[];skipped=[]
  if future:
   for name,url in URLS.items():
    before=dt.datetime.now(dt.timezone.utc)
    req=urllib.request.Request(url,headers={"User-Agent":"ValueWatchResearch/1.0"})
    with urllib.request.urlopen(req,timeout=35) as response:
     if response.status!=200:raise ValueError("historical CSV HTTP failure")
     raw=response.read(2000001)
    after=dt.datetime.now(dt.timezone.utc)
    if not raw or len(raw)>2000000:raise ValueError("historical CSV size failure")
    (OUT/name).write_bytes(raw)
    rows=parse(raw)
    if len(rows)<30:raise ValueError("insufficient source rows")
    included=[r for r in rows if r[0]<start.date()]
    weight=0.5 if name=="E0_2526.csv" else 1.0
    training.extend([[r[0].isoformat(),r[1],r[2],r[3],r[4],weight] for r in included])
    receipts.append({"filename":name,"url":url,"sha256":digest(raw),
     "request_started_at_utc":stamp(before),"response_received_at_utc":stamp(after),
     "source_first_availability_verified":False,"included_rows":len(included)})
   if len(training)<100:raise ValueError("insufficient training rows")
   (OUT/"training-rows.json").write_bytes(canonical(training)+b"\n")
   model=fit([(dt.date.fromisoformat(r[0]),*r[1:]) for r in training],2.0)
   teams={norm(k):k for k in model[0]}
   if len(teams)!=len(model[0]):raise ValueError("ambiguous canonical team mapping")
   for fixture in future:
    h=teams.get(norm(fixture["home"]));a=teams.get(norm(fixture["away"]))
    if not h or not a:
     skipped.append({"fixture":fixture,"reason":"team not in model"});continue
    if dt.datetime.fromisoformat(fixture["kickoff_utc"].replace("Z","+00:00"))<=dt.datetime.now(dt.timezone.utc)+dt.timedelta(minutes=90):
     skipped.append({"fixture":fixture,"reason":"kickoff safety buffer elapsed"});continue
    p=predict(h,a,model)
    record={"record_type":"PAPER_ONLY_NOT_CHALLENGE","league":"E0",
     "home":fixture["home"],"away":fixture["away"],"kickoff_utc":fixture["kickoff_utc"],
     "generated_at_utc":stamp(dt.datetime.now(dt.timezone.utc)),
     "prob_home":p[0],"prob_draw":p[1],"prob_away":p[2],
     "fixture_source_sha256":fixture["source_snapshot_sha256"],
     "model_sha256":digest((ROOT/"scripts/model_integration_smoke.py").read_bytes()),
     "training_rows_sha256":digest(canonical(training)),
     "odds":None,"expected_value":None,"publication_gate":"BLOCKED",
     "challenge_eligible":0,"independent_timestamp_attested":False,
     "source_first_availability_verified":False}
    record["record_sha256"]=digest(canonical(record));records.append(record)
  bundle={"schema":"experiment68-paper-batch-v1","run_started_at_utc":stamp(start),
   "forecasts":records,"skipped":skipped,"cross_experiment_registry_used":True,
   "previous_forecast_count":len(existing),"discovery_status":discovery["status"],
   "discovery_report_sha256":digest((DISCOVERY/"report.json").read_bytes()),
   "source_receipts":receipts,"publication_gate":"BLOCKED","challenge_eligible":0}
  (OUT/"manifest.json").write_bytes(canonical(bundle)+b"\n")
  report.update(status="NEW_PAPER_FORECASTS_CAPTURED" if records else "NO_NEW_PAPER_FORECASTS",
   forecast_count=len(records),previous_forecast_count=len(existing),
   discovered_count=len(fixtures),skipped_count=len(skipped),
   manifest_sha256=digest(canonical(bundle)),
   limitations=["Artifacts retained by GitHub Actions only; not an independently immutable ledger",
   "Deduplication covers retained historical artifacts only",
   "No independently attested input availability or timestamp",
   "No verified odds, EV, publication or official challenge credit"])
 except Exception as e:report.update(status="BLOCKED_AUDIT_ERROR",error=str(e))
 (OUT/"report.json").write_text(json.dumps(report,indent=2)+"\n")
 print(json.dumps({k:report.get(k) for k in ("status","forecast_count","error")}))
 if report["status"]=="BLOCKED_AUDIT_ERROR":sys.exit(1)
if __name__=="__main__":main()
