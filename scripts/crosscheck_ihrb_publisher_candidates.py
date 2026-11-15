#!/usr/bin/env python3
"""Suggest unverified IHRB-to-publisher evidence matches, never auto-confirm.

The IHRB row combines horse and rider in one field and provides race ordinal,
while our research observations have Sporting Life race IDs. Horse-name prefix
matches are only candidate clues, not independently verified crosswalks.
"""
import argparse
import json
import re
import unicodedata
from collections import Counter
from pathlib import Path
from zoneinfo import ZoneInfo
from horse_market_benchmark_v1 import fingerprint,when
from diff_racing_field_observations import load_valid

IRE=ZoneInfo("Europe/Dublin")
def name(s):
    s=unicodedata.normalize("NFKD",str(s)).casefold()
    s="".join(ch for ch in s if not unicodedata.combining(ch))
    s=re.sub(r"\s*\((?:ire|gb|fr|usa|ger|aus)\)","",s)
    return re.sub(r"[^a-z0-9]+"," ",s).strip()

def evaluate(field_paths,official_paths):
    groups,invalid=load_valid(field_paths)
    official=[];bad=Counter()
    for path in official_paths:
        try:
            item=json.loads(path.read_text())
            if item["record_sha256"]!=path.stem or item["record_sha256"]!=fingerprint({k:v for k,v in item.items() if k!="record_sha256"}):
                raise ValueError("SHA")
            if item.get("kind")!="IHRB_OFFICIAL_NONRUNNER_PAGE_OBSERVED_V1" or item.get("research_only") is not True or item.get("publication_gate")!="BLOCKED" or item.get("source_independently_timestamp_attested") is not False:
                raise ValueError("SOURCE_GATE")
            when(item["source_observed_at_utc"])
            official.append(item)
        except (ValueError,KeyError,TypeError,OverflowError):
            bad["INVALID_OFFICIAL_RECEIPT"]+=1
    # Repeating official observations of a row is not additional confirmation.
    index={}
    for item in official:
        for row in item["rows"]:
            key=(row["race_day_local"],name(row["course"]),row["race_number"],name(row["horse_and_rider_text"]))
            index.setdefault(key,[]).append((item,row))
    # Name-and-rider string may be a prefix match. Require one candidate
    # Sporting Life horse/race field across *all* captured races at the venue.
    candidates=[]
    statuses=Counter()
    for key,versions in sorted(index.items()):
        day,course,ordinal,_=key
        matches=[]
        for (race,start),observations in groups.items():
            if start.astimezone(IRE).date().isoformat()!=day:continue
            for at,record in observations:
                if name(record["racecourse"])!=course:continue
                for h in record["runners"]:
                    horse=name(h["name"]);text=name(versions[0][1]["horse_and_rider_text"])
                    if horse and (text==horse or text.startswith(horse+" ")):
                        matches.append((race,start,h["horse_id"],h["name"],record["record_sha256"],at))
        unique={ (m[0],m[2]):m for m in matches }
        if len(unique)==1:
            status="SINGLE_UNVERIFIED_NAME_PREFIX_CANDIDATE"
            race,start,hid,hname,sha,at=next(iter(unique.values()))
            inferred={"race_id":race,"startUTC":start.isoformat(),"horse_id":str(hid),
                      "horse_name":hname,"example_publisher_receipt_sha256":sha,
                      "publisher_observed_at_utc":at.isoformat()}
        elif not unique:status="NO_PUBLISHER_HORSE_CANDIDATE";inferred=None
        else:status="MULTIPLE_PUBLISHER_CANDIDATES";inferred=None
        statuses[status]+=1
        candidates.append({"local_day":day,"course":course,"official_race_ordinal_unverified":ordinal,
                           "official_combined_name_text":versions[0][1]["horse_and_rider_text"],
                           "official_reported_logged_at_utc":versions[0][1]["reported_logged_at_utc"],
                           "official_page_first_seen_in_our_archive_at_utc":min(when(i["source_observed_at_utc"]) for i,_ in versions).isoformat(),
                           "official_receipts_seen":len(versions),"candidate":inferred,"status":status,
                           "official_cross_provider_match_verified":False,
                           "official_withdrawal_at_forecast_verified":False,
                           "betting_eligible":False})
    report={"schema_version":1,"type":"IHRB_SOURCE_PUBLISHER_CANDIDATES_V1",
            "research_only":True,"model_validation":"UNVALIDATED","publication_gate":"BLOCKED",
            "field_receipts_inspected":len(field_paths),"regulator_receipts_inspected":len(official_paths),
            "valid_regulator_receipts":len(official),"observed_regulator_entries_unique":len(index),
            "candidate_counts":dict(statuses),"invalid_regulator_receipts":dict(bad),
            "candidate_matches":candidates,
            "limitations":["IHRB horse and rider text is not a structured horse ID. Prefix matches are suggestions only.",
                           "Irish racing meeting race ordinal is not validated by Sporting Life race ID in this report.",
                           "Regulator logged time need not equal first public visibility.",
                           "Historic unchanged records do not prove absence of official non-runners.",
                           "No BSP, betting edge, CLV or release eligibility."]}
    report["report_sha256"]=fingerprint(report)
    return report

def main():
    p=argparse.ArgumentParser()
    p.add_argument("--fields",type=Path,default=Path("research/horse-v3/field-observation-archive"))
    p.add_argument("--regulator",type=Path,default=Path("research/horse-v3/ihrb-nonrunner-archive"))
    p.add_argument("--out",required=True,type=Path)
    a=p.parse_args()
    report=evaluate(sorted(a.fields.glob("*/*.json")),sorted(a.regulator.glob("*.json")))
    a.out.parent.mkdir(parents=True,exist_ok=True)
    a.out.write_text(json.dumps(report,indent=2)+"\n")
    print(json.dumps({"official_entries":report["observed_regulator_entries_unique"],
                      "candidate_counts":report["candidate_counts"],"publication_gate":"BLOCKED"}))
if __name__=="__main__":main()
