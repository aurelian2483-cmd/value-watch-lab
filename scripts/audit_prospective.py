#!/usr/bin/env python3
"""Audit immutable pre-kickoff forecast snapshots. Never inflate the counter."""
import json, pathlib, datetime, sys
ROOT=pathlib.Path(__file__).resolve().parents[1]
DATA=ROOT/"research"/"prospective"
def audit():
    ids=set(); eligible=0; pending=0; failures=[]; entries=[]
    for f in sorted(DATA.glob("*-prekickoff.json")):
        data=json.loads(f.read_text(encoding="utf-8"))
        created=datetime.datetime.fromisoformat(data["record_created_utc"].replace("Z","+00:00"))
        for r in data["records"]:
            errors=[]
            if r["id"] in ids: errors.append("duplicate id")
            ids.add(r["id"])
            kickoff=datetime.datetime.fromisoformat(r["kickoff_utc"].replace("Z","+00:00"))
            if not created < kickoff: errors.append("not recorded before kickoff")
            probs=[r["prob_home"],r["prob_draw"],r["prob_away"]]
            if not all(isinstance(p,(int,float)) and 0<=p<=1 for p in probs) or abs(sum(probs)-1)>1e-6: errors.append("invalid probabilities")
            if r["home"]==r["away"]: errors.append("same teams")
            if r["league"] not in ("Premier League","Championship"): errors.append("wrong league")
            if r.get("research_decision")!="PASS_UNPRICED": errors.append("unexpected research decision")
            if r.get("outcome") is not None: errors.append("outcome already populated in immutable snapshot")
            if not r.get("current_data_cutoff") or datetime.date.fromisoformat(r["current_data_cutoff"])>=kickoff.date(): errors.append("data cutoff")
            if errors: failures.append({"id":r["id"],"errors":errors})
            else:
                pending+=1
                entries.append({"id":r["id"],"fixture":r["home"]+" v "+r["away"],"status":"PENDING_VERIFICATION","kickoff_utc":r["kickoff_utc"]})
    summary={"schema_version":"1.0","target":100,"pre_kickoff_structurally_valid":pending,"verified_eligible":eligible,"pending_independent_verification":pending,"failures":failures,"records":entries,"note":"Structural checks do not prove fixture authenticity, data integrity, or model reproducibility. Only independently verified forecasts count."}
    return summary
if __name__=="__main__":
    result=audit()
    print(json.dumps(result,indent=2))
    if result["failures"]: sys.exit(1)
