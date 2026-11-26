"""Research only. Run python replay.py DIRECTORY of pinned annual ATP CSVs."""
import csv
import hashlib
import json
import re
import sys
from collections import Counter, defaultdict, deque
from datetime import date, timedelta
from itertools import groupby
from pathlib import Path

import numpy as np

HERE = Path(__file__).resolve().parent
MODELS = ["global_elo", "surface_elo", "equal_surface_global", "surface_experience_pool"]
SETS = re.compile(r"(\d+)-(\d+)(?:\(\d+\))?")
def completed(score, best_of):
    target = {"3": 2, "5": 3}.get(best_of)
    wins = losses = 0
    for token in score.split():
        m = SETS.fullmatch(token)
        if not m or wins == target or losses == target:
            return False
        a,b = map(int,m.groups())
        hi,lo = max(a,b),min(a,b)
        if not ((hi == 6 and lo <= 4) or (hi == 7 and lo == 6) or (hi >= 7 and hi-lo == 2)):
            return False
        wins += a>b
        losses += b>a
    return target is not None and wins == target and losses < target

def load(folder):
    report, rows, keys = {}, [], set()
    for file, digest in json.loads((HERE/"sources.json").read_text()).items():
        path = folder/file
        assert hashlib.sha256(path.read_bytes()).hexdigest() == digest
        counts = Counter()
        with path.open(encoding="utf-8-sig",newline="") as f:
            for r in csv.DictReader(f):
                counts["source_rows"] += 1
                if r["tourney_level"] not in {"A","M","G"}:
                    counts["excluded_event_level"] += 1
                    continue
                if not completed(r["score"],r["best_of"]):
                    counts["excluded_nonstandard_or_incomplete_score"] += 1
                    continue
                w,l = r["winner_id"],r["loser_id"]
                surface = r["surface"]
                assert w.isdecimal() and l.isdecimal() and w != l and surface in {"Hard","Clay","Grass"}
                event = (r["tourney_id"],r["match_num"])
                assert event not in keys
                keys.add(event)
                d = date.fromisoformat(r["tourney_date"][:4]+"-"+r["tourney_date"][4:6]+"-"+r["tourney_date"][6:])
                rows.append((d,event,surface,w,l))
                counts["accepted"] += 1
        assert counts["source_rows"] == sum(v for k,v in counts.items() if k!="source_rows")
        report[file] = counts
    return sorted(rows), report

def win_prob(x): return 1/(1+10**(-x/400))

def rating_updates(history, ratings, appearances):
    changes = Counter()
    for _,_,surface,w,l in history:
        for key in ["all",surface]:
            delta = 20*(1-win_prob(ratings[key,w]-ratings[key,l]))
            changes[key,w] += delta
            changes[key,l] -= delta
            appearances[key,w] += 1
            appearances[key,l] += 1
    for pair,delta in changes.items():
        ratings[pair] += delta

def predict(rows):
    ratings, appearances, pending = defaultdict(float), Counter(), deque()
    scored = defaultdict(list)
    for day,batch in groupby(rows,key=lambda r:r[0]):
        group = list(batch)
        while pending and pending[0][0]+timedelta(days=42) <= day:
            rating_updates(pending.popleft()[1], ratings, appearances)
        for _,event,surface,w,l in group:
            if day.year < 2021:
                continue
            first,second = sorted([w,l])
            g,s = [win_prob(ratings[k,first]-ratings[k,second]) for k in ["all",surface]]
            n = min(appearances[surface,first],appearances[surface,second])
            share = n/(n+20)
            scored[day.year].append((day, first==w, [g,s,(g+s)/2,(1-share)*g+share*s]))
        pending.append((day,group))
    return scored

def metrics(rows, year):
    p = np.array([r[2] for r in rows])
    y = np.array([r[1] for r in rows])[:,None]
    loss = -np.log(np.where(y,p,1-p))
    assert np.isfinite(loss).all()
    weeks = defaultdict(list)
    for i,r in enumerate(rows):
        weeks[r[0].isocalendar()[:2]].append(i)
    clusters = np.array([loss[indices].sum(axis=0) for indices in weeks.values()])
    draws = np.random.default_rng(20261126+year).integers(len(clusters),size=(20000,len(clusters)))
    totals = clusters[draws].sum(axis=1)
    relative = 100*(1-totals/totals[:,[0]])
    tail = .025/(3*4)
    out = {}
    for j,name in enumerate(MODELS):
        residual = p[:,j]-y[:,0]
        bins = np.minimum((10*p[:,j]).astype(int),9)
        out[name] = dict(log_loss=loss[:,j].mean(), relative_gain_pct=100*(1-loss[:,j].sum()/loss[:,0].sum()),
            binary_brier=(residual**2).mean(), mean_probability_minus_frequency=residual.mean(),
            ece=sum(abs(residual[bins==b].sum()) for b in range(10))/len(rows),
            adjusted_week_bootstrap_interval_pct=np.quantile(relative[:,j],[tail,1-tail]).tolist())
    return dict(n=len(rows), start_weeks=len(clusters),models=out)
if __name__ == "__main__":
    rows,counts=load(Path(sys.argv[1]))
    result={year:metrics(group,year) for year,group in predict(rows).items()}
    print(json.dumps(dict(reconciliation=counts,development=result),indent=2))
