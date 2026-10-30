#!/usr/bin/env python3
"""Fetch factual upcoming football fixtures only. No picks, prices or predictions."""
import datetime as dt
import json
import os
import pathlib
import sys
import urllib.error
import urllib.request

token = os.environ.get("FOOTBALL_DATA_API_KEY", "").strip()
if not token:
    print("SKIPPED: FOOTBALL_DATA_API_KEY is not configured; no files changed.")
    sys.exit(0)

now = dt.datetime.now(dt.timezone.utc)
end = now + dt.timedelta(days=7)
fixtures = []
errors = []
for code, league in (("PL", "Premier League"), ("ELC", "Championship")):
    url = "https://api.football-data.org/v4/competitions/" + code + "/matches?status=SCHEDULED"
    request = urllib.request.Request(url, headers={"X-Auth-Token": token, "Accept": "application/json"})
    try:
        with urllib.request.urlopen(request, timeout=25) as response:
            payload = json.load(response)
        matches = payload.get("matches")
        if not isinstance(matches, list):
            raise ValueError("Missing matches list")
        for match in matches:
            stamp = match.get("utcDate")
            if not isinstance(stamp, str):
                continue
            kickoff = dt.datetime.fromisoformat(stamp.replace("Z", "+00:00"))
            if not now < kickoff <= end:
                continue
            home = (match.get("homeTeam") or {}).get("name")
            away = (match.get("awayTeam") or {}).get("name")
            match_id = match.get("id")
            if not home or not away or not isinstance(match_id, int):
                continue
            fixtures.append({
                "id": str(match_id), "competition": league, "competitionCode": code,
                "home": home, "away": away, "kickoffUTC": kickoff.isoformat().replace("+00:00", "Z"),
                "status": "SCHEDULED", "source": url,
                "researchStatus": "FIXTURE ONLY — UNPRICED — NOT MODELLED",
            })
    except (urllib.error.URLError, ValueError, KeyError, TimeoutError) as error:
        errors.append(code + ": " + str(error))
if errors:
    print("Source errors:", "; ".join(errors))
if not fixtures:
    print("No verified eligible fixtures returned; existing feed unchanged.")
    sys.exit(0)

fixtures.sort(key=lambda f: (f["kickoffUTC"], f["id"]))
path = pathlib.Path("fixture-feed.json")
if path.exists():
    try:
        old = json.loads(path.read_text(encoding="utf-8"))
        if old.get("fixtures") == fixtures:
            print("Fixture set unchanged; no new commit.")
            sys.exit(0)
    except (ValueError, OSError):
        pass

snapshot = {
    "schemaVersion": 1,
    "kind": "SOURCE_ATTRIBUTED_FIXTURES_ONLY",
    "observedAtUTC": now.isoformat().replace("+00:00", "Z"),
    "sourceProvider": "football-data.org",
    "noOdds": True, "noPredictions": True, "modelValidated": False,
    "persistedPredictionCount": 0, "fixtures": fixtures,
}
path.write_text(json.dumps(snapshot, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
print("Saved", len(fixtures), "fixture records. No odds or predictions.")
