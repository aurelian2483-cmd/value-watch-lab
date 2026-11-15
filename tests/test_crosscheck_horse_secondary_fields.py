"""Strict archived secondary-result field reconciliation, with no automatic releases."""
import sys
import unittest
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/"scripts"))
from horse_market_benchmark_v1 import fingerprint
from crosscheck_horse_secondary_fields import compare

def forecast(horses,stamp):
    f={"schema_version":1,"model":"FORM_PERCENTILE_SOFTMAX_RESEARCH_V1",
       "race_id":"1","racecourse":"Newcastle","startUTC":"2026-11-03T17:00:00+00:00",
       "generated_at_utc":stamp,"research_only":True,"model_validation":"UNVALIDATED",
       "publication_gate":"BLOCKED","challenge_eligible":0,
       "runners":[{"horse_id":str(i),"name":name,"model_probability":1/len(horses)}
                  for i,name in enumerate(horses)]}
    f["record_sha256"]=fingerprint(f);return f

def result(starters,nonrunners=()):
    rows=[{"horse":name,"position":str(i+1)} for i,name in enumerate(starters)]
    rows.extend({"horse":name,"position":"NR"} for name in nonrunners)
    return {"row":{"course":"Newcastle","off_dt":"2026-11-03T17:00:00+00:00",
                   "runners":rows},"receipt":{"observed_at_utc":"2026-11-03T18:00:00+00:00"},
            "source_sha256":"a"*64}

class SecondaryFields(unittest.TestCase):
    def setUp(self):
        self.forecasts=[forecast(["A","B","C"],"2026-11-03T10:00:00Z"),
                        forecast(["A","B"],"2026-11-03T11:00:00Z")]
    def test_matching_later_field_does_not_release(self):
        r=compare(self.forecasts,[result(["A","B"],["C"])])
        self.assertEqual(r["secondary_result_crosscheck"]["classification_counts"],
                         {"ONE_FORECAST_FIELD_MATCHES_SECONDARY_FINAL_STARTERS":1})
        x=r["races"][0]
        self.assertFalse(x["bsp_matching_eligible"])
        self.assertEqual(x["secondary_evidence"]["final_nonrunner_names"],["c"])
        self.assertEqual(r["audit_sha256"],fingerprint({k:v for k,v in r.items() if k!="audit_sha256"}))
    def test_unavailable_results(self):
        r=compare(self.forecasts,[])
        self.assertEqual(r["races"][0]["secondary_check_status"],"SECONDARY_RESULT_NOT_IN_ARCHIVE")
    def test_two_distinct_results_ambiguous(self):
        r=compare(self.forecasts,[result(["A","B"]),result(["A","C"])])
        self.assertEqual(r["races"][0]["secondary_check_status"],"SECONDARY_RESULT_AMBIGUOUS_OR_REVISED")
    def test_unmatched_field(self):
        r=compare(self.forecasts,[result(["A","D"])])
        self.assertEqual(r["races"][0]["secondary_check_status"],"NO_FORECAST_FIELD_MATCHES_SECONDARY_FINAL_STARTERS")
    def test_rejected_ambiguous_names(self):
        r=compare(self.forecasts,[result(["A","A"])])
        self.assertEqual(r["races"][0]["secondary_check_status"],"SECONDARY_FIELD_MALFORMED")
    def test_a_different_time_cannot_match(self):
        other=result(["A","B"]);other["row"]["off_dt"]="2026-11-03T18:00:00Z"
        r=compare(self.forecasts,[other])
        self.assertEqual(r["races"][0]["secondary_check_status"],"SECONDARY_RESULT_NOT_IN_ARCHIVE")
    def test_no_disputed_races(self):
        r=compare([self.forecasts[0]],[result(["A","B","C"])])
        self.assertEqual(r["unique_races_with_conflicting_fields"],0)

if __name__=="__main__":unittest.main()
