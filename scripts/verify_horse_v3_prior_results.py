#!/usr/bin/env python3
"""Read-only, fail-closed verification of V3 recovered prior races.

Re-fetches published Sporting Life structured results. Never edits original
V1/V2 models, historical archive or approved candidate ledger. A publisher
match is retrospective evidence, NOT independent or pre-event verification.
"""
import datetime as dt
import hashlib
import json
import sys
import time
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parent))
from collect_horse_training_pilot import fetch

ROOT=Path(__file__).resolve().parents[1]
LEDGER=ROOT/"research/horse-v3/recovered-prior-races-pilot.json"
OUT=Path("/tmp/horse-v3-result-verification")

def normalize(value):
 return " ".join(str(value or "").casefold().split())

def verify(row):
 result={"target_race_id":row["target_race_id"],"target_date":row["target_date"],
         "horse_id":row["horse_id"],"horse_name":row["horse_name"],
         "prior_race_id":row["race_id"],"result_url":row["result_url"],
         "status":"REJECTED","retrospective_only":True}
 try:
  target_day=dt.date.fromisoformat(row["target_date"])
  past_day=dt.date.fromisoformat(row["date"])
  if past_day>=target_day:raise ValueError("HISTORY_NOT_BEFORE_TARGET")
  if not str(row["result_url"]).startswith("https://www.sportinglife.com/racing/results/"):
   raise ValueError("UNAPPROVED_SOURCE")
  props,digest=fetch(row["result_url"])
  race=props["race"];summary=race["race_summary"]
  source_id=str(summary["race_summary_reference"]["id"])
  if source_id!=str(row["race_id"]) or summary["date"]!=row["date"]:
   raise ValueError("RACE_ID_OR_DATE_MISMATCH")
  if normalize(summary["course_name"])!=normalize(row["course"]):
   raise ValueError("COURSE_MISMATCH")
  if normalize(summary["distance"])!=normalize(row["distance"]):
   raise ValueError("DISTANCE_MISMATCH")
  if normalize(summary["going"])!=normalize(row["going"]):
   raise ValueError("GOING_MISMATCH")
  if summary["race_stage"]!="WEIGHEDIN":raise ValueError("UNSETTLED_RACE")
  rides=race["rides"]
  horse_ids=[str(ride["horse"]["horse_reference"]["id"]) for ride in rides]
  if len(horse_ids)!=len(set(horse_ids)):raise ValueError("DUPLICATE_SOURCE_HORSE")
  matching=[ride for ride in rides if str(ride["horse"]["horse_reference"]["id"])==str(row["horse_id"])]
  if len(matching)!=1:raise ValueError("MISSING_OR_AMBIGUOUS_HORSE_ID")
  ride=matching[0]
  if normalize(ride["horse"]["name"])!=normalize(row["horse_name"]):
   raise ValueError("HORSE_NAME_MISMATCH")
  if ride["ride_status"]!="RUNNER":raise ValueError("NON_RUNNER")
  actual=ride.get("finish_position")
  if type(actual) is not int or actual!=row["position"]:
   raise ValueError("FINISH_POSITION_MISMATCH")
  starters=sum(r.get("ride_status")=="RUNNER" for r in rides)
  if starters!=row["runner_count"]:raise ValueError("STARTER_COUNT_MISMATCH")
  receipt={"url":row["result_url"],"content_sha256":digest,
           "observed_at_utc":dt.datetime.now(dt.timezone.utc).isoformat()}
  result.update(status="PUBLISHER_RESULT_MATCH_RETROSPECTIVE",
                source_receipt=receipt,
                confirmed={"date":summary["date"],"horse_id":str(row["horse_id"]),
                           "race_id":source_id,"finish_position":actual,"runner_count":starters,
                           "run_type":row["run_type"],"course":summary["course_name"],
                           "distance":summary["distance"],"going":summary["going"]})
 except Exception as e:
  result["error"]=str(e)[:250]
 return result

def main():
 OUT.mkdir(parents=True,exist_ok=True)
 body=LEDGER.read_bytes();ledger=json.loads(body)
 if ledger.get("training_eligible") is not False or ledger.get("publication_gate")!="BLOCKED":
  raise SystemExit("Unsafe candidate ledger")
 rows=ledger["rows"];keys=[(x["target_race_id"],x["horse_id"],x["race_id"]) for x in rows]
 if len(set(keys))!=len(keys):raise SystemExit("Duplicate candidate triples")
 findings=[]
 for row in rows:
  finding=verify(row);findings.append(finding)
  print(json.dumps({"horse_id":finding["horse_id"],"prior_race_id":finding["prior_race_id"],
                    "status":finding["status"],"error":finding.get("error")}),flush=True)
  time.sleep(2)
 report={"schema_version":1,"model_validation":"UNVALIDATED","publication_gate":"BLOCKED",
         "training_eligible":False,"independent_publisher_verified":False,
         "historical_first_availability_attested":False,
         "ledger_sha256":hashlib.sha256(body).hexdigest(),
         "rows_checked":len(rows),
         "publisher_result_matches":sum(x["status"]=="PUBLISHER_RESULT_MATCH_RETROSPECTIVE" for x in findings),
         "rejected_or_unresolved":sum(x["status"]!="PUBLISHER_RESULT_MATCH_RETROSPECTIVE" for x in findings),
         "results":findings,
         "limitations":["One publisher only","Observed retrospectively; does not attest pre-race availability",
                        "No full-field V1 eligibility or training approval","No bookmaker executable prices or betting-value evidence"]}
 (OUT/"verification.json").write_text(json.dumps(report,indent=2)+"\n")
 print(json.dumps({k:report[k] for k in ("rows_checked","publisher_result_matches","rejected_or_unresolved")}))
 if report["rejected_or_unresolved"]:raise SystemExit("Some records failed verification; see artifact")
if __name__=="__main__":main()
