#!/usr/bin/env python3
"""Verify completed football 1X2 predictions against football-data.org match results.
Only matches with explicit provider match IDs and pre-event timestamps are eligible.
Never infer settlement for prop markets, horse racing, tennis or NFL.
"""
import datetime as dt
import json
import os
from pathlib import Path
from urllib.request import Request, urlopen

ledger = json.loads(Path("prediction-ledger.json").read_text(encoding="utf-8"))
path = Path("results-feed.json")
feed = json.loads(path.read_text(encoding="utf-8"))
token = os.getenv("FOOTBALL_DATA_API_KEY", "").strip()
if not token:
    print("SKIPPED: result source not connected")
    raise SystemExit(0)
existing = {x["predictionId"] for x in feed["records"]}
now = dt.datetime.now(dt.timezone.utc)
added = 0
for record in ledger["records"]:
    if not record.get("isProspective") or record.get("id") in existing:
        continue
    if record.get("sportCode") != "FOOTBALL" or record.get("marketCode") != "FULL_TIME_1X2":
        continue
    match_id = record.get("providerMatchId")
    selection = record.get("selectionCode")
    if not isinstance(match_id, int) or selection not in ("HOME", "DRAW", "AWAY"):
        continue
    try:
        start = dt.datetime.fromisoformat(record["eventStartUTC"].replace("Z", "+00:00"))
        locked = dt.datetime.fromisoformat(record["recordedAtUTC"].replace("Z", "+00:00"))
    except (ValueError, KeyError, TypeError):
        continue
    if locked >= start or start >= now:
        continue
    url = "https://api.football-data.org/v4/matches/" + str(match_id)
    try:
        req = Request(url, headers={"X-Auth-Token": token, "Accept": "application/json"})
        with urlopen(req, timeout=20) as response:
            match = json.load(response)
        if match.get("status") != "FINISHED" or match.get("id") != match_id:
            continue
        score = (match.get("score") or {}).get("fullTime") or {}
        home, away = score.get("home"), score.get("away")
        if not isinstance(home, int) or not isinstance(away, int):
            continue
        winner = "HOME" if home > away else "AWAY" if away > home else "DRAW"
        feed["records"].append({
            "predictionId": record["id"], "verified": True,
            "result": "WIN" if selection == winner else "LOSS",
            "marketCode": "FULL_TIME_1X2", "fullTimeScore": {"home": home, "away": away},
            "source": url, "observedAtUTC": now.isoformat().replace("+00:00", "Z")
        })
        existing.add(record["id"])
        added += 1
    except (OSError, ValueError, KeyError, TimeoutError) as error:
        print("Could not verify", record.get("id"), str(error))
if added:
    path.write_text(json.dumps(feed, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
print("New independently verified 1X2 settlements:", added)
