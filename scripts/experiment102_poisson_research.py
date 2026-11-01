#!/usr/bin/env python3
"""Reproducible experimental football Poisson baseline; never betting advice."""
import csv, io, json, math, urllib.request, datetime as dt, pathlib
from collections import defaultdict
SOURCE="https://www.football-data.co.uk/mmz4281/2526/E0.csv"
FEED=pathlib.Path("/tmp/experiment82/dashboard-data.json")
def poisson(lam,k):
 return math.exp(-lam)*lam**k/math.factorial(k)
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
 outputs=[]
 for fixture in data["upcoming_fixtures"]:
  if fixture["verification"]!="SCHEDULE_CROSS_CHECK":continue
  home=keyed.get(norm(fixture["home"]));away=keyed.get(norm(fixture["away"]))
  if not home or not away or min(home["hn"],away["an"])<10:continue
  lh=max(.15,min(4.,avg_h*(home["hgf"]/home["hn"]/avg_h)*(away["aga"]/away["an"]/avg_h)))
  la=max(.15,min(4.,avg_a*(away["agf"]/away["an"]/avg_a)*(home["hga"]/home["hn"]/avg_a)))
  probs=[0.,0.,0.]
  for i in range(12):
   for j in range(12):
    probs[0 if i>j else 1 if i==j else 2]+=poisson(lh,i)*poisson(la,j)
  scale=sum(probs);probs=[v/scale for v in probs]
  outputs.append({"home":fixture["home"],"away":fixture["away"],"kickoff_utc":fixture["kickoff_utc"],"prob_home":probs[0],"prob_draw":probs[1],"prob_away":probs[2],"model":"POISSON_BASELINE_2025_26_V1","research_only":True,"model_validation":"UNVALIDATED","publication_gate":"BLOCKED","challenge_eligible":0,"odds":None,"expected_value":None})
 data["experimental_model_forecasts"]=outputs
 data["experimental_model_audit"]={"model":"POISSON_BASELINE_2025_26_V1","training_source":SOURCE,"training_matches":matches,"forecast_count":len(outputs),"limitation":"Single prior season, uncalibrated Poisson baseline; not archived or independently attested"}
 FEED.write_text(json.dumps(data,indent=2)+"\n")
 print(json.dumps(data["experimental_model_audit"]))
if __name__=="__main__":main()
