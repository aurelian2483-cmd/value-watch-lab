#!/usr/bin/env python3
"""Consecutive prospective runner-field observations: no official NR inference.

Reads only intact V2 publisher snapshots. Reports changes in active runner IDs,
runner statuses and names between *observation times*, not guessed scratches.
Older V1 receipts never qualify for prospective-change proof.
"""
import argparse
import json
from collections import Counter
from pathlib import Path
from horse_market_benchmark_v1 import fingerprint, when

KIND="SOURCE_OBSERVED_RACING_FIELD_V2"

def load_valid(paths):
    events={};invalid=Counter()
    for path in paths:
        try:
            row=json.loads(path.read_text())
            ident=row["record_sha256"]
            if not isinstance(ident,str) or path.stem!=ident or ident!=fingerprint({k:v for k,v in row.items() if k!="record_sha256"}):
                raise ValueError("HASH")
            if row.get("kind")!=KIND or row.get("publication_gate")!="BLOCKED" or row.get("model_validation")!="UNVALIDATED" or row.get("research_only") is not True or row.get("official_nonrunner_announcement_verified") is not False:
                raise ValueError("NOT_ELIGIBLE_V2")
            race=str(row["race_id"]);start=when(row["startUTC"]);at=when(row["source_observed_at_utc"])
            capture=when(row["capture_processed_at_utc"])
            if at>=start or capture>=start or (capture-at).total_seconds() < -300 or (capture-at).total_seconds()>1800:
                raise ValueError("CHRONOLOGY")
            runners=row["runners"]
            if not isinstance(runners,list) or len(runners)<2:raise ValueError("FIELD")
            ids=[str(x["horse_id"]) for x in runners]
            if len(set(ids))!=len(ids) or set(row["active_runner_ids"])!={str(x["horse_id"]) for x in runners if x.get("runner_status")=="RUNNER" and x.get("active_runner") is True}:
                raise ValueError("FIELD")
            if any(x.get("runner_status") not in ("RUNNER","NONRUNNER","WITHDRAWN") or x.get("active_runner") is not (x.get("runner_status")=="RUNNER") for x in runners):
                raise ValueError("FIELD")
            events.setdefault((race,start),[]).append((at,row))
        except (ValueError,TypeError,KeyError,OverflowError):
            invalid["INVALID_OR_INELIGIBLE_SNAPSHOT"]+=1
    return events,invalid

def evaluate(paths):
    events,invalid=load_valid(paths)
    changes=[]; counts=Counter()
    for (race,start),observations in sorted(events.items(),key=lambda x:(x[0][1],x[0][0])):
        seq=sorted(observations,key=lambda x:(x[0],x[1]["record_sha256"]))
        # Ambiguous same-time snapshots are not a chronological transition.
        for (t0,a),(t1,b) in zip(seq,seq[1:]):
            if t1<=t0:
                counts["SAME_OR_REVERSED_TIMESTAMP"]+=1
                continue
            old={str(r["horse_id"]):r for r in a["runners"]}
            new={str(r["horse_id"]):r for r in b["runners"]}
            removed_ids=sorted(set(old)-set(new))
            added_ids=sorted(set(new)-set(old))
            changed_status=[{"horse_id":id,"previous":old[id]["runner_status"],
                             "current":new[id]["runner_status"]}
                            for id in sorted(set(old)&set(new)) if old[id]["runner_status"]!=new[id]["runner_status"]]
            removed_active=sorted(set(a["active_runner_ids"])-set(b["active_runner_ids"]))
            added_active=sorted(set(b["active_runner_ids"])-set(a["active_runner_ids"]))
            renamed=[id for id in sorted(set(old)&set(new)) if old[id]["name"]!=new[id]["name"]]
            if not (removed_ids or added_ids or changed_status or removed_active or added_active or renamed):
                counts["UNCHANGED"]+=1
                continue
            counts["CHANGED_PUBLISHER_FIELD"]+=1
            changes.append({"race_id":race,"startUTC":start.isoformat(),
                "earlier_observed_at_utc":t0.isoformat(),"later_observed_at_utc":t1.isoformat(),
                "earlier_receipt_sha256":a["record_sha256"],"later_receipt_sha256":b["record_sha256"],
                "removed_runner_ids":removed_ids,"added_runner_ids":added_ids,
                "removed_active_runner_ids":removed_active,"added_active_runner_ids":added_active,
                "status_transitions":changed_status,"renamed_runner_ids":renamed,
                "classification":"PUBLISHER_OBSERVATION_CHANGE_ONLY",
                "official_withdrawal_verified":False,"source_first_availability_attested":False,
                "betting_eligible":False})
    result={"schema_version":1,"kind":"PROSPECTIVE_SOURCE_FIELD_DIFF_V1",
            "research_only":True,"model_validation":"UNVALIDATED","publication_gate":"BLOCKED",
            "snapshot_files_inspected":len(paths),"races_with_valid_v2_captures":len(events),
            "invalid_snapshots":dict(sorted(invalid.items())),"transition_counts":dict(sorted(counts.items())),
            "change_count":len(changes),"changes":changes,
            "limitations":["Only two observed publisher snapshots are compared, not regulator announcements.",
                           "Never infer official withdrawal or timing of original public availability.",
                           "Incomplete source coverage, reappearing runners and race-time changes need separate audit.",
                           "Does not alter predictions, prices, website, or betting recommendations."]}
    result["report_sha256"]=fingerprint(result)
    return result

def main():
    p=argparse.ArgumentParser()
    p.add_argument("--archive",type=Path,default=Path("research/horse-v3/field-observation-archive"))
    p.add_argument("--output",type=Path,required=True)
    a=p.parse_args()
    paths=sorted(a.archive.glob("*/*.json"))
    report=evaluate(paths)
    a.output.parent.mkdir(parents=True,exist_ok=True)
    a.output.write_text(json.dumps(report,indent=2)+"\n")
    print(json.dumps({"valid_races":report["races_with_valid_v2_captures"],"changes":report["change_count"],
                      "invalid":report["invalid_snapshots"],"publication_gate":"BLOCKED"}))
if __name__=="__main__":main()
