#!/usr/bin/env python3
"""Experiment 34: strict Sky Sports JSON-LD fixture extraction and ESPN comparison.
No publishing or challenge entries; source format must be validated first.
"""
import datetime as dt,hashlib,json,pathlib,sys
from html.parser import HTMLParser
from experiment33_sky_source_probe import fetch,URL
from experiment30_fixture_crosscheck import get_espn,normal,parse_time
from experiment18_team_check import FIXTURES
class Scripts(HTMLParser):
 def __init__(self):super().__init__();self.active=False;self.parts=[];self.blocks=[]
 def handle_starttag(self,tag,attrs):
  if tag=="script" and dict(attrs).get("type","").casefold()=="application/ld+json":self.active=True;self.parts=[]
 def handle_data(self,data):
  if self.active:self.parts.append(data)
 def handle_endtag(self,tag):
  if tag=="script" and self.active:self.blocks.append("".join(self.parts));self.active=False
def objects(node):
 if isinstance(node,list):
  for item in node:yield from objects(item)
 elif isinstance(node,dict):
  yield node
  for v in node.values():yield from objects(v)
def name(v):
 if isinstance(v,str):return v
 if isinstance(v,dict):return v.get("name") or ""
 return ""
def extract(raw):
 parser=Scripts();parser.feed(raw.decode("utf-8","replace"))
 matches=[]
 for block in parser.blocks:
  try:data=json.loads(block)
  except json.JSONDecodeError:continue
  for item in objects(data):
   kind=item.get("@type",[])
   if isinstance(kind,str):kind=[kind]
   if not any(t in ("SportsEvent","Event") for t in kind):continue
   home=name(item.get("homeTeam"));away=name(item.get("awayTeam"))
   kickoff=item.get("startDate")
   if not home or not away or not isinstance(kickoff,str):continue
   try:utc=parse_time(kickoff)
   except (ValueError,TypeError):continue
   matches.append({"home":home,"away":away,"kickoff_utc":utc.isoformat()})
 return matches,len(parser.blocks)
def espn_match(home,away,kickoff):
 when=parse_time(kickoff);events=json.loads(get_espn(when)).get("events",[])
 found=[]
 for e in events:
  for c in e.get("competitions",[]):
   h=[t for t in c.get("competitors",[]) if t.get("homeAway")=="home"]
   a=[t for t in c.get("competitors",[]) if t.get("homeAway")=="away"]
   if len(h)==len(a)==1 and normal(h[0].get("team",{}).get("displayName",""))==normal(home) and normal(a[0].get("team",{}).get("displayName",""))==normal(away):
    found.append(parse_time(c.get("date") or e.get("date")))
 return len(found)==1 and found[0]==when
def main():
 now=dt.datetime.now(dt.timezone.utc);raw=fetch();matches,blocks=extract(raw);rows=[]
 for home,away,kickoff in FIXTURES:
  if parse_time(kickoff)<=now:continue
  found=[m for m in matches if normal(m["home"])==normal(home) and normal(m["away"])==normal(away)]
  exact=len(found)==1 and parse_time(found[0]["kickoff_utc"])==parse_time(kickoff)
  # ESPN verification is only needed if Sky has a unique exact structured match.
  espn=espn_match(home,away,kickoff) if exact else False
  rows.append({"home":home,"away":away,"kickoff_utc":kickoff,"sky_structured_matches":len(found),"sky_exact_kickoff":exact,"espn_exact_kickoff":espn,"status":"TWO_SOURCE_STRUCTURED_MATCH_REVIEW_ONLY" if exact and espn else "BLOCKED"})
 report={"experiment":34,"checked_at_utc":now.isoformat(),"source":URL,"source_sha256":hashlib.sha256(raw).hexdigest(),"jsonld_blocks":blocks,"structured_events":len(matches),"results":rows,"two_source_matches":sum(r["status"].startswith("TWO_SOURCE") for r in rows),"challenge_eligible":0,"publishing_enabled":False}
 pathlib.Path("/tmp/experiment34-structured-review.json").write_text(json.dumps(report,indent=2)+"\n")
 print(json.dumps({"structured_events":len(matches),"two_source_matches":report["two_source_matches"],"challenge_eligible":0}))
if __name__=="__main__":
 try:main()
 except Exception as exc:sys.exit(f"BLOCKED: {exc}")
