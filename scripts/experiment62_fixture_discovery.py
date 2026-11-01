#!/usr/bin/env python3
"""Experiment 62: discover fresh E0 fixtures, cross-check against ESPN, exclude ledger repeats.
Paper-only discovery. No odds, predictions, publication or official challenge entries.
"""
import csv,datetime as dt,hashlib,io,json,pathlib,re,sys,urllib.parse,urllib.request
from zoneinfo import ZoneInfo
ROOT=pathlib.Path(__file__).resolve().parents[1]
OUT=pathlib.Path("/tmp/experiment62")
UTC=dt.timezone.utc
LONDON=ZoneInfo("Europe/London")
FIXTURE_URL="https://www.football-data.co.uk/fixtures.csv"
ESPN_URL="https://site.api.espn.com/apis/site/v2/sports/soccer/eng.1/scoreboard"
ALIASES={
 "man utd":"manchester united","man united":"manchester united",
 "man city":"manchester city","manchester city":"manchester city",
 "nott m forest":"nottingham forest","nottingham forest":"nottingham forest",
 "newcastle":"newcastle united","newcastle united":"newcastle united",
 "tottenham":"tottenham hotspur","tottenham hotspur":"tottenham hotspur",
 "leeds":"leeds united","leeds united":"leeds united",
 "coventry":"coventry city","coventry city":"coventry city",
 "wolves":"wolverhampton wanderers","wolverhampton":"wolverhampton wanderers",
 "west ham":"west ham united","west ham united":"west ham united",
 "brighton":"brighton and hove albion","brighton & hove albion":"brighton and hove albion",
 "bournemouth":"afc bournemouth","afc bournemouth":"afc bournemouth",
 "leicester":"leicester city","leicester city":"leicester city",
 "ipswich":"ipswich town","ipswich town":"ipswich town",
 "norwich":"norwich city","norwich city":"norwich city",
 "cardiff":"cardiff city","cardiff city":"cardiff city",
 "brentford":"brentford","crystal palace":"crystal palace",
 "sunderland":"sunderland","burnley":"burnley","fulham":"fulham",
 "everton":"everton","liverpool":"liverpool","arsenal":"arsenal",
 "chelsea":"chelsea","aston villa":"aston villa","southampton":"southampton",
 "west brom":"west bromwich albion","west bromwich albion":"west bromwich albion",
 "sheffield utd":"sheffield united","sheffield united":"sheffield united",
 "luton":"luton town","luton town":"luton town","watford":"watford",
 "nottingham":"nottingham forest",
}
def norm(name):
 s=re.sub(r"\s+"," ",re.sub(r"[^a-z0-9& ]"," ",name.lower().replace("fc ","").replace(" fc",""))).strip()
 return ALIASES.get(s,s)
def parse_time(s):
 s=(s or "").strip()
 if not re.fullmatch(r"\d{1,2}:\d{2}",s):raise ValueError("missing or invalid fixture time")
 return dt.time.fromisoformat(s)
def stamp(t):return t.astimezone(UTC).isoformat().replace("+00:00","Z")
def sha(raw):return hashlib.sha256(raw).hexdigest()
def fetch(url,name):
 before=dt.datetime.now(UTC);request=urllib.request.Request(url,headers={"User-Agent":"ValueWatchResearch/1.0","Accept":"application/json,text/csv,*/*"})
 with urllib.request.urlopen(request,timeout=35) as response:
  if response.status!=200:raise ValueError(name+" HTTP error")
  raw=response.read(3000001)
  headers={"date":response.headers.get("Date"),"etag":response.headers.get("ETag"),"last_modified":response.headers.get("Last-Modified")}
 after=dt.datetime.now(UTC)
 if not raw or len(raw)>3000000:raise ValueError(name+" empty or oversized")
 (OUT/name).write_bytes(raw)
 return raw,{"url":url,"request_started_at_utc":stamp(before),"response_received_at_utc":stamp(after),
 "sha256":sha(raw),"byte_length":len(raw),"http_headers_unverified":headers}
def main():
 OUT.mkdir(parents=True,exist_ok=True)
 report={"experiment":62,"mode":"READ_ONLY_DYNAMIC_FIXTURE_DISCOVERY",
  "status":"BLOCKED_PENDING","publication_gate":"BLOCKED","challenge_eligible":0,
  "challenge_progress":"0/100","persistent_ledger_modified":False,
  "sky_bet_odds_verified":False,"independent_timestamp_attested":False}
 try:
  now=dt.datetime.now(UTC);earliest=now+dt.timedelta(minutes=90);end=now+dt.timedelta(days=14)
  data,primary=fetch(FIXTURE_URL,"football-data-fixtures.csv")
  reader=csv.DictReader(io.StringIO(data.decode("utf-8-sig")))
  required={"Div","Date","Time","HomeTeam","AwayTeam"}
  if not required.issubset(set(reader.fieldnames or [])):raise ValueError("fixtures CSV schema changed")
  csv_by_pair={};rejections=[]
  for line,r in enumerate(reader,start=2):
   if r.get("Div")!="E0":continue
   try:
    day=dt.datetime.strptime(r["Date"].strip(),"%d/%m/%Y").date()
    kickoff_local=dt.datetime.combine(day,parse_time(r["Time"]),tzinfo=LONDON)
    kickoff=kickoff_local.astimezone(UTC)
    if kickoff<earliest or kickoff>end:continue
    home=norm(r["HomeTeam"]);away=norm(r["AwayTeam"])
    if not home or not away or home==away:raise ValueError("bad team identity")
    pair=(home,away)
    if pair in csv_by_pair:raise ValueError("duplicate home/away within discovery window")
    csv_by_pair[pair]={"home":r["HomeTeam"],"away":r["AwayTeam"],"normalized_home":home,
      "normalized_away":away,"kickoff_utc":stamp(kickoff),"csv_row":line}
   except Exception as exc:rejections.append({"line":line,"reason":str(exc)})
  if not csv_by_pair:raise ValueError("no upcoming E0 fixture candidates in football-data fixtures.csv")
  params=urllib.parse.urlencode({"dates":now.strftime("%Y%m%d")+"-"+end.strftime("%Y%m%d"),"limit":"500"})
  espn_raw,secondary=fetch(ESPN_URL+"?"+params,"espn-scoreboard.json")
  events=json.loads(espn_raw).get("events",[])
  espn_by_pair={}
  for e in events:
   if not e.get("competitions"):continue
   comp=e["competitions"][0]
   competitors=comp.get("competitors",[])
   home=next((c for c in competitors if c.get("homeAway")=="home"),None)
   away=next((c for c in competitors if c.get("homeAway")=="away"),None)
   if not home or not away:continue
   hn=norm(home.get("team",{}).get("displayName",""))
   an=norm(away.get("team",{}).get("displayName",""))
   if not hn or not an or hn==an:continue
   kickoff=dt.datetime.fromisoformat(e["date"].replace("Z","+00:00"))
   if not earliest<=kickoff<=end:continue
   pair=(hn,an)
   espn_by_pair.setdefault(pair,[]).append({"id":e.get("id"),"kickoff_utc":stamp(kickoff),
    "state":e.get("status",{}).get("type",{}).get("state")})
  ledger=json.loads((ROOT/"research/persistent-forecast-ledger.json").read_text())
  existing={(norm(v[1]),norm(v[2])) for row in ledger
   for v in [row.get("fixture_identity",[])] if len(v)==4 and v[0]=="E0"}
  accepted=[];excluded=[]
  for pair,primary_row in sorted(csv_by_pair.items(),key=lambda z:z[1]["kickoff_utc"]):
   reasons=[]
   secondary_rows=espn_by_pair.get(pair,[])
   if pair in existing:reasons.append("already recorded fixture pairing in persistent research ledger")
   if len(secondary_rows)!=1:reasons.append("ESPN independently matching fixture missing or ambiguous")
   else:
    match=secondary_rows[0]
    delta=abs((dt.datetime.fromisoformat(primary_row["kickoff_utc"].replace("Z","+00:00"))-
       dt.datetime.fromisoformat(match["kickoff_utc"].replace("Z","+00:00"))).total_seconds())
    if delta>60:reasons.append("kickoff time mismatch between independent sources")
    if match["state"]!="pre":reasons.append("ESPN event not confirmed pre-match")
   candidate={"league":"E0","home":primary_row["home"],"away":primary_row["away"],
      "kickoff_utc":primary_row["kickoff_utc"],"football_data_row":primary_row["csv_row"],
      "espn_event_id":secondary_rows[0]["id"] if len(secondary_rows)==1 else None,
      "matched_espn_event_count":len(secondary_rows),"source_snapshot_sha256":{"football_data":primary["sha256"],"espn":secondary["sha256"]},
      "odds":None,"challenge_eligible":0,"publication_gate":"BLOCKED",
      "source_first_availability_verified":False,"independent_attestation_verified":False}
   if reasons:excluded.append({"fixture":candidate,"reasons":reasons})
   else:accepted.append(candidate)
  report.update(status="NEW_CROSS_SOURCE_FIXTURES_DISCOVERED_REVIEW_ONLY" if accepted else "NO_NEW_CROSS_SOURCE_FIXTURES_REVIEW_ONLY",
   run_started_at_utc=stamp(now),discovery_window_utc=[stamp(earliest),stamp(end)],
   source_receipts=[primary,secondary],source_a_candidates=len(csv_by_pair),
   source_b_events=len(events),new_cross_source_fixtures=len(accepted),
   excluded_count=len(excluded),skipped_csv_rows=rejections,
   match_policy="Exact canonical team pairing; UTC kickoff <= 60 seconds difference; ESPN pre-match; not existing ledger pair",
   fixture_schedule_corrobated_at_capture=bool(accepted),
   historical_first_availability_independently_verified=False,
   limitations=["Two live sources corroborate schedules only at retrieval time, not independent immutable notarisation",
    "CSV Time assumed UK local Europe/London timezone; DST handled but source timezone convention must be confirmed",
    "Duplicate suppression by home/away pairing is deliberately conservative",
    "No model predictions, odds, official challenge entries or ledger updates"])
  (OUT/"discovered-fixtures.json").write_text(json.dumps({"accepted":accepted,"excluded":excluded},indent=2)+"\n")
 except Exception as exc:report.update(status="BLOCKED_AUDIT_ERROR",error=str(exc))
 (OUT/"report.json").write_text(json.dumps(report,indent=2)+"\n")
 print(json.dumps({k:report.get(k) for k in ("status","source_a_candidates","new_cross_source_fixtures","excluded_count","error")}))
 if report["status"]=="BLOCKED_AUDIT_ERROR":sys.exit(1)
if __name__=="__main__":main()
