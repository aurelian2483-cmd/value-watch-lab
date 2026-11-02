#!/usr/bin/env python3
"""Reproducible experimental football Poisson baseline; never betting advice."""
import csv, io, json, math, urllib.request, datetime as dt, pathlib
from collections import defaultdict
import hashlib
SOURCE="https://www.football-data.co.uk/mmz4281/2526/E0.csv"
FEED=pathlib.Path("/tmp/experiment82/dashboard-data.json")
def poisson(lam,k):
 return math.exp(-lam)*lam**k/math.factorial(k)

def current_season_inputs(data):
 cutoff=dt.datetime.fromisoformat(data["generated_at_utc"].replace("Z","+00:00"))
 if cutoff.tzinfo is None:raise ValueError("Snapshot timezone missing")
 year=cutoff.year if cutoff.month>=7 else cutoff.year-1
 url=f"https://www.football-data.co.uk/mmz4281/{year%100:02d}{(year+1)%100:02d}/E0.csv"
 req=urllib.request.Request(url,headers={"User-Agent":"ValueWatchResearch/1.0"})
 with urllib.request.urlopen(req,timeout=35) as response:
  if response.status!=200:raise ValueError("Current-season HTTP failure")
  raw=response.read(1000001)
 if not raw or len(raw)>1000000:raise ValueError("Invalid current-season CSV")
 from experiment62_fixture_discovery import norm
 teams=defaultdict(lambda:{"hgf":0,"hga":0,"hn":0,"agf":0,"aga":0,"an":0})
 th=ta=count=0
 for r in csv.DictReader(io.StringIO(raw.decode("utf-8-sig"))):
  if r.get("Div")!="E0" or r.get("FTR") not in ("H","D","A"):continue
  try:
   day=dt.datetime.strptime(r["Date"],"%d/%m/%Y").date()
   if day>=cutoff.astimezone(dt.timezone.utc).date():continue
   hg,ag=int(r["FTHG"]),int(r["FTAG"])
   if min(hg,ag)<0 or r["FTR"]!=("H" if hg>ag else "A" if hg<ag else "D"):continue
   home,away=norm(r["HomeTeam"]),norm(r["AwayTeam"])
   if not home or not away or home==away:continue
  except (ValueError,KeyError,TypeError):continue
  teams[home]["hgf"]+=hg;teams[home]["hga"]+=ag;teams[home]["hn"]+=1
  teams[away]["agf"]+=ag;teams[away]["aga"]+=hg;teams[away]["an"]+=1
  th+=hg;ta+=ag;count+=1
 if count<30 or min(th,ta)<=0:raise ValueError("Insufficient current-season results")
 return teams,th/count,ta/count,{"source":url,"sha256":hashlib.sha256(raw).hexdigest(),"training_matches":count,
  "cutoff_exclusive_utc_date":cutoff.astimezone(dt.timezone.utc).date().isoformat(),
  "minimum_matches_per_relevant_venue":3,"league_average_pseudo_matches":5,
  "limitation":"Small-sample current-season fallback; shrinkage is an unvalidated modelling choice, not evidence of accuracy."}

def main():
 data=json.loads(FEED.read_text())
 if data.get("research_only") is not True or data.get("publication_gate")!="BLOCKED":
  raise ValueError("Unsafe feed")
 req=urllib.request.Request(SOURCE,headers={"User-Agent":"ValueWatchResearch/1.0"})
 with urllib.request.urlopen(req,timeout=35) as response:
  raw=response.read(1000001)
 if not raw or len(raw)>1000000:raise ValueError("Invalid historical CSV")
 rows=list(csv.DictReader(io.StringIO(raw.decode("utf-8-sig"))))
 teams=defaultdict(lambda:{"hgf":0,"hga":0,"hn":0,"agf":0,"aga":0,"an":0})
 total_h=total_a=matches=0
 for row in rows:
  if row.get("Div")!="E0" or row.get("FTR") not in ("H","D","A"):continue
  try:hg=int(row["FTHG"]);ag=int(row["FTAG"])
  except (ValueError,KeyError,TypeError):continue
  if min(hg,ag)<0:continue
  h=row["HomeTeam"].strip().casefold();a=row["AwayTeam"].strip().casefold()
  teams[h]["hgf"]+=hg;teams[h]["hga"]+=ag;teams[h]["hn"]+=1
  teams[a]["agf"]+=ag;teams[a]["aga"]+=hg;teams[a]["an"]+=1
  total_h+=hg;total_a+=ag;matches+=1
 if matches<300 or total_h<=0 or total_a<=0:raise ValueError("Insufficient historical data")
 # Use explicit aliases; unknown teams remain unmodelled.
 from experiment62_fixture_discovery import norm
 keyed={norm(name):v for name,v in teams.items()}
 avg_h=total_h/matches;avg_a=total_a/matches
 fallback={};fallback_audit={};fallback_error=None
 try:fallback,cur_h,cur_a,fallback_audit=current_season_inputs(data)
 except Exception as exc:fallback_error=str(exc)
 outputs=[];unavailable=[]
 for fixture in data["upcoming_fixtures"]:
  if fixture["verification"]!="SCHEDULE_CROSS_CHECK":continue
  home=keyed.get(norm(fixture["home"]));away=keyed.get(norm(fixture["away"]))
  model="POISSON_BASELINE_2025_26_V1";basis=None
  if not home or not away or min(home["hn"],away["an"])<10:
   h=fallback.get(norm(fixture["home"]));a=fallback.get(norm(fixture["away"]))
   if not h or not a or min(h["hn"],a["an"])<3:
    unavailable.append({"home":fixture["home"],"away":fixture["away"],"kickoff_utc":fixture["kickoff_utc"],"reason":"INSUFFICIENT_TEAM_HISTORY","source_error":fallback_error})
    continue
   weight=5
   hgf=(h["hgf"]+weight*cur_h)/(h["hn"]+weight);hga=(h["hga"]+weight*cur_a)/(h["hn"]+weight)
   agf=(a["agf"]+weight*cur_a)/(a["an"]+weight);aga=(a["aga"]+weight*cur_h)/(a["an"]+weight)
   lh=max(.15,min(4.,hgf*aga/cur_h));la=max(.15,min(4.,agf*hga/cur_a))
   model="POISSON_CURRENT_SEASON_SHRINKAGE_V1"
   basis={"home_matches":h["hn"],"away_matches":a["an"],"league_average_pseudo_matches":weight,"small_sample":True}
  else:
   lh=max(.15,min(4.,avg_h*(home["hgf"]/home["hn"]/avg_h)*(away["aga"]/away["an"]/avg_h)))
   la=max(.15,min(4.,avg_a*(away["agf"]/away["an"]/avg_a)*(home["hga"]/home["hn"]/avg_a)))
  probs=[0.,0.,0.]
  for i in range(12):
   for j in range(12):
    probs[0 if i>j else 1 if i==j else 2]+=poisson(lh,i)*poisson(la,j)
  scale=sum(probs);probs=[v/scale for v in probs]
  outputs.append({"home":fixture["home"],"away":fixture["away"],"kickoff_utc":fixture["kickoff_utc"],"prob_home":probs[0],"prob_draw":probs[1],"prob_away":probs[2],"model":model,"training_basis":basis,"research_only":True,"model_validation":"UNVALIDATED","publication_gate":"BLOCKED","challenge_eligible":0,"odds":None,"expected_value":None})
 data["experimental_model_forecasts"]=outputs
 data["experimental_model_unavailable"]=unavailable
 data["experimental_model_audit"]={"model":"POISSON_BASELINE_2025_26_V1","training_source":SOURCE,"training_matches":matches,"training_sha256":hashlib.sha256(raw).hexdigest(),"forecast_count":len(outputs),"fallback_audit":fallback_audit,"fallback_source_error":fallback_error,"fallback_forecast_count":sum(x["model"]=="POISSON_CURRENT_SEASON_SHRINKAGE_V1" for x in outputs),"limitation":"Uncalibrated prior-season baseline plus separately labelled small-sample current-season fallback; not archived or independently attested"}
 FEED.write_text(json.dumps(data,indent=2)+"\n")
 print(json.dumps(data["experimental_model_audit"]))
if __name__=="__main__":main()

