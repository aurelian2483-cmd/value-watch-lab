#!/usr/bin/env python3
"""Experiment 55: capture fresh source bytes and a reproducible as-of row manifest.
Retrieval timestamps are NOT independently attested source first-availability times.
"""
import csv,datetime as dt,hashlib,io,json,pathlib,urllib.request,sys
from experiment23_pipeline import parse
from experiment39_training_inclusion_audit import canonical
OUT=pathlib.Path("/tmp/experiment55")
SOURCES={"E0_2526.csv":"https://www.football-data.co.uk/mmz4281/2526/E0.csv",
         "E0_2627.csv":"https://www.football-data.co.uk/mmz4281/2627/E0.csv"}
def stamp():return dt.datetime.now(dt.timezone.utc).isoformat().replace("+00:00","Z")
def main():
 OUT.mkdir(parents=True,exist_ok=True)
 report={"experiment":55,"status":"BLOCKED_PENDING","publication_gate":"BLOCKED","challenge_eligible":0,
         "publishing_enabled":False,"persistent_ledger_modified":False,
         "source_first_availability_independently_verified":False}
 try:
  capture_started=stamp();cutoff=dt.datetime.now(dt.timezone.utc)
  sources=[];training=[]
  for name,url in SOURCES.items():
   request=urllib.request.Request(url,headers={"User-Agent":"ValueWatchResearch/1.0"})
   with urllib.request.urlopen(request,timeout=35) as response:
    if response.status!=200:raise ValueError("unexpected HTTP status")
    data=response.read(2000001)
    headers={"last_modified":response.headers.get("Last-Modified"),
             "etag":response.headers.get("ETag"),"date":response.headers.get("Date")}
   received=stamp()
   if not data or len(data)>2000000:raise ValueError("empty or oversized CSV")
   rows=parse(data)
   if len(rows)<30:raise ValueError("insufficient valid rows")
   (OUT/name).write_bytes(data)
   included=[];excluded=[]
   for row in rows:
    # Exclude current UTC date and future dates: completion time is unknown.
    if name=="E0_2526.csv" or row[0]<cutoff.date():included.append(row)
    else:excluded.append(row)
   if any(row[0]>=cutoff.date() for row in included):raise ValueError("cutoff violation")
   weight=0.5 if name=="E0_2526.csv" else 1.0
   training.extend([[r[0].isoformat(),r[1],r[2],r[3],r[4],weight] for r in included])
   sources.append({"filename":name,"url":url,"retrieved_at_utc":received,
     "sha256":hashlib.sha256(data).hexdigest(),"byte_length":len(data),
     "http_response_headers_untrusted":headers,"parsed_rows":len(rows),
     "included_rows":len(included),"excluded_rows":len(excluded),
     "included_rows_sha256":hashlib.sha256(canonical([[r[0].isoformat(),*r[1:]] for r in included])).hexdigest(),
     "first_available_at_utc":None,"completion_timestamps_verified":False})
  if len(training)<100:raise ValueError("insufficient training rows")
  manifest={"schema":"experiment55-input-snapshot-v1","capture_started_at_utc":capture_started,
    "cutoff_utc":cutoff.isoformat().replace("+00:00","Z"),
    "source_first_availability_verified":False,
    "source_snapshots":sources,"training_row_count":len(training),
    "training_rows_sha256":hashlib.sha256(canonical(training)).hexdigest(),
    "publication_gate":"BLOCKED","challenge_eligible":0}
  (OUT/"training-rows.json").write_bytes(canonical(training)+b"\n")
  (OUT/"snapshot-manifest.json").write_bytes(canonical(manifest)+b"\n")
  report.update(status="PROSPECTIVE_SOURCE_BYTES_CAPTURED_CUTOFF_UNVERIFIED",
    manifest_sha256=hashlib.sha256(canonical(manifest)).hexdigest(),
    source_count=len(sources),training_row_count=len(training),
    source_hashes={s["filename"]:s["sha256"] for s in sources},
    replay_inputs_captured=True,model_replay_verified=False,
    historical_source_first_availability_verified=False,
    limitations=["GitHub artifact is not independent timestamp authority",
      "HTTP headers do not prove first availability",
      "Current-day results excluded, but prior-day availability still requires evidence",
      "No forecast committed or counted toward prospective challenge"])
 except Exception as e:report.update(status="BLOCKED_AUDIT_ERROR",error=str(e))
 (OUT/"report.json").write_text(json.dumps(report,indent=2)+"\n")
 print(json.dumps({k:report.get(k) for k in ("status","source_count","training_row_count","error")}))
 if report["status"]=="BLOCKED_AUDIT_ERROR":sys.exit(1)
if __name__=="__main__":main()
