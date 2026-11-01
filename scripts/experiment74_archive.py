#!/usr/bin/env python3
"""Experiment 74: append-only, hash-verified research archive from retained Actions artifacts.
Research-only; never grants official challenge credit or changes the persistent ledger.
"""
import hashlib,json,pathlib,sys,datetime as dt
BASE=pathlib.Path("/tmp/experiment68-history")
DEST=pathlib.Path("research/forecast-archive/v1")
def canonical(x):return json.dumps(x,sort_keys=True,separators=(",",":")).encode()
def digest(x):return hashlib.sha256(x).hexdigest()
def key(x):return (x["league"],x["home"].strip().casefold(),x["away"].strip().casefold(),x["kickoff_utc"])
def main():
 inventory=json.loads((BASE/"artifact-inventory.json").read_text())["artifacts"]
 original=0;added=0;duplicates=0;seen={}
 DEST.mkdir(parents=True,exist_ok=True)
 for file in sorted(DEST.glob("*.json")):
  x=json.loads(file.read_text())
  if file.stem!=x.get("record_sha256"):raise ValueError("archive filename/hash mismatch")
  y=dict(x);y.pop("record_sha256",None)
  if digest(canonical(y))!=file.stem:raise ValueError("archive record corrupted")
  k=key(x)
  if k in seen and seen[k]!=file.stem:raise ValueError("conflicting existing fixture records")
  seen[k]=file.stem
 for a in sorted(inventory,key=lambda v:(0 if v["name"].startswith("experiment63-") else 1,v["id"])):
  root=BASE/str(a["id"]);name=a["name"]
  if name=="experiment63-new-fixture-forecast-review":
   files=list(root.rglob("forecast.json"))
   if len(files)!=1:raise ValueError("original forecast missing or ambiguous")
   objects=[json.loads(files[0].read_text())];original+=1
  elif name in ("experiment68-forecast-collector-review","experiment69-deduplicated-collector-review"):
   files=list(root.rglob("manifest.json"))
   if len(files)!=1:raise ValueError("collector manifest missing or ambiguous")
   objects=json.loads(files[0].read_text())["forecasts"]
  else:raise ValueError("unexpected artifact type")
  for x in objects:
   h=x.get("record_sha256");y=dict(x);y.pop("record_sha256",None)
   if not isinstance(h,str) or len(h)!=64 or digest(canonical(y))!=h:raise ValueError("source record hash mismatch")
   k=key(x)
   if k in seen:
    duplicates+=1
    # Existing distinct records of one fixture are historical duplicates: preserve the first.
    continue
   p=DEST/(h+".json")
   if p.exists():raise ValueError("unexpected existing archive path")
   p.write_bytes(canonical(x)+b"\n");seen[k]=h;added+=1
 if not original:raise ValueError("original Experiment 63 missing; refusing partial bootstrap")
 report={"experiment":74,"status":"ARCHIVE_READY","added":added,"duplicate_or_existing":duplicates,
  "unique_archived":len(seen),"publication_gate":"BLOCKED","challenge_eligible":0,
  "limitations":["Git history can be rewritten by administrators; not independently immutable",
  "Only retained artifacts were imported; unavailable history cannot be recovered",
  "No independently trusted first-availability evidence"]}
 pathlib.Path("/tmp/experiment74-report.json").write_text(json.dumps(report,indent=2)+"\n")
 print(json.dumps(report))
if __name__=="__main__":
 try:main()
 except Exception as e:
  print(json.dumps({"experiment":74,"status":"BLOCKED_AUDIT_ERROR","error":str(e)}));sys.exit(1)
