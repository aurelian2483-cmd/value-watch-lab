#!/usr/bin/env python3
"""Inspect Sky HTML <time> elements and their nearest enclosing fixture containers.
Read-only diagnostic; never treats an HTML hit as independently verified.
"""
import datetime as dt,hashlib,json,pathlib,re,sys
from html.parser import HTMLParser
from experiment33_sky_source_probe import fetch,URL
class TimeInspector(HTMLParser):
 def __init__(self):
  super().__init__();self.stack=[];self.times=[];self.capturing=None
 def handle_starttag(self,tag,attrs):
  attr=dict(attrs);self.stack.append((tag,attr))
  if tag=="time":
   self.capturing={"attributes":{k:v for k,v in attr.items() if k in ("datetime","dateTime","class","title","data-testid")},"text":"","ancestors":[{"tag":t,"class":a.get("class",""),"data-testid":a.get("data-testid","")} for t,a in self.stack[-6:-1]]}
 def handle_data(self,data):
  if self.capturing is not None:self.capturing["text"]+=data
 def handle_endtag(self,tag):
  if tag=="time" and self.capturing is not None:
   self.capturing["text"]=" ".join(self.capturing["text"].split())[:120];self.times.append(self.capturing);self.capturing=None
  for i in range(len(self.stack)-1,-1,-1):
   if self.stack[i][0]==tag:
    self.stack=self.stack[:i];break
def main():
 raw=fetch();html=raw.decode("utf-8","replace");p=TimeInspector();p.feed(html)
 snippets=[]
 for match in list(re.finditer(r"<time\b[^>]*>.*?</time>",html,re.I|re.S))[:40]:
  before=html[max(0,match.start()-700):match.start()]
  after=html[match.end():min(len(html),match.end()+700)]
  def clean(s):
   s=re.sub(r"<script\b[^>]*>.*?</script>"," ",s,flags=re.I|re.S)
   s=re.sub(r"<[^>]+>"," ",s);return " ".join(s.split())[:250]
  snippets.append({"before_text":clean(before),"time_html":match.group(0)[:350],"after_text":clean(after)})
 report={"diagnostic":"sky-time-container-v1","checked_at_utc":dt.datetime.now(dt.timezone.utc).isoformat(),"source":URL,"source_sha256":hashlib.sha256(raw).hexdigest(),"time_count":len(p.times),"time_elements":p.times[:40],"time_contexts":snippets,"verified":0,"challenge_eligible":0,"publishing_enabled":False}
 pathlib.Path("/tmp/sky-time-container-review.json").write_text(json.dumps(report,indent=2)+"\n")
 print(json.dumps({"time_count":len(p.times),"context_count":len(snippets),"verification_status":"NOT_VERIFIED","challenge_eligible":0}))
if __name__=="__main__":
 try:main()
 except Exception as e:sys.exit(f"BLOCKED: {e}")
