#!/usr/bin/env python3
"""Experiment 63: capture one NEW independently cross-checked fixture and model forecast.
Read-only, paper-only, no ledger changes, no Sky Bet odds or positive EV claims.
"""
import datetime as dt,hashlib,json,pathlib,sys,urllib.request
from experiment23_pipeline import parse
from experiment62_fixture_discovery import main as discover,OUT as DISCOVERY_OUT,norm,stamp
from model_integration_smoke import fit,predict
ROOT=pathlib.Path(__file__).resolve().parents[1]
OUT=pathlib.Path("/tmp/experiment63")
SOURCES={"E0_2526.csv":"https://www.football-data.co.uk/mmz4281/2526/E0.csv",
         "E0_2627.csv":"https://www.football-data.co.uk/mmz4281/2627/E0.csv"}
def canon(x):return json.dumps(x,sort_keys=True,separators=(",",":")).encode()
def sha(raw):return hashlib.sha256(raw).hexdigest()
def main():
 OUT.mkdir(parents=True,exist_ok=True)
 report={"experiment":63,"mode":"PAPER_ONLY_NEW_FIXTURE_FORECAST","status":"BLOCKED_PENDING",
  "publication_gate":"BLOCKED","challenge_eligible":0,"challenge_progress":"0/100",
  "persistent_ledger_modified":False,"sky_bet_odds_verified":False,
  "source_first_availability_verified":False,"independent_timestamp_attested":False}
 try:
  start=dt.datetime.now(dt.timezone.utc)
  discover()
  discovery=json.loads((DISCOVERY_OUT/"report.json").read_text())
  if discovery.get("status")=="BLOCKED_AUDIT_ERROR":raise ValueError("fixture discovery failed")
  fixtures=json.loads((DISCOVERY_OUT/"discovered-fixtures.json").read_text()).get("accepted",[])
  if not fixtures:
   report.update(status="NO_NEW_VERIFIED_FUTURE_FIXTURE",discovery_status=discovery.get("status"),
    reason="No independently corroborated, new future fixture; fail closed")
  else:
   fixture=fixtures[0]
   when=dt.datetime.fromisoformat(fixture["kickoff_utc"].replace("Z","+00:00"))
   if when<=dt.datetime.now(dt.timezone.utc)+dt.timedelta(minutes=90):raise ValueError("kickoff too close")
   training=[];receipts=[]
   for name,url in SOURCES.items():
    before=dt.datetime.now(dt.timezone.utc)
    request=urllib.request.Request(url,headers={"User-Agent":"ValueWatchResearch/1.0"})
    with urllib.request.urlopen(request,timeout=35) as response:
     if response.status!=200:raise ValueError("data source HTTP error")
     raw=response.read(2000001)
     headers={"date":response.headers.get("Date"),"etag":response.headers.get("ETag")}
    after=dt.datetime.now(dt.timezone.utc)
    if not raw or len(raw)>2000000:raise ValueError("invalid source data length")
    (OUT/name).write_bytes(raw)
    rows=parse(raw)
    if len(rows)<30:raise ValueError("too few matches")
    selected=[r for r in rows if r[0]<start.date()]
    weight=0.5 if name=="E0_2526.csv" else 1.0
    training.extend([[r[0].isoformat(),r[1],r[2],r[3],r[4],weight] for r in selected])
    receipts.append({"name":name,"url":url,"sha256":sha(raw),"request_started_at_utc":stamp(before),
     "response_received_at_utc":stamp(after),"http_headers_unverified":headers,
     "parsed_matches":len(rows),"included_matches":len(selected)})
   if len(training)<100:raise ValueError("insufficient training")
   (OUT/"training-rows.json").write_bytes(canon(training)+b"\n")
   model=fit([(dt.date.fromisoformat(r[0]),*r[1:]) for r in training],2.0)
   matches=lambda team:[x for x in model[0] if norm(x)==norm(team)]
   homes=matches(fixture["home"]);aways=matches(fixture["away"])
   if len(homes)!=1 or len(aways)!=1:raise ValueError("team mapping not unique or missing")
   p=predict(homes[0],aways[0],model)
   if abs(sum(p)-1)>1e-8:raise ValueError("probabilities do not sum to one")
   record={"record_type":"NEW_FIXTURE_PAPER_ONLY_NOT_CHALLENGE","league":"E0",
    "home":fixture["home"],"away":fixture["away"],"kickoff_utc":fixture["kickoff_utc"],
    "model_home":homes[0],"model_away":aways[0],"generated_at_utc":stamp(dt.datetime.now(dt.timezone.utc)),
    "prob_home":p[0],"prob_draw":p[1],"prob_away":p[2],
    "model_sha256":sha((ROOT/"scripts/model_integration_smoke.py").read_bytes()),
    "training_rows_sha256":sha(canon(training)),
    "fixture_discovery_report_sha256":sha((DISCOVERY_OUT/"report.json").read_bytes()),
    "source_receipts":receipts,"odds":None,"expected_value":None,
    "source_first_availability_verified":False,"independent_timestamp_attested":False,
    "publication_gate":"BLOCKED","challenge_eligible":0}
   record["record_sha256"]=sha(canon(record))
   (OUT/"forecast.json").write_bytes(canon(record)+b"\n")
   report.update(status="NEW_FIXTURE_PAPER_FORECAST_CAPTURED_UNVALIDATED",
    fixture=fixture,forecast_count=1,training_row_count=len(training),
    forecast_sha256=sha(canon(record)),probabilities={"home":p[0],"draw":p[1],"away":p[2]},
    source_receipts=receipts,discovery_status=discovery["status"])
 except Exception as exc:report.update(status="BLOCKED_AUDIT_ERROR",error=str(exc))
 (OUT/"report.json").write_text(json.dumps(report,indent=2)+"\n")
 print(json.dumps({k:report.get(k) for k in ("status","forecast_count","training_row_count","error")}))
 if report["status"]=="BLOCKED_AUDIT_ERROR":sys.exit(1)
if __name__=="__main__":main()
