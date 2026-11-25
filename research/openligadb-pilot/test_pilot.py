"""Offline pilot contract tests. Every fixture in this file is artificial."""
import copy
import hashlib
import io
import json
import sys
import unittest
from email.message import Message
from pathlib import Path
from urllib.error import HTTPError, URLError
from unittest.mock import Mock
sys.path.insert(0, str(Path(__file__).resolve().parent))
from pilot import run, summarize, SOURCE, USER_AGENT, SEASON, MATCHDAY, MAX_BYTES, Capture
from scripts.read_openligadb_bundesliga import build_receipt

def rows():
    return [{
        "leagueShortcut": "bl1", "leagueSeason": SEASON,
        "group": {"groupOrderID": MATCHDAY}, "matchID": i+1,
        "team1": {"teamId": 2*i+1, "teamName": "Synthetic"},
        "team2": {"teamId": 2*i+2, "teamName": "Synthetic"},
        "matchDateTimeUTC": "2025-08-23T13:30:00Z",
        "matchIsFinished": True,
        "matchResults": [
            {"resultName": "Endergebnis", "resultTypeID": 2,
             "pointsTeam1": i%3, "pointsTeam2": 0},
            {"resultName": "Halbzeitergebnis", "resultTypeID": 1,
             "pointsTeam1": 0, "pointsTeam2": 0}
        ]
    } for i in range(9)]

class Response(io.BytesIO):
    def __init__(self, data, url=SOURCE, media="application/json"):
        super().__init__(data)
        self.url = url
        self.headers = Message()
        self.headers["Content-Type"] = media
    def geturl(self):
        return self.url

def encoded(data):
    return json.dumps(data).encode("utf-8")

def summarize_fixture(data):
    raw=encoded(data)
    return summarize(raw,build_receipt(raw,SEASON,MATCHDAY,"2026-11-25T01:00:00Z"))

class PilotTests(unittest.TestCase):
    def test_single_bounded_get_and_aggregate_only(self):
        raw=encoded(rows())
        opener=Mock(return_value=Response(raw))
        r=run(opener)
        opener.assert_called_once()
        req=opener.call_args.args[0]
        self.assertEqual(req.full_url,SOURCE)
        self.assertEqual(req.get_method(),"GET")
        self.assertEqual(req.get_header("User-agent"),USER_AGENT)
        self.assertEqual(opener.call_args.kwargs["timeout"],12)
        self.assertEqual(r["response_sha256"],hashlib.sha256(raw).hexdigest())
        self.assertEqual(r["fixture_count"],9)
        self.assertEqual(r["final_result_shape_accepted_count"],9)
        self.assertEqual(r["distinct_provider_team_ids"],18)
        self.assertEqual(r["independently_verified_outcomes"],0)
        self.assertEqual(r["real_evaluation_eligible_rows"],0)
        self.assertFalse(r["execution_authorized"])
        self.assertFalse(r["protected_evaluation_authorized"])
        self.assertEqual(r["publication_gate"],"BLOCKED")
        self.assertFalse(r["raw_records_published"])
        for field in ("fixtures","results","matchResults","teamName","event_id","pointsTeam1","pointsTeam2"):
            self.assertNotIn(field,r)
    def test_partial_duplicate_and_wrong_scope(self):
        for data in (rows()[:-1],rows()[:8]+[rows()[0]],[]):
            with self.subTest(length=len(data)),self.assertRaises(ValueError):
                summarize_fixture(data)
        data=rows()
        data[1]["team1"]["teamId"]=data[0]["team1"]["teamId"]
        with self.assertRaisesRegex(ValueError,"Team duplicated"):
            summarize_fixture(data)
    def test_final_result_never_inferred_from_array_position(self):
        data=rows()
        self.assertEqual(summarize_fixture(data)["final_result_shape_accepted_count"],9)
        for mut in ("missing","duplicate","wrong_id","wrong_name","boolean","negative","unfinished"):
            data=rows()
            if mut=="missing":data[0]["matchResults"].pop(0)
            elif mut=="duplicate":data[0]["matchResults"].append(copy.deepcopy(data[0]["matchResults"][0]))
            elif mut=="wrong_id":data[0]["matchResults"][0]["resultTypeID"]=3
            elif mut=="wrong_name":data[0]["matchResults"][0]["resultName"]="Halbzeit"
            elif mut=="boolean":data[0]["matchResults"][0]["pointsTeam1"]=True
            elif mut=="negative":data[0]["matchResults"][0]["pointsTeam1"]=-1
            else:data[0]["matchIsFinished"]=False
            with self.subTest(mut=mut),self.assertRaises(ValueError):
                summarize_fixture(data)
    def test_out_of_season_and_receipt_binding(self):
        data=rows();data[0]["matchDateTimeUTC"]="2026-11-23T13:30:00Z"
        with self.assertRaisesRegex(ValueError,"Out-of-scope"):
            summarize_fixture(data)
        raw=encoded(rows())
        r=build_receipt(raw,SEASON,MATCHDAY,"2026-11-25T01:00:00Z")
        with self.assertRaisesRegex(ValueError,"byte mismatch"):
            summarize(raw+b" ",r)
    def test_http_failure_oversize_and_redirect_never_retried(self):
        for failure in (HTTPError(SOURCE,429,"rate limited",None,None),HTTPError(SOURCE,503,"unavailable",None,None),URLError("offline")):
            opener=Mock(side_effect=failure)
            with self.assertRaises(type(failure)):run(opener)
            opener.assert_called_once()
        for response in (Response(b"x"*(MAX_BYTES+1)),Response(encoded(rows()),url="https://example.invalid"),Response(encoded(rows()),media="text/html")):
            opener=Mock(return_value=response)
            with self.assertRaises(ValueError):run(opener)
            opener.assert_called_once()
    def test_capture_cannot_repeat_request(self):
        from urllib.request import Request
        opener=Mock(return_value=Response(encoded(rows())))
        cap=Capture(opener)
        cap(Request(SOURCE),12)
        with self.assertRaisesRegex(ValueError,"repeat"):
            cap(Request(SOURCE),12)
        opener.assert_called_once()

if __name__=="__main__":
    unittest.main()
