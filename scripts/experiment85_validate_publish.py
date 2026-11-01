#!/usr/bin/env python3
"""Experiment 85: validate research feed before website JSON publication."""
import datetime as dt,json,pathlib,sys
source=pathlib.Path(sys.argv[1]);dest=pathlib.Path(sys.argv[2])
data=json.loads(source.read_text())
now=dt.datetime.now(dt.timezone.utc)
generated=dt.datetime.fromisoformat(data["generated_at_utc"].replace("Z","+00:00"))
if generated.tzinfo is None or not dt.timedelta(0)<=now-generated<=dt.timedelta(hours=2):
 raise ValueError("Research feed timestamp missing, future-dated or stale")
if data.get("research_only") is not True or data.get("publication_gate")!="BLOCKED" or data.get("model_validation")!="UNVALIDATED":
 raise ValueError("Research safety gates not satisfied")
if data.get("official_challenge",{}).get("completed")!=0:raise ValueError("Official challenge status unexpectedly changed")
if data.get("paper_forecasts")!=[] or data.get("completed_results")!=[]:
 raise ValueError("Unexpected forecasts/results: this publication stage is fixtures-only")
if data.get("accuracy",{}).get("value") is not None:raise ValueError("Accuracy must remain unavailable")
if data.get("source_audits",{}).get("football_data_cross_check")!="CROSS_SOURCE_AUDIT_READY":
 raise ValueError("Independent schedule audit incomplete")
if data.get("source_audits",{}).get("espn")!="COVERAGE_AUDIT_READY":
 raise ValueError("ESPN coverage incomplete")
fixtures=data.get("upcoming_fixtures")
if not isinstance(fixtures,list) or len(fixtures)>100:raise ValueError("Invalid fixture count")
seen=set()
for f in fixtures:
 if f.get("forecast_eligible") is not False:raise ValueError("Unexpected forecast eligibility")
 if f.get("verification") not in ("UNVERIFIED","SCHEDULE_CROSS_CHECK"):raise ValueError("Unknown verification status")
 if not all(isinstance(f.get(k),str) and f[k].strip() for k in ("home","away","kickoff_utc")):raise ValueError("Invalid fixture")
 key=(f["home"].casefold(),f["away"].casefold(),f["kickoff_utc"])
 if key in seen:raise ValueError("Duplicate fixture")
 seen.add(key)
data["website_publication"]={"type":"RESEARCH_FIXTURE_SNAPSHOT","validated_at_utc":now.isoformat(),
 "schedule_cross_checked":sum(f["verification"]=="SCHEDULE_CROSS_CHECK" for f in fixtures),
 "not_a_live_odds_or_betting_feed":True}
dest.write_text(json.dumps(data,indent=2)+"\n")
print("Research-only fixture feed validated:",len(fixtures),"fixtures")
