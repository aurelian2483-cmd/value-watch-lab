"""Replay the frozen Pro D2 screening protocol without network or live outputs."""
import hashlib
import json
import math
import random
import re
from collections import Counter, defaultdict
from datetime import date
from itertools import groupby
from pathlib import Path
from statistics import mean

SHA256 = "52cdf6254487577e367d2c04867740010bbccb745fb563e59a9283e55caef25a"
PATH = Path(__file__).resolve().parents[2] / "rugby/pro-d2-results.json"
SOURCE = r"https://prod2\.lnr\.fr/feuille-de-match/2026-2027/j(\d+)/(\d+)-[a-z0-9-]+"


def validated_rows(document):
    if (document["competition_code"], document["season"]) != ("RU:5172", "2026-2027"):
        raise ValueError("Unexpected competition or season")
    events, bookings, rounds = set(), set(), Counter()
    for row in document["results"]:
        day = date.fromisoformat(row["date"])
        match = re.fullmatch(SOURCE, row["source"])
        teams = (row["home"], row["away"])
        scores = (row["home_points"], row["away_points"])
        if (not match or teams[0] == teams[1]
                or not all(re.fullmatch("[a-z0-9-]+", team) for team in teams)
                or not all(type(score) is int and 0 <= score <= 200 for score in scores)):
            raise ValueError("Invalid match identity or score")
        round_number, event = map(int, match.groups())
        if event in events or any((day, team) in bookings for team in teams):
            raise ValueError("Repeated event or ambiguous same-day team booking")
        events.add(event)
        bookings.update((day, team) for team in teams)
        rounds[round_number] += 1
        yield day, round_number, event, teams, scores
    if rounds != {**dict.fromkeys(range(1, 11), 8), 11: 1}:
        raise ValueError("Round coverage differs from frozen protocol")


def home_share(home, away):
    return 1 / (1 + 10 ** ((away - home - 50) / 400))


def compare(rows):
    ratings = defaultdict(lambda: 1500.0)
    margins = defaultdict(list)
    previous = None
    draws = total = 0
    for day, batch in groupby(sorted(rows), key=lambda row: row[0]):
        changes, observed = defaultdict(float), []
        draw = (draws + 1) / (total + 2)
        for _, round_number, _, (home, away), (home_points, away_points) in batch:
            margin = home_points - away_points
            outcome = 0 if margin > 0 else 2 if margin < 0 else 1
            share = home_share(ratings[home], ratings[away])
            if 6 <= round_number <= 10 and previous and (day - previous).days <= 35 and min(
                len(margins[home]), len(margins[away])
            ) >= 5:
                delta = (mean(margins[home][-5:]) - mean(margins[away][-5:])) / 84
                tilted = 1 / (1 + math.exp(-(math.log(share / (1 - share)) + delta)))
                yield day, round_number, outcome, (
                    (share * (1 - draw), draw, (1 - share) * (1 - draw)),
                    (tilted * (1 - draw), draw, (1 - tilted) * (1 - draw)),
                )
            change = 20 * ((1, 0.5, 0)[outcome] - share)
            changes[home] += change
            changes[away] -= change
            observed.append((home, away, max(-21, min(21, margin)), outcome))
        for club, change in changes.items():
            ratings[club] += change
        for home, away, margin, outcome in observed:
            margins[home].append(margin)
            margins[away].append(-margin)
            draws += outcome == 1
            total += 1
        previous = day


def metrics(entries, model):
    losses, briers, confidence, accuracy = [], [], [], []
    for _, _, outcome, predictions in entries:
        p = predictions[model]
        losses.append(-math.log(p[outcome]))
        briers.append(sum((value - (index == outcome)) ** 2 for index, value in enumerate(p)))
        confidence.append(max(p))
        accuracy.append(p.index(max(p)) == outcome)
    return dict(log_loss=mean(losses), brier=mean(briers), top_confidence=mean(confidence),
                accuracy=mean(accuracy))


def uncertainty(entries):
    by_day = defaultdict(list)
    for day, _, outcome, (baseline, candidate) in entries:
        by_day[day].append((
            math.log(baseline[outcome] / candidate[outcome]),
            sum((c - (i == outcome)) ** 2 - (b - (i == outcome)) ** 2
                for i, (b, c) in enumerate(zip(baseline, candidate))),
        ))
    clusters = list(by_day.values())
    rng = random.Random(52026)
    samples = [[], []]
    for _ in range(4000):
        picked = [pair for cluster in rng.choices(clusters, k=len(clusters)) for pair in cluster]
        for output, component in zip(samples, zip(*picked)):
            output.append(mean(component))
    return {name: [sorted(values)[i] for i in (100, 3899)]
            for name, values in zip(("log_loss", "brier"), samples)}


def summary(entries, denominator):
    baseline, candidate = (metrics(entries, index) for index in (0, 1))
    return dict(n=len(entries), available=denominator, outcomes=dict(sorted(Counter(
        entry[2] for entry in entries
    ).items())), baseline=baseline, candidate=candidate,
                delta={k: candidate[k] - baseline[k] for k in ("log_loss", "brier")})


def run(raw):
    if hashlib.sha256(raw).hexdigest() != SHA256:
        raise ValueError("Input differs from the frozen research snapshot")
    rows = list(validated_rows(json.loads(raw)))
    results = list(compare(rows))
    validation = [row for row in results if row[1] in (6, 7)]
    holdout = [row for row in results if row[1] in (8, 9, 10)]
    return dict(snapshot_sha256=SHA256, status="RETROSPECTIVE_SCREENING_UNVALIDATED",
                publication="BLOCKED", independently_verified_outcomes=0,
                market_benchmark=None, training_rows=40, excluded_incomplete_round_rows=1,
                diagnostic=summary(validation, 16), holdout=summary(holdout, 24),
                holdout_date_clusters=len({row[0] for row in holdout}),
                holdout_delta_interval_95=uncertainty(holdout),
                holdout_by_round={r: summary([row for row in holdout if row[1] == r], 8)
                                  for r in (8, 9, 10)})


if __name__ == "__main__":
    print(json.dumps(run(PATH.read_bytes()), indent=2))
