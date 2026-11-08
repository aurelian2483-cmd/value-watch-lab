"""Conservative fixture-calendar extraction: meetings are NOT racecards."""
import datetime as dt
import re
import urllib.request
from html.parser import HTMLParser
from urllib.parse import urljoin, urlparse
from zoneinfo import ZoneInfo

FIXTURE_URL="https://www.sportinglife.com/racing/going"
COURSE_RE=re.compile(r"^[A-Za-z][A-Za-z .'-]{2,55}$")
DATE_RE=re.compile(r"20\\d{2}-\\d{2}-\\d{2}")

class FixtureLinks(HTMLParser):
 def __init__(self):
  super().__init__();self.href=None;self.text=[];self.links=[]
 def handle_starttag(self,tag,attrs):
  if tag=="a":
   self.href=dict(attrs).get("href","");self.text=[]
 def handle_data(self,data):
  if self.href is not None:self.text.append(data)
 def handle_endtag(self,tag):
  if tag=="a" and self.href is not None:
   self.links.append((self.href," ".join(" ".join(self.text).split())))
   self.href=None;self.text=[]

def parse_fixture_links(raw,dates,observed,base=FIXTURE_URL):
 """Accept only explicit date and course in source links; never infer times."""
 p=FixtureLinks();p.feed(raw.decode("utf-8"))
 found={}
 for href,label in p.links:
  url=urljoin(base,href)
  if urlparse(url).netloc!="www.sportinglife.com":continue
  if not any(x in urlparse(url).path for x in ("/racing/racecards/","/racing/going/","/racing/fixtures/")):continue
  m=DATE_RE.search(urlparse(url).path)
  if not m or m.group() not in dates or not COURSE_RE.fullmatch(label):continue
  key=(m.group(),label.lower())
  found[key]={"date":m.group(),"course":label,"source_url":url,"observed_at_utc":observed.isoformat(),
   "record_type":"MEETING_FIXTURE","race_times_status":"NOT_SUPPLIED","declarations_status":"NOT_VERIFIED"}
 return sorted(found.values(),key=lambda x:(x["date"],x["course"]))

def collect_fixtures(dates,now,fetch=None):
 if fetch is None:
  def fetch(url):
   req=urllib.request.Request(url,headers={"User-Agent":"Mozilla/5.0 (compatible; ValueWatchResearch/1.0)"})
   with urllib.request.urlopen(req,timeout=25) as response:
    if response.status!=200:raise ValueError("Fixture HTTP failure")
    return response.read(3000001)
 try:
  raw=fetch(FIXTURE_URL)
  if not raw or len(raw)>3000000:raise ValueError("Missing or oversized fixture source")
  meetings=parse_fixture_links(raw,set(dates),now)
  return {"status":"SOURCE_OBSERVED" if meetings else "FORMAT_UNVERIFIED","meetings":meetings,"url":FIXTURE_URL}
 except Exception as exc:
  return {"status":"COLLECTION_FAILED","meetings":[],"url":FIXTURE_URL,"error":str(exc)[:240]}
