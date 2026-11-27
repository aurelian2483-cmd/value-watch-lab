"""Development comparison using only the six previously inspected EPL seasons.
Usage: python six_seasons.py DIRECTORY containing the six pinned YYYY-YY.json files.
"""
import hashlib
import json
import math
import sys
from collections import defaultdict
from itertools import groupby
from pathlib import Path

import numpy as np
import replay

HERE = Path(__file__).resolve().parent
pins = json.loads((HERE/"source-hashes.json").read_text())
reference = {r["id"]:r for r in replay.rows}
names = ["benchmark", "venue_normalisation", "davidson_elo", "half_venue_elo"]
def vector(home, away):
    rates = []
    for rate in [home, away]:
        masses = [math.exp(-rate)]
        for i in range(1,12):
            masses.append(masses[-1]*rate/i)
        rates.append(masses)
    table = np.outer(*rates)
    return replay.unit(np.array([np.tril(table,-1).sum(), table.trace(), np.triu(table,1).sum()]))

def run(season, games):
    history = []
    ratings = defaultdict(float)
    output = []
    for day, day_games in groupby(sorted(games,key=lambda x:x["date"]), key=lambda x:x["date"]):
        fixtures = list(day_games)
        changes = defaultdict(float)
        for game in fixtures:
            h,a = game["team1"],game["team2"]
            gh,ga = game["score"]["ft"]
            y = 0 if gh>ga else 2 if ga>gh else 1
            ratio = 10**((ratings[h]+60-ratings[a])/400)
            elo = replay.unit(np.array([ratio, .70*math.sqrt(ratio), 1]))
            step = 20*((1-y/2)-(elo[0]+elo[1]/2))
            changes[h] += step
            changes[a] -= step
            hosts = [g for g in history if g["team1"]==h]
            guests = [g for g in history if g["team2"]==a]
            if len(history)<30 or min(len(hosts),len(guests))<3:
                continue
            lh,la = np.mean([g["score"]["ft"] for g in history],axis=0)
            hgf,hga = (np.sum([g["score"]["ft"] for g in hosts],axis=0)+5*np.array([lh,la]))/(len(hosts)+5)
            agc,agf = (np.sum([g["score"]["ft"] for g in guests],axis=0)+5*np.array([lh,la]))/(len(guests)+5)
            def form(team):
                diffs = [(g["score"]["ft"][0]-g["score"]["ft"][1])*(1 if g["team1"]==team else -1)
                         for g in history if team in (g["team1"],g["team2"])]
                return np.mean(diffs[-5:])
            mult = math.exp(.025*(form(h)-form(a)))
            def poisson(dh,da):
                return vector(np.clip(hgf*agc/max(.01,dh),.15,4)*mult,
                              np.clip(agf*hga/max(.01,da),.15,4)/mult)
            base, venue = poisson(la,lh), poisson(lh,la)
            key = "|".join([season,day,h,a])
            if season in ("2024-25","2025-26"):
                assert np.max(abs(base-reference[key]["p_recent_form_alpha_0_025"]))<1e-10
            output.append(dict(id=key,date=day,winner_index=y, forecasts=[base,venue,elo,(venue+elo)/2]))
        history.extend(fixtures)
        for team,value in changes.items():
            ratings[team] += value
    return output

if __name__ == "__main__":
    root = Path(sys.argv[1])
    scores = {}
    for season, sha in pins.items():
        data = (root/(season+".json")).read_bytes()
        assert hashlib.sha256(data).hexdigest()==sha
        games = [g for g in json.loads(data)["matches"] if isinstance(g.get("score"),dict) and len(g["score"].get("ft",[]))==2]
        completed = run(season,games)
        assert len({r["id"] for r in completed}) == len(completed)
        scores[season] = dict(completed=len(games), results=replay.score_arrays(
            np.array([r["forecasts"] for r in completed]), np.array([r["winner_index"] for r in completed]),
            [replay.date.fromisoformat(r["date"]).isocalendar()[:2] for r in completed], names, 18))
    (HERE/"six-season-results.json").write_text(json.dumps(scores,indent=2)+"\n")
