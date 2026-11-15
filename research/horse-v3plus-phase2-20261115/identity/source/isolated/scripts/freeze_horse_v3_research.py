#!/usr/bin/env python3
"""Freeze fixed-coefficient experimental V3 pre-event forecasts, research only.

Consumes already source-observed, time-stamped racecards. Requires full runner
field and verified pre-off phase; never substitutes retrospectively recovered
results. Appends SHA-named immutable JSON records without modifying V1/V2.
"""
import argparse
import datetime as dt
import json
import math
import re
from pathlib import Path
from zoneinfo import ZoneInfo

from horse_market_benchmark_v1 import fingerprint,when
from horse_v3_experimental_ablations import runner_features,yards

MODEL="V3_FIXED_DISTANCE_SURFACE_RESEARCH"
PARAMS={"distance_weight":.15,"surface_weight":.15,
        "form_half_life_days":90,"form_neutral_runs":5,"max_form_runs":6,
        "softmax_temperature_inverse":2,"minimum_prior_flat_finishes":3}
GATE={"research_only":True,"model_validation":"UNVALIDATED",
      "publication_gate":"BLOCKED","challenge_eligible":0,
      "odds":None,"expected_value":None}

def attempt(race,now):
    try:
        start=when(race["startUTC"])
        if start<=now+dt.timedelta(minutes=5):return None,"NOT_PRE_EVENT_WITH_BUFFER"
        if race.get("capture_phase")!="PRE_EVENT" or race.get("race_stage") not in ("DORMANT","GOINGDOWN","ATTHEPOST"):
            return None,"RACE_STAGE_NOT_PRE_EVENT"
        observed=when(race["runner_observed_at_utc"])
        if not dt.timedelta(minutes=-5)<=now-observed<=dt.timedelta(minutes=30):
            return None,"STALE_OR_FUTURE_RUNNER_OBSERVATION"
        if race.get("surface") not in ("ALLWEATHER","POLYTRACK","TAPETA","FIBRESAND") or race.get("run_type") not in ("FLAT",None):
            return None,"OUTSIDE_FLAT_ALL_WEATHER_SCOPE"
        if race.get("runner_data_status")!="SINGLE_SOURCE_RUNNERS_OBSERVED":
            return None,"RUNNER_FIELD_UNVERIFIED"
        if not re.fullmatch(r"[a-f0-9]{64}",str(race.get("runner_source_sha256",""))):
            return None,"MISSING_RUNNER_SOURCE_RECEIPT"
        candidates=race["runners"]
        if not isinstance(candidates,list) or any(not isinstance(h,dict) for h in candidates):
            return None,"INVALID_RUNNER_RECORDS"
        if any(h.get("runner_status") not in ("RUNNER","NONRUNNER","WITHDRAWN") or h.get("active_runner") is not (h.get("runner_status")=="RUNNER") for h in candidates):
            return None,"INCONSISTENT_RUNNER_STATUS"
        ids=[str(h["horse_id"]) for h in candidates]
        if len(ids)!=len(set(ids)):return None,"DUPLICATE_HORSE_IDS"
        active=sorted([h for h in candidates if h["active_runner"] is True],key=lambda h:str(h["horse_id"]))
        if len(active)<2 or len(active)!=race.get("active_runner_count"):
            return None,"ACTIVE_FIELD_MISMATCH"
        distance=yards(race.get("distance"))
        if distance<=0:return None,"MISSING_TARGET_DISTANCE"
        cutoff=min(now.astimezone(ZoneInfo("Europe/London")).date(),
                   start.astimezone(ZoneInfo("Europe/London")).date())
        scores=[]
        for h in active:
            # Historical data must not contain post-capture performances or
            # silently incomplete first-availability claims.
            form=runner_features(h,cutoff,distance)
            strength,nearby,surface,n=form
            scores.append((h,2*(strength+.15*nearby+.15*surface),n))
        peak=max(s for _,s,_ in scores)
        weights=[math.exp(s-peak) for _,s,_ in scores]
        total=sum(weights)
        runner_rows=[{"horse_id":str(h["horse_id"]),"name":str(h["name"]),
                      "model_probability":weight/total,"usable_prior_flat_finishes":n}
                     for (h,_,n),weight in zip(scores,weights)]
        record={"schema_version":1,"model":MODEL,"parameters":PARAMS,
                "race_id":str(race["race_id"]),"racecourse":str(race["racecourse"]),
                "startUTC":race["startUTC"],"generated_at_utc":now.isoformat(),
                "runner_observed_at_utc":race["runner_observed_at_utc"],
                "runner_source_sha256":race["runner_source_sha256"],
                "source":race["runner_source"],"race_surface":race["surface"],
                "distance":race["distance"],"runners":runner_rows,
                "source_first_availability_attested":False,
                "provenance":"SOURCE_OBSERVED_RACECARD_UNVERIFIED_PRE_EVENT_INPUT_ORIGIN",
                **GATE}
        record["record_sha256"]=fingerprint(record)
        return record,None
    except (ValueError,KeyError,TypeError,AttributeError,ZeroDivisionError,OverflowError):
        return None,"INSUFFICIENT_OR_INVALID_HISTORICAL_FORM"

def archive(feed,out,now):
    if any(feed.get(k)!=v for k,v in (("research_only",True),("model_validation","UNVALIDATED"),("publication_gate","BLOCKED"))):
        raise ValueError("Unsafe feed")
    if not isinstance(feed.get("races"),list):raise ValueError("Invalid race feed")
    if not dt.timedelta(minutes=-5)<=now-when(feed["generated_at_utc"])<=dt.timedelta(hours=2):
        raise ValueError("Stale/future race feed")
    saved,skipped=[],[]
    for race in feed["races"]:
        record,why=attempt(race,now)
        if why:skipped.append({"race_id":str(race.get("race_id","UNKNOWN")),"reason":why});continue
        subdir=out/record["race_id"];path=subdir/(record["record_sha256"]+".json")
        subdir.mkdir(parents=True,exist_ok=True)
        data=json.dumps(record,indent=2)+"\n"
        if path.exists():
            if path.read_text()!=data:raise ValueError("Archived V3 hash collision")
        else:path.write_text(data)
        saved.append(str(path))
    return {"model":MODEL,**{k:GATE[k] for k in ("research_only","model_validation","publication_gate")},
            "forecasts_archived":len(saved),"skipped":skipped,
            "note":"No claim of calibrated win odds, independent provenance or verified betting edge."}

def main():
    p=argparse.ArgumentParser()
    p.add_argument("--feed",required=True,type=Path)
    p.add_argument("--out",type=Path,required=True)
    a=p.parse_args()
    report=archive(json.loads(a.feed.read_text()),a.out,dt.datetime.now(dt.timezone.utc))
    print(json.dumps(report))
if __name__=="__main__":main()

