#!/usr/bin/env python3
"""Sky fixture parser: bounded day sections and explicit fixture/time statements.
Read-only verification; no forecast publishing or challenge counting.
"""
import datetime as dt,hashlib,json,pathlib,re,sys
from zoneinfo import ZoneInfo
from experiment33_sky_source_probe import fetch,Text,URL
from experiment30_fixture_crosscheck import normal,parse_time,get_espn
from experiment18_team_check import FIXTURES
DAYS=re.compile(r"(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)\\s+(\\d{1,2})(?:st|nd|rd|th)?\\s+November",re.I)
FIXTURE=re.compile(r"(?P<time>\\d{1,2}[.]\\d{2}\\s*(?:am|pm))\\s+(?P<home>[A-Za-z][A-Za-z .&'’-]+?)\\s+vs\\s+(?P<away>[A-Za-z][A-Za-z .&'’-]+?)\\s+Kick-off at\\s+(?P<confirm>\\d{1,2}[.]\\d{2}\\s*(?:am|pm))",re.I)
def parse(raw):
 p=Text();p.feed(raw.decode("utf-8","replace"));text=" ".join(p.parts)
 dates=list(DAYS.finditer(text));events=[]
 for i,m in enumerate(dates):
  section=text[m.end():dates[i+1].start() if i+1<len(dates) else len(text)]
  for x in FIXTURE.finditer(section):
   if x.group("time").replace(" ","").lower()!=x.group("confirm").replace(" ","").lower():continue
   clock=dt.datetime.strptime(re.sub(r"\\s+","",x.group("time")).upper(),"%I.%M%p").time()
   local=dt.datetime.combine(dt.date(2026,11,int(m.group(2))),clock,tzinfo=ZoneInfo("Europe/London"))
   events.append({"home":x.group("home").strip(),"away":x.group("away").strip(),"kickoff_utc":local.astimezone(dt.timezone.utc).isoformat()})
 return events
def main():
 raw=fetch();events=parse(raw);now=dt.datetime.now(dt.timezone.utc);rows=[]
 for home,away,kickoff in FIXTURES:
  if parse_time(kickoff)<=now:continue
  candidates=[e for e in events if normal(e["home"])==normal(home) and normal(e["away"])==normal(away)]
  exact=len(candidates)==1 and parse_time(candidates[0]["kickoff_utc"])==parse_time(kickoff)
  rows.append({"home":home,"away":away,"kickoff_utc":kickoff,"sky_candidates":len(candidates),"sky_exact":exact,"status":"SKY_EXACT_PENDING_ESPN_AND_PROVENANCE" if exact else "BLOCKED"})
 report={"parser":"sky-bounded-day-and-explicit-kickoff-v1","source":URL,"source_sha256":hashlib.sha256(raw).hexdigest(),"parsed_events":len(events),"results":rows,"sky_exact":sum(r["sky_exact"] for r in rows),"challenge_eligible":0,"publishing_enabled":False}
 pathlib.Path("/tmp/sky-parser-review.json").write_text(json.dumps(report,indent=2)+"\n")
 print(json.dumps({"parsed_events":len(events),"sky_exact":report["sky_exact"],"challenge_eligible":0}))
if __name__=="__main__":
 try:main()
 except Exception as e:sys.exit(f"BLOCKED: {e}")
