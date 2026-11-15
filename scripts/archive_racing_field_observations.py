#!/usr/bin/env python3
"""Prospective, immutable source-observed race-field receipts.

This records what the main racing feed claimed at its collection time; it does
NOT impersonate an official non-runner announcement, independently timestamp
source availability, or authorize a BSP model join.
"""
import argparse
import datetime as dt
import json
import re
from collections import Counter
from pathlib import Path
from horse_market_benchmark_v1 import fingerprint,when

GATES={"research_only":True,"model_validation":"UNVALIDATED","publication_gate":"BLOCKED"}
KIND="SOURCE_OBSERVED_RACING_FIELD_V1"
STATUS={"RUNNER","NONRUNNER","WITHDRAWN"}

def snapshot(race,feed,now,source_commit):
    if not isinstance(race,dict):return None,"INVALID_RACE"
    try:
        race_id=str(race["race_id"])
        if not re.fullmatch(r"[0-9]{3,12}",race_id):return None,"INVALID_RACE_ID"
        start=when(race["startUTC"]);observed=when(race["runner_observed_at_utc"]);generated=when(feed["generated_at_utc"])
        if start <= now+dt.timedelta(minutes=5):return None,"NOT_PRE_EVENT_WITH_BUFFER"
        if not dt.timedelta(minutes=-5)<=now-generated<=dt.timedelta(hours=2):
            return None,"STALE_SOURCE_FEED"
        if not dt.timedelta(minutes=-5)<=generated-observed<=dt.timedelta(minutes=30):
            return None,"RUNNER_OBSERVATION_NOT_FRESH_IN_FEED"
        if observed>=start or generated>=start:return None,"NOT_PRE_EVENT"
        if race.get("capture_phase")!="PRE_EVENT" or race.get("race_stage") not in ("DORMANT","GOINGDOWN","ATTHEPOST"):
            return None,"NOT_CONFIRMED_PRE_EVENT_STAGE"
        if race.get("runner_data_status")!="SINGLE_SOURCE_RUNNERS_OBSERVED":
            return None,"NO_SOURCE_RUNNERS"
        sha=race.get("runner_source_sha256")
        if not isinstance(sha,str) or not re.fullmatch("[a-f0-9]{64}",sha):
            return None,"MISSING_SOURCE_SHA"
        source=race.get("runner_source")
        if not isinstance(source,str) or not source.startswith("https://www.sportinglife.com/racing/racecards/"):
            return None,"UNVERIFIED_SOURCE_HOST_OR_PATH"
        active=race["runners"]
        if not isinstance(active,list) or len(active)<2:return None,"INCOMPLETE_RUNNER_LIST"
        ids=[];rows=[]
        for h in active:
            hid=str(h["horse_id"]);name=h["name"];status=h["runner_status"];flag=h["active_runner"]
            if not re.fullmatch(r"[0-9]{3,12}",hid) or not isinstance(name,str) or not name.strip():
                return None,"INVALID_RUNNER_IDENTITY"
            if status not in STATUS or type(flag) is not bool or flag!=(status=="RUNNER"):
                return None,"INCONSISTENT_RUNNER_STATUS"
            ids.append(hid);rows.append({"horse_id":hid,"name":name.strip(),
                                         "runner_status":status,"active_runner":flag})
        if len(set(ids))!=len(ids):return None,"DUPLICATE_RUNNER"
        present=sum(r["active_runner"] for r in rows)
        if present<2 or present!=race.get("active_runner_count"):
            return None,"ACTIVE_COUNT_MISMATCH"
        rows.sort(key=lambda h:h["horse_id"])
        receipt={"schema_version":1,"kind":KIND,**GATES,"betting_eligible":False,
                 "race_id":race_id,"racecourse":str(race["racecourse"]),"startUTC":start.isoformat(),
                 "source_observed_at_utc":observed.isoformat(),"feed_generated_at_utc":generated.isoformat(),
                 "capture_processed_at_utc":now.isoformat(),"main_source_commit":source_commit,
                 "source_url":source,"source_sha256":sha,"runners":rows,
                 "active_runner_ids":[r["horse_id"] for r in rows if r["active_runner"]],
                 "source_kind":"SPORTING_LIFE_PUBLISHER_OBSERVATION",
                 "official_nonrunner_announcement_verified":False,
                 "source_first_availability_independently_attested":False,
                 "limitations":["Observed runner status came from one publisher's feed, not an official scratch log.",
                                "The feed timestamp is publisher/scraper metadata, not independent notarisation.",
                                "No stored raw HTML bytes independently rechecked against source_sha256.",
                                "No Betfair selections, prices, edge, or staking."]}
        receipt["record_sha256"]=fingerprint(receipt)
        return receipt,None
    except (KeyError,ValueError,TypeError,OverflowError,AttributeError):
        return None,"INVALID_RECORD_OR_TIMESTAMP"

def archive(feed,root,now,source_commit):
    if not isinstance(feed,dict) or not all(feed.get(k)==v for k,v in GATES.items()):
        raise ValueError("Unsafe source feed")
    if not re.fullmatch("[a-f0-9]{40}",source_commit):raise ValueError("Source commit SHA required")
    if not isinstance(feed.get("races"),list):raise ValueError("Missing race records")
    # A stale source is not to be represented as a new prospective capture.
    if not dt.timedelta(minutes=-5)<=now-when(feed["generated_at_utc"])<=dt.timedelta(hours=2):
        raise ValueError("Stale or future-dated published feed")
    saved=[];reasons=Counter()
    for race in feed["races"]:
        record,error=snapshot(race,feed,now,source_commit)
        if error:reasons[error]+=1;continue
        path=root/record["race_id"]/(record["record_sha256"]+".json")
        path.parent.mkdir(parents=True,exist_ok=True)
        payload=json.dumps(record,indent=2)+"\n"
        if path.exists():
            if path.read_text()!=payload:raise ValueError("Immutable receipt conflict")
        else:
            path.write_text(payload)
        saved.append(record)
    return {"kind":"PROSPECTIVE_RACE_FIELD_CAPTURE_AUDIT",**GATES,
            "racecards_examined":len(feed["races"]),"records_captured":len(saved),
            "excluded":dict(sorted(reasons.items())),"claim":"Source-observed only; not official nonrunner evidence"}

def main():
    p=argparse.ArgumentParser()
    p.add_argument("--feed",required=True,type=Path)
    p.add_argument("--out",required=True,type=Path)
    p.add_argument("--source-commit-file",required=True,type=Path)
    p.add_argument("--diagnostics",required=True,type=Path)
    a=p.parse_args()
    report=archive(json.loads(a.feed.read_text()),a.out,dt.datetime.now(dt.timezone.utc),
                   a.source_commit_file.read_text().strip())
    a.diagnostics.parent.mkdir(parents=True,exist_ok=True)
    a.diagnostics.write_text(json.dumps(report,indent=2)+"\n")
    print(json.dumps(report))
if __name__=="__main__":main()
