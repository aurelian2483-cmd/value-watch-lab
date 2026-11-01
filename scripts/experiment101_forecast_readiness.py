#!/usr/bin/env python3
"""Research-only fixture forecast readiness. No invented probabilities."""
import json
from pathlib import Path

feed_path = Path("/tmp/experiment82/dashboard-data.json")
data = json.loads(feed_path.read_text())
if data.get("publication_gate") != "BLOCKED" or data.get("research_only") is not True:
    raise ValueError("Research safety gate failed")

counts = {"archived": 0, "schedule_unverified": 0, "model_unavailable": 0}
for fixture in data["upcoming_fixtures"]:
    has_archive = any(
        item["kickoff_utc"] == fixture["kickoff_utc"]
        and item["away"].casefold() == fixture["away"].casefold()
        for item in data.get("paper_forecasts", [])
    )
    if has_archive:
        reason = "ARCHIVED_PAPER_FORECAST"
        counts["archived"] += 1
    elif fixture["verification"] != "SCHEDULE_CROSS_CHECK":
        reason = "SCHEDULE_UNVERIFIED"
        counts["schedule_unverified"] += 1
    else:
        reason = "MODEL_INPUTS_UNAVAILABLE"
        counts["model_unavailable"] += 1
    fixture["forecast_status"] = reason
    fixture["forecast_eligible"] = False

data["forecast_readiness"] = {
    "status": "PENDING_REPRODUCIBLE_MODEL",
    "counts": counts,
    "automated_probabilities_generated": 0
}
feed_path.write_text(json.dumps(data, indent=2) + "\n")
print(json.dumps(data["forecast_readiness"]))
