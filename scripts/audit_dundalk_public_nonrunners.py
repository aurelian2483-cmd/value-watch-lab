#!/usr/bin/env python3
"""Evaluate public non-runner evidence against immutable forecast transitions.

A chronological match is descriptive; source first-availability is not attested.
Never auto-release an amended field into BSP or adjust frozen predictions.
"""
import argparse
import json
import unicodedata
from collections import Counter
from pathlib import Path
from horse_market_benchmark_v1 import fingerprint,when
from compare_horse_bsp_models import valid_forecast

def normalized(s):
    if not isinstance(s,str):return ""
    return " ".join("".join(c for c in unicodedata.normalize("NFKD",s).casefold() if not unicodedata.combining(c)).replace("’","'").split()).strip()
def audit(forecasts,evidence):
    if any(evidence.get(k)!=v for k,v in (("kind","MANUALLY_RESEARCHED_PUBLIC_NONRUNNER_REFERENCES_V1"),("research_only",True),("publication_gate","BLOCKED"),("model_validation","UNVALIDATED"),("source_capture_attested",False))):
        raise ValueError("Invalid evidence gate")
    grouped={};invalid=0
    for f in forecasts:
        try:
            key,t,p=valid_forecast(f)
            if any(not normalized(h.get("name")) for h in f["runners"]):raise ValueError("Missing horse name")
            grouped.setdefault(key,[]).append((t,f))
        except (ValueError,TypeError,KeyError,OverflowError):
            invalid+=1
    rows=[];counts=Counter();identities=set()
    for item in evidence["races"]:
        key=(str(item["race_id"]),when(item["startUTC"]))
        if key in identities:raise ValueError("Duplicate evidence race")
        identities.add(key)
        snapshots=sorted(grouped.get(key,[]),key=lambda x:(x[0],x[1]["record_sha256"]))
        known={normalized(h["name"]):h for _,f in snapshots for h in f["runners"]}
        evid=item["nonrunners"]
        observed={}
        for nr in evid:
            n=normalized(nr["name"])
            if not n or n in observed:raise ValueError("Duplicate or empty nonrunner")
            ts=when(nr["logged_at_utc"]) if nr.get("logged_at_utc") else None
            if ts is not None and ts>=key[1]:raise ValueError("Nonrunner recorded after scheduled race")
            observed[n]=ts
        transitions=[]
        for (a,first),(b,last) in zip(snapshots,snapshots[1:]):
            old={normalized(h["name"]) for h in first["runners"]}
            new={normalized(h["name"]) for h in last["runners"]}
            if len(old)!=len(first["runners"]) or len(new)!=len(last["runners"]):
                raise ValueError("Ambiguous normalized horse names")
            removed=sorted(old-new);added=sorted(new-old)
            if added:result="FIELD_CHANGED_NOT_PURE_REMOVAL"
            elif any(n not in observed for n in removed):result="REMOVED_HORSE_NOT_IN_PUBLIC_NONRUNNER_REPORT"
            elif any(observed[n] is None for n in removed):result="FINAL_RESULT_NR_NO_LOG_TIMESTAMP"
            elif any(not (a < observed[n] <= b) for n in removed):result="LOG_TIMELINE_NOT_WITHIN_FORECAST_TRANSITION"
            elif not removed:result="UNCHANGED_FIELD"
            else:result="REGULATOR_LOG_TIMELINE_CONSISTENT"
            counts[result]+=1
            transitions.append({"earlier_forecast_sha256":first["record_sha256"],
                                "later_forecast_sha256":last["record_sha256"],
                                "earlier_frozen_utc":a.isoformat(),"later_frozen_utc":b.isoformat(),
                                "removed_names":removed,"added_names":added,"classification":result,
                                "bsp_released":False})
        final={normalized(h["name"]) for h in snapshots[-1][1]["runners"]} if snapshots else set()
        supported=sorted(n for n in observed if n in known)
        unknown=sorted(n for n in observed if n not in known)
        if not snapshots:status="NO_MATCHING_FROZEN_ARCHIVE"
        elif unknown:status="UNKNOWN_NONRUNNER_NAME"
        elif len(snapshots)<2:status="ONLY_ONE_FORECAST"
        elif any(n in final for n in observed):status="FINAL_ARCHIVE_STILL_CONTAINS_REPORTED_NONRUNNER"
        elif any(x["classification"] not in ("REGULATOR_LOG_TIMELINE_CONSISTENT","FINAL_RESULT_NR_NO_LOG_TIMESTAMP") for x in transitions):status="INCONSISTENT_OR_INCOMPLETE_TIMELINE"
        elif all(x["classification"]=="REGULATOR_LOG_TIMELINE_CONSISTENT" for x in transitions):status="CONSISTENT_WITH_REPORTED_REGULATOR_TIMELINE"
        else:status="FINAL_NONRUNNER_STATUS_ONLY_NO_LOGGED_TIMES"
        rows.append({"race_id":key[0],"startUTC":key[1].isoformat(),
                     "reported_source_url":item["source"],"reported_source_kind":item["source_kind"],
                     "public_nonrunners":[{"name":n,"reported_logged_at_utc":observed[n].isoformat() if observed[n] else None} for n in sorted(observed)],
                     "forecasts":len(snapshots),"transitions":transitions,
                     "source_first_availability_attested":False,
                     "independent_source_archival_attested":False,
                     "status":status,"bsp_matching_eligible":False})
    report={"schema_version":1,"kind":"HORSE_DUNDALK_PUBLIC_NONRUNNER_CHRONOLOGY_AUDIT_V1",
            "research_only":True,"model_validation":"UNVALIDATED","publication_gate":"BLOCKED",
            "forecast_receipts_checked":len(forecasts),"invalid_forecast_receipts":invalid,
            "source_evidence_races":len(evidence["races"]),"transition_classes":dict(sorted(counts.items())),
            "races":rows,
            "limitations":["Public result names and regulatory times were manually transcribed; underlying pages are not immutable timestamp attestations.",
                           "Regulatory logged time is an event claim, not proof it was available to the model at freeze.",
                           "A transition aligning with a logged withdrawal does not prove correct historic pre-race probability normalization.",
                           "No race released to Betfair BSP comparison, no model version selected, no staking permitted."]}
    report["audit_sha256"]=fingerprint(report)
    return report

def main():
    p=argparse.ArgumentParser()
    p.add_argument("--archive",type=Path,default=Path("research/horse-form-archive/v1"))
    p.add_argument("--evidence",type=Path,default=Path("research/horse-v3/dundalk-public-nonrunner-evidence-2026-11-15.json"))
    p.add_argument("--output",required=True,type=Path)
    a=p.parse_args()
    report=audit([json.loads(path.read_text()) for path in sorted(a.archive.glob("*.json"))],json.loads(a.evidence.read_text()))
    a.output.parent.mkdir(parents=True,exist_ok=True)
    a.output.write_text(json.dumps(report,indent=2)+"\n")
    print(json.dumps({"races":len(report["races"]),"statuses":{x["race_id"]:x["status"] for x in report["races"]},
                      "transition_classes":report["transition_classes"],"publication_gate":"BLOCKED"}))
if __name__=="__main__":main()
