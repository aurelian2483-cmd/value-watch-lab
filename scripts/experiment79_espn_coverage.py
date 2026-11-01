#!/usr/bin/env python3
"""Experiment 79: ESPN-only future fixture coverage audit; no forecast admission."""
import datetime as dt,hashlib,json,pathlib,urllib.parse,urllib.request,sys
from experiment62_fixture_discovery import ESPN_URL,norm,stamp
OUT=pathlib.Path("/tmp/experiment79")
def main():
 OUT.mkdir(parents=True,exist_ok=True)
 now=dt.datetime.now(dt.timezone.utc)
 start=now+dt.timedelta(minutes=90);end=now+dt.timedelta(days=21)
 days=sorted({(now+dt.timedelta(days=i)).strftime("%Y%m%d") for i in range(22)})
 fixtures={};errors=[];receipts=[]
 for day in days:
  url=ESPN_URL+"?"+urllib.parse.urlencode({"dates":day,"limit":"100"})
  try:
   before=dt.datetime.now(dt.timezone.utc)
   req=urllib.request.Request(url,headers={"User-Agent":"ValueWatchResearch/1.0"})
   with urllib.request.urlopen(req,timeout=25) as response:
    if response.status!=200:raise ValueError("HTTP "+str(response.status))
    raw=response.read(3000001)
   if not raw or len(raw)>3000000:raise ValueError("empty or oversized response")
   receipts.append({"date":day,"sha256":hashlib.sha256(raw).hexdigest(),
     "retrieved_at_utc":stamp(dt.datetime.now(dt.timezone.utc)),
     "request_started_at_utc":stamp(before)})
   for event in json.loads(raw).get("events",[]):
    comps=event.get("competitions") or []
    if len(comps)!=1:continue
    sides=comps[0].get("competitors") or []
    home=[x for x in sides if x.get("homeAway")=="home"]
    away=[x for x in sides if x.get("homeAway")=="away"]
    if len(home)!=1 or len(away)!=1:continue
    h=home[0].get("team",{}).get("displayName","")
    a=away[0].get("team",{}).get("displayName","")
    if not norm(h) or not norm(a) or norm(h)==norm(a):continue
    when=dt.datetime.fromisoformat(event["date"].replace("Z","+00:00"))
    if not start<=when<=end:continue
    if event.get("status",{}).get("type",{}).get("state")!="pre":continue
    key=(norm(h),norm(a),stamp(when))
    fixture={"league":"E0","home":h,"away":a,"kickoff_utc":stamp(when),
      "espn_event_id":event.get("id"),"source":"ESPN_ONLY_UNCORROBORATED",
      "independently_verified":False,"forecast_eligible":False}
    if key in fixtures and fixtures[key]["espn_event_id"]!=fixture["espn_event_id"]:
     raise ValueError("ambiguous ESPN fixture identity")
    fixtures[key]=fixture
  except Exception as exc:errors.append({"date":day,"error":str(exc)})
 result={"experiment":79,"status":"COVERAGE_AUDIT_READY" if not errors else "PARTIAL_SOURCE_COVERAGE_REVIEW_ONLY",
  "discovery_window_utc":[stamp(start),stamp(end)],"days_requested":len(days),
  "days_succeeded":len(receipts),"errors":errors,"source_receipts":receipts,
  "espn_unique_future_fixtures":len(fixtures),
  "fixtures":sorted(fixtures.values(),key=lambda x:x["kickoff_utc"]),
  "independently_verified_count":0,"new_forecasts":0,
  "publication_gate":"BLOCKED","challenge_eligible":0,"model_validation":"UNVALIDATED"}
 (OUT/"coverage-report.json").write_text(json.dumps(result,indent=2)+"\n")
 print(json.dumps({k:result[k] for k in ("status","days_succeeded","espn_unique_future_fixtures","independently_verified_count","new_forecasts")}))
 if errors:sys.exit(1)
if __name__=="__main__":main()
