"""One-matchday OpenLigaDB read-only pilot. No raw source or event output is published."""
import hashlib
import json
import sys
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path
from urllib.request import build_opener, HTTPRedirectHandler
from urllib.error import HTTPError, URLError
ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT))
from scripts.read_openligadb_bundesliga import read_matchday, endpoint, kickoff, MAX_BYTES

SEASON, MATCHDAY = 2025, 1
SOURCE = endpoint(SEASON, MATCHDAY)
CONTACT = "https://github.com/aurelian2483-cmd/value-watch-lab/issues"
USER_AGENT = "ValueWatchResearch/1.0 (+%s)" % CONTACT
FLAGS = {"research_only": True, "model_validation": "UNVALIDATED",
         "publication_gate": "BLOCKED", "execution_authorized": False,
         "validation_authorized": False, "protected_evaluation_authorized": False,
         "dispatch_authorized": False, "independently_verified_outcomes": 0,
         "real_evaluation_eligible_rows": 0}
ATTRIBUTION = {
    "notice": "Data from OpenLigaDB (www.openligadb.de), licensed under ODbL 1.0",
    "provider": "https://www.openligadb.de/",
    "data_terms": "https://www.openligadb.de/lizenz",
    "api_terms": "https://www.openligadb.de/nutzungsbedingungen",
    "license": "https://opendatacommons.org/licenses/odbl/1-0/",
}
def require(condition, message):
    if not condition:
        raise ValueError(message)

class NoRedirect(HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None

class Capture:
    """Reuse the existing bounded reader; preserve the exact response locally for the one inspection."""
    def __init__(self, opener):
        self.opener = opener
        self.calls = 0
        self.raw = None
    def __call__(self, request, timeout):
        require(request.full_url == SOURCE and request.get_method() == "GET" and self.calls == 0,
                "Unexpected request or repeat")
        self.calls += 1
        request.add_header("User-Agent", USER_AGENT)
        response = self.opener(request, timeout=timeout)
        return self.Wrapper(response, self)
    class Wrapper:
        def __init__(self, response, capture):
            self.response, self.capture = response, capture
        def __enter__(self):
            self.response.__enter__()
            return self
        def __exit__(self, *args):
            return self.response.__exit__(*args)
        @property
        def headers(self):
            return self.response.headers
        def geturl(self):
            return self.response.geturl()
        def read(self, limit):
            require(limit == MAX_BYTES + 1, "Unexpected read limit")
            data = self.response.read(limit)
            self.capture.raw = data
            return data

def summarize(raw, receipt):
    require(isinstance(raw, bytes) and 0 < len(raw) <= MAX_BYTES, "Invalid cached response")
    require(hashlib.sha256(raw).hexdigest() == receipt["response_sha256"], "Receipt byte mismatch")
    require(receipt["source"] == SOURCE and receipt["season_start_year"] == SEASON
            and receipt["matchday"] == MATCHDAY and receipt["verification"] == "SINGLE_SOURCE_UNREVIEWED",
            "Wrong receipt scope")
    rows = json.loads(raw)
    require(len(rows) == 9 and len(receipt["fixtures"]) == 9, "Incomplete or duplicated matchday")
    fixtures = {f["event_id"]: f for f in receipt["fixtures"]}
    require(len(fixtures) == 9, "Nonunique fixtures")
    team_ids = set()
    counts = Counter()
    captured = datetime.fromisoformat(receipt["captured_at_utc"].replace("Z", "+00:00"))
    require(captured > datetime(2026, 7, 1, tzinfo=timezone.utc), "Invalid capture chronology")
    for row in rows:
        fixture = fixtures["openligadb:bl1:%s" % row["matchID"]]
        require(fixture["provider_reports_finished"] is True, "Unfinished fixture")
        event = datetime.fromisoformat(kickoff(fixture["kickoff_utc"]).replace("Z", "+00:00"))
        require(datetime(2025, 7, 1, tzinfo=timezone.utc) <= event < datetime(2026, 7, 1, tzinfo=timezone.utc)
                and event < captured, "Out-of-scope event date")
        for key in ("home_provider_id", "away_provider_id"):
            require(fixture[key] not in team_ids, "Team duplicated in matchday")
            team_ids.add(fixture[key])
        results = row.get("matchResults")
        require(isinstance(results, list) and 1 <= len(results) <= 10, "Missing or unbounded result array")
        # Require both explicit provider result type and name; never infer from array position.
        finals = [s for s in results if s.get("resultTypeID") == 2 or s.get("resultName") == "Endergebnis"]
        require(len(finals) == 1, "Missing or ambiguous final result")
        final = finals[0]
        require(type(final.get("resultTypeID")) is int and final["resultTypeID"] == 2
                and final.get("resultName") == "Endergebnis", "Unrecognized final result semantics")
        home, away = final.get("pointsTeam1"), final.get("pointsTeam2")
        require(type(home) is int and type(away) is int and 0 <= home <= 30 and 0 <= away <= 30,
                "Invalid final score")
        counts["final_result_shape_accepted"] += 1
    require(len(team_ids) == 18 and counts["final_result_shape_accepted"] == 9, "Count reconciliation failed")
    return {
        "kind": "OPENLIGADB_SINGLE_MATCHDAY_PILOT", "schema_version": 1,
        "status": "SOURCE_CONTRACT_PASSED_NOT_CERTIFIED", "source": SOURCE,
        "season_start_year": SEASON, "matchday": MATCHDAY,
        "captured_at_utc": receipt["captured_at_utc"], "response_sha256": receipt["response_sha256"],
        "response_bytes": len(raw), "fixture_count": 9, "distinct_provider_team_ids": 18,
        "source_reported_finished_count": 9, "final_result_shape_accepted_count": 9,
        "attribution": ATTRIBUTION, "network_requests": 1, "raw_records_published": False,
        "limitations": [
            "Single current retrieval of community-maintained historical data, not an immutable pre-event snapshot.",
            "Final-result shape accepted, not independently corroborated or certified.",
            "No prediction or outcome values exported; raw response cached only in process for this one inspection.",
            "No model scoring, historical training, protected evaluation, or production changes."
        ], **FLAGS
    }

def run(opener=None):
    cap = Capture(opener or build_opener(NoRedirect()).open)
    receipt = read_matchday(SEASON, MATCHDAY, opener=cap)
    require(cap.calls == 1 and cap.raw is not None, "Missing response")
    return summarize(cap.raw, receipt)

if __name__ == "__main__":
    # A CLI read is explicit; CI separately restricts the live job to its one authorized opening event.
    require(sys.argv[1:] == ["--authorized-one-matchday"], "Explicit pilot flag required")
    try:
        result = run()
        print(json.dumps(result, indent=2, allow_nan=False))
    except HTTPError as error:
        print("Source HTTP failure: %d. No retry." % error.code, file=sys.stderr)
        sys.exit(1)
    except (URLError, OSError, ValueError, KeyError, TypeError, AttributeError):
        print("Source unavailable or contract rejected. No retry or fallback.", file=sys.stderr)
        sys.exit(1)
