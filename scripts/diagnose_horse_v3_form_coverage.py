#!/usr/bin/env python3
"""V3 retrospective form-coverage diagnosis, never imputes missing history.

Input is the unmodified collected dataset.json. Distinguishes source-present
history from evidence gaps. Produces no training data and does not alter V1/V2.
"""
import argparse
import datetime as dt
import json
from collections import Counter
from pathlib import Path

def valid_prior(p, date):
    try:
        day=dt.date.fromisoformat(str(p["date"]))
        age=(date-day).days
        pos=p.get("position"); count=p.get("runner_count")
        return (0<age<=730 and p.get("run_type")=="FLAT"
                and type(pos) is int and type(count) is int
                and count>=2 and 1<=pos<=count)
    except (KeyError,TypeError,ValueError):
        return False

def diagnose(dataset):
    rows=[];dist=Counter();missing=Counter();zero=0;total=0
    for race in dataset["races"]:
        day=dt.date.fromisoformat(race["date"])
        runners=[]
        for h in race["runners"]:
            previous=h.get("previous_results")
            if not isinstance(previous,list):
                missing["missing_or_invalid_previous_results"]+=1
                previous=[]
            usable=sum(valid_prior(p,day) for p in previous)
            total+=1; dist[usable]+=1
            if not previous: zero+=1
            runners.append({"horse_id":h["horse_id"],"horse_name":h["name"],
                            "stored_history_rows":len(previous),"usable_v1_flat_finishes":usable,
                            "form_requirement_met":usable>=3,
                            "evidence_status":"NO_STORED_PRIOR_ROWS_NOT_PROOF_OF_DEBUT" if not previous else
                            ("INSUFFICIENT_USABLE_PRIOR_ROWS" if usable<3 else "MEETS_HISTORY_COUNT_ONLY")})
        rows.append({"race_id":race["race_id"],"date":race["date"],
                     "racecourse":race["racecourse"],"source":race["source"],
                     "runner_count":len(runners),
                     "v1_history_count_eligible":all(v["form_requirement_met"] for v in runners),
                     "runners":runners})
    return {"schema_version":1,"research_only":True,"model_validation":"UNVALIDATED",
            "publication_gate":"BLOCKED","diagnostic_only":True,
            "collected_races":len(rows),"runner_records":total,
            "runners_with_zero_stored_rows":zero,
            "usable_prior_flat_finish_distribution":dict(sorted(dist.items())),
            "races_with_complete_v1_history_count":sum(r["v1_history_count_eligible"] for r in rows),
            "missing_fields":dict(missing),"races":rows,
            "limitations":["Historical pages downloaded after outcomes are retrospective, not genuine pre-event captures",
                           "Absence of stored history does not establish an unraced horse",
                           "Counts are not verification of source completeness, dates or result provenance",
                           "Search snippets, form strings and summary commentaries cannot be converted into dated complete prior race records",
                           "Do not loosen V1's minimum form or full-field eligibility to increase counts"]}

def main():
    p=argparse.ArgumentParser();p.add_argument("dataset");p.add_argument("--output",required=True)
    args=p.parse_args()
    result=diagnose(json.loads(Path(args.dataset).read_text()))
    Path(args.output).write_text(json.dumps(result,indent=2)+"\n")
    print(json.dumps({k:v for k,v in result.items() if k!="races"},indent=2))
if __name__=="__main__":main()
