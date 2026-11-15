#!/usr/bin/env python3
"""V3 profile source recovery feasibility probe: three identity-verified horses.

Outputs source receipts and structured field coverage. Does not impute data,
change frozen records, claim prospective availability, or export model inputs.
"""
import datetime as dt
import hashlib
import json
import re
import time
import urllib.request
from html.parser import HTMLParser
from pathlib import Path

TARGETS=[
 {"target_race_id":"877817","target_date":"2025-09-08","horse_id":"968902","horse_name":"Ebendi"},
 {"target_race_id":"877820","target_date":"2025-09-08","horse_id":"856295","horse_name":"Jewel Maker"},
 {"target_race_id":"877820","target_date":"2025-09-08","horse_id":"1105875","horse_name":"Electric Avenue"}
]

class NextData(HTMLParser):
 def __init__(self):super().__init__();self.active=False;self.parts=[];self.payloads=[]
 def handle_starttag(self,tag,attrs):
  attrs=dict(attrs)
  if tag=="script" and (attrs.get("id")=="__NEXT_DATA__" or attrs.get("type")=="application/json"):
   self.active=True;self.parts=[]
 def handle_data(self,data):
  if self.active:self.parts.append(data)
 def handle_endtag(self,tag):
  if tag=="script" and self.active:
   raw="".join(self.parts)
   try:self.payloads.append(json.loads(raw))
   except (ValueError,TypeError):pass
   self.active=False

def walk(value,path="$",depth=0):
 if depth>28:return
 if isinstance(value,dict):
  yield path,value
  for k,v in value.items():
   if isinstance(v,(dict,list)):yield from walk(v,path+"."+str(k),depth+1)
 elif isinstance(value,list):
  for i,v in enumerate(value):
   if isinstance(v,(dict,list)):yield from walk(v,path+"["+str(i)+"]",depth+1)

def main():
 output=Path("/tmp/horse-v3-profile-recovery");output.mkdir(parents=True,exist_ok=True)
 report={"schema_version":1,"kind":"PROFILE_STRUCTURE_PROBE","research_only":True,
         "model_validation":"UNVALIDATED","publication_gate":"BLOCKED",
         "capture_type":"POST_EVENT_RETROSPECTIVE_NOT_PRE_RACE_ATTESTED",
         "profiles":[]}
 for target in TARGETS:
  url="https://www.sportinglife.com/racing/profiles/horse/"+target["horse_id"]
  record={**target,"profile_url":url,"status":"FETCH_FAILED","candidate_rows":[]}
  try:
   req=urllib.request.Request(url,headers={"User-Agent":"Mozilla/5.0 (compatible; ValueWatchResearch/1.0)"})
   with urllib.request.urlopen(req,timeout=25) as response:
    if response.status!=200 or response.geturl()!=url:raise ValueError("Unapproved response/redirect")
    raw=response.read(3000001)
   if not raw or len(raw)>3000000:raise ValueError("Invalid source length")
   observed=dt.datetime.now(dt.timezone.utc).isoformat()
   digest=hashlib.sha256(raw).hexdigest()
   (output/(target["horse_id"]+".html")).write_bytes(raw)
   parser=NextData();parser.feed(raw.decode("utf-8",errors="replace"))
   record.update(status="SOURCE_CAPTURED",source_sha256=digest,
                 observed_at_utc=observed,structured_payloads=len(parser.payloads))
   possible=[]
   for obj in parser.payloads:
    for path,node in walk(obj):
     keys={str(k).lower():k for k in node}
     if "date" not in keys:continue
     if not any(k in keys for k in ("race_id","raceid","race_reference","race_summary_reference")):continue
     if not any(k in keys for k in ("position","finish_position","finishposition")):continue
     possible.append({"json_path":path,"fields":sorted(str(k) for k in node),
                      "record":node})
   record["structured_candidate_count"]=len(possible)
   # Disclosure only; a complete row still needs independent ID, field and date verification.
   record["candidate_rows"]=possible[:100]
   if possible:record["status"]="STRUCTURED_CANDIDATES_NEED_VERIFICATION"
   else:record["status"]="NO_COMPLETE_STRUCTURED_CANDIDATES"
  except Exception as exc:record["error"]=str(exc)[:300]
  report["profiles"].append(record)
  print(json.dumps({"horse_id":target["horse_id"],"status":record["status"],
                    "candidates":record.get("structured_candidate_count",0)}),flush=True)
  time.sleep(2)
 report["verified_training_rows"]=0
 report["limitations"]=["No horse profile table rows are promoted automatically",
                        "Post-event profile observations are not historic pre-race receipts",
                        "Structured candidates require exact event and identity checks",
                        "Any missing race IDs, fields, or ambiguous outcomes block recovery"]
 (output/"profile-probe.json").write_text(json.dumps(report,indent=2,default=str)+"\n")
 print(json.dumps({"source_captures":sum("source_sha256" in p for p in report["profiles"]),
                   "candidate_count":sum(p.get("structured_candidate_count",0) for p in report["profiles"]),
                   "verified_training_rows":0}))
if __name__=="__main__":main()
