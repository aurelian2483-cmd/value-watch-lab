#!/usr/bin/env python3
"""Experiment 33: inspect Sky Sports schedule as a second independent fixture source.
Read-only diagnostics. No challenge eligibility or permanent publishing.
"""
import datetime as dt,hashlib,json,pathlib,re,sys,urllib.request
from html.parser import HTMLParser
from experiment18_team_check import FIXTURES
from experiment30_fixture_crosscheck import get_espn,normal,parse_time
URL="https://www.skysports.com/premier-league-scores-fixtures/2026-11-01"
class Text(HTMLParser):
 def __init__(self):super().__init__();self.parts=[]
 def handle_data(self,data):
  s=" ".join(data.split())
  if s:self.parts.append(s)
def fetch():
 req=urllib.request.Request(URL,headers={"User-Agent":"Mozilla/5.0 (compatible; ValueWatchResearch/1.0)","Accept":"text/html"})
 with urllib.request.urlopen(req,timeout=30) as r:
  if "skysports.com" not in r.geturl().split("/")[2]:raise ValueError("unexpected redirect")
  return r.read(5000000)
def diagnose(raw,fixtures):
 parser=Text();parser.feed(raw.decode("utf-8","replace"))
 plain=" ".join(parser.parts)
 # Inspect text and original HTML independently. Neither alone proves a fixture.
 results=[]
 for home,away,kickoff in fixtures:
  def variants(n):
   return [n,{"Tottenham Hotspur":"Tottenham","Nottingham Forest":"Nottingham Forest","Coventry City":"Coventry","Newcastle United":"Newcastle"}.get(n,n)]
  hp=any(v.casefold() in plain.casefold() for v in variants(home))
  ap=any(v.casefold() in plain.casefold() for v in variants(away))
  results.append({"home":home,"away":away,"kickoff_utc":kickoff,"sky_text_has_home":hp,"sky_text_has_away":ap,"sky_kickoff_verified":False,"status":"REVIEW_ONLY_NEEDS_STRUCTURED_PAIR_AND_TIME"})
 return results,len(plain)
def main():
 now=dt.datetime.now(dt.timezone.utc)
 raw=fetch();fixtures=[f for f in FIXTURES if parse_time(f[2])>now]
 results,length=diagnose(raw,fixtures)
 report={"experiment":33,"checked_at_utc":now.isoformat(),"source":URL,"sha256":hashlib.sha256(raw).hexdigest(),"html_bytes":len(raw),"extracted_text_chars":length,"results":results,"verified":0,"challenge_eligible":0,"publishing_enabled":False,"next_step":"Parse structured fixture objects with exact home-away-date-time and crosscheck ESPN; reject ambiguity"}
 pathlib.Path("/tmp/experiment33-sky-source.json").write_text(json.dumps(report,indent=2)+"\n")
 print(json.dumps({"source_retrieved":True,"fixtures_for_review":len(results),"verified":0}))
if __name__=="__main__":
 try:main()
 except Exception as exc:sys.exit(f"BLOCKED: {exc}")
