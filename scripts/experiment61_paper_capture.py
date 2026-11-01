#!/usr/bin/env python3
"""Experiment 61: paper-only, pre-kickoff input and forecast evidence bundle.
Captures new bytes during this run; never retroactively certifies first availability.
Does NOT write to the ledger, validate Sky Bet odds, or award challenge credit.
"""
import datetime as dt,hashlib,json,pathlib,sys,urllib.request
from experiment23_pipeline import parse
from experiment18_team_check import FIXTURES,ALIASES,OFFICIAL,SECONDARY
from model_integration_smoke import fit,predict
ROOT=pathlib.Path(__file__).resolve().parents[1]
OUT=pathlib.Path("/tmp/experiment61")
URLS={"E0_2526.csv":"https://www.football-data.co.uk/mmz4281/2526/E0.csv",
      "E0_2627.csv":"https://www.football-data.co.uk/mmz4281/2627/E0.csv"}
def stamp():return dt.datetime.now(dt.timezone.utc).isoformat().replace("+00:00","Z")
def canon(x):return json.dumps(x,sort_keys=True,separators=(",",":")).encode()
def sha(x):return hashlib.sha256(x).hexdigest()
def main():
 OUT.mkdir(parents=True,exist_ok=True)
 report={"experiment":61,"mode":"PAPER_ONLY_PREMATCH_CAPTURE","status":"BLOCKED_PENDING",
         "publication_gate":"BLOCKED","challenge_eligible":0,"challenge_progress":"0/100",
         "persistent_ledger_modified":False,"independent_timestamp_verified":False,
         "source_first_availability_verified":False,"sky_bet_odds_verified":False}
 try:
  started=dt.datetime.now(dt.timezone.utc)
  sources=[];training=[]
  for name,url in URLS.items():
   before=stamp()
   req=urllib.request.Request(url,headers={"User-Agent":"ValueWatchResearch/1.0"})
   with urllib.request.urlopen(req,timeout=35) as resp:
    if resp.status!=200:raise ValueError("source HTTP status not 200")
    raw=resp.read(2_000_001)
    hdr={"date":resp.headers.get("Date"),"last_modified":resp.headers.get("Last-Modified"),"etag":resp.headers.get("ETag")}
   after=stamp()
   if not raw or len(raw)>2_000_000:raise ValueError("source empty or oversized")
   parsed=parse(raw)
   if len(parsed)<30:raise ValueError("too few parsed result rows")
   (OUT/name).write_bytes(raw)
   selected=[r for r in parsed if r[0]<started.date()]
   if any(r[0]>=started.date() for r in selected):raise ValueError("training date cutoff violated")
   if not selected:raise ValueError("empty eligible training sample")
   weight=0.5 if name=="E0_2526.csv" else 1.0
   training.extend([r[0].isoformat(),r[1],r[2],r[3],r[4],weight] for r in selected)
   sources.append({"name":name,"url":url,"request_started_at_utc":before,"response_received_at_utc":after,
       "sha256":sha(raw),"bytes":len(raw),"parsed_matches":len(parsed),
       "included_matches":len(selected),"excluded_matches":len(parsed)-len(selected),
       "http_headers_unverified":hdr,"independently_verified_first_available_at_utc":None})
  if len(training)<100:raise ValueError("insufficient training")
  (OUT/"training-rows.json").write_bytes(canon(training)+b"\n")
  model_train=[(dt.date.fromisoformat(r[0]),*r[1:]) for r in training]
  model=fit(model_train,2.0)
  model_hash=sha((ROOT/"scripts/model_integration_smoke.py").read_bytes())
  cutoff=stamp();now=dt.datetime.now(dt.timezone.utc)
  records=[];skipped=[]
  for home,away,kickoff in FIXTURES:
   when=dt.datetime.fromisoformat(kickoff.replace("Z","+00:00"))
   if when<=now+dt.timedelta(minutes=60):
    skipped.append({"fixture":[home,away,kickoff],"reason":"kickoff too close or already passed"})
    continue
   h=home if home in model[0] else ALIASES.get(home,home)
   a=away if away in model[0] else ALIASES.get(away,away)
   if h not in model[0] or a not in model[0]:
    skipped.append({"fixture":[home,away,kickoff],"reason":"team missing from model training"})
    continue
   p=predict(h,a,model)
   record={"type":"NEW_PAPER_ONLY_NOT_CHALLENGE","league":"E0",
      "home":home,"away":away,"model_home":h,"model_away":a,"kickoff_utc":kickoff,
      "generated_at_utc":stamp(),"prob_home":p[0],"prob_draw":p[1],"prob_away":p[2],
      "model_sha256":model_hash,"training_rows_sha256":sha(canon(training)),
      "source_sha256":{s["name"]:s["sha256"] for s in sources},
      "fixture_schedule_sources_named_but_not_refetched":[OFFICIAL,SECONDARY],
      "fixture_asof_verification":False,"odds":None,
      "independent_server_receipt_verified":False,"publication_gate":"BLOCKED",
      "challenge_eligible":0}
   record["record_sha256"]=sha(canon(record))
   records.append(record)
  bundle={"schema":"experiment61-paper-forecast-bundle-v1","capture_started_at_utc":started.isoformat().replace("+00:00","Z"),
    "forecast_cutoff_utc":cutoff,"source_snapshots":sources,"training_row_count":len(training),
    "training_rows_sha256":sha(canon(training)),"model_sha256":model_hash,
    "forecasts":records,"skipped":skipped,
    "source_first_availability_verified":False,"fixture_freshness_verified":False,
    "sky_bet_quote_verified":False,"independent_timestamp_attestation_verified":False,
    "challenge_eligible":0,"publication_gate":"BLOCKED"}
  (OUT/"forecast-bundle.json").write_bytes(canon(bundle)+b"\n")
  report.update(status="PAPER_ONLY_PREKICKOFF_BUNDLE_CAPTURED_NOT_CHALLENGE" if records else "NO_ELIGIBLE_FUTURE_FIXTURES",
   forecast_count=len(records),skipped_count=len(skipped),source_count=len(sources),
   training_row_count=len(training),forecast_bundle_sha256=sha(canon(bundle)),
   source_hashes={s["name"]:s["sha256"] for s in sources},
   limitations=["Scheduled fixtures are hard-coded from previous review; not freshly verified",
    "GitHub runner time is a capture timestamp, not independent notarisation",
    "Recorded source availability is receipt time only, not independent historical first availability",
    "No contemporaneous Sky Bet prices or EV calculated",
    "Pre-kickoff capture here is paper-only and cannot be counted toward official challenge"])
 except Exception as exc:report.update(status="BLOCKED_AUDIT_ERROR",error=str(exc))
 (OUT/"report.json").write_text(json.dumps(report,indent=2)+"\n")
 print(json.dumps({k:report.get(k) for k in ("status","forecast_count","skipped_count","training_row_count","error")}))
 if report["status"]=="BLOCKED_AUDIT_ERROR":sys.exit(1)
if __name__=="__main__":main()
