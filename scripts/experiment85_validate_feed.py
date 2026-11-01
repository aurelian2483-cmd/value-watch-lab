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
forecasts=data.get("paper_forecasts")
if not isinstance(forecasts,list) or len(forecasts)>100:raise ValueError("Invalid forecast list")
if forecasts:
 audit=data.get("forecast_archive_audit",{})
 if audit.get("status")!="SHA256_VERIFIED_RESEARCH_ONLY" or audit.get("unique_forecasts")!=len(forecasts):
  raise ValueError("Missing archive integrity audit")
 keys=set()
 for f in forecasts:
  if f.get("record_type")!="ARCHIVED_PAPER_FORECAST" or f.get("challenge_eligible")!=0 or f.get("publication_gate")!="BLOCKED":
   raise ValueError("Unsafe archived forecast")
  if f.get("source_first_availability_verified") is not False or f.get("independent_timestamp_attested") is not False:
   raise ValueError("Unattested archived forecast flags changed")
  key=(f.get("league"),f.get("home"),f.get("away"),f.get("kickoff_utc"))
  if any(not isinstance(x,str) or not x.strip() for x in key) or key in keys:raise ValueError("Duplicate or invalid archive fixture")
  keys.add(key)
  created=dt.datetime.fromisoformat(f["generated_at_utc"].replace("Z","+00:00"))
  kickoff=dt.datetime.fromisoformat(f["kickoff_utc"].replace("Z","+00:00"))
  if created.tzinfo is None or kickoff.tzinfo is None or created>=kickoff:raise ValueError("Archive not pre-event")
  probs=[f.get(k) for k in ("prob_home","prob_draw","prob_away")]
  if any(not isinstance(v,(float,int)) or isinstance(v,bool) or not 0<v<1 for v in probs) or abs(sum(probs)-1)>1e-8:
   raise ValueError("Invalid archived probabilities")
  digest=f.get("record_sha256")
  if not isinstance(digest,str) or len(digest)!=64 or any(ch not in "0123456789abcdef" for ch in digest):
   raise ValueError("Invalid archived digest")
if data.get("completed_results")!=[]:raise ValueError("Results cannot be published yet")
if data.get("accuracy",{}).get("value") is not None:raise ValueError("Accuracy cannot be published yet")
print(json.dumps({"status":"PUBLIC_RESEARCH_FEED_VALIDATED","fixtures":len(fixtures),"publication_gate":"BLOCKED"}))
