#!/usr/bin/env python3
"""Extract Sky fixture containers with date context. Strictly review-only."""
import datetime as dt,hashlib,json,pathlib,re,sys
from html.parser import HTMLParser
from zoneinfo import ZoneInfo
from experiment33_sky_source_probe import fetch,URL
from experiment30_fixture_crosscheck import normal,parse_time
from experiment18_team_check import FIXTURES

class FixtureHTML(HTMLParser):
 def __init__(self):
  super().__init__();self.stack=[];self.matches=[];self.headings=[];self.active=None;self.heading=None
 def handle_starttag(self,tag,attrs):
  a=dict(attrs);classes=a.get("class","").split()
  self.stack.append((tag,a))
  if tag in ("h2","h3","h4") and self.heading is None:self.heading={"tag":tag,"text":""}
  if tag=="li" and "ui-tournament-matches__match-item" in classes:
   self.active={"teams":[],"times":[],"text":[],"heading_before":self.headings[-1] if self.headings else None,"depth":len(self.stack)}
  if self.active is not None:
   if tag=="time" and a.get("datetime"):self.active["times"].append(a["datetime"])
   if tag=="img" and a.get("alt"):self.active["teams"].append(a["alt"])
 def handle_data(self,data):
  s=" ".join(data.split())
  if self.heading is not None:self.heading["text"]+=(" "+s if s else "")
  if self.active is not None and s:self.active["text"].append(s)
 def handle_endtag(self,tag):
  if self.heading is not None and tag==self.heading["tag"]:
   h=" ".join(self.heading["text"].split())
   if h:self.headings.append(h)
   self.heading=None
  if self.active is not None and len(self.stack)==self.active["depth"] and tag=="li":
   self.active["text"]=" ".join(self.active["text"])[:450]
   self.matches.append(self.active);self.active=None
  for i in range(len(self.stack)-1,-1,-1):
   if self.stack[i][0]==tag:self.stack=self.stack[:i];break

def main():
 raw=fetch();p=FixtureHTML();p.feed(raw.decode("utf-8","replace"))
 now=dt.datetime.now(dt.timezone.utc)
 rows=[]
 for home,away,kickoff in FIXTURES:
  if parse_time(kickoff)<=now:continue
  candidates=[]
  for m in p.matches:
   team_names=[normal(x) for x in m["teams"]]
   if normal(home) in team_names and normal(away) in team_names:
    candidates.append({"heading_before":m["heading_before"],"times":m["times"],"teams":m["teams"][:8],"text":m["text"][:250]})
  rows.append({"home":home,"away":away,"kickoff_utc":kickoff,"candidate_containers":len(candidates),"candidate_evidence":candidates[:3],"status":"REVIEW_REQUIRED_DATE_AND_HOME_AWAY_NOT_YET_VERIFIED"})
 report={"diagnostic":"sky-fixture-container-v2","source":URL,"checked_at_utc":now.isoformat(),"source_sha256":hashlib.sha256(raw).hexdigest(),"containers":len(p.matches),"headings":p.headings[:60],"results":rows,"verified":0,"challenge_eligible":0,"publishing_enabled":False}
 pathlib.Path("/tmp/sky-fixture-container-review.json").write_text(json.dumps(report,indent=2)+"\n")
 print(json.dumps({"containers":len(p.matches),"candidate_counts":[r["candidate_containers"] for r in rows],"verified":0}))
if __name__=="__main__":
 try:main()
 except Exception as exc:sys.exit(f"BLOCKED: {exc}")
