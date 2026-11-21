"""Offline contract tests. These payloads are synthetic."""

import hashlib
import io
import json
import unittest
from email.message import Message
from unittest.mock import Mock
from urllib.error import URLError

from scripts.read_openligadb_bundesliga import MAX_BYTES, build_receipt, endpoint, read_matchday


def row(**changes):
    return {
        "leagueShortcut": "bl1", "leagueSeason": 2026,
        "group": {"groupOrderID": 10}, "matchID": 17,
        "team1": {"teamId": 20, "teamName": "Synthetic A"},
        "team2": {"teamId": 30, "teamName": "Synthetic B"},
        "matchDateTimeUTC": "2026-11-21T15:30:00Z",
        "lastUpdateDateTime": "2026-11-20T09:00:00",
        "matchIsFinished": False, "matchResults": [{"pointsTeam1": 1}],
        **changes,
    }


def receipt(*rows):
    raw = json.dumps(rows).encode()
    return build_receipt(raw, 2026, 10, "2026-11-21T13:20:00Z")


class OpenLigaDBTests(unittest.TestCase):
    def test_receipt_is_attributed_research_only_and_keeps_order(self):
        match = row()
        proof = receipt(match, match)
        self.assertEqual(proof["response_sha256"], hashlib.sha256(json.dumps((match, match)).encode()).hexdigest())
        self.assertEqual(proof["publication_gate"], "BLOCKED")
        self.assertEqual(proof["model_validation"], "UNVALIDATED")
        self.assertEqual(proof["verification"], "SINGLE_SOURCE_UNREVIEWED")
        self.assertEqual(proof["attribution"]["license"], "ODbL 1.0")
        self.assertEqual(proof["fixtures"], [{
            "event_id": "openligadb:bl1:17", "home_provider_id": 20, "away_provider_id": 30,
            "kickoff_utc": "2026-11-21T15:30:00Z", "provider_reports_finished": False,
        }])

    def test_rejects_conflict_scope_and_unusable_timestamps(self):
        for bad in (
            row(leagueShortcut="bl2"), row(leagueSeason=2025),
            row(group={"groupOrderID": 9}), row(matchDateTimeUTC="2026-11-21T15:30:00"),
            row(matchDateTimeUTC="2026-02-30T12:00:00Z"), row(team2={"teamId": 20}),
            row(matchID=True), row(matchIsFinished="false"),
        ):
            with self.subTest(bad=bad), self.assertRaises(ValueError):
                receipt(bad)
        for conflicting in (row(team2={"teamId": 31}), row(matchDateTimeUTC="2026-11-22T15:30:00Z")):
            with self.assertRaisesRegex(ValueError, "Conflicting"):
                receipt(row(), conflicting)
        with self.assertRaises(ValueError):
            receipt()

    def test_single_request_and_source_failures(self):
        class Response(io.BytesIO):
            headers = Message()

            def geturl(self):
                return endpoint(2026, 10)

        Response.headers["Content-Type"] = "application/json"
        opener = Mock(return_value=Response(json.dumps([row()]).encode()))
        self.assertEqual(len(read_matchday(2026, 10, opener)["fixtures"]), 1)
        opener.assert_called_once()
        self.assertEqual(opener.call_args.args[0].full_url, endpoint(2026, 10))
        self.assertEqual(opener.call_args.kwargs["timeout"], 12)
        with self.assertRaises(ValueError):
            read_matchday(2026, 35, opener)
        opener.assert_called_once()
        with self.assertRaises(URLError):
            read_matchday(2026, 10, Mock(side_effect=URLError("offline")))
        with self.assertRaisesRegex(ValueError, "size limit"):
            read_matchday(2026, 10, Mock(return_value=Response(b" " * (MAX_BYTES + 1))))
