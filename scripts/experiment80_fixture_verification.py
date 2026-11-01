#!/usr/bin/env python3
"""Experiment 80: fail-closed ESPN vs Football-Data fixture corroboration audit.
Read-only; no forecasts, ledger edits, or publication.
"""
import csv,datetime as dt,io,json,pathlib,urllib.request,hashlib,sys
from zoneinfo import ZoneInfo
from html.parser import HTMLParser
import re
from experiment62_fixture_discovery import norm,stamp,FIXTURE_URL
from experiment79_espn_coverage import main as collect_espn
OUT=pathlib.Path("/tmp/experiment80")

SKY_URL = "https://www.skysports.com/premier-league-scores-fixtures"
class SkyFixtures(HTMLParser):
 def __init__(self):
  super().__init__(); self.selected=[]; self.records=[]
 def handle_starttag(self, tag, attrs):
  attrs=dict(attrs)
  if attrs.get("id")=="currently-selected-day":
   self.selected.append(attrs.get("data-date-string"))
  if attrs.get("data-component-name")=="ui-sport-match-score":
   self.records.append(json.loads(attrs["data-state"]))

def parse_sky(raw, month):
 parser=SkyFixtures(); parser.feed(raw.decode("utf-8"))
 year,mon=map(int,month.split("-"))
 if parser.selected != [f"{mon:02d}.{year}"]:
  raise ValueError("Sky selected month missing, ambiguous or different")
 index={}; rejected=0
 for record in parser.records:
  try:
   if record["competition"]["name"]["full"]!="Premier League":continue
   if record.get("matchState")!="pre" or record.get("isFixture") is not True:continue
   if any(record.get(k) for k in ("isCancelled","isPostponed","isSuspended","isAbandoned")):continue
   date_text=record["start"]["date"]
   cleaned=re.sub(r"(\d+)(st|nd|rd|th)",r"\1",date_text)
   day=dt.datetime.strptime(cleaned+f" {year}","%A %d %B %Y")
   if day.month!=mon or day.strftime("%A")!=date_text.split()[0]:raise ValueError("Sky date mismatch")
   time_text=record["start"]["time"]
   if not re.fullmatch(r"\d{2}:\d{2}",time_text):raise ValueError("Sky kickoff unavailable")
   when=dt.datetime.combine(day.date(),dt.time.fromisoformat(time_text),tzinfo=ZoneInfo("Europe/London"))
   home=norm(record["teams"]["home"]["name"]["full"])
   away=norm(record["teams"]["away"]["name"]["full"])
   if not home or not away or home==away:raise ValueError("Sky team identity invalid")
   index.setdefault((home,away),[]).append(stamp(when))
  except (ValueError,KeyError,TypeError):rejected+=1
 if not parser.records:raise ValueError("Sky structured match records unavailable")
 return index,rejected

def collect_sky(fixtures):
 index={};receipts=[];errors=[]
 for month in sorted({f["kickoff_utc"][:7] for f in fixtures}):
  url=SKY_URL+"/"+month+"-01"
  try:
   req=urllib.request.Request(url,headers={"User-Agent":"Mozilla/5.0 (compatible; ValueWatchResearch/1.0)"})
   with urllib.request.urlopen(req,timeout=35) as response:
    if response.status!=200:raise ValueError("Sky HTTP failure")
    raw=response.read(3000001)
   if not raw or len(raw)>3000000:raise ValueError("Sky missing or oversized")
   parsed,rejected=parse_sky(raw,month)
   snapshot="sky-"+month+".html";(OUT/snapshot).write_bytes(raw)
   for key,values in parsed.items():index.setdefault(key,[]).extend(values)
   receipts.append({"url":url,"sha256":hashlib.sha256(raw).hexdigest(),
    "retrieved_at_utc":stamp(dt.datetime.now(dt.timezone.utc)),
    "snapshot_file":snapshot,"structured_prematch_records":sum(map(len,parsed.values())),
    "rejected_records":rejected})
  except Exception as exc:errors.append({"url":url,"error":str(exc)})
 return index,receipts,errors

def main():
 OUT.mkdir(parents=True,exist_ok=True)
 collect_espn()
 es=json.loads(pathlib.Path("/tmp/experiment79/coverage-report.json").read_text())
 if es["status"]!="COVERAGE_AUDIT_READY":raise ValueError("ESPN coverage incomplete")
 req=urllib.request.Request(FIXTURE_URL,headers={"User-Agent":"ValueWatchResearch/1.0"})
 with urllib.request.urlopen(req,timeout=35) as response:
  if response.status!=200:raise ValueError("Football-Data HTTP failure")
  raw=response.read(3000001)
 if not raw or len(raw)>3000000:raise ValueError("Football-Data missing or oversized")
 rows=list(csv.DictReader(io.StringIO(raw.decode("utf-8-sig"))))
 index={}
 for row in rows:
  if row.get("Div")!="E0":continue
  try:
   when=dt.datetime.combine(dt.datetime.strptime(row["Date"],"%d/%m/%Y").date(),
      dt.time.fromisoformat(row["Time"]),tzinfo=ZoneInfo("Europe/London"))
   key=(norm(row["HomeTeam"]),norm(row["AwayTeam"]))
   index.setdefault(key,[]).append(stamp(when))
  except (ValueError,KeyError):continue
 sky_index,sky_receipts,sky_errors=collect_sky(es['fixtures'])
 verified=[];unverified=[];reason_counts={};matched_sources={}
 for fixture in es["fixtures"]:
  key=(norm(fixture["home"]),norm(fixture["away"]))
  target=dt.datetime.fromisoformat(fixture["kickoff_utc"].replace("Z","+00:00"))
  source='FOOTBALL_DATA'
  candidates=index.get(key,[])
  if not candidates and key in sky_index:
   candidates=sky_index[key];source='SKY_SPORTS'
  matches=[t for t in candidates if abs((dt.datetime.fromisoformat(t.replace("Z","+00:00"))-target).total_seconds())<=60]
  item={"home":fixture["home"],"away":fixture["away"],"kickoff_utc":fixture["kickoff_utc"],
   "espn_event_id":fixture["espn_event_id"],"forecast_eligible":False}
  if len(matches)==1:
   item["cross_source_schedule_match"]=True
   item["corroborating_source"]=source
   matched_sources[source]=matched_sources.get(source,0)+1
   verified.append(item)
  else:
   item["cross_source_schedule_match"]=False
   if not candidates:
    item["reason"]="TEAM_PAIR_ABSENT_FROM_SECOND_SOURCE"
   elif len(matches)>1:
    item["reason"]="AMBIGUOUS_MULTIPLE_KICKOFF_MATCHES"
   else:
    item["reason"]="KICKOFF_TIME_MISMATCH"
    item["secondary_kickoffs_utc"]=candidates[:4]
   unverified.append(item)
   reason_counts[item["reason"]]=reason_counts.get(item["reason"],0)+1
 report={"experiment":80,"status":"CROSS_SOURCE_AUDIT_READY",
  "espn_fixture_count":len(es["fixtures"]),"matched_count":len(verified),
  "unmatched_count":len(unverified),"verified_schedule_only":verified,
  "corroborating_source_counts":matched_sources,"sky_source_receipts":sky_receipts,"sky_source_errors":sky_errors,
  "secondary_source_policy":"Football-Data first; Sky structured Premier League pre-match fallback only for absent pairings; exact canonical teams and UTC kickoff within 60 seconds",
  "unverified":unverified,"unverified_reason_counts":reason_counts,"football_data_snapshot_sha256":hashlib.sha256(raw).hexdigest(),
  "source_first_availability_verified":False,"independent_timestamp_attested":False,
  "forecast_eligible_count":0,"new_forecasts":0,"model_validation":"UNVALIDATED",
  "publication_gate":"BLOCKED","challenge_eligible":0,
  "limitation":"Schedules are corroborated at retrieval only; Sky times interpreted in Europe/London; neither matching schedules nor retrieval hashes independently attest historical first availability"}
 (OUT/"verification-report.json").write_text(json.dumps(report,indent=2)+"\n")
 print(json.dumps({k:report[k] for k in ("status","espn_fixture_count","matched_count","unmatched_count","forecast_eligible_count")}))
if __name__=="__main__":
 try:main()
 except Exception as e:
  OUT.mkdir(parents=True,exist_ok=True)
  (OUT/"verification-report.json").write_text(json.dumps({"experiment":80,"status":"BLOCKED_AUDIT_ERROR","error":str(e),"publication_gate":"BLOCKED","challenge_eligible":0},indent=2)+"\n")
  raise
