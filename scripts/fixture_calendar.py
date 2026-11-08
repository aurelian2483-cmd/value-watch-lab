"""Conservative fixture-calendar extraction: meetings are NOT racecards."""
import datetime as dt
import re
import urllib.request
from html.parser import HTMLParser
from urllib.parse import urljoin, urlparse
from zoneinfo import ZoneInfo

FIXTURE_URL="https://www.sportinglife.com/racing/going"
COURSE_RE=re.compile(r"^[A-Za-z][A-Za-z .'-]{2,55}$")
DATE_RE=re.compile(r"20\d{2}-\d{2}-\d{2}")

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
  if urlparse(url).netloc not in ("www.sportinglife.com","www.racingpost.com"):continue
  if not any(x in urlparse(url).path for x in ("/racing/meeting/","/racing/racecards/","/racing/going/","/racing/fixtures/","/racecards/")):continue
  path=urlparse(url).path
  m=DATE_RE.search(path)
  if path.startswith("/racing/meeting/") and not re.fullmatch(r"/racing/meeting/20\d{2}-\d{2}-\d{2}/[a-z0-9-]+/\d+",path):continue
  if not m or m.group() not in dates:continue
  meeting_match=re.fullmatch(r"/racing/meeting/(20\d{2}-\d{2}-\d{2})/([a-z0-9-]+)/([0-9]+)",path)
  if meeting_match:
   # The dated meeting URL supplies the course identity even when anchor text contains going details.
   course=meeting_match.group(2).replace("-"," ").title()
  elif COURSE_RE.fullmatch(label):
   course=label
  else:
   continue
  if not COURSE_RE.fullmatch(course):continue
  key=(m.group(),course.casefold())
  found[key]={"date":m.group(),"course":course,"source_url":url,"observed_at_utc":observed.isoformat(),
   "record_type":"MEETING_FIXTURE","race_times_status":"NOT_SUPPLIED","declarations_status":"NOT_VERIFIED"}
 return sorted(found.values(),key=lambda x:(x["date"],x["course"]))

def collect_fixtures(dates,now,fetch=None,source_url=FIXTURE_URL):
 if fetch is None:
  def fetch(url):
   req=urllib.request.Request(url,headers={"User-Agent":"Mozilla/5.0 (compatible; ValueWatchResearch/1.0)"})
   with urllib.request.urlopen(req,timeout=25) as response:
    if response.status!=200:raise ValueError("Fixture HTTP failure")
    return response.read(3000001)
 try:
  raw=fetch(source_url)
  if not raw or len(raw)>3000000:raise ValueError("Missing or oversized fixture source")
  meetings=parse_fixture_links(raw,set(dates),now,base=source_url)
  return {"status":"SOURCE_OBSERVED" if meetings else "FORMAT_UNVERIFIED","meetings":meetings,"url":source_url}
 except Exception as exc:
  return {"status":"COLLECTION_FAILED","meetings":[],"url":FIXTURE_URL,"error":str(exc)[:240]}
