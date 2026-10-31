#!/usr/bin/env python3
"""Inspect actual Sky Sports HTML structure, without guessing fixture formats.
Diagnostic only. No predictions, publishing, or eligibility.
"""
import collections,datetime as dt,hashlib,json,pathlib,re,sys
from html.parser import HTMLParser
from experiment33_sky_source_probe import fetch,URL
from experiment18_team_check import FIXTURES
class Inspector(HTMLParser):
 def __init__(self):
  super().__init__();self.tags=collections.Counter();self.scripts=[];self.active=None;self.buffer=[]
 def handle_starttag(self,tag,attrs):
  self.tags[tag]+=1
  if tag=="script":
   a=dict(attrs);self.active={"type":a.get("type",""),"id":a.get("id",""),"src":a.get("src","")};self.buffer=[]
 def handle_data(self,data):
  if self.active is not None:self.buffer.append(data)
 def handle_endtag(self,tag):
  if tag=="script" and self.active is not None:
   payload="".join(self.buffer)
   self.scripts.append({**self.active,"bytes":len(payload),"sha256":hashlib.sha256(payload.encode()).hexdigest(),"starts_json":payload.lstrip().startswith(("{","[")),"mentions_everton":"everton" in payload.lower()})
   self.active=None;self.buffer=[]
def main():
 raw=fetch();html=raw.decode("utf-8","replace");p=Inspector();p.feed(html)
 markers=["Everton","Coventry","Leeds","Tottenham","Fulham","Newcastle","Nottingham","Manchester City","2026-11-06","2026-11-07","fixture","kickoff","__NEXT_DATA__","__NUXT__"]
 counts={m:len(list(re.finditer(re.escape(m),html,re.I))) for m in markers}
 # Keep short HTML excerpts near a small number of team mentions; exclude script contents
 stripped=re.sub(r"<script\b[^>]*>.*?</script>"," ",html,flags=re.I|re.S)
 excerpts={}
 for name in ["Everton","Coventry","Tottenham","Newcastle","Nottingham Forest"]:
  hits=list(re.finditer(re.escape(name),stripped,re.I))
  excerpts[name]=[re.sub(r"\s+"," ",stripped[max(0,m.start()-130):m.end()+160])[:330] for m in hits[:2]]
 report={"diagnostic":"sky-html-structure-v1","checked_at_utc":dt.datetime.now(dt.timezone.utc).isoformat(),"source":URL,"html_sha256":hashlib.sha256(raw).hexdigest(),"html_bytes":len(raw),"tag_counts":dict(p.tags.most_common(20)),"marker_counts":counts,"scripts":p.scripts[:100],"html_excerpts":excerpts,"verified":0,"challenge_eligible":0,"publishing_enabled":False}
 pathlib.Path("/tmp/sky-html-structure-review.json").write_text(json.dumps(report,indent=2)+"\n")
 print(json.dumps({"scripts":len(p.scripts),"markers":counts,"verified":0}))
if __name__=="__main__":
 try:main()
 except Exception as e:sys.exit(f"BLOCKED: {e}")
