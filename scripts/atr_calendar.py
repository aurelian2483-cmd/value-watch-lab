"""Free At The Races monthly fixture calendar: conservative meeting-only extraction."""
import datetime as dt
import re
from html.parser import HTMLParser
from urllib.parse import urlparse

URL="https://www.attheraces.com/racing-calendar"
MONTH=re.compile(r"^([0-3]?\d)(?:st|nd|rd|th)\s+([A-Za-z]+)\s+(20\d{2})$",re.I)
MONTH_NAMES={name.lower():i for i,name in enumerate(("January","February","March","April","May","June","July","August","September","October","November","December"),1)}
COURSE=re.compile(r"^([A-Za-z][A-Za-z '-]{2,55})(?:\s*\((?:Afternoon|Evening|Aw|AW|Turf|All Weather|Flat|Jumps|Jump)[^)]*\))*$",re.I)
class Calendar(HTMLParser):
 def __init__(self):
  super().__init__();self.stack=[];self.buf=[];self.rows=[]
 def handle_starttag(self,tag,attrs):
  self.stack.append(tag)
  if tag in ("h2","h3","h4","li"):self.buf.append([tag,[]])
 def handle_data(self,data):
  for tag,parts in self.buf:parts.append(data)
 def handle_endtag(self,tag):
  if self.buf and self.buf[-1][0]==tag:
   t,parts=self.buf.pop();self.rows.append((t," ".join(" ".join(parts).split())))
  if tag in self.stack:
   self.stack=self.stack[:len(self.stack)-1-self.stack[::-1].index(tag)]
def parse_calendar(raw,dates,now):
 p=Calendar();p.feed(raw.decode("utf-8"))
 found={};active=None;dates=set(dates)
 for tag,label in p.rows:
  m=MONTH.fullmatch(label)
  if m and tag in ("h2","h3","h4"):
   month=MONTH_NAMES.get(m.group(2).lower())
   active=dt.date(int(m.group(3)),month,int(m.group(1))).isoformat() if month else None
   continue
  if tag in ("h2","h3","h4"):active=None;continue
  if tag!="li" or active not in dates:continue
  # A calendar list item is a course with optional session/surface/race-type metadata.
  course=label.split(" (",1)[0].strip()
  if not COURSE.fullmatch(course) or len(course)>60:continue
  found[(active,course.casefold())]={"date":active,"course":course,"source_url":URL,
   "observed_at_utc":now.isoformat(),"record_type":"MEETING_FIXTURE",
   "race_times_status":"NOT_SUPPLIED","declarations_status":"NOT_VERIFIED"}
 return sorted(found.values(),key=lambda x:(x["date"],x["course"]))
