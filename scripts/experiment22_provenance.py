#!/usr/bin/env python3
"""Experiment 22: bind forecast records to exact model and input bytes.
Read-only preflight: does not publish or claim that GitHub commit time is verified.
"""
import argparse,datetime as dt,hashlib,json,pathlib,sys
from experiment21_ledger import check_record,identity
def sha256(path):
    if not path.is_file():raise ValueError(f"missing evidence file: {path}")
    return hashlib.sha256(path.read_bytes()).hexdigest()
def check_manifest(record,model_path,input_paths,now):
    check_record(record,now)
    if not input_paths:raise ValueError("at least one input required")
    if len(set(map(str,input_paths)))!=len(input_paths):raise ValueError("duplicate input path")
    model_hash=sha256(model_path)
    hashes=[{"name":p.name,"sha256":sha256(p)} for p in input_paths]
    # The data hash is over a deterministic manifest of file names + exact file hashes.
    if len({h["name"] for h in hashes})!=len(hashes):raise ValueError("ambiguous duplicate input filename")
    data_hash=hashlib.sha256(json.dumps(sorted(hashes,key=lambda h:h["name"]),sort_keys=True,separators=(",",":")).encode()).hexdigest()
    if record["model_sha256"]!=model_hash:raise ValueError("model hash does not match bytes")
    if record["data_sha256"]!=data_hash:raise ValueError("data hash does not match bytes")
    return {"model_sha256":model_hash,"data_sha256":data_hash,"input_hashes":hashes}
def main():
    p=argparse.ArgumentParser()
    p.add_argument("--record",type=pathlib.Path,required=True)
    p.add_argument("--model",type=pathlib.Path,required=True)
    p.add_argument("--input",type=pathlib.Path,action="append",required=True)
    p.add_argument("--output",type=pathlib.Path,required=True)
    a=p.parse_args();now=dt.datetime.now(dt.timezone.utc)
    r=json.loads(a.record.read_text())
    if not isinstance(r,dict):raise ValueError("record must be object")
    evidence=check_manifest(r,a.model,a.input,now)
    a.output.write_text(json.dumps({"status":"PREFLIGHT_ONLY","record_id":identity(r),"evidence":evidence,"challenge_eligible":0,"publishing_enabled":False},indent=2)+"\n")
    print("PASS: model and inputs cryptographically match candidate; no publication")
if __name__=="__main__":
    try:main()
    except Exception as exc:sys.exit(f"BLOCKED: {exc}")
