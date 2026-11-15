"""Closed-world checks for frozen V1/V3 versus at-off Betfair BSP benchmark."""
import copy
import datetime as dt
import sys
import unittest
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/"scripts"))
import compare_horse_bsp_models as C
from horse_market_benchmark_v1 import fingerprint
from import_betfair_daily_bsp import parse_file

START="2026-11-15T14:00:00+00:00"
def fixtures():
    base={"schema_version":1,"race_id":"100","racecourse":"Newcastle","startUTC":START,
          "generated_at_utc":"2026-11-15T10:00:00+00:00",
          "research_only":True,"model_validation":"UNVALIDATED","publication_gate":"BLOCKED",
          "challenge_eligible":0,
          "runners":[{"horse_id":"a","model_probability":.65},{"horse_id":"b","model_probability":.35}]}
    a=dict(base,model=C.BASE)
    b=copy.deepcopy(a);b["model"]=C.V3;b["runners"][0]["model_probability"]=.55;b["runners"][1]["model_probability"]=.45
    a["record_sha256"]=fingerprint(a);b["record_sha256"]=fingerprint(b)
    raw=("EVENT_ID,SELECTION_ID,SELECTION_NAME,EVENT_DT,BSP,WIN_LOSE\n"
         "E11,91,Horse A,2026-11-15T14:00:00+00:00,2.1,1\n"
         "E11,92,Horse B,2026-11-15T14:00:00+00:00,3.8,0\n").encode()
    mapping={"mapping_verified":True,"market_type":"WIN","event_id":"E11","race_id":"100",
             "startUTC":START,"runner_id_map":{"a":"91","b":"92"}}
    receipt=parse_file(raw,"official.csv",mapping)
    return a,b,receipt

class Tests(unittest.TestCase):
    def test_identical_race_v1_v3_vs_bsp(self):
        a,b,sp=fixtures()
        for method in ("proportional","power"):
            out=C.compare([a,b],[sp],method)
            self.assertEqual(out["scored_records"],2)
            self.assertEqual(out["paired_v1_v3"]["same_races"],1)
            self.assertEqual(out["models"][C.BASE]["count"],1)
            self.assertIsNone(out["clv"])
            self.assertEqual(out["recommendations"],[])
            self.assertEqual(out["publication_gate"],"BLOCKED")
            self.assertEqual(out["report_sha256"],fingerprint({k:v for k,v in out.items() if k!="report_sha256"}))
    def test_no_source_is_correct_zero(self):
        a,b,sp=fixtures()
        out=C.compare([a,b],[])
        self.assertEqual(out["scored_records"],0)
        self.assertEqual(out["paired_v1_v3"]["same_races"],0)
        self.assertEqual(out["exclusions"]["NO_MATCHING_VERIFIED_BSP"],2)
    def test_field_mismatch(self):
        a,b,sp=fixtures()
        b["runners"][1]["horse_id"]="different"
        b["record_sha256"]=fingerprint({k:v for k,v in b.items() if k!="record_sha256"})
        out=C.compare([a,b],[sp])
        self.assertEqual(out["scored_records"],1)
        self.assertEqual(out["paired_v1_v3"]["same_races"],0)
        self.assertEqual(out["exclusions"]["FIELD_IDENTITY_MISMATCH"],1)
    def test_tampered_bsp_rejected(self):
        a,b,sp=fixtures()
        sp["quotes"][0]["bsp"]=9.99
        out=C.compare([a,b],[sp])
        self.assertEqual(out["scored_records"],0)
        self.assertGreaterEqual(out["exclusions"]["BSP_HASH_MISMATCH"],1)
    def test_late_model_rejected(self):
        a,b,sp=fixtures()
        a["generated_at_utc"]="2026-11-15T13:59:00Z"
        a["record_sha256"]=fingerprint({k:v for k,v in a.items() if k!="record_sha256"})
        out=C.compare([a,b],[sp])
        self.assertEqual(out["scored_records"],1)
        self.assertEqual(out["exclusions"]["NOT_FROZEN_PRE_EVENT"],1)
    def test_result_single_winner(self):
        a,b,sp=fixtures()
        sp["quotes"][1]["win_lose"]=True
        sp["record_sha256"]=fingerprint({k:v for k,v in sp.items() if k!="record_sha256"})
        out=C.compare([a],[sp])
        self.assertEqual(out["scored_records"],0)
        self.assertGreaterEqual(out["exclusions"]["WINNER_AMBIGUOUS"],1)
    def test_no_duplicated_bsp_used(self):
        a,b,sp=fixtures()
        out=C.compare([a,b],[sp,copy.deepcopy(sp)])
        self.assertEqual(out["scored_records"],0)
        self.assertGreaterEqual(out["exclusions"]["DUPLICATE_BSP_RACE"],1)
    def test_no_duplicated_model_used(self):
        a,b,sp=fixtures()
        out=C.compare([a,a,b],[sp])
        self.assertEqual(out["scored_records"],2) # later duplicate excluded, not counted again
        self.assertEqual(out["exclusions"]["DUPLICATE_MODEL_RACE"],1)
    def test_unsafe_gate_rejected(self):
        a,b,sp=fixtures()
        sp["publication_gate"]="OPEN"
        sp["record_sha256"]=fingerprint({k:v for k,v in sp.items() if k!="record_sha256"})
        self.assertEqual(C.compare([a],[sp])["scored_records"],0)
    def test_no_staking_or_roi(self):
        a,b,sp=fixtures()
        out=C.compare([a,b],[sp])
        self.assertIsNone(out["estimated_edge"])
        self.assertIsNone(out["kelly"])
        self.assertIsNone(out["clv"])
    def test_unknown_market_method_fails(self):
        with self.assertRaises(ValueError):C.compare([],[],"shin")

if __name__=="__main__":unittest.main()
