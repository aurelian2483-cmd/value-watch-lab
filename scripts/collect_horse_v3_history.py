#!/usr/bin/env python3
"""Expand isolated V3 retrospective historical evidence; never changes V1/V2 files.

Uses the existing Sporting Life parser and eligibility definitions. Downloaded
post-race pages are retrospective only, not independently attested pre-race
forecasts. Intended for small, date-scoped, rate-limited batches.
"""
import argparse
import datetime as dt
import json
import sys
import time
from pathlib import Path

sys.path.insert(0,str(Path(__file__).resolve().parent))
import collect_horse_training_pilot as old

def dates_for_batch(batch):
    if batch=="2025-autumn":
        first,last,step=dt.date(2025,9,1),dt.date(2025,12,31),7
    elif batch=="2026-jan-jun":
        first,last,step=dt.date(2026,1,1),dt.date(2026,6,30),7
    else:
        raise ValueError("Unknown prespecified batch")
    result=[]
    while first<=last:
        result.append(first.isoformat())
        first+=dt.timedelta(days=step)
    return result

def main():
    parser=argparse.ArgumentParser()
    parser.add_argument("--batch",choices=("2025-autumn","2026-jan-jun"),required=True)
    parser.add_argument("--output",default="/tmp/horse-v3-expanded")
    parser.add_argument("--delay-seconds",type=float,default=2.0)
    args=parser.parse_args()
    if args.delay_seconds<1:parser.error("Minimum source request interval is one second")
    root=Path(args.output)/args.batch
    root.mkdir(parents=True,exist_ok=True)
    old.ROOT=root
    dates=dates_for_batch(args.batch)
    summaries=[];failures=[];index_receipts=[];duplicates=set()
    for date in dates:
        url="https://www.sportinglife.com/racing/results/"+date
        cache=root/(date+"-index.json")
        try:
            if cache.exists():
                obj=json.loads(cache.read_text())
                if isinstance(obj,list):
                    raise ValueError("Legacy index cache has no source receipt")
            else:
                props,source_sha=old.fetch(url)
                time.sleep(args.delay_seconds)
                obj={"source":url,"source_sha256":source_sha,"observed_at_utc":dt.datetime.now(dt.timezone.utc).isoformat(),
                     "races":[r for m in props["meetings"] for r in m["races"]
                      if r.get("course_surface",{}).get("surface")=="ALLWEATHER"
                      and r.get("has_handicap") is True
                      and r.get("country_short_name") in ("ENG","SCO","WAL")
                      and r.get("race_stage")=="WEIGHEDIN"]}
                cache.write_text(json.dumps(obj,indent=2)+"\n")
            index_receipts.append({k:obj[k] for k in ("source","source_sha256","observed_at_utc")})
            for s in obj["races"]:
                race_id=str(s["race_summary_reference"]["id"])
                if race_id in duplicates:
                    failures.append({"race_id":race_id,"reason":"DUPLICATE_RACE_ID"})
                    continue
                duplicates.add(race_id)
                summaries.append(s)
        except Exception as exc:
            failures.append({"date":date,"reason":"INDEX_FETCH_FAILED","detail":str(exc)[:300]})
    races=[]
    for summary in summaries:
        race_id=str(summary["race_summary_reference"]["id"])
        try:
            before=(root/"cards"/(race_id+".json")).exists()
            result=old.card(summary)
            races.append(result)
            if not before:time.sleep(args.delay_seconds)
        except Exception as exc:
            failures.append({"race_id":race_id,"reason":"CARD_INELIGIBLE_OR_FETCH_FAILED","detail":str(exc)[:300]})
            time.sleep(args.delay_seconds)
    races.sort(key=lambda r:(r["date"],r["race_id"]))
    output={"schema_version":1,"v3_batch":args.batch,"research_only":True,"model_validation":"UNVALIDATED",
            "publication_gate":"BLOCKED","evidence_type":"RETROSPECTIVE_RECONSTRUCTED_FINAL_FIELDS",
            "design":"Predeclared weekly dates, all completed GB all-weather handicaps; minimum 4 final runners and single winner. No success-based selection.",
            "limitations":["Downloaded after event; original pre-race card availability not attested",
                           "Racecards and past form may have been corrected retrospectively",
                           "Final runner field is retrospective and cannot prove pre-race non-runner availability",
                           "Single Sporting Life publisher; independent result verification outstanding",
                           "Source collection subject to website permissions and availability",
                           "No pricing, financial returns or prospective model validation"],
            "requested_dates":dates,"date_index_receipts":index_receipts,
            "index_race_candidates":len(summaries),"collected_races":len(races),
            "failures":failures,"races":races}
    (root/"dataset.json").write_text(json.dumps(output,indent=2)+"\n")
    summary={"batch":args.batch,"requested_dates":len(dates),"successful_indexes":len(index_receipts),
             "candidate_races":len(summaries),"collected_races":len(races),
             "failures":len(failures),"status":"RETROSPECTIVE_UNVALIDATED"}
    (root/"summary.json").write_text(json.dumps(summary,indent=2)+"\n")
    print(json.dumps(summary))
    if not races:raise SystemExit("NO_RACES_COLLECTED: check source/errors; do not claim expansion")

if __name__=="__main__":
    main()
