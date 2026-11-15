#!/usr/bin/env python3
"""Archive IHRB non-runner page as a separately sourced regulator observation.

This is an independent publisher of official racing notices, but its displayed
"logged" time is not independently attested public availability. Full page
bytes are hashed and retained as a local CI artifact, not republished.
No automatic cross-provider Betfair mapping or release eligibility.
"""
import argparse
import datetime as dt
import hashlib
import json
import re
import urllib.parse
import urllib.request
from html.parser import HTMLParser
from pathlib import Path
from zoneinfo import ZoneInfo
from horse_market_benchmark_v1 import fingerprint,when

URL="https://www.ihrb.ie/non-runners/"
TZ=ZoneInfo("Europe/Dublin")
class Tables(HTMLParser):
    def __init__(self):
        super().__init__();self.table=False;self.row=None;self.cell=None
        self.rows=[];self.heading=False;self.heading_text=[];self.context=""
        self.selected=False;self.header_row=False
    def handle_starttag(self,tag,attrs):
        if tag in ("h1","h2","h3","h4"):self.heading=True;self.heading_text=[]
        if tag=="table":self.table=True;self.selected=("non runner" in self.context and "reserve" not in self.context);self.rows=[]
        if self.table and tag=="tr":self.row=[];self.header_row=False
        if self.table and self.row is not None and tag in ("th","td"):
            self.cell=[]
            if tag=="th":self.header_row=True
    def handle_data(self,data):
        if self.heading:self.heading_text.append(data)
        if self.cell is not None:self.cell.append(data)
    def handle_endtag(self,tag):
        if tag in ("h1","h2","h3","h4") and self.heading:
            self.context=" ".join(self.heading_text).strip().lower()
            self.heading=False
        if tag in ("th","td") and self.cell is not None and self.row is not None:
            self.row.append(" ".join("".join(self.cell).split()));self.cell=None
        if tag=="tr" and self.row is not None:
            if self.selected and not self.header_row and len(self.row)>=5:
                if not hasattr(self,"all_rows"):self.all_rows=[]
                self.all_rows.append(self.row)
            self.row=None
        if tag=="table":self.table=False;self.selected=False

def parse(raw,observed):
    if not isinstance(raw,bytes) or not raw or len(raw)>3000000:raise ValueError("Missing or oversized regulator page")
    parser=Tables();parser.feed(raw.decode("utf-8",errors="strict"))
    candidates=getattr(parser,"all_rows",[])
    if not candidates:raise ValueError("No non-runner table entries parsed: schema/unavailable/empty; abstain")
    rows=[];seen=set()
    for cells in candidates:
        venue=cells[0].strip()
        m=re.fullmatch(r"(\d{2}/\d{2}/\d{4})\s+(.+)",venue)
        if not m or not re.fullmatch(r"\d+",cells[1]) or not re.match(r"^\d+:\s*.+",cells[2]):
            raise ValueError("Unsupported official non-runner table schema")
        race_day=dt.datetime.strptime(m.group(1),"%d/%m/%Y").date()
        horse=re.match(r"^\d+:\s*(.+)",cells[2]).group(1).strip()
        logged=dt.datetime.strptime(cells[4],"%d/%m/%Y %H:%M:%S").replace(tzinfo=TZ).astimezone(dt.timezone.utc)
        if logged>observed+dt.timedelta(minutes=5):raise ValueError("Future official log time")
        identity=(race_day.isoformat(),m.group(2).casefold(),cells[1],horse.casefold(),logged.isoformat())
        if identity in seen:continue
        seen.add(identity)
        rows.append({"race_day_local":race_day.isoformat(),"course":m.group(2).strip(),"race_number":int(cells[1]),
                     "horse_and_rider_text":horse,"excuse_text":cells[3],"reported_logged_at_utc":logged.isoformat()})
    receipt={"schema_version":1,"kind":"IHRB_OFFICIAL_NONRUNNER_PAGE_OBSERVED_V1",
             "research_only":True,"model_validation":"UNVALIDATED","publication_gate":"BLOCKED",
             "betting_eligible":False,"source_url":URL,"source_observed_at_utc":observed.isoformat(),
             "raw_source_sha256":hashlib.sha256(raw).hexdigest(),"rows":rows,
             "source_independently_timestamp_attested":False,
             "official_logged_time_is_verified_publication_time":False,
             "limitations":["Displayed logged time is a regulator statement, not independently proved first public availability.",
                            "Horse-and-rider text may not isolate the horse name reliably; only human-reviewed mappings can confirm identity.",
                            "No British racing coverage, no Betfair prices, no betting release."]}
    receipt["record_sha256"]=fingerprint(receipt)
    return receipt

def main():
    ap=argparse.ArgumentParser()
    ap.add_argument("--out",required=True,type=Path)
    ap.add_argument("--diagnostics",required=True,type=Path)
    a=ap.parse_args()
    req=urllib.request.Request(URL,headers={"User-Agent":"ValueWatchResearch/1.0 (non-commercial evidence audit)"})
    with urllib.request.urlopen(req,timeout=25) as resp:
        if resp.status!=200 or urllib.parse.urlsplit(resp.geturl()).hostname!="www.ihrb.ie":
            raise ValueError("Unexpected regulator source")
        raw=resp.read(3000001)
    receipt=parse(raw,dt.datetime.now(dt.timezone.utc))
    a.out.mkdir(parents=True,exist_ok=True)
    path=a.out/(receipt["record_sha256"]+".json")
    if path.exists() and json.loads(path.read_text())!=receipt:raise ValueError("Immutable receipt differs")
    if not path.exists():path.write_text(json.dumps(receipt,indent=2)+"\n")
    a.diagnostics.parent.mkdir(parents=True,exist_ok=True)
    a.diagnostics.write_text(json.dumps({"regulator_rows":len(receipt["rows"]),"source_sha256":receipt["raw_source_sha256"],
                                         "status":"OBSERVED_NOT_INDEPENDENTLY_TIMESTAMPED","publication_gate":"BLOCKED"})+"\n")
    print(json.dumps({"regulator_rows":len(receipt["rows"]),"publication_gate":"BLOCKED"}))
if __name__=="__main__":main()
