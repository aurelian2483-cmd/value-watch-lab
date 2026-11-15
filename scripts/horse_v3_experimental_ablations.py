#!/usr/bin/env python3
"""Experimental V3 fixed-coefficient ablations; NOT a validated model.

Inputs must be recovered historical research-only data. This module does not
alter V1/V2, create live forecasts, or produce betting recommendations.
"""
import datetime as dt
import math
import re

MODEL_VARIANTS={"M1_V1":(0.0,0.0),"M2_DISTANCE":(.15,0.0),
                "M3_SURFACE":(0.0,.15),"M4_BOTH":(.15,.15)}

def yards(text):
    return sum(float(n)*{"m":1760,"f":220,"y":1}[u]
               for n,u in re.findall(r"(\d+(?:\.\d+)?)\s*([mfy])",str(text).lower()))

def runner_features(horse,day,target_distance):
    past=[];seen=set()
    for p in sorted(horse["previous_results"],key=lambda p:p["date"],reverse=True):
        age=(day-dt.date.fromisoformat(p["date"])).days
        rid=str(p["race_id"]);pos=p.get("position");n=p.get("runner_count")
        if not 0<age<=730 or p.get("run_type")!="FLAT" or rid in seen:continue
        if type(pos) is not int or type(n) is not int or n<2 or not 1<=pos<=n:continue
        seen.add(rid)
        past.append((p,(n-pos)/(n-1),2**(-age/90)))
        if len(past)==6:break
    if len(past)<3:raise ValueError("Insufficient V1 full-field form")
    total=sum(w for _,_,w in past)
    form=.5+sum(w*(v-.5) for _,v,w in past)/(5+total)
    nearby=[(v,w) for p,v,w in past if yards(p.get("distance"))>0 and abs(yards(p["distance"])/target_distance-1)<=.20]
    allweather=[(v,w) for p,v,w in past if str(p.get("going","")).casefold().startswith("standard")]
    def context(rows):
        return sum(w*(v-.5) for v,w in rows)/(5+sum(w for _,w in rows)) if rows else 0.0
    return (form,context(nearby),context(allweather),len(past))

def evaluate_retro(race):
    if race.get("surface")!="ALLWEATHER" or len(race.get("runners",[]))<4:raise ValueError("Out of scope")
    day=dt.date.fromisoformat(race["date"]);distance=yards(race.get("distance"))
    if distance<=0:raise ValueError("Missing race distance")
    horses=race["runners"];ids=[str(r["horse_id"]) for r in horses]
    if len(ids)!=len(set(ids)):raise ValueError("Duplicate horse ID")
    results={str(r["horse_id"]):r.get("finish_position") for r in horses}
    if any(type(p) is not int or p<1 for p in results.values()) or len(set(results.values()))!=len(results) or set(range(1,5))-set(results.values()):
        raise ValueError("Missing or ambiguous final positions")
    winner=next(h for h,p in results.items() if p==1)
    features={str(h["horse_id"]):runner_features(h,day,distance) for h in horses}
    output=[]
    for variant,(distance_weight,surface_weight) in MODEL_VARIANTS.items():
        scores={hid:2*(f[0]+distance_weight*f[1]+surface_weight*f[2]) for hid,f in features.items()}
        vmax=max(scores.values());raw={hid:math.exp(v-vmax) for hid,v in scores.items()}
        norm=sum(raw.values());ps={hid:v/norm for hid,v in raw.items()}
        order=sorted(ps,key=lambda hid:(-ps[hid],hid))
        actual_four={hid for hid,p in results.items() if p<=4}
        output.append({"variant":variant,"ranked_horse_ids":order,
                       "winner_rank":order.index(winner)+1,"top4_overlap":len(set(order[:4])&actual_four),
                       "log_loss":-math.log(ps[winner]),
                       "multiclass_brier":sum((ps[hid]-(hid==winner))**2 for hid in ps),
                       "softmax_weights":ps})
    return {"race_id":str(race["race_id"]),"publication_gate":"BLOCKED",
            "model_validation":"UNVALIDATED","retrospective_only":True,
            "source_first_availability_attested":False,"variants":output,
            "limitations":["No untouched holdout or pre-event timestamp proof",
                           "Fixed illustrative context weights; no calibrated place or win probabilities",
                           "Never use for real-money recommendation or publication"]}
