#!/usr/bin/env python3
"""Experiment 18: verified four-fixture model-team compatibility check, read-only.
Source snapshots checked 2026-10-31; MUST be rechecked before any future publication.
"""
import csv,datetime as dt,io,json,pathlib,urllib.request
OFFICIAL="https://www.premierleague.com/en/news/4725574/fixture-amendments-for-premier-league-matches-in-november"
SECONDARY="https://www.skysports.com/premier-league-scores-fixtures/2026-11-01"
FIXTURES=[
 ("Everton","Coventry City","2026-11-06T20:00:00Z"),
 ("Leeds United","Tottenham Hotspur","2026-11-07T12:30:00Z"),
 ("Fulham","Newcastle United","2026-11-07T15:00:00Z"),
 ("Nottingham Forest","Manchester City","2026-11-07T17:30:00Z"),
]
ALIASES={"Coventry City":"Coventry","Leeds United":"Leeds","Tottenham Hotspur":"Tottenham","Newcastle United":"Newcastle","Nottingham Forest":"Nott'm Forest","Manchester City":"Man City"}
def load_teams():
    url="https://www.football-data.co.uk/mmz4281/2627/E0.csv"
    req=urllib.request.Request(url,headers={"User-Agent":"ValueWatchResearch/1.0"})
    with urllib.request.urlopen(req,timeout=25) as r: data=r.read(2000000).decode("utf-8-sig")
    rows=list(csv.DictReader(io.StringIO(data)))
    teams={x[k] for x in rows for k in ("HomeTeam","AwayTeam") if x.get(k)}
    if len(teams)<18:raise ValueError("insufficient current EPL teams")
    return teams
def main():
    now=dt.datetime.now(dt.timezone.utc);teams=load_teams();out=[]
    for home,away,kickoff in FIXTURES:
        when=dt.datetime.fromisoformat(kickoff.replace("Z","+00:00"))
        if when<=now:raise ValueError("fixture has already started; fail closed")
        h=home if home in teams else ALIASES.get(home,home)
        a=away if away in teams else ALIASES.get(away,away)
        if h not in teams or a not in teams:raise ValueError(f"team-name mismatch: {home}/{away}; data names {sorted(teams)}")
        out.append({"home":home,"away":away,"model_home":h,"model_away":a,"kickoff_utc":kickoff,"sources":[OFFICIAL,SECONDARY],"status":"MODEL_TEAM_COMPATIBLE_NOT_PUBLISHED"})
    pathlib.Path("/tmp/experiment18-review.json").write_text(json.dumps({"generated_at_utc":now.isoformat(),"fixtures":out,"count":len(out),"challenge_eligible":0,"publication_enabled":False},indent=2)+"\n")
    print(f"PASS: {len(out)} verified-schedule fixtures have model-compatible team names; 0 published")
if __name__=="__main__":main()
