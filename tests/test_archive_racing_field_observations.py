"""Prospective source-observed runner-field receipt tests (not official withdrawals)."""
import copy
import datetime as dt
import json
import sys
import tempfile
import unittest
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/"scripts"))
from horse_market_benchmark_v1 import fingerprint
from archive_racing_field_observations import archive,snapshot
NOW=dt.datetime(2026,11,15,11,0,tzinfo=dt.timezone.utc)
COMMIT="a"*40
def feed():
    return {"research_only":True,"model_validation":"UNVALIDATED",
            "publication_gate":"BLOCKED","generated_at_utc":"2026-11-15T10:55:00+00:00",
            "races":[{"race_id":"948999","racecourse":"Newcastle",
                      "startUTC":"2026-11-15T14:00:00+00:00",
                      "runner_observed_at_utc":"2026-11-15T10:53:00+00:00",
                      "runner_source_sha256":"b"*64,
                      "runner_source":"https://www.sportinglife.com/racing/racecards/2026-11-15/newcastle/racecard/948999/example",
                      "capture_phase":"PRE_EVENT","race_stage":"DORMANT",
                      "runner_data_status":"SINGLE_SOURCE_RUNNERS_OBSERVED",
                      "active_runner_count":2,
                      "runners":[{"horse_id":"10001","name":"First","runner_status":"RUNNER","active_runner":True},
                                 {"horse_id":"10002","name":"Second","runner_status":"RUNNER","active_runner":True},
                                 {"horse_id":"10003","name":"Withdrawn","runner_status":"NONRUNNER","active_runner":False}]}]}
class CaptureTests(unittest.TestCase):
    def test_sourced_receipt_preserves_withdrawn_and_active(self):
        src=feed()
        record,reason=snapshot(src["races"][0],src,NOW,COMMIT)
        self.assertIsNone(reason)
        self.assertEqual(record["active_runner_ids"],["10001","10002"])
        self.assertFalse(record["official_nonrunner_announcement_verified"])
        self.assertEqual(record["runners"][2]["runner_status"],"NONRUNNER")
        self.assertEqual(record["record_sha256"],fingerprint({k:v for k,v in record.items() if k!="record_sha256"}))
    def test_idempotence_same_cycle(self):
        src=feed()
        with tempfile.TemporaryDirectory() as tmp:
            one=archive(src,Path(tmp),NOW,COMMIT)
            two=archive(src,Path(tmp),NOW,COMMIT)
            self.assertEqual(one["records_captured"],1)
            self.assertEqual(two["records_captured"],1)
            self.assertEqual(len(list(Path(tmp).rglob("*.json"))),1)
    def test_stale_feed_rejected(self):
        src=feed();src["generated_at_utc"]="2026-11-14T12:00:00+00:00"
        with tempfile.TemporaryDirectory() as tmp:
            with self.assertRaises(ValueError):archive(src,Path(tmp),NOW,COMMIT)
    def test_future_runner_observation_rejected(self):
        src=feed();src["races"][0]["runner_observed_at_utc"]="2026-11-15T11:20:00+00:00"
        self.assertIsNotNone(snapshot(src["races"][0],src,NOW,COMMIT)[1])
    def test_stale_runner_observation_rejected(self):
        src=feed();src["races"][0]["runner_observed_at_utc"]="2026-11-15T09:00:00+00:00"
        self.assertIsNotNone(snapshot(src["races"][0],src,NOW,COMMIT)[1])
    def test_after_off_rejected(self):
        src=feed();src["races"][0]["startUTC"]="2026-11-15T10:59:00+00:00"
        self.assertIsNotNone(snapshot(src["races"][0],src,NOW,COMMIT)[1])
    def test_unverified_source_rejected(self):
        src=feed();src["races"][0]["runner_source"]="https://attacker.com/other"
        self.assertIsNotNone(snapshot(src["races"][0],src,NOW,COMMIT)[1])
    def test_status_mismatch_rejected(self):
        src=feed();src["races"][0]["runners"][2]["active_runner"]=True
        self.assertIsNotNone(snapshot(src["races"][0],src,NOW,COMMIT)[1])
    def test_duplicate_identity_rejected(self):
        src=feed();src["races"][0]["runners"][1]["horse_id"]="10001"
        self.assertIsNotNone(snapshot(src["races"][0],src,NOW,COMMIT)[1])
    def test_mislabelled_source_blocked(self):
        src=feed();src["publication_gate"]="OPEN"
        with tempfile.TemporaryDirectory() as tmp:
            with self.assertRaises(ValueError):archive(src,Path(tmp),NOW,COMMIT)
    def test_no_runners_is_honest_abstention(self):
        src=feed();src["races"][0]["runners"]=[]
        with tempfile.TemporaryDirectory() as tmp:
            r=archive(src,Path(tmp),NOW,COMMIT)
            self.assertEqual(r["records_captured"],0)
            self.assertEqual(r["excluded"]["INCOMPLETE_RUNNER_LIST"],1)
    def test_no_rollback_into_betting(self):
        src=feed()
        with tempfile.TemporaryDirectory() as tmp:
            r=archive(src,Path(tmp),NOW,COMMIT)
            self.assertEqual(r["publication_gate"],"BLOCKED")
            self.assertEqual(json.loads(list(Path(tmp).rglob("*.json"))[0].read_text())["betting_eligible"],False)
if __name__=="__main__":unittest.main()
