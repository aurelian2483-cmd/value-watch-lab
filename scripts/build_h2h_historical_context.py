"""Fetch independently published historical league results for research-only H2H evaluation.

Historical CSV files are observed now, not attested as available at forecast time.
Never use this output to claim prospective model validation or betting value.
"""
import hashlib
import json
import sys
import urllib.request
from datetime import datetime, timezone
from pathlib import Path
from expanded_football import csv_rows

LEAGUES = ("E1", "D1", "F1", "I1", "SP1")
SEASONS = ("2122", "2223", "2324", "2425", "2526", "2627")


def main():
    if len(sys.argv) != 3:
        raise SystemExit("Usage: build_h2h_historical_context.py HISTORY.json RECEIPTS.json")
    rows, receipts = [], []
    cutoff = datetime.now(timezone.utc)
    for league in LEAGUES:
        for season in SEASONS:
            url = f"https://www.football-data.co.uk/mmz4281/{season}/{league}.csv"
            try:
                req = urllib.request.Request(url, headers={"User-Agent": "ValueWatchResearch/1.0"})
                with urllib.request.urlopen(req, timeout=25) as response:
                    if response.status != 200:
                        raise ValueError("Unexpected HTTP status")
                    raw = response.read(3000001)
                if not raw or len(raw) > 3000000:
                    raise ValueError("Missing or oversized CSV")
                parsed = csv_rows(raw, league, cutoff, season)
                if len(parsed) < 20:
                    raise ValueError("Insufficient completed historical matches")
                rows.extend(parsed)
                receipts.append({"league": league, "season": season, "url": url,
                                 "sha256": hashlib.sha256(raw).hexdigest(),
                                 "observed_at_utc": datetime.now(timezone.utc).isoformat(),
                                 "accepted_rows": len(parsed)})
            except Exception as exc:
                receipts.append({"league": league, "season": season, "url": url,
                                 "error": str(exc)})
    if not rows:
        raise ValueError("No independently sourced historical rows")
    accepted = sum("accepted_rows" in receipt for receipt in receipts)
    failed = len(receipts) - accepted
    Path(sys.argv[1]).write_text(json.dumps(rows, indent=2) + "\n")
    Path(sys.argv[2]).write_text(json.dumps({
        "research_only": True, "publication_gate": "BLOCKED",
        "historical_source_availability_at_forecast_time": "NOT_ATTESTED",
        "sources_accepted": accepted, "sources_failed": failed,
        "history_rows": len(rows), "receipts": receipts}, indent=2) + "\n")


if __name__ == "__main__":
    main()
