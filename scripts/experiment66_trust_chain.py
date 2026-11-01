#!/usr/bin/env python3
"""Experiment 66: diagnose FreeTSA trust chain without promoting an untrusted root.
All timestamp and certificate assertions remain UNVERIFIED unless a separately
authenticated root fingerprint is supplied and cryptographic verification passes.
"""
import datetime as dt,hashlib,json,pathlib,subprocess,sys,urllib.request
OUT=pathlib.Path("/tmp/experiment66");OUT.mkdir(parents=True,exist_ok=True)
SRC=pathlib.Path("/tmp/experiment65-original")
def sha(b):return hashlib.sha256(b).hexdigest()
def run(*args):
 try:
  r=subprocess.run(args,capture_output=True,text=True,timeout=25)
  return {"exit_code":r.returncode,"stdout":r.stdout[-6000:],"stderr":r.stderr[-6000:]}
 except Exception as e:return {"exit_code":-1,"error":str(e)}
def main():
 report={"experiment":66,"status":"BLOCKED_PENDING","independent_timestamp_trust":"UNVERIFIED",
  "model_validation":"UNVALIDATED","publication_gate":"BLOCKED","challenge_eligible":0,
  "challenge_progress":"0/100","persistent_ledger_modified":False}
 try:
  evidence=SRC/"frozen-original-forecast.json"
  response=SRC/"timestamp-response.tsr"
  prior=SRC/"report.json"
  if not all(p.is_file() for p in (evidence,response,prior)):raise ValueError("Experiment 65 artifact lacks original RFC3161 evidence")
  old=json.loads(prior.read_text())
  if sha(evidence.read_bytes())!=old.get("original_forecast_sha256"):raise ValueError("forecast integrity mismatch")
  if sha(response.read_bytes())!=old.get("timestamp_response_sha256"):raise ValueError("timestamp response integrity mismatch")
  certs=[]
  for label,url in [("root","https://freetsa.org/files/Root_CA.pem"),
                    ("intermediate","https://freetsa.org/files/tsa.crt")]:
   item={"role":label,"url":url,"authenticated_independently":False}
   try:
    req=urllib.request.Request(url,headers={"User-Agent":"ValueWatchResearch/1.0"})
    with urllib.request.urlopen(req,timeout=20) as r:raw=r.read(200001)
    if not raw or len(raw)>200000:raise ValueError("empty or oversized certificate")
    path=OUT/(label+".pem");path.write_bytes(raw)
    item.update(sha256=sha(raw),details=run("openssl","x509","-in",str(path),
     "-noout","-subject","-issuer","-fingerprint","-sha256","-dates","-ext","basicConstraints"))
    if item["details"]["exit_code"]!=0:raise ValueError("not a parseable X509 certificate")
   except Exception as e:item["error"]=str(e)
   certs.append(item)
  system=run("openssl","ts","-verify","-data",str(evidence),"-in",str(response),
    "-CApath","/etc/ssl/certs")
  (OUT/"system-verification.json").write_text(json.dumps(system,indent=2)+"\n")
  root=OUT/"root.pem";inter=OUT/"intermediate.pem"
  supplied=None
  if root.exists() and inter.exists():
   supplied=run("openssl","ts","-verify","-data",str(evidence),"-in",str(response),
     "-CAfile",str(root),"-untrusted",str(inter))
   (OUT/"provider-chain-verification.json").write_text(json.dumps(supplied,indent=2)+"\n")
  report.update(status="CHAIN_DIAGNOSTICS_COMPLETED_TRUST_UNVERIFIED",
   original_forecast_sha256=sha(evidence.read_bytes()),
   timestamp_response_sha256=sha(response.read_bytes()),
   certificate_candidates=certs,system_trust_result=system,provider_chain_result=supplied,
   independently_authenticated_root_fingerprint=None,
   provider_chain_result_is_not_independent_trust=True,
   limitations=["Provider-hosted root and intermediate are not independent trust evidence",
    "Certificate validity dates do not establish root authenticity",
    "A trusted root fingerprint must be authenticated through a separate trusted channel",
    "No retrospective timestamp promotion, odds, EV, or challenge credit"])
 except Exception as e:report.update(status="BLOCKED_AUDIT_ERROR",error=str(e))
 (OUT/"report.json").write_text(json.dumps(report,indent=2)+"\n")
 print(json.dumps({k:report.get(k) for k in ("status","error")}))
 if report["status"]=="BLOCKED_AUDIT_ERROR":sys.exit(1)
if __name__=="__main__":main()
