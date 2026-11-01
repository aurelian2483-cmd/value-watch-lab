#!/usr/bin/env python3
"""Experiment 64: freeze the original Experiment 63 bytes and request RFC3161 timestamp.
Third-party response is evidence only; do not mark independently VERIFIED without
trust-chain and message-imprint verification. No ledger writes or challenge credit.
"""
import datetime as dt,hashlib,json,pathlib,subprocess,sys,urllib.request
ROOT=pathlib.Path("/tmp/experiment64")
ROOT.mkdir(parents=True,exist_ok=True)
def sha(b):return hashlib.sha256(b).hexdigest()
def stamp():return dt.datetime.now(dt.timezone.utc).isoformat().replace("+00:00","Z")
def run(*args):return subprocess.run(args,capture_output=True,text=True,timeout=25)
def main():
 report={"experiment":64,"status":"BLOCKED_PENDING","publication_gate":"BLOCKED",
  "challenge_eligible":0,"challenge_progress":"0/100","persistent_ledger_modified":False,
  "independent_timestamp_verified":False,"model_validation":"UNVALIDATED"}
 try:
  original=pathlib.Path("/tmp/experiment63-original/forecast.json")
  if not original.is_file():raise ValueError("Original Experiment 63 forecast artifact missing")
  raw=original.read_bytes()
  forecast=json.loads(raw)
  record=dict(forecast);record_hash=record.pop("record_sha256",None)
  if record_hash!=sha(json.dumps(record,sort_keys=True,separators=(",",":")).encode()):
   raise ValueError("original forecast record hash mismatch")
  if forecast.get("challenge_eligible")!=0 or forecast.get("publication_gate")!="BLOCKED":
   raise ValueError("unexpected publication/challenge flags")
  kickoff=dt.datetime.fromisoformat(forecast["kickoff_utc"].replace("Z","+00:00"))
  now=dt.datetime.now(dt.timezone.utc)
  if now>=kickoff:raise ValueError("cannot request new pre-kickoff witness after kickoff")
  (ROOT/"frozen-original-forecast.json").write_bytes(raw)
  # Timestamp exact original bytes; query requests SHA256 imprint and nonce.
  query=ROOT/"timestamp-request.tsq";reply=ROOT/"timestamp-response.tsr"
  q=run("openssl","ts","-query","-data",str(original),"-sha256","-cert","-out",str(query))
  if q.returncode:raise ValueError("openssl timestamp query failed: "+q.stderr[-300:])
  response_status="NOT_OBTAINED";error=None
  try:
   req=urllib.request.Request("https://freetsa.org/tsr",data=query.read_bytes(),
    headers={"Content-Type":"application/timestamp-query","User-Agent":"ValueWatchResearch/1.0"},
    method="POST")
   with urllib.request.urlopen(req,timeout=20) as r:
    response=r.read(2000001)
   if not response or len(response)>2000000:raise ValueError("empty/oversized timestamp response")
   reply.write_bytes(response)
   parsed=run("openssl","ts","-reply","-in",str(reply),"-text")
   (ROOT/"timestamp-response-inspection.txt").write_text(parsed.stdout+parsed.stderr)
   if parsed.returncode:raise ValueError("timestamp response could not be parsed")
   # Do NOT interpret parsing as cryptographic verification. Full TSA chain
   # and trust policy must be checked separately.
   response_status="RFC3161_RESPONSE_RECEIVED_UNVERIFIED"
  except Exception as e:error=str(e);response_status="RFC3161_REQUEST_FAILED"
  report.update(status="ORIGINAL_FORECAST_FROZEN_TIMESTAMP_RESPONSE_UNVERIFIED" if not error else "ORIGINAL_FORECAST_FROZEN_WITNESS_UNAVAILABLE",
   original_forecast_sha256=sha(raw),original_record_sha256=record_hash,
   original_forecast_generated_at_utc=forecast["generated_at_utc"],kickoff_utc=forecast["kickoff_utc"],
   timestamp_request_sha256=sha(query.read_bytes()),timestamp_response_status=response_status,
   timestamp_response_sha256=sha(reply.read_bytes()) if reply.exists() else None,
   witness_requested_at_utc=stamp(),witness_error=error,
   limitations=["Original GitHub artifact was copied, not rewritten",
    "RFC3161 response parsing is not cryptographic chain verification",
    "Third-party response does not independently certify historical input first availability",
    "No odds, EV, publication, or challenge credit"])
 except Exception as e:report.update(status="BLOCKED_AUDIT_ERROR",error=str(e))
 (ROOT/"report.json").write_text(json.dumps(report,indent=2)+"\n")
 print(json.dumps({k:report.get(k) for k in ("status","timestamp_response_status","error","witness_error")}))
 if report["status"]=="BLOCKED_AUDIT_ERROR":sys.exit(1)
if __name__=="__main__":main()
