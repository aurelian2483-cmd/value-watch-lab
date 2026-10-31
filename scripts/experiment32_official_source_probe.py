#!/usr/bin/env python3
"""Experiment 32: independently inspect the live Premier League official fixture page.
Review-only. No inference from a stale hard-coded schedule; fail closed.
"""
import datetime as dt,hashlib,html,json,pathlib,re,sys,urllib.request
from html.parser import HTMLParser
from experiment30_fixture_crosscheck import get_espn,normal,parse_time
from experiment18_team_check import FIXTURES
URL="https://www.premierleague.com/en/news/4725574"
class Text(HTMLParser):
 def __init__(self):super().__init__();self.parts=[]
 def handle_data(self,s):
  s=" ".join(html.unescape(s).split())
  if s:self.parts.append(s)
def get(url):
 req=urllib.request.Request(url,headers={"User-Agent":"Mozilla/5.0 (compatible; ValueWatchResearch/1.0)","Accept":"text/html"})
 with urllib.request.urlopen(req,timeout=30) as response:
  final=response.geturl()
  if not final.startswith("https://www.premierleague.com/"):raise ValueError("official source redirected off domain")
  raw=response.read(5000000)
  if len(raw)<1000:raise ValueError("official page unexpectedly small")
  return raw,final
def inspect(raw,fixtures):
 parser=Text();parser.feed(raw.decode("utf-8","replace"))
 text=" ".join(parser.parts)
 # Presence of team names is only a weak signal: NEVER mark verified by text matching.
 rows=[]
 for home,away,kickoff in fixtures:
  h=any(x in text.casefold() for x in [home.casefold()])
  a=any(x in text.casefold() for x in [away.casefold()])
  rows.append({"home":home,"away":away,"kickoff_utc":kickoff,"official_page_mentions_both_teams":h and a,"official_kickoff_verified":False,"status":"REVIEW_REQUIRED_NO_STRUCTURED_OFFICIAL_FIXTURE"})
 return rows
def main():
 now=dt.datetime.now(dt.timezone.utc)
 raw,url=get(URL)
 future=[f for f in FIXTURES if parse_time(f[2])>now]
 rows=inspect(raw,future)
 report={"experiment":32,"checked_at_utc":now.isoformat(),"official_source":url,"official_page_sha256":hashlib.sha256(raw).hexdigest(),"official_page_bytes":len(raw),"results":rows,"verified":0,"challenge_eligible":0,"publishing_enabled":False,"next_step":"Find machine-readable official fixture event fields, or a second authoritative schedule API; require exact team, UTC kickoff and independent source snapshot"}
 pathlib.Path("/tmp/experiment32-official-source.json").write_text(json.dumps(report,indent=2)+"\n")
 print(json.dumps({"official_source_fetched":True,"fixtures_for_review":len(rows),"verified":0}))
if __name__=="__main__":
 try:main()
 except Exception as exc:sys.exit(f"BLOCKED: {exc}")
