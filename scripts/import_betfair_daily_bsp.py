#!/usr/bin/env python3
"""Parse official Betfair SP daily CSV for auditable, explicitly mapped GB/IE races.

No downloading, automatic name matching, executable odds claim, or licence claim.
BSP is an *at-off* reference, never a price available at an earlier forecast.
"""
import argparse
import csv
import datetime as dt
import hashlib
import io
import json
import math
from pathlib import Path

REQUIRED={"EVENT_ID","SELECTION_ID","SELECTION_NAME","EVENT_DT","BSP","WIN_LOSE"}
GATE={"research_only":True,"publication_gate":"BLOCKED","model_validation":"UNVALIDATED",
      "betting_eligible":False,"data_licence_attested":False}
def digest(o):
    return hashlib.sha256(json.dumps(o,sort_keys=True,separators=(",",":"),allow_nan=False).encode()).hexdigest()
def instant(v):
    if not isinstance(v,str):raise ValueError("Offset-aware event timestamp required")
    t=dt.datetime.fromisoformat(v.strip().replace("Z","+00:00"))
    if t.tzinfo is None:raise ValueError("Offset-aware event timestamp required")
    return t.astimezone(dt.timezone.utc)
def check_mapping(item):
    if item.get("mapping_verified") is not True or item.get("market_type")!="WIN":
        raise ValueError("Explicit manually verified WIN mapping required")
    horses=item.get("runner_id_map")
    if not isinstance(horses,dict) or len(horses)<2 or any(not str(k).strip() or not str(v).strip() for k,v in horses.items()) or len(set(map(str,horses.values())))!=len(horses):
        raise ValueError("Incomplete or ambiguous cross-provider runner mapping")
    if not item.get("race_id") or not item.get("event_id"):raise ValueError("Missing race or event identity")
    start=instant(item["startUTC"])
    return start,{str(k):str(v) for k,v in horses.items()}
def parse_file(raw,source_name,mapping):
    if not isinstance(raw,bytes) or not raw or len(raw)>20000000:raise ValueError("Invalid size for source CSV")
    start,horse_map=check_mapping(mapping)
    if len(source_name)>250 or not source_name.lower().endswith(".csv"):raise ValueError("Source must be CSV")
    text=raw.decode("utf-8-sig")
    reader=csv.DictReader(io.StringIO(text))
    if reader.fieldnames is None or len(reader.fieldnames)!=len(set(reader.fieldnames)) or not REQUIRED.issubset(reader.fieldnames):
        raise ValueError("Missing or duplicate Betfair BSP CSV columns")
    rows=[];event=str(mapping["event_id"]).strip()
    for row in reader:
        if str(row.get("EVENT_ID","")).strip()!=event:continue
        # Betting exchange IDs are not interchangeable with Sporting Life horse IDs.
        selection=str(row.get("SELECTION_ID","")).strip()
        if selection not in set(horse_map.values()):continue
        if any(row.get(k) is None for k in REQUIRED):raise ValueError("Malformed source row")
        if instant(row["EVENT_DT"])!=start:raise ValueError("Betfair event timestamp mismatch")
        try:bsp=float(row["BSP"])
        except (TypeError,ValueError):raise ValueError("Invalid BSP")
        if not math.isfinite(bsp) or bsp<=1 or bsp>=1001:
            raise ValueError("Unusable, missing or sentinel BSP; race withheld")
        winner=row["WIN_LOSE"].strip()
        if winner not in ("0","1"):raise ValueError("Unresolved result in win market")
        rows.append({"selection_id":selection,"selection_name":row["SELECTION_NAME"].strip(),
                     "bsp":bsp,"won":winner=="1"})
    selections={r["selection_id"] for r in rows}
    if len(rows)!=len(horse_map) or selections!=set(horse_map.values()):
        raise ValueError("Full matched field BSP observations required")
    if sum(r["won"] for r in rows)!=1:raise ValueError("WIN market must have precisely one recorded winner")
    by_id={r["selection_id"]:r for r in rows}
    quotes=[{"horse_id":horse,"betfair_selection_id":selection,
             "bsp":by_id[selection]["bsp"],"win_lose":by_id[selection]["won"]}
            for horse,selection in sorted(horse_map.items())]
    receipt={"schema_version":1,"kind":"BETFAIR_DAILY_WIN_BSP_MATCHED_V1",
             "race_id":str(mapping["race_id"]),"betfair_event_id":event,
             "market_type":"WIN","startUTC":start.isoformat(),
             "source_filename":source_name,"source_file_sha256":hashlib.sha256(raw).hexdigest(),
             "cross_provider_mapping_sha256":digest(mapping),
             "quotes":quotes,"source_provider":"Betfair SP history CSV",
             "bsp_is_post_off_reference":True,"pre_event_executable_price":False,
             "historical_source_access_attested":False,**GATE,
             "limitations":["Cross-provider mapping is externally asserted, not independently verified by this parser.",
                            "BSP is settlement/closing reference and cannot be used as pre-off available price.",
                            "No licence to republish or use source data is inferred from availability."]}
    receipt["record_sha256"]=digest(receipt)
    return receipt
def main():
    p=argparse.ArgumentParser()
    p.add_argument("--csv",type=Path,required=True)
    p.add_argument("--mapping",type=Path,required=True)
    p.add_argument("--out",type=Path,required=True)
    a=p.parse_args()
    mapping=json.loads(a.mapping.read_text())
    receipt=parse_file(a.csv.read_bytes(),a.csv.name,mapping)
    a.out.parent.mkdir(parents=True,exist_ok=True)
    payload=json.dumps(receipt,indent=2)+"\n"
    if a.out.exists() and a.out.read_text()!=payload:raise ValueError("Refusing to overwrite a different BSP receipt")
    if not a.out.exists():a.out.write_text(payload)
    print(json.dumps({"status":"RESEARCH_ONLY","race_id":receipt["race_id"],"matched":len(receipt["quotes"]),"publication_gate":"BLOCKED"}))
if __name__=="__main__":main()
