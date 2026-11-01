#!/usr/bin/env python3
"""Experiment 86: integrate SHA-verified archived paper forecasts into research feed.
No official challenge credit, betting advice, or unverified results.
"""
import datetime as dt,hashlib,json,pathlib,math
ROOT=pathlib.Path(__file__).resolve().parents[1]
ARCHIVE=ROOT/"research/forecast-archive/v1"
FEED=pathlib.Path("/tmp/experiment82/dashboard-data.json")
OUT=pathlib.Path("/tmp/experiment86")
def canonical(obj):return json.dumps(obj,sort_keys=True,separators=(",",":")).encode()
def main():
 OUT.mkdir(parents=True,exist_ok=True)
 feed=json.loads(FEED.read_text())
 if feed.get("publication_gate")!="BLOCKED" or feed.get("research_only") is not True:
  raise ValueError("Unsafe input feed")
 records={};errors=[]
 for path in sorted(ARCHIVE.glob("*.json")):
  try:
   obj=json.loads(path.read_text())
   digest=obj.get("record_sha256")
   unsigned=dict(obj);unsigned.pop("record_sha256",None)
   if digest!=path.stem or hashlib.sha256(canonical(unsigned)).hexdigest()!=digest:
    raise ValueError("SHA256 record mismatch")
   if obj.get("publication_gate")!="BLOCKED" or obj.get("challenge_eligible")!=0 or obj.get("odds") is not None or obj.get("expected_value") is not None:
    raise ValueError("Unsafe forecast flags")
   generated=dt.datetime.fromisoformat(obj["generated_at_utc"].replace("Z","+00:00"))
   kickoff=dt.datetime.fromisoformat(obj["kickoff_utc"].replace("Z","+00:00"))
   if generated.tzinfo is None or kickoff.tzinfo is None or generated>=kickoff:
    raise ValueError("Not pre-event")
   probs=[obj[k] for k in ("prob_home","prob_draw","prob_away")]
   if any(not isinstance(v,(int,float)) or not math.isfinite(v) or v<=0 or v>=1 for v in probs) or abs(sum(probs)-1)>1e-8:
    raise ValueError("Invalid probabilities")
   key=(obj["league"],obj["home"].strip().casefold(),obj["away"].strip().casefold(),obj["kickoff_utc"])
   item={"league":obj["league"],"home":obj["home"],"away":obj["away"],
     "kickoff_utc":obj["kickoff_utc"],"generated_at_utc":obj["generated_at_utc"],
     "prob_home":probs[0],"prob_draw":probs[1],"prob_away":probs[2],
     "record_sha256":digest,"record_type":"ARCHIVED_PAPER_FORECAST",
     "source_first_availability_verified":bool(obj.get("source_first_availability_verified",False)),
     "independent_timestamp_attested":bool(obj.get("independent_timestamp_attested",False)),
     "challenge_eligible":0,"publication_gate":"BLOCKED"}
   if key in records:
    if records[key]["record_sha256"]!=digest:raise ValueError("Conflicting archived forecasts for same fixture")
   else:records[key]=item
  except Exception as exc:errors.append({"file":path.name,"error":str(exc)})
 if errors:
  (OUT/"archive-errors.json").write_text(json.dumps(errors,indent=2)+"\n")
  raise ValueError("Archive integrity audit failed; no feed published")
 feed["paper_forecasts"]=sorted(records.values(),key=lambda x:(x["kickoff_utc"],x["record_sha256"]))
 feed["experiment"]=86
 feed["forecast_archive_audit"]={"status":"SHA256_VERIFIED_RESEARCH_ONLY","unique_forecasts":len(records),
  "independently_attested_forecasts":sum(x["independent_timestamp_attested"] for x in records.values())}
 feed["completed_results"]=[]
 feed["accuracy"]={"status":"INSUFFICIENT_VERIFIED_SCORED_DATA","sample_size":0,"value":None}
 FEED.write_text(json.dumps(feed,indent=2)+"\n")
 (OUT/"archive-audit.json").write_text(json.dumps(feed["forecast_archive_audit"],indent=2)+"\n")
 print(json.dumps(feed["forecast_archive_audit"]))
if __name__=="__main__":main()
