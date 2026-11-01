#!/usr/bin/env python3
"""Read-only ESPN + Sky independent fixture crosscheck. Never publishes forecasts."""
import datetime as dt,hashlib,json,pathlib,re,sys
from html.parser import HTMLParser
from zoneinfo import ZoneInfo
from experiment18_team_check import FIXTURES
from experiment30_fixture_crosscheck import get_espn,normal,parse_time
from experiment33_sky_source_probe import fetch,URL

class Sky(HTMLParser):
 def __init__(self):
  super().__init__();self.stack=[];self.heading=None;self.day=None;self.matches=[];self.active=None;self.team_capture=None
 def handle_starttag(self,tag,attrs):
  a=dict(attrs);cl=a.get("class","")
  self.stack.append(tag)
  if tag in ("h2","h3","h4") and self.heading is None:self.heading={"tag":tag,"value":""}
  if tag=="li" and "ui-tournament-matches__match-item" in cl:
   self.active={"date_heading":self.day,"teams":[],"time":[],"depth":len(self.stack)}
  if self.active is not None:
   if tag=="time" and a.get("datetime"):self.active["time"].append(a["datetime"])
   if tag=="img" and a.get("alt") and "Sky Sports" not in a["alt"]:self.active["teams"].append(a["alt"])
 def handle_data(self,data):
  if self.heading is not None:self.heading["value"]+=data
 def handle_endtag(self,tag):
  if self.heading is not None and tag==self.heading["tag"]:
   value=" ".join(self.heading["value"].split())
   if re.fullmatch(r"(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday) \d{1,2}(?:st|nd|rd|th) November",value):
    self.day=value
   self.heading=None
  if self.active is not None and tag=="li" and len(self.stack)==self.active["depth"]:
   self.matches.append(self.active);self.active=None
  for i in range(len(self.stack)-1,-1,-1):
   if self.stack[i]==tag:self.stack=self.stack[:i];break

def sky_match(p,home,away,when):
 uk=when.astimezone(ZoneInfo("Europe/London"))
 expected=uk.strftime("%A ")+str(uk.day)+("th" if 11<=uk.day<=13 or uk.day%10 not in (1,2,3) else {1:"st",2:"nd",3:"rd"}[uk.day%10])+uk.strftime(" %B")
 matching=[m for m in p.matches if m["date_heading"]==expected and len(m["teams"])==2 and normal(m["teams"][0])==normal(home) and normal(m["teams"][1])==normal(away) and m["time"]==[uk.strftime("%H:%M")]]
 if len(matching)!=1:raise ValueError(f"Sky exact date/home-away/time match count {len(matching)}")
 return matching[0]
def espn_match(home,away,when,raw):
 events=json.loads(raw).get("events")
 if not isinstance(events,list):raise ValueError("ESPN events missing")
 matched=[]
 for event in events:
  for comp in event.get("competitions",[]):
   c=comp.get("competitors",[])
   h=[x for x in c if x.get("homeAway")=="home"]
   a=[x for x in c if x.get("homeAway")=="away"]
   if len(h)==1 and len(a)==1 and normal(h[0].get("team",{}).get("displayName",""))==normal(home) and normal(a[0].get("team",{}).get("displayName",""))==normal(away):
    matched.append(parse_time(comp.get("date") or event.get("date")))
 if matched!=[when]:raise ValueError("ESPN exact fixture missing, ambiguous or time mismatch")
def main():
 now=dt.datetime.now(dt.timezone.utc);raw=fetch();p=Sky();p.feed(raw.decode("utf-8","replace"))
 results=[]
 for home,away,kickoff in FIXTURES:
  when=parse_time(kickoff);r={"home":home,"away":away,"kickoff_utc":kickoff}
  if when<=now:r.update(status="BLOCKED",reason="kickoff already passed")
  else:
   try:
    m=sky_match(p,home,away,when)
    espn=get_espn(when)
    espn_match(home,away,when,espn)
    r.update(status="TWO_SOURCE_MATCH_REVIEW_ONLY",sky_heading=m["date_heading"],sky_teams=m["teams"],sky_time=m["time"][0],espn_sha256=hashlib.sha256(espn).hexdigest())
   except Exception as e:r.update(status="BLOCKED",reason=str(e))
  results.append(r)
 report={"diagnostic":"sky-espn-strict-crosscheck-v1","checked_at_utc":now.isoformat(),"sky_source":URL,"sky_sha256":hashlib.sha256(raw).hexdigest(),"results":results,"two_source_matches":sum(x["status"]=="TWO_SOURCE_MATCH_REVIEW_ONLY" for x in results),"challenge_eligible":0,"publishing_enabled":False,"note":"Independent schedule matching alone does not meet forecast timestamp, provenance or publication gates."}
 pathlib.Path("/tmp/sky-espn-crosscheck-review.json").write_text(json.dumps(report,indent=2)+"\n")
 print(json.dumps({"two_source_matches":report["two_source_matches"],"blocked":sum(x["status"]=="BLOCKED" for x in results),"challenge_eligible":0}))
if __name__=="__main__":
 try:main()
 except Exception as e:sys.exit("BLOCKED: "+str(e))
