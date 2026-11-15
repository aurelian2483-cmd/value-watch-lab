#!/usr/bin/env python3
"""Fail-closed retrospective structured verification of 18 profile result leads.

Emits per-record evidence to artifact. Does not construct model training rows
or assert pre-event availability. Fetches only existing exact Sporting Life URLs.
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
INPUT=ROOT/"research/horse-v3/next-two-18-result-page-matches.json"
LEADS=ROOT/"research/horse-v3/next-three-profile-history-leads.json"
OUT=Path("/tmp/horse-v3-next-two-verification")

def main():
 OUT.mkdir(parents=True,exist_ok=True)
 ledger=json.loads(INPUT.read_text());leads=json.loads(LEADS.read_text())
 if ledger.get("training_eligible") is not False or leads.get("training_eligible") is not False:
  raise SystemExit("Unapproved source ledger")
 lead_index={(str(x["horse_id"]),str(x["previous_date"])):x for x in leads["rows"]}
 records=[];cache={}
 for match in ledger["matches"]:
  horse=str(match["horse_id"]);date=match["date"];raceid=str(match["race_id"])
  source=lead_index.get((horse,date))
  record={"horse_id":horse,"date":date,"race_id":raceid,
          "status":"UNVERIFIED","training_eligible":False}
  try:
   if not source:raise ValueError("MANIFEST_LEAD_MISSING")
   url=source.get("prior_result_url")
   if not url:
    raise ValueError("EXACT_RESULT_URL_NOT_IN_PROFILE_LEADS")
   if not url.startswith("https://www.sportinglife.com/racing/results/") or "/"+raceid+"/" not in url:
    raise ValueError("UNAPPROVED_URL")
   if url not in cache:
    props,digest=fetch(url)
    cache[url]=(props,digest,dt.datetime.now(dt.timezone.utc).isoformat())
    time.sleep(2)
   props,digest,stamp=cache[url]
   race=props["race"];summary=race["race_summary"]
   if str(summary["race_summary_reference"]["id"])!=raceid or summary["date"]!=date:
    raise ValueError("RACE_ID_DATE_MISMATCH")
   if summary["race_stage"]!="WEIGHEDIN":raise ValueError("UNSETTLED_RACE")
   rides=[r for r in race["rides"] if r["ride_status"]=="RUNNER"]
   matching=[r for r in rides if str(r["horse"]["horse_reference"]["id"])==horse]
   if len(matching)!=1:raise ValueError("HORSE_ID_UNRESOLVED")
   position=matching[0].get("finish_position")
   if type(position) is not int:raise ValueError("POSITION_UNRESOLVED")
   record.update(status="PUBLISHER_STRUCTURED_RESULT_MATCH_RETROSPECTIVE",
                 source_url=url,source_sha256=digest,observed_at_utc=stamp,
                 position=position,observed_starters=len(rides),
                 course=summary.get("course_name"),distance=summary.get("distance"),going=summary.get("going"))
  except Exception as e:
   record["reason"]=str(e)[:250]
  records.append(record)
 report={"schema_version":1,"model_validation":"UNVALIDATED","publication_gate":"BLOCKED",
         "training_eligible":False,"pre_race_capture_attested":False,
         "independent_underlying_data_verified":False,
         "records_checked":len(records),
         "publisher_structured_matches":sum(x["status"]=="PUBLISHER_STRUCTURED_RESULT_MATCH_RETROSPECTIVE" for x in records),
         "unresolved_records":sum(x["status"]!="PUBLISHER_STRUCTURED_RESULT_MATCH_RETROSPECTIVE" for x in records),
         "results":records,"note":"Historical source observation is retrospective, and is not a pre-race model evaluation."}
 (OUT/"verification.json").write_text(json.dumps(report,indent=2)+"\n")
 print(json.dumps({k:report[k] for k in ("records_checked","publisher_structured_matches","unresolved_records")}))
 if report["unresolved_records"]:raise SystemExit("Some source rows unresolved; no training or model comparison")
if __name__=="__main__":main()
