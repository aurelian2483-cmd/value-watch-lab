#!/usr/bin/env python3
"""Experiment 81: independent Sky Sports source feasibility audit.
No scraped text is treated as verified fixture evidence automatically.
"""
import datetime as dt,hashlib,json,pathlib,re,urllib.request
from html.parser import HTMLParser
from experiment79_espn_coverage import main as collect_espn
OUT=pathlib.Path("/tmp/experiment81")
URL="https://www.skysports.com/premier-league-scores-fixtures"
class VisibleText(HTMLParser):
 def __init__(self):super().__init__();self.skip=0;self.parts=[]
 def handle_starttag(self,tag,attrs):
  if tag in ("script","style"):self.skip+=1
 def handle_endtag(self,tag):
  if tag in ("script","style") and self.skip:self.skip-=1
 def handle_data(self,data):
  if not self.skip and data.strip():self.parts.append(" ".join(data.split()))
def main():
 OUT.mkdir(parents=True,exist_ok=True)
 collect_espn()
 espn=json.loads(pathlib.Path("/tmp/experiment79/coverage-report.json").read_text())
 if espn["status"]!="COVERAGE_AUDIT_READY":raise RuntimeError("ESPN collection incomplete")
 status="THIRD_SOURCE_REVIEW_REQUIRED";error=None;sha=None;matches=[]
 try:
  req=urllib.request.Request(URL,headers={"User-Agent":"Mozilla/5.0 (compatible; ValueWatchResearch/1.0)","Accept":"text/html"})
  with urllib.request.urlopen(req,timeout=35) as response:
   if response.status!=200:raise ValueError("HTTP "+str(response.status))
   raw=response.read(3000001)
  if not raw or len(raw)>3000000:raise ValueError("empty or oversized response")
  sha=hashlib.sha256(raw).hexdigest()
  parser=VisibleText();parser.feed(raw.decode("utf-8","replace"))
  text=" ".join(parser.parts).lower()
  for f in espn["fixtures"]:
   h=f["home"].lower();a=f["away"].lower()
   # These are page mentions, NOT fixture verification: no pairing/time assurance.
   matches.append({"home":f["home"],"away":f["away"],
     "home_name_present":bool(re.search(r"(?<!\\w)"+re.escape(h)+r"(?!\\w)",text)),
     "away_name_present":bool(re.search(r"(?<!\\w)"+re.escape(a)+r"(?!\\w)",text)),
     "cross_source_verified":False})
 except Exception as exc:
  status="THIRD_SOURCE_FETCH_FAILED";error=str(exc)
 report={"experiment":81,"status":status,"source_url":URL,"source_sha256":sha,
  "retrieved_at_utc":dt.datetime.now(dt.timezone.utc).isoformat(),
  "source_error":error,"espn_fixture_count":len(espn["fixtures"]),
  "page_mentions":matches,"independently_verified_fixtures":0,
  "forecast_eligible_count":0,"new_forecasts":0,"publication_gate":"BLOCKED",
  "challenge_eligible":0,"model_validation":"UNVALIDATED",
  "next_action":"Develop reliable structured fixture extraction and validate home/away, league and kickoff before enabling cross-source verification"}
 (OUT/"source-feasibility-report.json").write_text(json.dumps(report,indent=2)+"\n")
 print(json.dumps({k:report[k] for k in ("status","espn_fixture_count","independently_verified_fixtures","source_error")}))
if __name__=="__main__":main()
