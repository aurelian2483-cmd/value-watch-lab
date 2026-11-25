"""Offline development only. Run with Python 3 and numpy from any directory."""
import csv
import hashlib
import json
from datetime import date
from itertools import groupby
from pathlib import Path

import numpy as np

HERE = Path(__file__).resolve().parent
LIB = HERE.parent / "mathematical-library"
DATA = HERE.parent / "football-baseline-v1/608-reconstructed-forecasts.json"
SHA = "c489bbe629470ac9858dfebccd6d896451c98b0f3cca709f8c5bcccca8797fec"
assert hashlib.sha256(DATA.read_bytes()).hexdigest() == SHA
rows = json.loads(DATA.read_text())["rows"]
assert len({r["id"] for r in rows}) == len(rows) == 608
names = ["benchmark", "temperature_130", "league_frequency", "arithmetic_half",
         "geometric_half", "js_shrink_gamma4", "online_eta025", "share_eta025_alpha005"]
methods = ["poisson-form-025", "temperature", "dirichlet-update", "weighted-ensemble",
           "log-pool", "probability-shrinkage", "online-log-weights", "fixed-share"]
used = set(methods + ["poisson-attack-defence", "elo-home", "davidson-ties", "log-loss", "brier", "ece", "calibration-in-large"])
def unit(x):
    return x / x.sum()

def softmax(x):
    return unit(np.exp(x - x.max()))

def forecast(p, freq, weights):
    experts = np.stack([p, freq, unit(p ** (1 / 1.30))])
    middle = (p + freq) / 2
    divergence = (p @ np.log(p / middle) + freq @ np.log(freq / middle)) / 2
    forecasts = [p, experts[2], freq, middle, unit(np.sqrt(p * freq)),
                 freq + np.exp(-4 * divergence) * (p - freq),
                 weights[0] @ experts, weights[1] @ experts]
    return np.stack(forecasts), experts

def evaluate(records):
    counts = np.ones(3)
    weights = np.full((2, 3), 1/3)
    estimates, labels, weeks = [], [], []
    for day, fixtures in groupby(sorted(records, key=lambda r:r["date"]), key=lambda r:r["date"]):
        daily_loss = np.zeros(3)
        day_labels = []
        for row in fixtures:
            estimates_day, experts = forecast(unit(np.array(row["p_recent_form_alpha_0_025"])), unit(counts), weights)
            estimates.append(estimates_day)
            label = row["winner_index"]
            day_labels.append(label)
            daily_loss -= np.log(experts[:, label])
            weeks.append(date.fromisoformat(day).isocalendar()[:2])
        labels.extend(day_labels)
        counts += np.bincount(day_labels, minlength=3)
        for i in range(2):
            weights[i] = softmax(np.log(weights[i]) - .25 * daily_loss)
        weights[1] = .95 * weights[1] + .05 / 3
    p = np.array(estimates)
    assert np.isfinite(p).all() and (p > 0).all() and np.allclose(p.sum(axis=2), 1)
    y = np.array(labels)
    return score_arrays(p, y, weeks, names, 14)

def score_arrays(p, y, weeks, names, comparisons):
    target = np.eye(3)[y]
    losses = -np.log(p[np.arange(len(y)), :, y])
    blocks = [losses[[j for j,w in enumerate(weeks) if w == week]].sum(axis=0) for week in sorted(set(weeks))]
    rng = np.random.default_rng(20261125)
    draws = rng.integers(len(blocks), size=(20000, len(blocks)))
    boot = np.array(blocks)[draws].sum(axis=1)
    gains = 100 * (1 - boot / boot[:, :1])
    results = []
    for i,name in enumerate(names):
        confidence = p[:,i].max(axis=1)
        hit = p[:,i].argmax(axis=1) == y
        bins = np.minimum((10 * confidence).astype(int), 9)
        ece = sum(abs((hit[mask] - confidence[mask]).sum()) for b in range(10) if (mask := bins == b).any()) / len(y)
        # Bonferroni within this batch over seven comparisons and two seasons only.
        tail = .025 / comparisons
        results.append(dict(method=name, n=len(y), weeks=len(blocks), loss=losses[:,i].mean(),
            gain_pct=100*(1-losses[:,i].sum()/losses[:,0].sum()),
            paired_week_interval_pct=np.quantile(gains[:,i],[tail,1-tail]).tolist(),
            brier=np.square(p[:,i]-target).sum(axis=1).mean(), top_label_ece=ece,
            mean_pred_minus_observed=(p[:,i]-target).mean(axis=0).tolist()))
    return results

if __name__ == "__main__":
    result = {s:evaluate([r for r in rows if r["season"]==s]) for s in sorted({r["season"] for r in rows})}
    (HERE/"results.json").write_text(json.dumps(result,indent=2)+"\n")
    entries = []
    for batch in json.loads((LIB/"catalogue.v1.json").read_text())["batches"]:
        entries.extend(json.loads((LIB/batch).read_text()))
    assert len({e["id"] for e in entries}) == len(entries) == 286
    with (HERE/"inventory.csv").open("w",newline="") as f:
        out = csv.writer(f)
        out.writerow(["id","name","role","family","sports","inputs","timing","related_methods","catalogue_status","implementation","test_evidence","batch_disposition","failure_conditions"])
        for e in entries:
            if e["id"] in used:
                status = "used in development replay or scoring"
            elif e["classification"] == "decision":
                status = "decision layer outside probability comparison"
            elif e["classification"] in ["diagnostic","distinct-algorithm","feature-transformation","framework"]:
                status = "requires a specified pipeline or diagnostic application"
            else:
                status = "pending compatible inputs and sport-specific evaluation"
            out.writerow([e["id"],e["name"],e["classification"],e["family"],"|".join(e["sports"]),e["required_inputs"],e["input_timing"],"|".join(e["compatible_methods"]),e["status"],e["implementation_ref"],e["test_evidence"],status,"|".join(e["failure_conditions"])])
