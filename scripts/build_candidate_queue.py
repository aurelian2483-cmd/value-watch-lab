#!/usr/bin/env python3
"""Build an auditable research queue. No odds, probabilities or new tips are invented."""
import json
from pathlib import Path

source = json.loads(Path("research-data.json").read_text(encoding="utf-8"))
records = []
for item in source.get("research", []):
    if item.get("sample") or not item.get("id") or not item.get("selection"):
        continue
    # These are historic leads, not fresh or actionable pre-event tips.
    records.append({
        "id": item["id"], "sport": item.get("sport"), "event": item.get("event"),
        "market": item["selection"], "status": "HISTORICAL_REVIEW",
        "sourceType": "PREVIOUS_RESEARCH_SNAPSHOT",
        "sourceDate": source.get("snapshotDate"),
        "support": item.get("support"), "counter": item.get("counter"),
        "blockers": ["EVENT_AND_MARKET_REVERIFICATION", "SKY_BET_PRICE", "INDEPENDENT_PROBABILITY"],
        "skyBetOdds": None, "probability": None, "grade": None,
        "realMoneyEligible": False
    })
fixture_path = Path("fixture-feed.json")
if fixture_path.exists():
    feed = json.loads(fixture_path.read_text(encoding="utf-8"))
    if feed.get("kind") == "SOURCE_ATTRIBUTED_FIXTURES_ONLY":
        for match in feed.get("fixtures", []):
            if not all(match.get(k) for k in ("id", "home", "away", "kickoffUTC", "source")):
                continue
            records.append({
                "id": "fixture-" + str(match["id"]), "sport": "⚽ Football",
                "event": match["home"] + " vs " + match["away"],
                "startUTC": match["kickoffUTC"], "market": None,
                "status": "FIXTURE_SCREENING", "sourceType": "PROVIDER_FIXTURE",
                "source": match["source"], "sourceObservedAtUTC": feed.get("observedAtUTC"),
                "support": None, "counter": None,
                "blockers": ["SPECIFIC_MARKET", "SUPPORT_AND_COUNTER_EVIDENCE", "SKY_BET_PRICE", "INDEPENDENT_PROBABILITY"],
                "skyBetOdds": None, "probability": None, "grade": None,
                "realMoneyEligible": False
            })
out = {
    "schemaVersion": 1, "kind": "RESEARCH_CANDIDATE_QUEUE",
    "researchOnly": True, "modelValidated": False,
    "notes": "Historic leads and fixture screening are NOT qualified bets or fresh predictions.",
    "counts": {
        "historicalReview": sum(x["status"] == "HISTORICAL_REVIEW" for x in records),
        "fixtureScreening": sum(x["status"] == "FIXTURE_SCREENING" for x in records),
        "paperEligible": 0
    },
    "candidates": records
}
path = Path("candidate-queue.json")
serialized = json.dumps(out, indent=2, ensure_ascii=False) + "\n"
if not path.exists() or path.read_text(encoding="utf-8") != serialized:
    path.write_text(serialized, encoding="utf-8")
    print("Candidate queue updated:", len(records))
else:
    print("Candidate queue unchanged:", len(records))
