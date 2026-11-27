"""Development-only fixture reconciliation and consecutive-week sensitivity."""
import hashlib
import json
import re
import sys
from collections import Counter
from datetime import date, datetime
from pathlib import Path

import numpy as np

import six_seasons as football
from nfl import replay_nfl as nfl
from replay import score_arrays

HERE = Path(__file__).resolve().parent
TEXT_SHA = "38c1de56c9e9b6662c7efc1420b7e1fe00dddbb502fe72d8f759e773ba3c093b"

def blocks(p, labels, weeks, comparisons):
    """Paired circular moving blocks of 1, 2 or 4 consecutive calendar weeks."""
    loss = -np.log(p[np.arange(len(labels)), :, labels])
    week_ids = np.array([date.fromisocalendar(int(y),int(w),1).toordinal()//7 for y,w in weeks])
    span = np.arange(week_ids.min(),week_ids.max()+1)
    totals = np.array([loss[week_ids==week].sum(axis=0) for week in span])
    result = {}
    for width in (1,2,4):
        rng = np.random.default_rng(20261127)
        starts = rng.integers(len(span),size=(20000,(len(span)+width-1)//width))
        idx = ((starts[:,:,None]+np.arange(width))%len(span)).reshape(len(starts),-1)[:,:len(span)]
        sampled = totals[idx].sum(axis=1)
        gains = 100*(1-sampled[:,1]/sampled[:,0])
        tail = .025/comparisons
        result[str(width)] = np.quantile(gains,[tail,1-tail]).tolist()
    return result

def metrics(p,labels,weeks,names,comparisons):
    return dict(metrics=score_arrays(p,labels,weeks,names,comparisons),
                paired_calendar_week_intervals_pct=blocks(p,labels,weeks,comparisons))

def canonical(s):
    return s.removeprefix("AFC ").removesuffix(" AFC").removesuffix(" FC")

def verify_text(text):
    assert hashlib.sha256(text).hexdigest()==TEXT_SHA
    by_fixture={}
    for line in text.decode().splitlines():
        header=re.fullmatch(r"(Mon|Tue|Wed|Thu|Fri|Sat|Sun) ([A-Z][a-z]{2}) (\d{1,2})(?: (20\d\d))?",line.strip())
        if header:
            month=datetime.strptime(header[2],"%b").month
            day=date(2025 if month>=8 else 2026,month,int(header[3]))
            assert day.strftime("%a")==header[1]
        match=re.match(r"^\s*\d\d:\d\d\s+(.+?)\s+(\d+)-(\d+)\s+(?:\(\d+-\d+\)\s+)?(.+?)\s*$",line)
        if match:
            key=(day.isoformat(),canonical(match[1]),canonical(match[4]))
            assert key not in by_fixture
            by_fixture[key]=[int(match[2]),int(match[3])]
    assert len(by_fixture)==380
    return by_fixture

def football_audit(folder):
    season="2025-26"
    data=(folder/(season+".json")).read_bytes()
    assert hashlib.sha256(data).hexdigest()==football.pins[season]
    raw=json.loads(data)["matches"]
    expected=verify_text((folder/"england.txt").read_bytes())
    completed,original,excluded=[],[],Counter()
    for game in raw:
        score=game["score"]
        if isinstance(score,dict):
            full_time=score["ft"]
            original.append(game)
        else:
            full_time=score
            excluded[str(full_time)]+=1
        key=(game["date"],canonical(game["team1"]),canonical(game["team2"]))
        assert expected.pop(key)==full_time, key
        completed.append(dict(game,score={"ft":full_time}))
    assert not expected
    scenarios={}
    common=None
    for name,games in [("original",original),("full_season",completed)]:
        # Separate scenario namespace for vectors whose history legitimately differs.
        rows=football.run(season if name=="original" else "full-season-sensitivity",games)
        ids=[row["id"].split("|",1)[1] for row in rows]
        assert len(ids)==len(set(ids))
        if common is None:
            common=set(ids)
        samples={name:rows}
        if name=="full_season":
            assert common<=set(ids)
            samples["full_history_original_fixture_ids"]=[r for i,r in zip(ids,rows) if i in common]
        for label,sample in samples.items():
            p=np.array([[r["forecasts"][0],r["forecasts"][3]] for r in sample])
            y=np.array([r["winner_index"] for r in sample])
            weeks=[date.fromisoformat(r["date"]).isocalendar()[:2] for r in sample]
            scenarios[label]=metrics(p,y,weeks,["recent_form","locked_pool"],3)
    return dict(reconciled_pairs=len(raw),array_scores=dict(excluded),scenarios=scenarios)

def nfl_audit(path):
    def score(p,y,weeks,names,_):
        return metrics(p[:,[0,2]],y,weeks,[names[0],names[2]],4)
    games, counts=nfl.load(path,first_year=2003,last_year=2011,first_scored=2008)
    return dict(reconciliation=counts, seasons=nfl.run(games,first_scored=2008,scorer=score))

if __name__=="__main__":
    folder=Path(sys.argv[1])
    print(json.dumps(dict(football=football_audit(folder),nfl=nfl_audit(folder/"nfl.csv")),indent=2))
