"""Build a strictly research-only paired backtest from verified forecast archives.

Run: python scripts/run_h2h_archive_backtest.py HISTORY.json OUTPUT.json
HISTORY.json must contain independently checked historical final results with
home, away, date, score_home, score_away. No result is inferred or fabricated.
"""
import json
import sys
from pathlib import Path
from datetime import datetime
from football_h2h_backtest import paired_backtest, chronological_weight_selection
from expanded_football import digest, validate_forecast


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
        receipts = entry.get("source_receipts", [])
        if (len(receipts) != 2 or
                not receipts[0].get("url", "").startswith("https://site.api.espn.com/") or
                not any(receipts[1].get("url", "").startswith(prefix) for prefix in (
                    "https://www.football-data.co.uk/",
                    "https://www.skysports.com/",
                )) or
                any(len(receipt.get("sha256", "")) != 64 for receipt in receipts)):
            raise ValueError("Verified score source receipts missing or malformed")
        source = archive / (sha + ".json")
        if not source.exists():
            raise FileNotFoundError(str(source))
        forecast = json.loads(source.read_text())
        unsigned = dict(forecast)
        unsigned.pop("record_sha256", None)
        if digest(unsigned) != sha:
            raise ValueError("Forecast archive digest mismatch")
        validate_forecast(forecast)
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


def verified_history_from_ledger(root):
    """Construct limited H2H history from two-source verified settled matches.

    This is an archive-only coverage option, not a replacement for multi-season
    independent historical sources. Match dates alone cannot attest availability.
    """
    path = root / "research/football-expanded-results/v1/verified.json"
    if not path.exists():
        raise FileNotFoundError(str(path))
    entries = json.loads(path.read_text())["entries"]
    seen = set()
    history = []
    for entry in entries:
        if entry.get("verification") != "TWO_SOURCE_REGULATION_TIME_FINAL":
            raise ValueError("Unverified historical result")
        key = (entry["league"], entry["home"], entry["away"], entry["kickoff_utc"][:10])
        if key in seen:
            continue  # Multiple forecast revisions of one verified match.
        seen.add(key)
        history.append({
            "league": entry["league"],
            "home": entry["home"],
            "away": entry["away"],
            "date": entry["kickoff_utc"][:10],
            "score_home": entry["score_home"],
            "score_away": entry["score_away"],
        })
    return history


def main():
    if len(sys.argv) != 3:
        raise SystemExit("Usage: run_h2h_archive_backtest.py HISTORY.json OUTPUT.json")
    root = Path(__file__).resolve().parents[1]
    history = (verified_history_from_ledger(root) if sys.argv[1] == "--verified-ledger"\n               else json.loads(Path(sys.argv[1]).read_text()))
    if not isinstance(history, list):
        raise ValueError("History must be a list")
    forecasts = load_verified(root, history)
    # One forecast per unique fixture. Revisions must not inflate sample size.
    latest = {}
    for f in forecasts:
        key = (f["league"], f["home"], f["away"], f["kickoff"])
        previous = latest.get(key)
        if previous is None or f["generated_at"] > previous["generated_at"]:
            latest[key] = f
    forecasts = sorted(latest.values(), key=lambda f: (f["kickoff"], f["league"], f["home"]))
    baseline = paired_backtest(forecasts, history, weight=0.0)
    baseline.pop("records")
    report = {
        "baseline": baseline,
        "history_rows_supplied": len(history),
        "unique_verified_fixtures": len(forecasts),
        "model_comparison_performed": False,
        "reason": "Insufficient unique scored fixtures for chronological split.",
        "research_only": True,
        "model_validation": "UNVALIDATED",
        "publication_gate": "BLOCKED",
    }
    if len(forecasts) >= 60:
        # Keep all matches on the boundary date in one partition.
        boundary = forecasts[int(len(forecasts) * 0.7)]["kickoff"].date()
        calibration = [f for f in forecasts if f["kickoff"].date() < boundary]
        evaluation = [f for f in forecasts if f["kickoff"].date() >= boundary]
        if len(calibration) >= 30 and len(evaluation) >= 20:
            comparison = chronological_weight_selection(calibration, evaluation, history)
            report["holdout"] = comparison
            report["model_comparison_performed"] = comparison["evaluation"]["comparison_active"]
            report["reason"] = comparison["selection_reason"]
        else:
            report["reason"] = "Insufficient distinct chronological calibration/evaluation dates."

    Path(sys.argv[2]).write_text(json.dumps(report, indent=2) + "\n")


if __name__ == "__main__":
    main()
