"""IHRB candidate crosswalk is descriptive only; never validates bookmaker IDs."""
import json
import sys
import tempfile
import unittest
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/"scripts"))
from horse_market_benchmark_v1 import fingerprint
from crosscheck_ihrb_publisher_candidates import evaluate
def make_receipts(root):
    d=Path(root);d.mkdir(exist_ok=True,parents=True)
    f={"kind":"SOURCE_OBSERVED_RACING_FIELD_V2","research_only":True,"model_validation":"UNVALIDATED","publication_gate":"BLOCKED",
       "official_nonrunner_announcement_verified":False,"race_id":"987650","racecourse":"Navan",
       "startUTC":"2026-11-15T15:00:00Z","source_observed_at_utc":"2026-11-15T10:00:00Z",
       "capture_processed_at_utc":"2026-11-15T10:00:00Z",
       "runners":[{"horse_id":"101","name":"Holly's Thunder","runner_status":"NONRUNNER","active_runner":False},
                  {"horse_id":"102","name":"Other Runner","runner_status":"RUNNER","active_runner":True},
                  {"horse_id":"103","name":"Third Runner","runner_status":"RUNNER","active_runner":True}],
       "active_runner_ids":["102","103"]}
    f["record_sha256"]=fingerprint(f);fp=d/(f["record_sha256"]+".json");fp.write_text(json.dumps(f))
    o={"kind":"IHRB_OFFICIAL_NONRUNNER_PAGE_OBSERVED_V1",
       "research_only":True,"model_validation":"UNVALIDATED","publication_gate":"BLOCKED",
       "source_independently_timestamp_attested":False,"source_observed_at_utc":"2026-11-15T10:10:00Z",
       "rows":[{"race_day_local":"2026-11-15","course":"Navan","race_number":2,
                "horse_and_rider_text":"Holly's Thunder John Shinnick",
                "reported_logged_at_utc":"2026-11-15T08:33:53+00:00"}]}
    o["record_sha256"]=fingerprint(o);op=d/(o["record_sha256"]+".json");op.write_text(json.dumps(o))
    return fp,op
class OfficialCandidates(unittest.TestCase):
    def test_single_name_candidate_not_confirmed(self):
        with tempfile.TemporaryDirectory() as tmp:
            f,o=make_receipts(tmp);r=evaluate([f],[o])
            self.assertEqual(r["observed_regulator_entries_unique"],1)
            self.assertEqual(r["candidate_counts"]["SINGLE_UNVERIFIED_NAME_PREFIX_CANDIDATE"],1)
            c=r["candidate_matches"][0]
            self.assertEqual(c["candidate"]["horse_id"],"101")
            self.assertFalse(c["official_cross_provider_match_verified"])
            self.assertFalse(c["betting_eligible"])
            self.assertEqual(r["report_sha256"],fingerprint({k:v for k,v in r.items() if k!="report_sha256"}))
    def test_no_field_no_match(self):
        with tempfile.TemporaryDirectory() as tmp:
            _,o=make_receipts(tmp);r=evaluate([],[o])
            self.assertEqual(r["candidate_counts"]["NO_PUBLISHER_HORSE_CANDIDATE"],1)
    def test_invalid_regulator_integrity(self):
        with tempfile.TemporaryDirectory() as tmp:
            f,o=make_receipts(tmp);obj=json.loads(o.read_text())
            obj["rows"][0]["horse_and_rider_text"]="Changed"
            o.write_text(json.dumps(obj))
            r=evaluate([f],[o]);self.assertEqual(r["valid_regulator_receipts"],0)
            self.assertEqual(r["invalid_regulator_receipts"]["INVALID_OFFICIAL_RECEIPT"],1)
    def test_duplicate_observations_do_not_multiply_unique_entries(self):
        with tempfile.TemporaryDirectory() as tmp:
            f,o=make_receipts(tmp);a=evaluate([f],[o,o])
            self.assertEqual(a["observed_regulator_entries_unique"],1)
            self.assertEqual(a["candidate_matches"][0]["official_receipts_seen"],2)
    def test_empty_evidence(self):
        self.assertEqual(evaluate([],[])["observed_regulator_entries_unique"],0)
if __name__=="__main__":unittest.main()
