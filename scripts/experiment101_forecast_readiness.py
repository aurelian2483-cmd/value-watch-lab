#!/usr/bin/env python3
"""Research-only fixture forecast readiness; match complete canonical identities."""
import datetime as dt
import json
from pathlib import Path
from experiment62_fixture_discovery import norm


def fixture_key(item):
    kickoff = dt.datetime.fromisoformat(item["kickoff_utc"].replace("Z", "+00:00"))
    if kickoff.tzinfo is None or kickoff.utcoffset() is None:
        raise ValueError("Fixture kickoff must include a timezone")
    home, away = norm(item["home"]), norm(item["away"])
    if not home or not away or home == away:
        raise ValueError("Invalid fixture team identity")
    return home, away, kickoff.astimezone(dt.timezone.utc)


def audit(data):
    if data.get("publication_gate") != "BLOCKED" or data.get("research_only") is not True:
        raise ValueError("Research safety gate failed")
    archived_keys = {fixture_key(x) for x in data.get("paper_forecasts", [])}
    model_keys = {fixture_key(x) for x in data.get("experimental_model_forecasts", [])}
    counts = {"archived": 0, "experimental_model": 0,
              "schedule_unverified": 0, "model_unavailable": 0}
    for fixture in data["upcoming_fixtures"]:
        key = fixture_key(fixture)
        has_archive, model_available = key in archived_keys, key in model_keys
        fixture["has_archived_paper_forecast"] = has_archive
        fixture["has_experimental_model_forecast"] = model_available
        if model_available:
            reason = "EXPERIMENTAL_MODEL_FORECAST"
            counts["experimental_model"] += 1
        elif has_archive:
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
        "status": "EXPERIMENTAL_OUTPUTS_AVAILABLE_UNVALIDATED" if model_keys else "NO_EXPERIMENTAL_OUTPUTS",
        "counts": counts,
        "count_policy": "Exclusive primary status per upcoming fixture; availability counts may overlap.",
        "availability_counts": {
            "archived": sum(f["has_archived_paper_forecast"] for f in data["upcoming_fixtures"]),
            "experimental_model": sum(f["has_experimental_model_forecast"] for f in data["upcoming_fixtures"])
        },
        "automated_probabilities_generated": len(data.get("experimental_model_forecasts", []))
    }
    return data


def main():
    feed_path = Path("/tmp/experiment82/dashboard-data.json")
    data = audit(json.loads(feed_path.read_text()))
    feed_path.write_text(json.dumps(data, indent=2) + "\n")
    print(json.dumps(data["forecast_readiness"]))


if __name__ == "__main__":
    main()
