"""Audit unverified race field changes; never rewrite or auto-promote records."""
import copy
import sys
import unittest
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/"scripts"))
from audit_horse_field_revisions import reconcile
from horse_market_benchmark_v1 import fingerprint
from compare_horse_bsp_models import BASE

def snapshot(ids,frozen):
    f={"schema_version":1,"model":BASE,"race_id":"r1","racecourse":"Newcastle",
       "startUTC":"2026-11-15T18:00:00+00:00","generated_at_utc":frozen,
       "research_only":True,"model_validation":"UNVALIDATED",
       "publication_gate":"BLOCKED","challenge_eligible":0,
       "runner_source_sha256":"a"*64,
       "runners":[{"horse_id":h,"model_probability":1/len(ids)} for h in ids]}
    f["record_sha256"]=fingerprint(f)
    return f

class FieldAudit(unittest.TestCase):
    def test_removed_runner_not_assumed_withdrawn(self):
        f=[snapshot(["a","b","c"],"2026-11-15T12:00:00+00:00"),
           snapshot(["a","b"],"2026-11-15T13:00:00+00:00")]
        r=reconcile(f)
        self.assertEqual(r["unique_races_with_conflicting_fields"],1)
        self.assertEqual(r["revisions_affected"],2)
        self.assertEqual(r["races"][0]["first_to_last_removed_ids"],["c"])
        self.assertEqual(r["races"][0]["status"],"UNRESOLVED_AWAITING_INDEPENDENT_FINAL_FIELD_EVIDENCE")
        self.assertFalse(r["races"][0]["bsp_matching_eligible"])
        self.assertEqual(r["audit_sha256"],fingerprint({k:v for k,v in r.items() if k!="audit_sha256"}))
    def test_stable_field_not_conflict(self):
        f=[snapshot(["a","b"],"2026-11-15T12:00:00+00:00"),
           snapshot(["b","a"],"2026-11-15T13:00:00+00:00")]
        self.assertEqual(reconcile(f)["unique_races_with_conflicting_fields"],0)
    def test_added_and_removed(self):
        a=snapshot(["a","b"],"2026-11-15T12:00:00+00:00")
        b=snapshot(["b","c"],"2026-11-15T13:00:00+00:00")
        r=reconcile([a,b])
        self.assertEqual(r["classifications"]["BOTH_ADDED_AND_REMOVED"],1)
    def test_intermediate_change(self):
        f=[snapshot(["a","b"],"2026-11-15T12:00:00+00:00"),
           snapshot(["a","c"],"2026-11-15T13:00:00+00:00"),
           snapshot(["a","b"],"2026-11-15T14:00:00+00:00")]
        self.assertEqual(reconcile(f)["classifications"]["INTERMEDIATE_FIELD_REVISED_OR_REVERTED"],1)
    def test_bad_hash_cannot_create_conflict(self):
        a=snapshot(["a","b"],"2026-11-15T12:00:00+00:00")
        b=snapshot(["a","c"],"2026-11-15T13:00:00+00:00")
        b["runners"][0]["horse_id"]="tampered"
        r=reconcile([a,b])
        self.assertEqual(r["unique_races_with_conflicting_fields"],0)
        self.assertEqual(r["invalid_receipts"]["INVALID_FORECAST_RECEIPT"],1)
    def test_one_record_no_issue(self):
        self.assertEqual(reconcile([snapshot(["a","b"],"2026-11-15T12:00:00+00:00")])["unique_races_with_conflicting_fields"],0)
    def test_no_input(self):
        self.assertEqual(reconcile([])["races"],[])

if __name__=="__main__":unittest.main()
