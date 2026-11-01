#!/usr/bin/env python3
"""Experiment 69: build fail-closed, cross-experiment read-only fixture registry.
Input: all retained Experiment 63 and 68 GitHub artifacts downloaded by workflow.
No writes to persistent research ledger or publication.
"""
import datetime as dt,hashlib,json,pathlib,sys
BASE=pathlib.Path("/tmp/experiment68-history");BASE.mkdir(parents=True,exist_ok=True)
def canon(x):return json.dumps(x,sort_keys=True,separators=(",",":")).encode()
def sha(x):return hashlib.sha256(x).hexdigest()
def main():
 report={"experiment":69,"status":"BLOCKED_PENDING","publication_gate":"BLOCKED","challenge_eligible":0}
 try:
  inventory=json.loads((BASE/"artifact-inventory.json").read_text())
  records=[];seen=set();dupes=[];source_counts={"63":0,"68":0}
  for entry in sorted(inventory["artifacts"],key=lambda e:(0 if e["name"]=="experiment63-new-fixture-forecast-review" else 1,e["id"])):
   root=BASE/str(entry["id"])
   if entry["name"]=="experiment63-new-fixture-forecast-review":
    candidates=list(root.rglob("forecast.json"));kind="63"
    if len(candidates)!=1:raise ValueError("Experiment 63 artifact missing unique forecast.json")
    objects=[json.loads(candidates[0].read_text())]
   elif entry["name"]=="experiment68-forecast-collector-review":
    candidates=list(root.rglob("manifest.json"));kind="68"
    if len(candidates)!=1:raise ValueError("Experiment 68 artifact missing unique manifest.json")
    objects=json.loads(candidates[0].read_text()).get("forecasts",[])
   else:raise ValueError("unexpected artifact")
   source_counts[kind]+=1
   for obj in objects:
    expected=obj.get("record_sha256")
    content=dict(obj);content.pop("record_sha256",None)
    if expected!=sha(canon(content)):raise ValueError("forecast record integrity mismatch")
    key=(obj["league"],obj["home"].strip().lower(),obj["away"].strip().lower(),obj["kickoff_utc"])
    record={"league":obj["league"],"home":obj["home"],"away":obj["away"],
      "kickoff_utc":obj["kickoff_utc"],"record_sha256":expected,
      "artifact_id":entry["id"],"experiment":int(kind)}
    if key in seen:dupes.append(record)
    else:records.append(record);seen.add(key)
  if source_counts["63"]<1:raise ValueError("original Experiment 63 artifact not found")
  registry={"schema":"experiment69-read-only-registry-v1","complete":True,
   "generated_at_utc":dt.datetime.now(dt.timezone.utc).isoformat(),
   "experiment63_artifact_count":source_counts["63"],
   "experiment68_artifact_count":source_counts["68"],
   "forecasts":records,"duplicate_records":dupes,"publication_gate":"BLOCKED",
   "challenge_eligible":0,"scope":"retained GitHub Actions artifacts only"}
  (BASE/"registry.json").write_bytes(canon(registry)+b"\n")
  report.update(status="CROSS_EXPERIMENT_REGISTRY_READY",unique_fixture_count=len(records),
   duplicate_record_count=len(dupes),source_counts=source_counts,registry_sha256=sha(canon(registry)))
 except Exception as e:report.update(status="BLOCKED_AUDIT_ERROR",error=str(e))
 (BASE/"registry-report.json").write_text(json.dumps(report,indent=2)+"\n")
 print(json.dumps(report))
 if report["status"]=="BLOCKED_AUDIT_ERROR":sys.exit(1)
if __name__=="__main__":main()
