#!/usr/bin/env python3
"""Experiment 85: validate a research-only feed before website publication."""
import datetime as dt,json,pathlib,sys
source=pathlib.Path(sys.argv[1])
data=json.loads(source.read_text())
now=dt.datetime.now(dt.timezone.utc)
when=dt.datetime.fromisoformat(data["generated_at_utc"].replace("Z","+00:00"))
if when.tzinfo is None or not -dt.timedelta(minutes=5)<=now-when<=dt.timedelta(hours=2):
 raise ValueError("Feed timestamp invalid or stale")
if data.get("schema_version")!=1 or data.get("research_only") is not True or data.get("model_validation")!="UNVALIDATED" or data.get("publication_gate")!="BLOCKED":
 raise ValueError("Research safety flags invalid")
if data.get("official_challenge",{}).get("completed")!=0 or data.get("official_challenge",{}).get("target")!=100:
 raise ValueError("Challenge gate mismatch")
if data.get("source_audits",{}).get("espn")!="COVERAGE_AUDIT_READY" or data.get("source_audits",{}).get("football_data_cross_check")!="CROSS_SOURCE_AUDIT_READY":
 raise ValueError("Required source audits missing")
fixtures=data.get("upcoming_fixtures")
if not isinstance(fixtures,list) or not fixtures or len(fixtures)>100:raise ValueError("Missing or implausible fixture list")
seen=set()
for f in fixtures:
 if f.get("forecast_eligible") is not False or f.get("paper_prediction") is not None or f.get("result") is not None:
  raise ValueError("Unsafe fixture content")
 if f.get("verification") not in ("UNVERIFIED","SCHEDULE_CROSS_CHECK"):raise ValueError("Invalid verification label")
 key=(f.get("home"),f.get("away"),f.get("kickoff_utc"))
 if not all(isinstance(v,str) and v.strip() for v in key) or key in seen:raise ValueError("Invalid or duplicate fixture")
 seen.add(key)
 kickoff=dt.datetime.fromisoformat(key[2].replace("Z","+00:00"))
 if kickoff.tzinfo is None or kickoff<now-dt.timedelta(minutes=120) or kickoff>now+dt.timedelta(days=22):raise ValueError("Fixture outside permitted horizon")
if data.get("paper_forecasts")!=[] or data.get("completed_results")!=[]:raise ValueError("Unexpected prediction or result publication")
if data.get("accuracy",{}).get("value") is not None:raise ValueError("Accuracy cannot be published yet")
print(json.dumps({"status":"PUBLIC_RESEARCH_FEED_VALIDATED","fixtures":len(fixtures),"publication_gate":"BLOCKED"}))
