#!/usr/bin/env python3
"""Allowlisted read-only web summary from a validated research health report.

Only observational research metadata is allowed through. No probability,
selections, bookmaker odds or betting slip fields are exported.
"""
import argparse
import json
from pathlib import Path
from horse_market_benchmark_v1 import fingerprint,when

def make_web_summary(report):
    if not isinstance(report,dict) or any(report.get(k)!=v for k,v in
        {"type":"VALUE_WATCH_HORSE_RESEARCH_HEALTH_V1","research_only":True,
         "model_validation":"UNVALIDATED","publication_gate":"BLOCKED",
         "betting_eligible":False}.items()):
        raise ValueError("Invalid research report gate")
    digest=report.get("report_sha256")
    if not isinstance(digest,str) or digest!=fingerprint({k:v for k,v in report.items() if k!="report_sha256"}):
        raise ValueError("Source research report hash mismatch")
    when(report["report_generated_at_utc"])
    c=report["coverage"]
    names=("current_day_races_with_source_observation",
           "current_day_stale_last_observation_over_60m",
           "current_day_changes_observed","v1_frozen_forecasts",
           "v3_frozen_forecasts","historical_conflicting_field_races")
    values={}
    for k in names:
        v=c[k]
        if type(v) is not int or v<0:raise ValueError("Invalid metric "+k)
        values[k]=v
    result={"schema_version":1,"kind":"HORSE_RESEARCH_PUBLIC_READONLY_STATUS_V1",
            "research_only":True,"model_validation":"UNVALIDATED",
            "publication_gate":"BLOCKED","betting_eligible":False,
            "report_generated_at_utc":report["report_generated_at_utc"],
            "report_day_utc":report["report_day_utc"],
            "source_report_sha256":digest,
            "metrics":values,
            "source_completeness":"PUBLISHER_OBSERVATIONS_ONLY",
            "official_withdrawal_match_status":"NOT_VERIFIED",
            "bsp_comparison_status":"NOT_AVAILABLE",
            "model_recommendations_enabled":False,
            "description":"Descriptive racing research metrics only; not a model performance endorsement or source of betting selections."}
    result["receipt_sha256"]=fingerprint(result)
    return result

def main():
    p=argparse.ArgumentParser()
    p.add_argument("--report",required=True,type=Path)
    p.add_argument("--out",required=True,type=Path)
    a=p.parse_args()
    result=make_web_summary(json.loads(a.report.read_text()))
    a.out.parent.mkdir(parents=True,exist_ok=True)
    a.out.write_text(json.dumps(result,indent=2)+"\n")
    print(json.dumps({"kind":result["kind"],"status":"READONLY_BLOCKED",
                      "generated_at":result["report_generated_at_utc"],
                      "metrics":result["metrics"]}))
if __name__=="__main__":main()
