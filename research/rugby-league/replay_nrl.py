"""Replay a pre-match NRL rating baseline against a simpler historical baseline."""
import argparse
import csv
import hashlib
import json
import math
from collections import Counter, defaultdict
from datetime import date
from itertools import groupby
from pathlib import Path

START_YEAR = 2015
FIRST_TEST_YEAR = 2024
LAST_TEST_YEAR = 2026
RATING_STEP = 20
HOME_RATING_BONUS = 50


def load_matches(path):
    matches = []
    seen_ids = set()
    with path.open(encoding="utf-8-sig", newline="") as source:
        for row in csv.DictReader(source):
            if row["competition"] not in {"NRL", "NRL Premiership"}:
                continue
            day = date.fromisoformat(row["date"])
            if not START_YEAR <= day.year <= LAST_TEST_YEAR:
                continue
            home, away = row["home_team"], row["away_team"]
            home_score, away_score = row["home_team_score"], row["away_team_score"]
            if not home_score.isdecimal() or not away_score.isdecimal():
                continue
            if not home or not away or home == away or not row["match_id"] or row["match_id"] in seen_ids:
                raise ValueError(f"Missing or conflicting match identity on {day}")
            seen_ids.add(row["match_id"])
            difference = int(home_score) - int(away_score)
            outcome = 0 if difference > 0 else 1 if difference == 0 else 2
            matches.append((day, home, away, outcome))
    return sorted(matches)


def accumulate(totals, probabilities, outcome):
    totals["matches"] += 1
    totals["log_loss"] -= math.log(probabilities[outcome])
    totals["brier"] += sum((probability - (i == outcome)) ** 2 for i, probability in enumerate(probabilities))


def replay(matches):
    # Same-date matches share one pre-date snapshot. A draw updates Elo by half a win.
    # The categorical baseline uses a one-count prior per outcome.
    historical = [1, 1, 1]
    ratings = defaultdict(float)
    years = defaultdict(lambda: {"elo": Counter(), "historical_frequency": Counter()})
    last_year = START_YEAR
    for day, batch in groupby(matches, key=lambda match: match[0]):
        if day.year != last_year:
            for team in ratings:
                ratings[team] *= 0.75
            last_year = day.year
        frequencies = [count / sum(historical) for count in historical]
        draw = frequencies[1]
        daily_updates = defaultdict(float)
        for _, home, away, outcome in batch:
            expected = 1 / (1 + 10 ** ((ratings[away] - ratings[home] - HOME_RATING_BONUS) / 400))
            if day.year >= FIRST_TEST_YEAR:
                elo = ((1 - draw) * expected, draw, (1 - draw) * (1 - expected))
                accumulate(years[day.year]["elo"], elo, outcome)
                accumulate(years[day.year]["historical_frequency"], frequencies, outcome)
            change = RATING_STEP * ((1, 0.5, 0)[outcome] - expected)
            daily_updates[home] += change
            daily_updates[away] -= change
            historical[outcome] += 1
        for team, change in daily_updates.items():
            ratings[team] += change

    scores = {}
    for year, comparisons in years.items():
        scores[year] = {
            name: {"matches": totals["matches"], "log_loss": round(totals["log_loss"] / totals["matches"], 6),
                   "brier": round(totals["brier"] / totals["matches"], 6)}
            for name, totals in comparisons.items()
        }
    return scores


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("csv_path", type=Path, help="Local Useless NRL Stats match_data.csv")
    args = parser.parse_args()
    matches = load_matches(args.csv_path)
    warmup = sum(day.year < FIRST_TEST_YEAR for day, *_ in matches)
    if not warmup or not any(day.year >= FIRST_TEST_YEAR for day, *_ in matches):
        parser.error("The input must include warm-up and test matches.")
    print(json.dumps({
        "source_sha256": hashlib.sha256(args.csv_path.read_bytes()).hexdigest(),
        "warmup_matches": warmup,
        "last_result": matches[-1][0].isoformat(),
        "model_validation": "UNVALIDATED",
        "publication_gate": "BLOCKED",
        "scores": replay(matches),
    }, indent=2))


if __name__ == "__main__":
    main()
