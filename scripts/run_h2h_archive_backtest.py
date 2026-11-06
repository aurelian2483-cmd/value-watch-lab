"""Build a strictly research-only paired backtest from verified forecast archives.

Run: python scripts/run_h2h_archive_backtest.py HISTORY.json OUTPUT.json
HISTORY.json must contain independently checked historical final results with
home, away, date, score_home, score_away. No result is inferred or fabricated.
"""
import json
import sys
from pathlib import Path
from datetime import datetime
from football_h2h_backtest import paired_backtest


def parse(value):
    result = datetime.fromisoformat(value.replace("Z", "+00:00"))
    if result.tzinfo is None:
        raise ValueError("Missing timezone")
    return result


def load_verified(root, history):
    archive = root / "research/football-expanded-archive/v1"
    ledger = root / "research/football-expanded-results/v1/verified.json"
    if not ledger.exists():
        raise FileNotFoundError("Verified score ledger missing")
    entries = json.loads(ledger.read_text())["entries"]
    records = []
    seen = set()
    for entry in entries:
        sha = entry["record_sha256"]
        if sha in seen:
            raise ValueError("Duplicate forecast score")
        seen.add(sha)
        if entry.get("verification") != "TWO_SOURCE_REGULATION_TIME_FINAL":
            raise ValueError("Unverified outcome")
        source = archive / (sha + ".json")
        if not source.exists():
            raise FileNotFoundError(str(source))
        forecast = json.loads(source.read_text())
        if forecast.get("record_sha256") != sha or forecast.get("publication_gate") != "BLOCKED":
            raise ValueError("Forecast archive mismatch or unsafe gate")
        if (entry["league"], entry["home"], entry["away"], entry["kickoff_utc"]) != (
            forecast["league"], forecast["home"], forecast["away"], forecast["kickoff_utc"]
        ):
            raise ValueError("Forecast and score fixture mismatch")
        hg, ag = entry["score_home"], entry["score_away"]
        records.append({
            "league": forecast["league"], "home": forecast["home"], "away": forecast["away"],
            "generated_at": parse(forecast["generated_at_utc"]),
            "kickoff": parse(forecast["kickoff_utc"]),
            "probabilities": (
                forecast["prob_home"], forecast["prob_draw"], forecast["prob_away"]
            ),
            "outcome": 0 if hg > ag else 1 if hg == ag else 2,
        })
    return records


def main():
    if len(sys.argv) != 3:
        raise SystemExit("Usage: run_h2h_archive_backtest.py HISTORY.json OUTPUT.json")
    root = Path(__file__).resolve().parents[1]
    history = json.loads(Path(sys.argv[1]).read_text())
    if not isinstance(history, list):
        raise ValueError("History must be a list")
    forecasts = load_verified(root, history)
    # Zero weight is the only default. Nonzero weights require separate,
    # time-separated calibration and untouched evaluation fixtures.
    report = paired_backtest(forecasts, history, weight=0.0)
    report.pop("records")
    report["history_rows_supplied"] = len(history)
    report["model_comparison_performed"] = False
    report["reason"] = "Nonzero H2H weight requires independent earlier calibration."
    report["research_only"] = True
    Path(sys.argv[2]).write_text(json.dumps(report, indent=2) + "\n")


if __name__ == "__main__":
    main()
