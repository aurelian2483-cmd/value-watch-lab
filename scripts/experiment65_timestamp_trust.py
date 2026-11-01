#!/usr/bin/env python3
"""Experiment 65: verify original RFC3161 response and assess certificate trust.
A CA certificate downloaded from the TSA itself is NOT independently trusted.
No ledger changes, no publication or challenge credit.
"""
import datetime as dt,hashlib,json,pathlib,subprocess,sys,urllib.request
OUT=pathlib.Path("/tmp/experiment65");OUT.mkdir(parents=True,exist_ok=True)
SRC=pathlib.Path("/tmp/experiment64-original")
URL="https://freetsa.org/files/tsa.crt"
def sha(b):return hashlib.sha256(b).hexdigest()
def cmd(args):
 try:
  r=subprocess.run(args,capture_output=True,text=True,timeout=25)
  return {"exit_code":r.returncode,"stdout":r.stdout[-5000:],"stderr":r.stderr[-5000:]}
 except Exception as e:return {"exit_code":-1,"error":str(e)}
def main():
 report={"experiment":65,"status":"BLOCKED_PENDING","publication_gate":"BLOCKED",
  "challenge_eligible":0,"challenge_progress":"0/100","persistent_ledger_modified":False,
  "timestamp_independently_trusted":False,"model_validation":"UNVALIDATED"}
 try:
  files={name:SRC/name for name in ("frozen-original-forecast.json","timestamp-request.tsq","timestamp-response.tsr","report.json")}
  if not all(p.is_file() for p in files.values()):raise ValueError("original Experiment 64 artifact incomplete")
  old=json.loads(files["report.json"].read_text())
  original=files["frozen-original-forecast.json"].read_bytes()
  req=files["timestamp-request.tsq"].read_bytes();resp=files["timestamp-response.tsr"].read_bytes()
  for label,raw,key in (("original",original,"original_forecast_sha256"),("request",req,"timestamp_request_sha256"),("response",resp,"timestamp_response_sha256")):
   if sha(raw)!=old.get(key):raise ValueError(label+" SHA256 mismatch")
  forecast=json.loads(original)
  kickoff=dt.datetime.fromisoformat(forecast["kickoff_utc"].replace("Z","+00:00"))
  inspection=cmd(["openssl","ts","-reply","-in",str(files["timestamp-response.tsr"]),"-text"])
  (OUT/"response-inspection.json").write_text(json.dumps(inspection,indent=2)+"\n")
  if inspection["exit_code"]!=0:raise ValueError("invalid timestamp response")
  # OpenSSL verification checks message imprint, signature and chain against trust store.
  # Without an independently authenticated trust anchor this must fail closed.
  default=cmd(["openssl","ts","-verify","-data",str(files["frozen-original-forecast.json"]),
   "-in",str(files["timestamp-response.tsr"]),"-CApath","/etc/ssl/certs"])
  (OUT/"system-trust-verification.json").write_text(json.dumps(default,indent=2)+"\n")
  tsa_download=None;self_anchor=None;cert_details=None
  try:
   request=urllib.request.Request(URL,headers={"User-Agent":"ValueWatchResearch/1.0"})
   with urllib.request.urlopen(request,timeout=20) as r:cert=r.read(200001)
   if not cert or len(cert)>200000:raise ValueError("invalid certificate download")
   cert_path=OUT/"tsa-downloaded.crt";cert_path.write_bytes(cert)
   tsa_download={"url":URL,"sha256":sha(cert),"retrieved_at_utc":dt.datetime.now(dt.timezone.utc).isoformat(),
     "independently_authenticated":False}
   cert_details=cmd(["openssl","x509","-in",str(cert_path),"-noout","-subject","-issuer","-fingerprint","-sha256","-dates"])
   self_anchor=cmd(["openssl","ts","-verify","-data",str(files["frozen-original-forecast.json"]),
    "-in",str(files["timestamp-response.tsr"]),"-CAfile",str(cert_path)])
   (OUT/"tsa-supplied-anchor-verification.json").write_text(json.dumps(self_anchor,indent=2)+"\n")
  except Exception as e:tsa_download={"url":URL,"error":str(e),"independently_authenticated":False}
  response_text=inspection.get("stdout","")
  # genTime extracted only as an untrusted reported timestamp; chain required for trust.
  import re
  match=re.search(r"Time stamp:\s*(.+)",response_text)
  gen_time=match.group(1).strip() if match else None
  report.update(status="TIMESTAMP_TRUST_VERIFIED_BY_SYSTEM" if default["exit_code"]==0 else "TIMESTAMP_TRUST_UNVERIFIED",
   original_forecast_sha256=sha(original),timestamp_request_sha256=sha(req),timestamp_response_sha256=sha(resp),
   original_kickoff_utc=forecast["kickoff_utc"],tsa_reported_generation_time=gen_time,
   system_trust_verification=default,tsa_certificate_download=tsa_download,
   tsa_certificate_details=cert_details,tsa_supplied_anchor_verification=self_anchor,
   timestamp_independently_trusted=default["exit_code"]==0,
   limitations=["TSA-supplied certificate is not an independently authenticated trust anchor",
    "Even valid signature and message imprint do not establish source data first availability",
    "No verified Sky Bet odds, EV, publication or prospective challenge credit"])
 except Exception as e:report.update(status="BLOCKED_AUDIT_ERROR",error=str(e))
 (OUT/"report.json").write_text(json.dumps(report,indent=2)+"\n")
 print(json.dumps({k:report.get(k) for k in ("status","timestamp_independently_trusted","error")}))
 if report["status"]=="BLOCKED_AUDIT_ERROR":sys.exit(1)
if __name__=="__main__":main()
