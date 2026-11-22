"""Bounded, private SharpAPI coverage check; never prints odds or stores feed rows."""
from collections import Counter, defaultdict
import json
import os
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import HTTPRedirectHandler, Request, build_opener

BASE = "https://api.sharpapi.io/api/v1"
BOOKS = {"draftkings", "fanduel"}
MAX_BODY = 2 * 1024 * 1024


class NoRedirect(HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None


def get(path, params, key):
    url = f"{BASE}/{path}"
    if params:
        url += "?" + urlencode(params)
    request = Request(url, headers={"Accept": "application/json", "X-API-Key": key})
    try:
        with build_opener(NoRedirect()).open(request, timeout=20) as response:
            body = response.read(MAX_BODY + 1)
        if len(body) > MAX_BODY:
            raise RuntimeError("response_too_large")
        value = json.loads(body)
        if not isinstance(value, dict) or not isinstance(value.get("data"), list):
            raise RuntimeError("unexpected_response")
        return value["data"]
    except HTTPError as exc:
        raise RuntimeError(f"provider_http_{exc.code}") from None
    except (URLError, TimeoutError, OSError, ValueError):
        raise RuntimeError("provider_connection_or_json_error") from None


def main():
    key = os.environ.get("THE_SHARP_API_KEY", "")
    if not key:
        print("THE_SHARP_API_KEY is unavailable; no requests made.")
        return 2
    try:
        books = get("sportsbooks", {}, key)
        sports = get("sports", {"sportsbook": ",".join(sorted(BOOKS))}, key)
        odds = get("odds", {
            "market": "moneyline",
            "sportsbook": ",".join(sorted(BOOKS)),
            "is_live": "false",
            "limit": "200",
        }, key)

        book_rows = []
        for row in books:
            if isinstance(row, dict) and row.get("id") in BOOKS:
                book_rows.append({
                    "id": row.get("id"),
                    "status": row.get("status"),
                    "tier": row.get("requires_tier"),
                    "currently_serving": row.get("currently_serving"),
                    "event_count": row.get("event_count"),
                })

        sport_rows = []
        for row in sports:
            if not isinstance(row, dict):
                continue
            sport_rows.append({
                "id": row.get("id"),
                "name": row.get("name"),
                "event_count": row.get("event_count"),
                "live_count": row.get("live_count"),
                "leagues": row.get("leagues") if isinstance(row.get("leagues"), list) else [],
            })

        groups = defaultdict(set)
        for row in odds:
            if not isinstance(row, dict) or row.get("sportsbook") not in BOOKS:
                continue
            event_id = row.get("event_id")
            market = row.get("market_type")
            selection = row.get("selection")
            if all(isinstance(x, str) and x for x in (event_id, market, selection)):
                groups[(row.get("sport"), row.get("league"), row.get("sportsbook"),
                        event_id, market)].add(selection)

        coverage = Counter()
        for (sport, league, book, _event, market), selections in groups.items():
            complete = (market == "moneyline" and len(selections) == 2) or (
                market == "moneyline_3-way" and len(selections) == 3
            )
            coverage[(sport or "unknown", league or "unknown", book, "complete" if complete else "partial")] += 1

        print(json.dumps({
            "check": "SharpAPI bounded live coverage; no odds values retained or printed",
            "sportsbooks": book_rows,
            "sports": sport_rows,
            "moneyline_event_groups_from_first_200_rows": [
                {"sport": sport, "league": league, "book": book, "outcome_status": status, "events": count}
                for (sport, league, book, status), count in sorted(coverage.items())
            ],
        }, separators=(",", ":")))
        return 0
    except RuntimeError as exc:
        print(f"SharpAPI coverage check stopped safely: {exc}")
        return 1
    except Exception:
        print("SharpAPI coverage check failed; provider details and response data were not logged.")
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
