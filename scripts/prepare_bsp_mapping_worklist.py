#!/usr/bin/env python3
"""Prepare non-price, read-only V1/V3-to-Betfair matching manifest.

Each race entry includes exactly the frozen horse identities and race timestamp.
Betfair EVENT_ID and SELECTION_ID remain null until independently verified.
No horse-name inference, BSP CSV downloads, licence claims, or model promotion.
"""
import argparse
import json
from collections import Counter
from pathlib import Path
from horse_market_benchmark_v1 import fingerprint, when, vector
from compare_horse_bsp_models import BASE,V3,valid_forecast

def prepare(forecasts):
    records=[]; excluded=Counter();groups={}
    for f in forecasts:
        try:
            key,captured,p=valid_forecast(f)
            rows=f["runners"]
            if len(p)!=len(rows) or any(not isinstance(r.get("name"),str) or not r["name"].strip() for r in rows):
                raise ValueError("MISSING_RUNNER_NAMES")
            identity=(key[0],key[1])
            groups.setdefault(identity,[]).append((f,captured,p))
        except (KeyError,ValueError,TypeError,OverflowError) as exc:
            excluded["INVALID_ARCHIVED_FORECAST"]+=1
    for (race_id,start),items in sorted(groups.items(),key=lambda pair:(pair[0][1],pair[0][0])):
        # Multiple versions of one model are retained in provenance but never
        # silently chosen as the 'best' version based on outcomes.
        models=sorted(set(item[0]["model"] for item in items))
        same_field={tuple(sorted(p)) for _,_,p in items}
        if len(same_field)!=1:
            excluded["CONFLICTING_FIELDS_WITHIN_RACE"]+=len(items)
            continue
        # A race-only crosswalk can be reused for all frozen model versions only
        # when the complete matching runner ID set is unchanged.
        representative=min(items,key=lambda item:item[1])[0]
        names={str(row["horse_id"]):row["name"].strip() for row in representative["runners"]}
        if len(names)!=len(representative["runners"]):
            excluded["DUPLICATE_RUNNER"]+=len(items)
            continue
        entries=[]
        for model in (BASE,V3):
            variants=[(f,c) for f,c,p in items if f["model"]==model]
            entries.extend({"model":model,"forecast_sha256":f["record_sha256"],
                            "generated_at_utc":c.isoformat()} for f,c in sorted(variants,key=lambda it:it[1]))
        records.append({"race_id":race_id,"racecourse":representative.get("racecourse"),
                        "startUTC":start.isoformat(),
                        "models_available":models,
                        "archived_forecasts":entries,
                        "runner_count":len(names),
                        "runner_id_map":{h:None for h in sorted(names)},
                        "runners":[{"sporting_life_horse_id":h,"horse_name":names[h],
                                    "betfair_selection_id":None} for h in sorted(names)],
                        "betfair_event_id":None,
                        "betfair_market_type":"WIN",
                        "mapping_verified":False,
                        "mapping_status":"REQUIRES_EXPLICIT_ID_VERIFICATION"})
    out={"schema_version":1,"type":"BSP_IDENTITY_MAPPING_WORKLIST_V1",
         "research_only":True,"model_validation":"UNVALIDATED","publication_gate":"BLOCKED",
         "betting_eligible":False,"data_licence_attested":False,
         "source_forecast_records":len(forecasts),"candidate_races":len(records),
         "exclusions":dict(sorted(excluded.items())),"races":records,
         "limitations":["Only user-owned frozen model race/horse identities are included; no Betfair prices copied.",
                        "Horse names are for human review, never used as automatic cross-provider joins.",
                        "A verified full-field official Betfair WIN EVENT_ID and SELECTION_ID mapping is required.",
                        "Missing BSP source access rights or crosswalk prevents scoring."]}
    out["manifest_sha256"]=fingerprint(out)
    return out

def main():
    p=argparse.ArgumentParser()
    p.add_argument("--archive",type=Path,default=Path("research/horse-form-archive/v1"))
    p.add_argument("--v3-archive",type=Path,default=Path("research/horse-v3/live-archive"))
    p.add_argument("--output",type=Path,required=True)
    args=p.parse_args()
    paths=sorted(args.archive.glob("*.json"))+sorted(args.v3_archive.glob("*/*.json"))
    result=prepare([json.loads(path.read_text()) for path in paths])
    args.output.parent.mkdir(parents=True,exist_ok=True)
    args.output.write_text(json.dumps(result,indent=2)+"\n")
    print(json.dumps({"archived_forecasts":len(paths),"races_prepared":result["candidate_races"],
                      "exclusions":result["exclusions"],"BSP_prices_imported":0,
                      "publication_gate":"BLOCKED"}))
if __name__=="__main__":main()
