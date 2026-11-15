#!/usr/bin/env python3
"""Strict retrospective BSP/V1/V3 score comparator. Research only, never stakes.

BSP reflects the market at the off, not a price available when forecast was frozen.
Only pair on exact race, UTC start and complete identified runner field. Missing
official CSV/crosswalk, ambiguous result or model mismatch => exclude.
"""
import argparse
import json
import math
from collections import Counter
from pathlib import Path
from horse_market_benchmark_v1 import fingerprint, when, vector, proper, demargin

BASE="FORM_PERCENTILE_SOFTMAX_RESEARCH_V1"
V3="V3_FIXED_DISTANCE_SURFACE_RESEARCH"
RESEARCH={"research_only":True,"model_validation":"UNVALIDATED","publication_gate":"BLOCKED"}
KIND="BETFAIR_DAILY_WIN_BSP_MATCHED_V1"

def gated(row):
    return isinstance(row,dict) and all(row.get(k)==v for k,v in RESEARCH.items())

def valid_forecast(f):
    if not gated(f) or f.get("model") not in (BASE,V3) or f.get("challenge_eligible")!=0:
        raise ValueError("UNKNOWN_OR_UNSAFE_MODEL")
    if not isinstance(f.get("record_sha256"),str) or f["record_sha256"]!=fingerprint({k:v for k,v in f.items() if k!="record_sha256"}):
        raise ValueError("FORECAST_HASH_MISMATCH")
    start=when(f["startUTC"]);cut=when(f["generated_at_utc"])
    if cut>=start.replace() or (start-cut).total_seconds()<300:raise ValueError("NOT_FROZEN_PRE_EVENT")
    p=vector(f["runners"])
    return (str(f["race_id"]),start),cut,p

def valid_bsp(b):
    if not gated(b) or b.get("kind")!=KIND or b.get("market_type")!="WIN" or b.get("betting_eligible") is not False or b.get("bsp_is_post_off_reference") is not True or b.get("pre_event_executable_price") is not False:
        raise ValueError("INVALID_BSP_GATE")
    if b.get("record_sha256")!=fingerprint({k:v for k,v in b.items() if k!="record_sha256"}):
        raise ValueError("BSP_HASH_MISMATCH")
    if not isinstance(b.get("source_file_sha256"),str) or len(b["source_file_sha256"])!=64 or not isinstance(b.get("cross_provider_mapping_sha256"),str) or len(b["cross_provider_mapping_sha256"])!=64:
        raise ValueError("MISSING_SOURCE_OR_CROSSWALK_RECEIPT")
    quotes=b["quotes"]
    if not isinstance(quotes,list) or len(quotes)<2:raise ValueError("INCOMPLETE_BSP_FIELD")
    odds={};wins=[]
    for q in quotes:
        h=str(q["horse_id"])
        v=q["bsp"]
        if not h or h in odds or type(v) not in (float,int) or not math.isfinite(v) or not 1<v<1001:
            raise ValueError("INVALID_OR_DUPLICATE_BSP")
        if type(q.get("win_lose")) is not bool:raise ValueError("UNRESOLVED_WIN_LOSE")
        if q["win_lose"]:wins.append(h)
        odds[h]=v
    if len(wins)!=1:raise ValueError("WINNER_AMBIGUOUS")
    return (str(b["race_id"]),when(b["startUTC"])),odds,wins[0]

def compare(forecasts,bsps,method="proportional"):
    if method not in ("proportional","power"):raise ValueError("Method not specified")
    if not isinstance(forecasts,list) or not isinstance(bsps,list):raise ValueError("Input records must be lists")
    excluded=Counter();valid_bsp_by_key={}
    for b in bsps:
        try:
            key,odds,winner=valid_bsp(b)
            if key in valid_bsp_by_key:raise ValueError("DUPLICATE_BSP_RACE")
            valid_bsp_by_key[key]=(b,odds,winner)
        except (ValueError,TypeError,KeyError,OverflowError) as e:
            excluded[str(e) if isinstance(e,ValueError) else "INVALID_BSP_INPUT"]+=1
    # Duplicate evidence must not silently select whichever happens to be first.
    ids=[(str(b.get("race_id")),str(b.get("startUTC"))) for b in bsps if isinstance(b,dict)]
    duplicate_keys={k for k in ids if ids.count(k)>1}
    for key in list(valid_bsp_by_key):
        if (key[0],key[1].isoformat()) in duplicate_keys or any((str(b.get("race_id")),when(b.get("startUTC"))) == key for b in bsps if isinstance(b,dict) and (str(b.get("race_id")),str(b.get("startUTC"))) in duplicate_keys):
            valid_bsp_by_key.pop(key,None)
            excluded["DUPLICATE_BSP_RACE"]+=1
    results=[];seen=set()
    for f in forecasts:
        try:
            key,freeze,p=valid_forecast(f)
            identity=(*key,f["model"])
            if identity in seen:raise ValueError("DUPLICATE_MODEL_RACE")
            seen.add(identity)
            if key not in valid_bsp_by_key:raise ValueError("NO_MATCHING_VERIFIED_BSP")
            b,odds,winner=valid_bsp_by_key[key]
            if set(p)!=set(odds):raise ValueError("FIELD_IDENTITY_MISMATCH")
            market=demargin(odds,method)["probabilities"]
            mod=proper(p,winner);close=proper(market,winner)
            results.append({"race_id":key[0],"startUTC":key[1].isoformat(),
                            "model":f["model"],"forecast_sha256":f["record_sha256"],
                            "bsp_sha256":b["record_sha256"],"field_size":len(p),
                            "winner_horse_id":winner,"forecast_frozen_at":freeze.isoformat(),
                            "model_log_loss":mod["log_loss"],"bsp_log_loss":close["log_loss"],
                            "model_brier":mod["multiclass_brier"],"bsp_brier":close["multiclass_brier"],
                            "delta_log_loss":mod["log_loss"]-close["log_loss"],
                            "delta_brier":mod["multiclass_brier"]-close["multiclass_brier"]})
        except (ValueError,TypeError,KeyError,OverflowError) as e:
            excluded[str(e) if isinstance(e,ValueError) else "INVALID_FORECAST_INPUT"]+=1
    results.sort(key=lambda x:(x["startUTC"],x["race_id"],x["model"]))
    by_model={}
    for model in (BASE,V3):
        entries=[r for r in results if r["model"]==model]
        by_model[model]={"count":len(entries),"mean_delta_log_loss":sum(r["delta_log_loss"] for r in entries)/len(entries) if entries else None,
                         "mean_delta_brier":sum(r["delta_brier"] for r in entries)/len(entries) if entries else None}
    matched={}
    for row in results:matched.setdefault((row["race_id"],row["startUTC"]),{})[row["model"]]=row
    same=[d for d in matched.values() if BASE in d and V3 in d]
    paired={"same_races":len(same),"mean_v3_minus_v1_log_loss":sum(d[V3]["model_log_loss"]-d[BASE]["model_log_loss"] for d in same)/len(same) if same else None}
    report={"schema_version":1,"type":"SHARP_CLOSE_HORSE_MODEL_COMPARISON_V1",**RESEARCH,
            "betting_eligible":False,"method":method,"input_forecasts":len(forecasts),"input_bsp_receipts":len(bsps),
            "scored_records":len(results),"exclusions":dict(sorted(excluded.items())),
            "models":by_model,"paired_v1_v3":paired,"rows":results,
            "clv":None,"estimated_edge":None,"kelly":None,"recommendations":[],
            "limitations":["BSP is an at-off benchmark, not a price known at model freeze.",
                           "No proof of independent underlying outcome evidence or BSP data rights.",
                           "No external pre-race executed price; CLV/EV/profit intentionally not calculated.",
                           "A matching BSP field does not independently validate pre-race form or model calibration.",
                           "Chronological untouched prospective evaluation and field-level provenance audit remain required."]}
    report["report_sha256"]=fingerprint(report)
    return report

def main():
    p=argparse.ArgumentParser()
    for key in ("forecasts","bsp","output"):p.add_argument("--"+key,required=True,type=Path)
    p.add_argument("--method",choices=("proportional","power"),default="proportional")
    a=p.parse_args()
    result=compare(json.loads(a.forecasts.read_text()),json.loads(a.bsp.read_text()),a.method)
    a.output.parent.mkdir(parents=True,exist_ok=True)
    a.output.write_text(json.dumps(result,indent=2)+"\n")
    print(json.dumps({"scored_records":result["scored_records"],"paired_v1_v3":result["paired_v1_v3"]["same_races"],"exclusions":result["exclusions"],"publication_gate":"BLOCKED"}))
if __name__=="__main__":main()
