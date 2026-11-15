"""Tests for evidence-only cross-provider mapping worklist."""
import copy
import sys
import unittest
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/"scripts"))
from prepare_bsp_mapping_worklist import prepare
from horse_market_benchmark_v1 import fingerprint
from compare_horse_bsp_models import BASE,V3

def record(model=BASE,race="101",ids=("a","b"),start="2026-11-15T15:00:00+00:00"):
    item={"schema_version":1,"model":model,"race_id":race,"racecourse":"Newcastle",
          "startUTC":start,"generated_at_utc":"2026-11-15T11:00:00+00:00",
          "challenge_eligible":0,"research_only":True,"model_validation":"UNVALIDATED",
          "publication_gate":"BLOCKED",
          "runners":[{"horse_id":h,"name":"Horse "+h,"model_probability":1/len(ids)} for h in ids]}
    item["record_sha256"]=fingerprint(item)
    return item
class TestWorklist(unittest.TestCase):
    def test_one_race_no_guessed_ids(self):
        m=prepare([record()])
        self.assertEqual(m["candidate_races"],1)
        self.assertFalse(m["races"][0]["mapping_verified"])
        self.assertEqual(m["races"][0]["runner_id_map"],{"a":None,"b":None})
        self.assertIsNone(m["races"][0]["betfair_event_id"])
        self.assertEqual(m["manifest_sha256"],fingerprint({k:v for k,v in m.items() if k!="manifest_sha256"}))
    def test_two_models_same_field_one_worklist(self):
        m=prepare([record(),record(V3)])
        self.assertEqual(m["candidate_races"],1)
        self.assertEqual(len(m["races"][0]["archived_forecasts"]),2)
        self.assertEqual(m["races"][0]["models_available"],[BASE,V3])
    def test_conflicting_field_excluded(self):
        m=prepare([record(),record(V3,ids=("a","c"))])
        self.assertEqual(m["candidate_races"],0)
        self.assertEqual(m["exclusions"]["CONFLICTING_FIELDS_WITHIN_RACE"],2)
    def test_bad_integrity_excluded(self):
        f=record();f["runners"][0]["name"]="Altered"
        m=prepare([f])
        self.assertEqual(m["candidate_races"],0)
        self.assertEqual(m["exclusions"]["INVALID_ARCHIVED_FORECAST"],1)
    def test_missing_name_excluded(self):
        f=record();f["runners"][0]["name"]=""
        f["record_sha256"]=fingerprint({k:v for k,v in f.items() if k!="record_sha256"})
        m=prepare([f])
        self.assertEqual(m["candidate_races"],0)
    def test_unsafe_model_excluded(self):
        f=record();f["publication_gate"]="OPEN"
        f["record_sha256"]=fingerprint({k:v for k,v in f.items() if k!="record_sha256"})
        self.assertEqual(prepare([f])["candidate_races"],0)
    def test_no_data_valid(self):
        m=prepare([])
        self.assertEqual(m["candidate_races"],0)
        self.assertEqual(m["source_forecast_records"],0)
if __name__=="__main__":unittest.main()
