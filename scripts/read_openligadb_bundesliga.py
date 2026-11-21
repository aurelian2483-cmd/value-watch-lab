"""Read one Bundesliga matchday into a local, research-only receipt on stdout."""

import argparse
import hashlib
import json
from datetime import datetime, timezone
from urllib.error import URLError
from urllib.request import Request, urlopen

API = "https://api.openligadb.de/getmatchdata/bl1"
MAX_BYTES = 256 * 1024
ATTRIBUTION = {
    "name": "OpenLigaDB",
    "url": "https://www.openligadb.de/",
    "license": "ODbL 1.0",
    "data_terms": "https://www.openligadb.de/lizenz",
    "license_url": "https://opendatacommons.org/licenses/odbl/1-0/",
}


def endpoint(season, matchday):
    if not 1963 <= season <= 9998 or not 1 <= matchday <= 34:
        raise ValueError("Expected a Bundesliga season start year and matchday 1–34")
    return f"{API}/{season}/{matchday}"


def positive_id(value):
    if type(value) is not int or value <= 0:
        raise ValueError("Expected a positive provider identifier")
    return value


def kickoff(value):
    if not isinstance(value, str) or "T" not in value or not value.endswith(("Z", "+00:00")):
        raise ValueError("Expected an explicit UTC kickoff")
    return datetime.fromisoformat(value.replace("Z", "+00:00")).isoformat().replace("+00:00", "Z")


def build_receipt(raw, season, matchday, captured_at):
    source = endpoint(season, matchday)
    rows = json.loads(raw)
    if not isinstance(rows, list) or not 1 <= len(rows) <= 9:
        raise ValueError("Missing or unexpected Bundesliga matchday rows")
    fixtures = {}
    for row in rows:
        if (row["leagueShortcut"] != "bl1" or row["leagueSeason"] != season
                or row["group"]["groupOrderID"] != matchday):
            raise ValueError("Observation outside the requested competition, season or matchday")
        match_id = positive_id(row["matchID"])
        home_id = positive_id(row["team1"]["teamId"])
        away_id = positive_id(row["team2"]["teamId"])
        if home_id == away_id or type(row["matchIsFinished"]) is not bool:
            raise ValueError("Invalid ordered teams or source finish flag")
        record = {
            "event_id": f"openligadb:bl1:{match_id}",
            "home_provider_id": home_id,
            "away_provider_id": away_id,
            "kickoff_utc": kickoff(row["matchDateTimeUTC"]),
            "provider_reports_finished": row["matchIsFinished"],
        }
        if fixtures.get(match_id, record) != record:
            raise ValueError("Conflicting observations for the same provider match ID")
        fixtures[match_id] = record
    return {
        "schema_version": 1,
        "sport": "football",
        "competition": "Bundesliga",
        "season_start_year": season,
        "matchday": matchday,
        "research_only": True,
        "model_validation": "UNVALIDATED",
        "publication_gate": "BLOCKED",
        "verification": "SINGLE_SOURCE_UNREVIEWED",
        "source": source,
        "attribution": ATTRIBUTION,
        "captured_at_utc": kickoff(captured_at),
        "response_sha256": hashlib.sha256(raw).hexdigest(),
        "fixtures": [fixtures[key] for key in sorted(fixtures)],
    }


def read_matchday(season, matchday, opener=urlopen):
    url = endpoint(season, matchday)
    request = Request(url, headers={"Accept": "application/json", "User-Agent": "ValueWatchResearch/1.0"})
    with opener(request, timeout=12) as response:
        if response.geturl() != url or response.headers.get_content_type() != "application/json":
            raise ValueError("Unexpected response location or media type")
        raw = response.read(MAX_BYTES + 1)
        if len(raw) > MAX_BYTES:
            raise ValueError("Response exceeds the matchday size limit")
    captured_at = datetime.now(timezone.utc).isoformat()
    return build_receipt(raw, season, matchday, captured_at)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("season", type=int, help="season start year, e.g. 2026")
    parser.add_argument("matchday", type=int, help="one matchday, 1–34")
    args = parser.parse_args()
    try:
        receipt = read_matchday(args.season, args.matchday)
    except (URLError, OSError, ValueError, KeyError, TypeError) as error:
        parser.exit(1, f"OpenLigaDB unavailable or unusable: {error}\n")
    print(json.dumps(receipt, indent=2))


if __name__ == "__main__":
    main()
