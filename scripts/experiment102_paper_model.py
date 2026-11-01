#!/usr/bin/env python3
"""Experimental Poisson baseline using completed E0 results; never betting advice."""
import csv, datetime as dt, io, json, math, pathlib, urllib.request
from collections import defaultdict
from experiment62_fixture_discovery import norm

FEED=pathlib.Path("/tmp/experiment82/dashboard-data.json")
URL="https://www.football-data.co.uk/mmz4281/2627/E0.csv"
def poisson(lam,k): return math.exp(-lam)*lam**k/math.factorial(k)
def main():
 data=json.loads(FEED.read_text())
 if data.get("research_only") is not True or data.get("publication_gate")!="BLOCKED": raise ValueError("Safety gate")
 req=urllib.request.Request(URL,headers={"User-Agent":"ValueWatchResearch/1.0"})
 with urllib.request.urlopen(req,timeout=35) as response:
  if response.status!=200:raise ValueError("Historical results unavailable")
  raw=response.read(2000001)
 if not raw or len(raw)>2000000:raise ValueError("Historical results invalid")
 rows=list(csv.DictReader(io.StringIO(raw.decode("utf-8-sig"))))
 if not {"HomeTeam","AwayTeam","FTHG","FTAG","FTR","Date"}.issubset(rows[0] if rows else {}):raise ValueError("CSV schema")
 now=dt.datetime.now(dt.timezone.utc)
 goals=defaultdict(lambda:[0,0,0,0,0])
 completed=[]
 for row in rows:
  try:
   date=dt.datetime.strptime(row["Date"],"%d/%m/%Y").replace(tzinfo=dt.timezone.utc)
   hg=int(row["FTHG"]);ag=int(row["FTAG"])
   if date>=now or min(hg,ag)<0 or max(hg,ag)>20 or row["FTR"] not in ("H","D","A"):continue
   home=norm(row["HomeTeam"]);away=norm(row["AwayTeam"])
   completed.append((home,away,hg,ag))
  except (ValueError,KeyError,TypeError):continue
 if len(completed)<60:raise ValueError("Insufficient completed season matches")
 homeavg=sum(x[2] for x in completed)/len(completed)
 awayavg=sum(x[3] for x in completed)/len(completed)
 for h,a,hg,ag in completed:
  goals[h][0]+=hg;goals[h][1]+=ag;goals[h][2]+=1
  goals[a][3]+=ag;goals[a][4]+=hg
 # Home and away records tracked separately to avoid treating missing samples as evidence.
 away_games=defaultdict(int)
 for h,a,_,_ in completed:away_games[a]+=1
 forecasts=[]
 for f in data["upcoming_fixtures"]:
  if f["verification"]!="SCHEDULE_CROSS_CHECK":continue
  h=norm(f["home"]);a=norm(f["away"])
  if goals[h][2]<4 or away_games[a]<4:continue
  hg=goals[h];ag=goals[a]
  # Smoothed attack and defence strengths; conservative baseline, not validated.
  h_attack=(hg[0]+5*homeavg)/(hg[2]+5)/homeavg
  h_defence=(hg[1]+5*awayavg)/(hg[2]+5)/awayavg
  a_attack=(ag[3]+5*awayavg)/(away_games[a]+5)/awayavg
  a_defence=(ag[4]+5*homeavg)/(away_games[a]+5)/homeavg
  lh=max(.2,min(4,homeavg*h_attack*a_defence))
  la=max(.2,min(4,awayavg*a_attack*h_defence))
  ph=pd=pa=0.
  for i in range(13):
   for j in range(13):
    p=poisson(lh,i)*poisson(la,j)
    if i>j:ph+=p
    elif i==j:pd+=p
    else:pa+=p
  total=ph+pd+pa
  forecasts.append({"home":f["home"],"away":f["away"],"kickoff_utc":f["kickoff_utc"],"generated_at_utc":now.isoformat(),"prob_home":ph/total,"prob_draw":pd/total,"prob_away":pa/total,"model":"EXPERIMENTAL_POISSON_2026_27_V1","training_matches":len(completed),"validation":"UNVALIDATED","challenge_eligible":0,"publication_gate":"BLOCKED","odds":None,"expected_value":None})
 data["experimental_model_forecasts"]=forecasts
 data["experimental_model_audit"]={"status":"RESEARCH_ONLY_UNVALIDATED","training_matches":len(completed),"forecasts":len(forecasts),"source":URL,"minimum_team_sample":4}
 FEED.write_text(json.dumps(data,indent=2)+"\n")
 print(json.dumps(data["experimental_model_audit"]))
if __name__=="__main__":main()
