"""Offline tests for opt-in first-provider original response preservation."""
import hashlib
import json
import os
import stat
import sys
import tempfile
import unittest
from datetime import datetime, timedelta, timezone
from pathlib import Path

SCRIPTS = Path(__file__).resolve().parents[1] / "scripts"
sys.path.insert(0, str(SCRIPTS))
import capture_prospective_research as cap
import observe_pending_results as obs
from private_result_capture import PrivateCaptureError, PrivateResultCapture, MAX_BODY

NOW = datetime(2026, 11, 20, 18, tzinfo=timezone.utc)
START = cap.iso(NOW - timedelta(days=1))
URL = "https://site.api.espn.com/apis/site/v2/sports/tennis/atp/scoreboard?dates=20261119"

def source_bytes():
    # Construct the synthetic source as JSON, rather than hand-writing brackets.
    # Earlier two collector tests were failing on an extra bracket in the mock.
    document = {"events": [{"groupings": [{
        "grouping": {"slug": "mens-singles"},
        "competitions": [{
            "id": "555", "date": START,
            "status": {"type": {"name": "STATUS_FINAL", "completed": True}},
            "competitors": [
                {"id": "a", "type": "athlete", "winner": True},
                {"id": "b", "type": "athlete", "winner": False}
            ]
        }]
    }]}]}
    return json.dumps(document, separators=(",", ":"), sort_keys=True).encode("utf-8")

def prediction():
    return {
        "prediction_id": "tennis:atp-555:MATCH_WINNER:FIXED_ELO_K24_V1",
        "sport": "tennis", "event_id": "atp-555", "market": "MATCH_WINNER",
        "source_url": URL, "event_start_utc": START,
        "participant_ids": ["a", "b"], "probabilities": {"a": 0.6, "b": 0.4}
    }

def observation(payload=None):
    raw = payload if payload is not None else source_bytes()
    return {
        "prediction_id": prediction()["prediction_id"], "sport": "tennis",
        "event_id": "atp-555", "market": "MATCH_WINNER", "actual_outcome": "a",
        "source_url": URL, "source_observed_at_utc": cap.iso(NOW),
        "provider_response_sha256": hashlib.sha256(raw).hexdigest(),
        "status": "SINGLE_PROVIDER_FINAL_UNVERIFIED",
        "independently_verified": False, "betting_eligible": False
    }

def fetcher(url):
    assert url == URL
    raw = source_bytes()
    return json.loads(raw), hashlib.sha256(raw).hexdigest(), raw, cap.iso(NOW)

def bare_ledger():
    return {"schemaVersion":1,"kind":"PROSPECTIVE_PREDICTION_LEDGER","records":[prediction()]}

def archive():
    return {"schema_version":1, "research_only":True, "model_validation":"UNVALIDATED",
            "publication_gate":"BLOCKED", "observations":[]}

class PrivateCaptureTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(prefix="bottleneck-private-result-")
        self.root = Path(self.temp.name) / "private"
        self.root.mkdir(mode=0o700)
        self.repo = Path(__file__).resolve().parents[1]
        self.store = PrivateResultCapture(self.root, self.repo)

    def tearDown(self):
        self.temp.cleanup()

    def test_preserves_exact_bytes_in_private_root_only(self):
        raw = source_bytes()
        saved = self.store.preserve_observation(observation(), raw)
        self.assertEqual(saved["status"], "ORIGINAL_BYTES_PRESERVED_LOCALLY_UNATTESTED")
        self.assertFalse(saved["independently_authenticated"])
        self.assertEqual(len(list(self.store.raw.glob("*.bin"))),1)
        self.assertEqual(len(list(self.store.receipts.glob("*.json"))),1)
        data = self.store.manifest()
        self.assertEqual(data["kind"],"PRIVATE_RESULT_SOURCE_BYTES_V1")
        self.assertEqual(len(data["records"]),1)
        r = data["records"][0]
        self.assertEqual(r["source_url"],URL)
        self.assertEqual(r["observed_at_utc"],cap.iso(NOW))
        self.assertEqual((self.root / r["relative_path"]).read_bytes(), raw)
        self.assertEqual((self.root / r["relative_path"]).stat().st_mode & 0o077,0)

    def test_second_capture_is_idempotent(self):
        x=self.store.preserve_observation(observation(),source_bytes())
        y=self.store.preserve_observation(observation(),source_bytes())
        self.assertTrue(x["raw_object_new"])
        self.assertFalse(y["raw_object_new"])
        self.assertEqual(len(self.store.manifest()["records"]),1)

    def test_first_write_is_immutable_even_when_hash_is_valid(self):
        body=source_bytes()+b" "
        self.store.preserve_observation(observation(),source_bytes())
        with self.assertRaisesRegex(PrivateCaptureError,"Conflicting"):
            self.store.preserve_observation(observation(body),body)
        self.assertEqual(len(self.store.manifest()["records"]),1)

    def test_tampered_digest_or_bytes_fail_closed(self):
        x=observation();x["provider_response_sha256"]="f"*64
        with self.assertRaisesRegex(PrivateCaptureError,"digest"):
            self.store.preserve_observation(x,source_bytes())
        with self.assertRaisesRegex(PrivateCaptureError,"digest"):
            self.store.preserve_observation(observation(),b"altered")
        self.assertEqual(len(self.store.manifest()["records"]),0)

    def test_rejects_fake_certification_and_unapproved_source(self):
        for k,v in [("independently_verified",True),("betting_eligible",True),
                    ("status","INDEPENDENTLY_VERIFIED")]:
            x=observation();x[k]=v
            with self.assertRaisesRegex(PrivateCaptureError,"eligible"):
                self.store.preserve_observation(x,source_bytes())
        x=observation();x["source_url"]="https://evil.invalid/result"
        with self.assertRaisesRegex(PrivateCaptureError,"allowlist"):
            self.store.preserve_observation(x,source_bytes())

    def test_rejects_empty_wrong_type_and_too_large(self):
        for data in [b"",bytearray(source_bytes()),b"x"*(MAX_BODY+1)]:
            with self.assertRaisesRegex(PrivateCaptureError,"bytes"):
                self.store.preserve_observation(observation(),data)

    def test_private_store_cannot_live_inside_checkout(self):
        with self.assertRaisesRegex(PrivateCaptureError,"outside|inside"):
            PrivateResultCapture(self.repo,self.repo)

    def test_private_directory_must_be_owner_only(self):
        path=Path(self.temp.name)/"bad"
        path.mkdir(mode=0o755)
        os.chmod(path,0o755)
        with self.assertRaisesRegex(PrivateCaptureError,"other users"):
            PrivateResultCapture(path,self.repo)

    def test_private_root_symlink_is_rejected(self):
        path=Path(self.temp.name)/"private-link"
        path.symlink_to(self.root,target_is_directory=True)
        with self.assertRaisesRegex(PrivateCaptureError,"pre-existing"):
            PrivateResultCapture(path,self.repo)

    def test_tampered_original_body_breaks_export(self):
        self.store.preserve_observation(observation(),source_bytes())
        r=self.store.manifest()["records"][0]
        (self.root / r["relative_path"]).write_bytes(b"tampered")
        with self.assertRaisesRegex(PrivateCaptureError,"tampered"):
            self.store.manifest()

    def test_manifest_does_not_contain_original_body(self):
        self.store.preserve_observation(observation(),source_bytes())
        body=json.dumps(self.store.manifest())
        self.assertNotIn("groupings",body)
        self.assertNotIn("competitors",body)

    def test_collector_accepts_future_first_capture_with_exact_bytes_timestamp(self):
        src=archive()
        result=obs.collect(bare_ledger(),src,NOW,fetcher=fetcher,private_capture=self.store)
        self.assertEqual(result["new_observations"],1,repr(result))
        self.assertEqual(src["observations"][0]["source_observed_at_utc"],cap.iso(NOW))
        self.assertFalse(src["observations"][0]["independently_verified"])
        self.assertFalse(src["observations"][0]["betting_eligible"])
        self.assertEqual(len(self.store.manifest()["records"]),1)

    def test_collector_does_not_forge_response_when_fetcher_omits_raw_bytes(self):
        src=archive()
        result=obs.collect(bare_ledger(),src,NOW,
                           fetcher=lambda url:fetcher(url)[:2],
                           private_capture=self.store)
        self.assertEqual(result["new_observations"],0)
        self.assertEqual(result["source_errors"],1)
        self.assertEqual(self.store.manifest()["records"],[])

    def test_existing_two_tuple_fetcher_without_private_storage_is_compatible(self):
        src=archive()
        result=obs.collect(bare_ledger(),src,NOW,fetcher=lambda url:fetcher(url)[:2])
        self.assertEqual(result["new_observations"],1,repr(result))
        self.assertEqual(src["observations"][0]["actual_outcome"],"a")

    def test_collector_refuses_late_capture_timestamp(self):
        src=archive()
        def late(url):
            d,h,b,t=fetcher(url)
            return d,h,b,cap.iso(NOW+timedelta(days=1))
        result=obs.collect(bare_ledger(),src,NOW,fetcher=late,private_capture=self.store)
        self.assertEqual(result["new_observations"],0)
        self.assertEqual(result["source_errors"],1)
        self.assertEqual(self.store.manifest()["records"],[])

    def test_collector_refuses_raw_body_hash_mismatch(self):
        src=archive()
        def modified(url):
            d,h,b,t=fetcher(url)
            return d,h,b+b"x",t
        result=obs.collect(bare_ledger(),src,NOW,fetcher=modified,private_capture=self.store)
        self.assertEqual(result["new_observations"],0)
        self.assertEqual(result["source_errors"],1)
        self.assertEqual(src["observations"],[])

    def test_safe_same_record_metadata_on_disk(self):
        raw=source_bytes()
        self.store.preserve_observation(observation(),raw)
        f=next(self.store.receipts.glob("*.json"))
        saved=json.loads(f.read_text())
        self.assertEqual(saved["body_sha256"],hashlib.sha256(raw).hexdigest())
        self.assertFalse(saved["independently_authenticated"])
        self.assertFalse(saved["betting_eligible"])

if __name__=="__main__":unittest.main()
