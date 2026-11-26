"""Offline sensitivity to half-strength going similarity on 76 inspected races."""
import copy
import json
import sys
from collections import defaultdict
from datetime import datetime
from pathlib import Path

import numpy as np

SOURCE=Path(__file__).resolve().parents[2]/"horse-v3plus-phase2-20261115"
sys.path.insert(0,str(SOURCE))
from run_phase2 import BASE, digest, predict

path=SOURCE/"inputs/derived_inputs.json"
assert digest(path)=="f3ecb2a63de87dd1412e04dc09b5f1dd027b0632af992f0fe57096b9c25fc365"
races=json.loads(path.read_text())["races"]
assert len({r["race_id"] for r in races})==len(races)==76
groups=defaultdict(list)
briers,confidence,hits=[],[],[]
for race in races:
    off=datetime.fromisoformat(race["startUTC"])
    assert datetime.fromisoformat(race["generated_at_utc"])<off
    full=predict(race,BASE,{})[0]
    assert max(abs(p-r["model_probability"]) for p,r in zip(full,race["runners"]))<1e-10
    modified=copy.deepcopy(race)
    for runner in modified["runners"]:
        for h in runner["history"]:
            assert datetime.fromisoformat(h["date"]).date()<off.date()
            if h["similarities"]["going"] is not None:
                h["similarities"]["going"] *= .5
    half=predict(modified,BASE,{})[0]
    n=len(full)
    win=[i for i,r in enumerate(race["runners"]) if r["horse_id"]==race["entry"]["winner_horse_id"]]
    assert len(win)==1
    p=np.array([[1/n]*n,full,half])
    y=np.eye(n)[win[0]]
    groups[off.date()].append(-np.log(p[:,win[0]]))
    briers.append(np.square(p-y).sum(axis=1))
    confidence.append(p.max(axis=1))
    # Exact maximum ties receive fractional credit, including the uniform baseline.
    ties=p==p.max(axis=1)[:,None]
    hits.append(ties[:,win[0]]/ties.sum(axis=1))
blocks=np.array([np.sum(v,axis=0) for v in groups.values()])
loss=blocks.sum(axis=0)/len(races)
draws=np.random.default_rng(20261126).integers(len(blocks),size=(20000,len(blocks)))
totals=blocks[draws].sum(axis=1)
gain=100*(1-totals[:,2]/totals[:,1])
print(json.dumps(dict(races=len(races),dates=len(groups),order=["field_uniform","full_going","half_going"],
    mean_log_loss=loss.tolist(),multiclass_brier=np.mean(briers,axis=0).tolist(),
    mean_top_confidence_minus_fractional_hit=(np.mean(confidence,axis=0)-np.mean(hits,axis=0)).tolist(),
    half_vs_full_gain_pct=100*(1-loss[2]/loss[1]), paired_date_bootstrap_95_pct=np.quantile(gain,[.025,.975]).tolist(),
    top_four_status="target race finish ranks absent in this input",stall_and_first_bend="absent in this input"),indent=2))
