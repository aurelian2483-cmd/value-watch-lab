"""Offline 3-way regular-season NFL replay. Argument: pinned nfl_games.csv."""
import csv
import hashlib
import json
import math
import sys
from collections import Counter, defaultdict, deque
from datetime import date, timedelta
from itertools import groupby
from pathlib import Path

import numpy as np

sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
from replay import score_arrays

PIN = "af16cf3c5848393057fad07feea278f0a85ab7b57ddbfe42ed96b5c80e7d519d"
NAMES = ["home_elo", "no_home_advantage", "margin_weighted_elo", "equal_margin_home_pool"]
def load(path):
    assert hashlib.sha256(path.read_bytes()).hexdigest() == PIN
    games, counts, seen = [], Counter(), set()
    with path.open(newline="") as f:
        for row in csv.DictReader(f):
            year = int(row["season"])
            if not 2012<=year<=2020:
                counts["outside_years"] += 1
                continue
            if row["playoff"]!="0":
                counts["excluded_playoff"] += 1
                continue
            day,h,a = date.fromisoformat(row["date"]), row["team1"],row["team2"]
            assert h!=a and (day,h) not in seen and (day,a) not in seen
            seen.update([(day,h),(day,a)])
            assert row["neutral"] in {"0","1"}
            diff = int(row["score1"])-int(row["score2"])
            games.append((year,day,h,a,int(row["neutral"]),diff))
            counts["warmup" if year<2017 else "scored"] += 1
    return sorted(games),counts

def run(games):
    ratings = [defaultdict(float) for _ in range(3)]
    report = {}
    ties, previous = 1,200
    for year, season in groupby(games,key=lambda r:r[0]):
        entries = list(season)
        assert len(entries)==256 and set(Counter(t for r in entries for t in r[2:4]).values())=={16}
        for rating in ratings:
            for team in rating: rating[team] *= .75
        forecasts,labels,weeks = [],[],[]
        pending = deque()
        def apply(changes):
            nonlocal ties,previous
            for h,a,deltas,is_tie in changes:
                for model,step in zip(ratings,deltas):
                    model[h] += step
                    model[a] -= step
                ties += is_tie
                previous += 1
        for day, group in groupby(entries,key=lambda r:r[1]):
            while pending and pending[0][0]+timedelta(days=2)<=day:
                apply(pending.popleft()[1])
            changes = []
            for _,_,h,a,neutral,diff in group:
                pdraw = ties/previous
                probs,steps = [],[]
                for model,home_bonus,margin in zip(ratings,[55,0,55],[False,False,True]):
                    p = 1/(1+10**(-(model[h]-model[a]+home_bonus*(1-neutral))/400))
                    probs.append(np.array([(1-pdraw)*p,pdraw,(1-pdraw)*(1-p)]))
                    multiplier = min(2.5,math.log1p(abs(diff))/math.log(8)) if margin and diff else 1
                    steps.append(20*multiplier*((1 if diff>0 else 0 if diff<0 else .5)-p))
                changes.append((h,a,steps,diff==0))
                forecasts.append(probs+[(probs[0]+probs[2])/2])
                labels.append(0 if diff>0 else 2 if diff<0 else 1)
                weeks.append(day.isocalendar()[:2])
            pending.append((day,changes))
        while pending:
            apply(pending.popleft()[1])
        if year>=2017:
            p=np.asarray(forecasts)
            assert np.isfinite(p).all() and (p>0).all() and np.allclose(p.sum(axis=2),1)
            report[year]=dict(ties=labels.count(1),calendar_weeks=len(set(weeks)),
                models=score_arrays(p,np.array(labels),weeks,NAMES,12))
    return report
if __name__=="__main__":
    games,counts=load(Path(sys.argv[1]))
    print(json.dumps(dict(reconciliation=counts,development=run(games)),indent=2))
