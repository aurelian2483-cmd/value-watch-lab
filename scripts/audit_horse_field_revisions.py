#!/usr/bin/env python3
"""Audit divergent immutable pre-off horse fields without selecting a winner.

Never interpret field changes as withdrawals without separate race-status evidence.
Does not rewrite archives, choose post-hoc winning snapshots or score predictions.
"""
import argparse
import json
from collections import Counter
from pathlib import Path
from compare_horse_bsp_models import valid_forecast
from horse_market_benchmark_v1 import fingerprint

def reconcile(records):
    groups={};invalid=Counter()
    for f in records:
        try:
            key,freeze,prob=valid_forecast(f)
            groups.setdefault(key,[]).append((f,freeze,prob))
        except (ValueError,KeyError,TypeError,OverflowError):
            invalid["INVALID_FORECAST_RECEIPT"]+=1
    rows=[];reasons=Counter();affected=0
    for key,items in sorted(groups.items(),key=lambda x:(x[0][1],x[0][0])):
        fields={tuple(sorted(p)) for _,_,p in items}
        if len(fields)<2:continue
        affected+=len(items)
        revisions=[]
        for f,freeze,p in sorted(items,key=lambda x:(x[1],x[0]["record_sha256"])):
            revisions.append({"record_sha256":f["record_sha256"],"model":f["model"],
                              "frozen_at_utc":freeze.isoformat(),"runner_count":len(p),
                              "runner_ids":sorted(p),
                              "runner_source_sha256":f.get("runner_source_sha256"),
                              "runner_observed_at_utc":f.get("runner_observed_at_utc"),
                              "revision_of":f.get("revision_of")})
        old=set(revisions[0]["runner_ids"]);new=set(revisions[-1]["runner_ids"])
        added=sorted(new-old);removed=sorted(old-new)
        if added and removed:reason="BOTH_ADDED_AND_REMOVED"
        elif added:reason="FIELD_EXPANDED"
        elif removed:reason="FIELD_SHRANK"
        else:reason="INTERMEDIATE_FIELD_REVISED_OR_REVERTED"
        # An observed field change is not proof that a horse was scratched.
        reasons[reason]+=1
        rows.append({"race_id":key[0],"startUTC":key[1].isoformat(),
                     "racecourse":revisions and items[0][0].get("racecourse"),
                     "revisions":len(revisions),"unique_fields":len(fields),
                     "first_to_last_added_ids":added,"first_to_last_removed_ids":removed,
                     "change_class":reason,"model_or_capture_snapshots":revisions,
                     "status":"UNRESOLVED_AWAITING_INDEPENDENT_FINAL_FIELD_EVIDENCE",
                     "bsp_matching_eligible":False,
                     "resolution_required":["Confirm final actual starter field from authorised event evidence",
                                            "Check non-runner/withdrawal timestamps and matching provider IDs",
                                            "Keep historical versions distinct and select one predeclared prediction freeze"]})
    output={"schema_version":1,"kind":"HORSE_FROZEN_FIELD_CONFLICT_AUDIT_V1",
            "research_only":True,"model_validation":"UNVALIDATED","publication_gate":"BLOCKED",
            "forecasts_inspected":len(records),"unique_races_with_conflicting_fields":len(rows),
            "revisions_affected":affected,"classifications":dict(sorted(reasons.items())),
            "invalid_receipts":dict(sorted(invalid.items())),"races":rows,
            "limitations":["No final runner field was independently verified by this report.",
                           "An archive's earlier vs later runner set does not establish a confirmed withdrawal.",
                           "Withheld races remain ineligible for BSP joins until reviewed evidence resolves field differences.",
                           "No forecast, market price, validation grade or staking rule is modified."]}
    output["audit_sha256"]=fingerprint(output)
    return output

def main():
    p=argparse.ArgumentParser()
    p.add_argument("--archive",type=Path,default=Path("research/horse-form-archive/v1"))
    p.add_argument("--v3-archive",type=Path,default=Path("research/horse-v3/live-archive"))
    p.add_argument("--output",type=Path,required=True)
    a=p.parse_args()
    paths=sorted(a.archive.glob("*.json"))+sorted(a.v3_archive.glob("*/*.json"))
    report=reconcile([json.loads(file.read_text()) for file in paths])
    a.output.parent.mkdir(parents=True,exist_ok=True)
    a.output.write_text(json.dumps(report,indent=2)+"\n")
    print(json.dumps({"forecasts_inspected":report["forecasts_inspected"],
                      "conflicting_races":report["unique_races_with_conflicting_fields"],
                      "affected_revisions":report["revisions_affected"],
                      "classifications":report["classifications"],
                      "publication_gate":"BLOCKED"}))
if __name__=="__main__":main()
