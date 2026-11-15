#!/usr/bin/env python3
"""Value Watch race-level market benchmark V1. Offline, research-only and fail-closed.

Use stored *pre-event* full-field model/price receipts and settled results.
Historical Sky Bet publisher snapshots are not executable or sharp closes.
This tool never fits weights, selects bets, estimates EV or enables releases.
"""
import argparse
import datetime as dt
import hashlib
import json
import math
from collections import Counter
from pathlib import Path

ID="RACING_MARKET_BENCHMARK_V1"
BLOCKED={"research_only":True,"model_validation":"UNVALIDATED","publication_gate":"BLOCKED","betting_eligible":False}

def canonical(value):
    return json.dumps(value,sort_keys=True,separators=(",",":"),allow_nan=False).encode()
def fingerprint(value):
    return hashlib.sha256(canonical(value)).hexdigest()
def when(value):
    if not isinstance(value,str):
        raise ValueError("Timestamp required")
    x=dt.datetime.fromisoformat(value.replace("Z","+00:00"))
    if x.tzinfo is None:raise ValueError("Offset-aware timestamp required")
    return x.astimezone(dt.timezone.utc)
def integer_id(v):
    if isinstance(v,bool) or not isinstance(v,(str,int)) or not str(v).strip():
        raise ValueError("Invalid identity")
    return str(v)
def vector(rows,field="model_probability"):
    if not isinstance(rows,list) or len(rows)<2:raise ValueError("Incomplete field")
    p={}
    for row in rows:
        horse=integer_id(row["horse_id"])
        v=row[field]
        if horse in p or type(v) not in (float,int) or not math.isfinite(v) or not 0<v<1:
            raise ValueError("Invalid probability or duplicate horse")
        p[horse]=float(v)
    if abs(sum(p.values())-1)>1e-8:raise ValueError("Probabilities not normalized")
    return p
def prices(rows):
    if not isinstance(rows,list) or len(rows)<2:raise ValueError("Incomplete market")
    out={}
    for row in rows:
        horse=integer_id(row["horse_id"]);v=row["decimal"]
        if horse in out or type(v) not in (float,int) or not math.isfinite(v) or v<=1:
            raise ValueError("Invalid market odds or duplicate horse")
        out[horse]=float(v)
    return out
def demargin(odds,method):
    if method not in ("proportional","power"):raise ValueError("Unregistered margin method")
    implied={k:1/v for k,v in odds.items()}
    overround=sum(implied.values())
    if not math.isfinite(overround) or overround<=0:raise ValueError("Invalid overround")
    if method=="proportional":p={k:v/overround for k,v in implied.items()}
    else:
        # Solve sum(q_i ** alpha)=1. Positive prices ensure a unique alpha.
        lo,hi=.000001,64.
        if sum(v**lo for v in implied.values())<=1 or sum(v**hi for v in implied.values())>=1:
            raise ValueError("Power de-margin root not bracketed")
        for _ in range(90):
            mid=(lo+hi)/2
            if sum(v**mid for v in implied.values())>1:lo=mid
            else:hi=mid
        p={k:v**((lo+hi)/2) for k,v in implied.items()}
        z=sum(p.values());p={k:v/z for k,v in p.items()}
    return {"probabilities":p,"raw_overround":overround,"method":method}

def proper(p,winner):
    if winner not in p:raise ValueError("Winner absent")
    return {"log_loss":-math.log(p[winner]),
            "multiclass_brier":sum((v-float(k==winner))**2 for k,v in p.items()),
            "winner_rank":1+sum(v>p[winner] for v in p.values())}

def checked_forecast(record):
    if not all(record.get(k)==v for k,v in (("research_only",True),("model_validation","UNVALIDATED"),("publication_gate","BLOCKED"))):
        raise ValueError("Unsafe forecast gate")
    if record.get("model") not in ("FORM_PERCENTILE_SOFTMAX_RESEARCH_V1","V3_FIXED_DISTANCE_SURFACE_RESEARCH"):
        raise ValueError("Unknown or non-frozen model")
    race=integer_id(record["race_id"]);start=when(record["startUTC"]);captured=when(record["generated_at_utc"])
    if captured>=start-dt.timedelta(minutes=5):raise ValueError("Forecast not captured pre-off with buffer")
    p=vector(record["runners"])
    return race,start,captured,p

def checked_market(market,race,start,field):
    if any(market.get(k)!=v for k,v in BLOCKED.items() if k!="betting_eligible"):
        raise ValueError("Unsafe market gate")
    if integer_id(market["race_id"])!=race or when(market["startUTC"])!=start:
        raise ValueError("Market race mismatch")
    if market.get("bookmaker")!="Sky Bet" or market.get("executable_verified") is not False:
        raise ValueError("Only unverified publisher-observed Sky Bet supported in this tier")
    if market.get("kind")!="HORSE_SOURCE_MARKET_CAPTURE" or market.get("challenge_eligible")!=0:
        raise ValueError("Unknown market evidence type")
    receipt=market.get("record_sha256")
    unsigned={k:v for k,v in market.items() if k!="record_sha256"}
    if not isinstance(receipt,str) or fingerprint(unsigned)!=receipt:
        raise ValueError("Market evidence integrity failure")
    observed=when(market["observed_at_utc"])
    if observed>=start-dt.timedelta(minutes=5):raise ValueError("Price not captured before buffer")
    quotes=prices(market["quotes"])
    if set(quotes)!=set(field) or sorted(map(str,market["active_runner_ids"]))!=sorted(field):
        raise ValueError("Market field differs from forecast")
    if not market.get("source_sha256") or len(str(market["source_sha256"]))!=64:
        raise ValueError("Missing publisher evidence hash")
    return observed,quotes

def checked_result(result,record,field,start):
    if result.get("verification")!="SINGLE_SOURCE_PROVISIONAL" or result.get("independently_verified") is not False or result.get("publication_gate")!="BLOCKED" or result.get("challenge_eligible")!=0:
        raise ValueError("Result is not an admissible provisional outcome receipt")
    if any(str(result.get(k))!=str(record.get(k)) for k in ("record_sha256","race_id","startUTC","model")):
        raise ValueError("Result-forecast identity mismatch")
    if when(result["scored_at_utc"])<start or when(result["source_receipt"]["observed_at_utc"])<start:
        raise ValueError("Result before race")
    sha=result["source_receipt"].get("sha256")
    if not isinstance(sha,str) or len(sha)!=64 or any(c not in "0123456789abcdef" for c in sha):
        raise ValueError("Missing source evidence")
    winner=integer_id(result["winner_horse_id"])
    if winner not in field:raise ValueError("Winner not in archived field")
    return winner

def evaluate(forecasts,markets,outcomes,method="proportional"):
    """Reports ONLY matched, publisher-observed descriptive scoring; never BSP/CLV."""
    if not all(isinstance(v,list) for v in (forecasts,markets,outcomes)):raise ValueError("Input lists required")
    candidates=Counter();rows=[]; market_by_race={}
    for m in markets:
        key=(str(m.get("race_id")),str(m.get("startUTC")))
        market_by_race.setdefault(key,[]).append(m)
    result_by_sha={}
    for result in outcomes:
        key=result.get("record_sha256")
        if key in result_by_sha:raise ValueError("Duplicate result receipts for same forecast")
        result_by_sha[key]=result
    seen=set()
    for f in forecasts:
        try:
            race,start,captured,p=checked_forecast(f)
            key=(race,start,f["model"])
            if key in seen:raise ValueError("Duplicate forecast for race/model")
            seen.add(key)
            result=result_by_sha.get(f.get("record_sha256"))
            if not result:candidates["NO_PROVISIONAL_RESULT"]+=1;continue
            winner=checked_result(result,f,p,start)
            matches=[]
            for m in market_by_race.get((race,f["startUTC"]),[]):
                try:
                    observed,odds=checked_market(m,race,start,p)
                    if observed>captured: # benchmark must use information available at model freeze
                        continue
                    matches.append((observed,m["record_sha256"],odds))
                except (KeyError,TypeError,ValueError):
                    candidates["INVALID_MARKET_RECORD"]+=1
            if not matches:candidates["NO_MATCHING_PRICE_AT_FORECAST_TIME"]+=1;continue
            _,receipt,odds=max(matches,key=lambda x:(x[0],x[1]))
            market=demargin(odds,method)
            model_scores=proper(p,winner);market_scores=proper(market["probabilities"],winner)
            rows.append({"race_id":race,"startUTC":f["startUTC"],"model":f["model"],
                         "forecast_record_sha256":f.get("record_sha256"),
                         "market_record_sha256":receipt,"winner_horse_id":winner,
                         "active_runners":len(p),"raw_overround":market["raw_overround"],
                         "model_log_loss":model_scores["log_loss"],"market_log_loss":market_scores["log_loss"],
                         "model_brier":model_scores["multiclass_brier"],"market_brier":market_scores["multiclass_brier"],
                         "delta_log_loss":model_scores["log_loss"]-market_scores["log_loss"],
                         "delta_brier":model_scores["multiclass_brier"]-market_scores["multiclass_brier"]})
        except (KeyError,TypeError,ValueError) as e:
            candidates["INVALID_OR_UNMATCHED_FORECAST"]+=1
            # Preserve a finite exclusion classification, not raw source detail.
            continue
    rows.sort(key=lambda x:(x["startUTC"],x["race_id"],x["model"]))
    summaries={}
    for model in sorted(set(r["model"] for r in rows)):
        values=[r for r in rows if r["model"]==model]
        summaries[model]={"matched_races":len(values),
            "mean_delta_log_loss":sum(v["delta_log_loss"] for v in values)/len(values),
            "mean_delta_brier":sum(v["delta_brier"] for v in values)/len(values),
            "status":"DESCRIPTIVE_SINGLE_SOURCE_ONLY_NOT_VALIDATION"}
    report={"schema_version":1,"benchmark":ID,**BLOCKED,
            "price_tier":"UNVERIFIED_PUBLISHER_OBSERVATIONS_NOT_BSP",
            "outcome_tier":"SINGLE_SOURCE_PROVISIONAL",
            "margin_method":method,"same_field_same_race_required":True,
            "price_must_precede_forecast_freeze":True,
            "eligible_rows":len(rows),"exclusions":dict(sorted(candidates.items())),
            "models":summaries,"rows":rows,
            "sharp_closing_benchmark":None,"clv":None,"roi":None,"expected_value":None,
            "limitations":["All price observations are third-party, not verified executable or Betfair BSP.",
                           "One publisher result is provisional, not independently corroborated.",
                           "If market snapshot postdates model freeze, excluded to avoid information mismatch.",
                           "No trained V3 records admitted until frozen versioning and timestamp provenance exist.",
                           "Scoring a historical sample does not establish an out-of-sample edge."]}
    report["report_sha256"]=fingerprint(report)
    return report

def main():
    parser=argparse.ArgumentParser(description="Research-only racing market benchmarking")
    for flag in ("forecasts","markets","outcomes","output"):parser.add_argument("--"+flag,required=True,type=Path)
    parser.add_argument("--method",choices=["proportional","power"],default="proportional")
    a=parser.parse_args()
    loaded=[json.loads(v.read_text()) for v in (a.forecasts,a.markets,a.outcomes)]
    report=evaluate(*loaded,method=a.method)
    a.output.parent.mkdir(parents=True,exist_ok=True)
    a.output.write_text(json.dumps(report,indent=2)+"\n")
    print(json.dumps({"eligible_rows":report["eligible_rows"],"exclusions":report["exclusions"],"market_tier":report["price_tier"],"publication_gate":"BLOCKED"}))
if __name__=="__main__":main()
