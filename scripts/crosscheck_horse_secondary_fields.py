#!/usr/bin/env python3
"""Cross-check archived divergent horse fields with cached second-publisher results.

Secondary results are after-event evidence, not proof of what was known at any
earlier forecast freeze. Never replace historical forecast rows, auto-resolve
model versions, or infer Betfair runner identities.
"""
import argparse
import json
import re
from collections import Counter
from pathlib import Path
from audit_horse_field_revisions import reconcile
from horse_market_benchmark_v1 import fingerprint,when
from horse_secondary_source import horse_name,course_name

NONRUN={"NR","WD","WITHDRAWN","NON RUNNER"}
FINISHED={"PU","F","UR","BD","RO","RR","SU","DSQ"}

def secondary_rows(paths):
    verified=[];invalid=Counter()
    for path in paths:
        try:
            obj=json.loads(path.read_text())
            sig=obj["record_sha256"]
            if sig!=path.stem or fingerprint({k:v for k,v in obj.items() if k!="record_sha256"})!=sig:
                raise ValueError("HASH_MISMATCH")
            receipt=obj["receipt"];row=obj["row"]
            if not str(receipt.get("url","")).startswith("https://api.theracingapi.com/v1/results/today/free?"):
                raise ValueError("UNTRUSTED_RECEIPT_URL")
            if not re.fullmatch("[a-f0-9]{64}",str(receipt.get("sha256",""))):
                raise ValueError("UNVERIFIED_RECEIPT_SHA")
            when(receipt["observed_at_utc"]);when(row["off_dt"])
            if row["region"] not in ("GB","IRE"):raise ValueError("NOT_GB_IRE")
            verified.append({"row":row,"receipt":receipt,"source_sha256":sig})
        except (ValueError,KeyError,TypeError,OverflowError) as exc:
            invalid["INVALID_SECONDARY_RECORD"]+=1
    return verified,dict(invalid)

def compare(forecasts,secondary):
    report=reconcile(forecasts)
    index={}
    for item in secondary:
        row=item["row"]
        try:
            k=(course_name(row["course"]),when(row["off_dt"]).date().isoformat())
            index.setdefault(k,[]).append(item)
        except (ValueError,KeyError,TypeError):continue
    stats=Counter()
    for race in report["races"]:
        when_start=when(race["startUTC"])
        lookup=(course_name(race["racecourse"]),when_start.date().isoformat())
        candidates=[]
        for candidate in index.get(lookup,[]):
            row=candidate["row"]
            if abs((when(row["off_dt"])-when_start).total_seconds())<=60:
                candidates.append(candidate)
        unique={fingerprint(c["row"]):c for c in candidates}
        if not unique:
            status="SECONDARY_RESULT_NOT_IN_ARCHIVE"
        elif len(unique)!=1:
            status="SECONDARY_RESULT_AMBIGUOUS_OR_REVISED"
        else:
            candidate=next(iter(unique.values()))
            field=candidate["row"].get("runners")
            if not isinstance(field,list) or not field:
                status="SECONDARY_RUNNERS_UNAVAILABLE"
            else:
                starters=[];nonrunners=[];bad=False
                for row in field:
                    name=horse_name(row.get("horse",""))
                    position=str(row.get("position","")).strip().upper()
                    if not name or (not position.isdigit() and position not in NONRUN|FINISHED):
                        bad=True;break
                    if position in NONRUN:nonrunners.append(name)
                    else:starters.append(name)
                if len(set(starters+nonrunners))!=len(starters+nonrunners):bad=True
                if bad or not starters:
                    status="SECONDARY_FIELD_MALFORMED"
                else:
                    revisions=race["model_or_capture_snapshots"]
                    # Archived forecast contains IDs; names must be recovered
                    # from corresponding unchanged SHA-verifiable originals.
                    by_hash={f["record_sha256"]:f for f in forecasts}
                    names=[]
                    for rev in revisions:
                        source=by_hash.get(rev["record_sha256"])
                        if source is None:continue
                        aliases=[horse_name(h["name"]) for h in source["runners"]]
                        names.append({"record_sha256":rev["record_sha256"],
                                      "starter_set_matches":set(aliases)==set(starters),
                                      "additional_names":sorted(set(aliases)-set(starters)),
                                      "missing_names":sorted(set(starters)-set(aliases))})
                    race["secondary_evidence"]={
                        "source_result_sha256":candidate["source_sha256"],
                        "source_observed_at_utc":candidate["receipt"]["observed_at_utc"],
                        "result_runner_count":len(starters),
                        "result_nonrunner_count":len(nonrunners),
                        "forecast_matches":names,
                        "final_nonrunner_names":sorted(nonrunners)}
                    matched=[n for n in names if n["starter_set_matches"]]
                    if len(matched)==1:status="ONE_FORECAST_FIELD_MATCHES_SECONDARY_FINAL_STARTERS"
                    elif len(matched)>1:status="MULTIPLE_FORECASTS_MATCH_SECONDARY_FINAL_STARTERS"
                    else:status="NO_FORECAST_FIELD_MATCHES_SECONDARY_FINAL_STARTERS"
        race["secondary_check_status"]=status
        race["status"]="UNRESOLVED_AWAITING_INDEPENDENT_FINAL_FIELD_EVIDENCE"
        race["bsp_matching_eligible"]=False
        stats[status]+=1
    report["secondary_result_crosscheck"]={
        "checked_secondary_rows":len(secondary),
        "classification_counts":dict(sorted(stats.items())),
        "note":"Secondary published final field is after-event evidence, not a verified pre-off scratch timeline or Betfair match."}
    report["audit_sha256"]=fingerprint({k:v for k,v in report.items() if k!="audit_sha256"})
    return report

def main():
    p=argparse.ArgumentParser()
    p.add_argument("--archive",type=Path,default=Path("research/horse-form-archive/v1"))
    p.add_argument("--secondary",type=Path,default=Path("research/horse-secondary-results/v1"))
    p.add_argument("--output",type=Path,required=True)
    a=p.parse_args()
    forecast=[json.loads(path.read_text()) for path in sorted(a.archive.glob("*.json"))]
    secondary,invalid=secondary_rows(sorted(a.secondary.glob("*.json")))
    report=compare(forecast,secondary)
    report["invalid_secondary_receipts"]=invalid
    report["audit_sha256"]=fingerprint({k:v for k,v in report.items() if k!="audit_sha256"})
    a.output.parent.mkdir(parents=True,exist_ok=True)
    a.output.write_text(json.dumps(report,indent=2)+"\n")
    print(json.dumps({"conflicting_races":report["unique_races_with_conflicting_fields"],
                      "secondary_crosscheck":report["secondary_result_crosscheck"]["classification_counts"],
                      "secondary_records_loaded":len(secondary),
                      "bsp_races_released":0,
                      "publication_gate":"BLOCKED"}))
if __name__=="__main__":main()
