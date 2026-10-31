#!/usr/bin/env python3
"""Audit supplied horse racecards; never infer bets or complete coverage."""
import json
from pathlib import Path
from datetime import datetime, timezone

source = Path("racing-racecards.json")
report = {
    "generatedAtUTC": datetime.now(timezone.utc).isoformat(),
    "status": "NO_SOURCE_CONNECTED",
    "coverageVerified": False,
    "racesReceived": 0,
    "racesWithBasicData": 0,
    "racesNeedingReview": [],
    "candidateSelections": [],
    "qualifiedSelections": [],
    "note": "This is a coverage audit, not a verified UK/Ireland full-card feed."
}
if source.exists():
    payload = json.loads(source.read_text(encoding="utf-8"))
    races = payload.get("races", [])
    if not isinstance(races, list):
        raise ValueError("races must be a list")
    report["status"] = "PARTIAL_SOURCE_UNVERIFIED"
    report["racesReceived"] = len(races)
    for race in races:
        required = ("racecourse", "startUTC", "source", "observedAtUTC", "runners")
        missing = [field for field in required if not race.get(field)]
        if missing:
            report["racesNeedingReview"].append({
                "racecourse": race.get("racecourse"),
                "startUTC": race.get("startUTC"),
                "missingFields": missing
            })
        else:
            report["racesWithBasicData"] += 1
Path("horse-screening-report.json").write_text(
    json.dumps(report, indent=2) + "\n", encoding="utf-8"
)
print(report["status"], report["racesReceived"])
