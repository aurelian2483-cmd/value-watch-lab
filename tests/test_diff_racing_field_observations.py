"""Source-observed V2 field change evidence, without official scratch inference."""
import copy
import json
import sys
import tempfile
import unittest
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/"scripts"))
from horse_market_benchmark_v1 import fingerprint
from diff_racing_field_observations import evaluate

def sample(at,change=False):
    rows=[{"horse_id":"101","name":"Alpha","runner_status":"RUNNER","active_runner":True},
          {"horse_id":"102","name":"Beta","runner_status":"NONRUNNER" if change else "RUNNER","active_runner":not change},
          {"horse_id":"103","name":"Gamma","runner_status":"RUNNER","active_runner":True}]
    r={"schema_version":1,"kind":"SOURCE_OBSERVED_RACING_FIELD_V2",
       "research_only":True,"model_validation":"UNVALIDATED","publication_gate":"BLOCKED",
       "official_nonrunner_announcement_verified":False,"race_id":"987650",
       "startUTC":"2026-11-15T18:00:00Z","source_observed_at_utc":at,
       "capture_processed_at_utc":at,"runners":rows,
       "active_runner_ids":[x["horse_id"] for x in rows if x["active_runner"]]}
    r["record_sha256"]=fingerprint(r)
    return r
def save(folder,r):
    path=Path(folder)/(r["record_sha256"]+".json")
    path.write_text(json.dumps(r))
    return path
class Changes(unittest.TestCase):
    def test_status_transition_only_publisher_evidence(self):
        with tempfile.TemporaryDirectory() as tmp:
            files=[save(tmp,sample("2026-11-15T11:00:00Z")),
                   save(tmp,sample("2026-11-15T11:30:00Z",True))]
            report=evaluate(files)
            self.assertEqual(report["change_count"],1)
            self.assertEqual(report["changes"][0]["removed_active_runner_ids"],["102"])
            self.assertEqual(report["changes"][0]["status_transitions"][0]["current"],"NONRUNNER")
            self.assertFalse(report["changes"][0]["official_withdrawal_verified"])
            self.assertEqual(report["report_sha256"],fingerprint({k:v for k,v in report.items() if k!="report_sha256"}))
    def test_unchanged(self):
        with tempfile.TemporaryDirectory() as tmp:
            paths=[save(tmp,sample("2026-11-15T11:00:00Z")),save(tmp,sample("2026-11-15T11:30:00Z"))]
            r=evaluate(paths)
            self.assertEqual(r["change_count"],0)
            self.assertEqual(r["transition_counts"]["UNCHANGED"],1)
    def test_hash_failure_rejected(self):
        with tempfile.TemporaryDirectory() as tmp:
            row=sample("2026-11-15T11:00:00Z")
            row["runners"][0]["name"]="Tampered"
            result=evaluate([save(tmp,row)])
            self.assertEqual(result["races_with_valid_v2_captures"],0)
            self.assertEqual(result["invalid_snapshots"]["INVALID_OR_INELIGIBLE_SNAPSHOT"],1)
    def test_prior_v1_not_used(self):
        with tempfile.TemporaryDirectory() as tmp:
            row=sample("2026-11-15T11:00:00Z");row["kind"]="SOURCE_OBSERVED_RACING_FIELD_V1"
            row["record_sha256"]=fingerprint({k:v for k,v in row.items() if k!="record_sha256"})
            self.assertEqual(evaluate([save(tmp,row)])["change_count"],0)
    def test_timestamp_ambiguity(self):
        with tempfile.TemporaryDirectory() as tmp:
            a=sample("2026-11-15T11:00:00Z");b=sample("2026-11-15T11:00:00Z",True)
            result=evaluate([save(tmp,a),save(tmp,b)])
            self.assertEqual(result["change_count"],0)
            self.assertEqual(result["transition_counts"]["SAME_OR_REVERSED_TIMESTAMP"],1)
    def test_empty(self):
        self.assertEqual(evaluate([])["change_count"],0)
if __name__=="__main__":unittest.main()
