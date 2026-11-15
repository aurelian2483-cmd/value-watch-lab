"""Free public-page fixture adapters; no inferred races, times, odds or runners."""
import re
import urllib.request
from html.parser import HTMLParser
from urllib.parse import urljoin,urlparse
from fixture_calendar import parse_fixture_links
from atr_calendar import parse_calendar
SOURCES=(("sportinglife_going","https://www.sportinglife.com/racing/going"),("sportinglife_fixtures","https://www.sportinglife.com/racing/fixtures"),("racingpost_calendar","https://www.racingpost.com/racecards/"),("atr_calendar","https://www.attheraces.com/racing-calendar"))
class Anchors(HTMLParser):
 def __init__(self):super().__init__();self.href=None;self.parts=[];self.links=[]
 def handle_starttag(self,tag,attrs):
  if tag=="a":self.href=dict(attrs).get("href","");self.parts=[]
 def handle_data(self,data):
  if self.href is not None:self.parts.append(data)
 def handle_endtag(self,tag):
  if tag=="a" and self.href is not None:
   self.links.append((self.href," ".join(" ".join(self.parts).split())))
   self.href=None;self.parts=[]
def parse_racingpost(raw,dates,now):
 p=Anchors();p.feed(raw.decode("utf-8"));found={}
 for href,label in p.links:
  url=urljoin("https://www.racingpost.com/racecards/",href);u=urlparse(url)
  if u.hostname not in ("www.racingpost.com","racingpost.com") or not u.path.startswith("/racecards/"):continue
  m=re.search(r"/(20\d{2}-\d{2}-\d{2})(?:/|$)",u.path)
  parts=u.path.strip("/").split("/")
  if not m or m.group(1) not in dates or len(parts)<4 or not parts[1].isdigit() or not re.fullmatch(r"[a-z][a-z0-9-]{1,65}",parts[2]):continue
  course=parts[2].replace("-"," ").title();key=(m.group(1),course.casefold())
  found[key]={"date":m.group(1),"course":course,"source_url":url,"observed_at_utc":now.isoformat(),"record_type":"MEETING_FIXTURE","race_times_status":"NOT_SUPPLIED","declarations_status":"NOT_VERIFIED"}
 return list(found.values())
def collect_free(dates,now,fetch=None):
 if fetch is None:
  def fetch(url):
   req=urllib.request.Request(url,headers={"User-Agent":"Mozilla/5.0 (compatible; ValueWatchResearch/1.0)"})
   with urllib.request.urlopen(req,timeout=25) as response:
    if response.status!=200:raise ValueError("HTTP "+str(response.status))
    return response.read(3000001)
 receipts=[];combined={}
 for name,url in SOURCES:
  try:
   raw=fetch(url)
   if not raw or len(raw)>3000000:raise ValueError("Missing or oversized source")
   meetings=parse_racingpost(raw,set(dates),now) if name=="racingpost_calendar" else parse_calendar(raw,set(dates),now) if name=="atr_calendar" else parse_fixture_links(raw,set(dates),now,base=url)
   receipts.append({"provider":name,"url":url,"status":"SOURCE_OBSERVED" if meetings else "FORMAT_UNVERIFIED","meetings":len(meetings)})
   for m in meetings:
    key=(m["date"],m["course"].casefold())
    if key not in combined:combined[key]={**m,"source_receipts":[]}
    combined[key]["source_receipts"].append({"provider":name,"url":m["source_url"]})
  except Exception as exc:
   receipts.append({"provider":name,"url":url,"status":"COLLECTION_FAILED","error":str(exc)[:240],"meetings":0})
 meetings=sorted(combined.values(),key=lambda x:(x["date"],x["course"]))
 return {"meetings":meetings,"provider_results":receipts,"status":"SOURCE_OBSERVED" if meetings else "NO_VERIFIED_FIXTURE_SOURCE"}
