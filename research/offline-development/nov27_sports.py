"""NRL and ATP development candidates using already inspected cohorts."""
import hashlib
import json
import sys
from collections import Counter, defaultdict
from itertools import groupby
from pathlib import Path
import numpy as np
from tennis import replay as atp
from nov27_sensitivity import metrics
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/"rugby-league"))
import replay_nrl as nrl

def rugby(path):
    assert hashlib.sha256(path.read_bytes()).hexdigest()=="9dae5279597ce91263be9c93e20fb8927efdf2ee089e2f3b7b722b0fbfe95b8c"
    games=nrl.load_matches(path)
    check=nrl.replay(games)
    years=defaultdict(list)
    ratings=defaultdict(float)
    observed=np.ones(3)
    last=nrl.START_YEAR
    for day, group in groupby(games,key=lambda r:r[0]):
        if day.year!=last:
            for team in ratings:
                ratings[team]*=.75
            last=day.year
        changes=Counter()
        freq=observed/observed.sum()
        for _,h,a,y in group:
            p=1/(1+10**((ratings[a]-ratings[h]-nrl.HOME_RATING_BONUS)/400))
            elo=np.array([p*(1-freq[1]),freq[1],(1-p)*(1-freq[1])])
            if day.year>=nrl.FIRST_TEST_YEAR:
                years[day.year].append((day,y,[elo,.75*elo+.25*freq]))
            delta=nrl.RATING_STEP*((1-y/2)-p)
            changes[h]+=delta
            changes[a]-=delta
            observed[y]+=1
        for team,delta in changes.items():
            ratings[team]+=delta
    report={}
    for year,rows in years.items():
        p=np.array([r[2] for r in rows])
        y=np.array([r[1] for r in rows])
        report[year]=metrics(p,y,[r[0].isocalendar()[:2] for r in rows],["home_elo","quarter_frequency_pool"],3)
        assert abs(report[year]["metrics"][0]["loss"]-check[year]["elo"]["log_loss"])<=5.1e-7
    return report

if __name__=="__main__":
    root=Path(sys.argv[1])
    rows,counts=atp.load(root/"tennis")
    tennis={year:atp.metrics(group,year,["global_elo","inactivity_shrink"],4) for year,group in atp.predict(rows,inactivity=True).items()}
    print(json.dumps(dict(tennis=tennis,nrl=rugby(root/"nrl.csv")),indent=2))
