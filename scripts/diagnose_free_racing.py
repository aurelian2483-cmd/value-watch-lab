"""Read-only source-shape diagnostics. No page HTML or cookies are persisted."""
import datetime as dt
import json
import re
import urllib.request
from html.parser import HTMLParser
from zoneinfo import ZoneInfo
from free_racing_sources import SOURCES

class Inspector(HTMLParser):
 def __init__(self):super().__init__();self.tags={};self.links=[];self.current=None;self.text=[]
 def handle_starttag(self,tag,attrs):
  self.tags[tag]=self.tags.get(tag,0)+1
  if tag=="a":self.current=dict(attrs).get("href","");self.text=[]
 def handle_data(self,data):
  if self.current is not None:self.text.append(data)
 def handle_endtag(self,tag):
  if tag=="a" and self.current is not None:
   self.links.append((self.current," ".join(" ".join(self.text).split())[:90]))
   self.current=None;self.text=[]

def diagnose(raw,dates):
 text=raw.decode("utf-8","replace");p=Inspector();p.feed(text)
 date_patterns=[d for d in dates if d in text]
 # Only publish bounded, sanitized link samples; never include response bodies.
 candidates=[]
 for href,label in p.links:
  if any(term in href.lower() for term in ("race","fixture","calendar","meeting","2026")) or any(d in href for d in dates):
   candidates.append({"path":href.split("?",1)[0][:140],"label":label[:65]})
 return {"bytes":len(raw),"tags":{k:p.tags.get(k,0) for k in ("a","li","h2","h3","script","time")},"date_strings_present":date_patterns,"candidate_link_count":len(candidates),"candidate_links":candidates[:18],
  "structured_data_markers":{x:x in text for x in ('__NEXT_DATA__','application/ld+json','__NUXT__','racecard','fixture')}}

def main():
 now=dt.datetime.now(dt.timezone.utc);today=now.astimezone(ZoneInfo("Europe/London")).date()
 dates=[(today+dt.timedelta(days=i)).isoformat() for i in range(1,8)]
 for name,url in SOURCES:
  try:
   req=urllib.request.Request(url,headers={"User-Agent":"Mozilla/5.0 (compatible; ValueWatchResearch/1.0)"})
   with urllib.request.urlopen(req,timeout=20) as response:
    raw=response.read(3000001)
   print(json.dumps({"provider":name,"url":url,"shape":diagnose(raw,dates)},ensure_ascii=True))
  except Exception as exc:print(json.dumps({"provider":name,"url":url,"error":str(exc)[:160]}))
if __name__=="__main__":main()
