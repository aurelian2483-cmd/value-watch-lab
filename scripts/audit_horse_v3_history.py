#!/usr/bin/env python3
"""Independent integrity/coverage audit for isolated V3 retrospective batches.

Audits provenance and structural correctness only. Does NOT establish historical
pre-event availability, independent result verification, or model validation.
"""
import argparse
import datetime as dt
import hashlib
import json
import math
from collections import Counter
from pathlib import Path
from urllib.parse import urlsplit

REQUIRED_RACE=("race_id","date","racecourse","distance","race_class","surface","source","source_sha256","observed_at_utc","runners")
def check_timestamp(value):
    d=dt.datetime.fromisoformat(value.replace("Z","+00:00"))
    if d.tzinfo is None:raise ValueError("timestamp lacks offset")
    return d.astimezone(dt.timezone.utc)
def check_digest(s):
    return isinstance(s,str) and len(s)==64 and all(c in "0123456789abcdef" for c in s)
def check_dataset(d):
    failures=[];missing=Counter();seen=set();dates=set();total_runners=0
    if d.get("research_only") is not True or d.get("model_validation")!="UNVALIDATED" or d.get("publication_gate")!="BLOCKED":
        failures.append("UNSAFE_DATASET_STATUS")
    if d.get("evidence_type")!="RETROSPECTIVE_RECONSTRUCTED_FINAL_FIELDS":failures.append("INVALID_EVIDENCE_TYPE")
    if d.get("collected_races")!=len(d.get("races",[])):failures.append("COUNT_MISMATCH")
    requested=set(d.get("requested_dates",[]))
    receipts=d.get("date_index_receipts",[])
    for receipt in receipts:
        if not check_digest(receipt.get("source_sha256")):failures.append("INVALID_INDEX_RECEIPT_DIGEST")
        try:check_timestamp(receipt["observed_at_utc"])
        except (KeyError,TypeError,ValueError):failures.append("INVALID_INDEX_RECEIPT_TIME")
    for race in d.get("races",[]):
        rid=str(race.get("race_id",""))
        if not rid or rid in seen:failures.append("MISSING_OR_DUPLICATE_RACE_ID:"+rid)
        seen.add(rid)
        if any(k not in race for k in REQUIRED_RACE):
            failures.append("INCOMPLETE_RACE:"+rid);continue
        dates.add(race["date"])
        if race["date"] not in requested:failures.append("UNREQUESTED_DATE:"+rid)
        if race["surface"]!="ALLWEATHER":failures.append("OUT_OF_SCOPE_SURFACE:"+rid)
        url=urlsplit(race["source"])
        if url.scheme!="https" or url.hostname!="www.sportinglife.com" or "/racecard/"+rid+"/" not in url.path:
            failures.append("INVALID_SOURCE_LINK:"+rid)
        if not check_digest(race["source_sha256"]):failures.append("INVALID_CARD_RECEIPT_DIGEST:"+rid)
        try:check_timestamp(race["observed_at_utc"])
        except (KeyError,TypeError,ValueError):failures.append("INVALID_CARD_OBSERVATION_TIME:"+rid)
        runners=race["runners"];total_runners+=len(runners)
        ids=[str(r.get("horse_id","")) for r in runners]
        if len(runners)<4 or "" in ids or len(set(ids))!=len(ids):failures.append("INVALID_RUNNER_FIELD:"+rid)
        if sum(r.get("finish_position")==1 for r in runners)!=1:failures.append("AMBIGUOUS_WINNER:"+rid)
        for r in runners:
            for k in ("official_rating","weight","previous_results"):
                if r.get(k) is None:missing[k]+=1
            if not isinstance(r.get("previous_results"),list):failures.append("INVALID_PREVIOUS_RESULTS:"+rid);continue
            for prior in r["previous_results"]:
                if not isinstance(prior,dict):failures.append("INVALID_PRIOR_ROW:"+rid);continue
                if prior.get("date") and prior["date"]>=race["date"]:failures.append("FUTURE_OR_SAME_DATE_HISTORY:"+rid)
    summary={
        "status":"STRUCTURE_AUDIT_FAILED" if failures else ("STRUCTURE_AUDIT_PASSED_RETROSPECTIVE_ONLY" if seen else "NO_RACES_COLLECTED"),
        "requested_dates":len(requested),"race_dates_covered":len(dates),
        "index_receipts":len(receipts),"race_records":len(seen),"runner_records":total_runners,
        "missing_runner_fields":dict(missing),
        "collector_failure_count":len(d.get("failures",[])),
        "audit_failures":failures[:200],
        "limitations":["No independent source corroboration","Post-race historical pages may be corrected","Raw publisher page bytes are not independently retained in this audit","Source receipts are not proof of first pre-event availability","No model training or betting-value validation"]}
    return summary
def main():
    p=argparse.ArgumentParser();p.add_argument("dataset");p.add_argument("--output");a=p.parse_args()
    path=Path(a.dataset)
    data=json.loads(path.read_text())
    result=check_dataset(data)
    result["dataset_sha256"]=hashlib.sha256(path.read_bytes()).hexdigest()
    rendered=json.dumps(result,indent=2)+"\n"
    if a.output:Path(a.output).write_text(rendered)
    print(rendered)
    if result["status"]!="STRUCTURE_AUDIT_PASSED_RETROSPECTIVE_ONLY":raise SystemExit(1)
if __name__=="__main__":main()
