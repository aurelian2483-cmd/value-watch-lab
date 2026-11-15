"""Research-only public nonrunner chronology audit tests."""
import copy
import sys
import unittest
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/"scripts"))
from horse_market_benchmark_v1 import fingerprint
from audit_dundalk_public_nonrunners import audit

def forecast(names,at):
    o={"schema_version":1,"model":"FORM_PERCENTILE_SOFTMAX_RESEARCH_V1",
       "race_id":"1","racecourse":"Dundalk","startUTC":"2026-11-13T20:00:00+00:00",
       "generated_at_utc":at,"research_only":True,"model_validation":"UNVALIDATED",
       "publication_gate":"BLOCKED","challenge_eligible":0,
       "runners":[{"horse_id":str(i),"name":n,"model_probability":1/len(names)} for i,n in enumerate(names)]}
    o["record_sha256"]=fingerprint(o)
    return o
def evidence(at="2026-11-13T13:29:42+00:00"):
    return {"kind":"MANUALLY_RESEARCHED_PUBLIC_NONRUNNER_REFERENCES_V1",
            "research_only":True,"model_validation":"UNVALIDATED","publication_gate":"BLOCKED",
            "source_capture_attested":False,
            "races":[{"race_id":"1","startUTC":"2026-11-13T20:00:00+00:00",
                      "source":"https://www.ihrb.ie/non-runners/","source_kind":"REGULATOR_PUBLIC_LOG",
                      "nonrunners":[{"name":"Spicy Margarita","logged_at_utc":at}]}]}
class Audit(unittest.TestCase):
    def setUp(self):
        self.forecasts=[forecast(["Horse A","Spicy Margarita"],"2026-11-13T10:00:00Z"),
                        forecast(["Horse A"],"2026-11-13T14:00:00Z")]
        # one-runner vectors are invalid model forecasts: extend both with a valid
        # second shared competitor and recalculate immutable hashes
        self.forecasts=[forecast(["Horse A","Horse B","Spicy Margarita"],"2026-11-13T10:00:00Z"),
                        forecast(["Horse A","Horse B"],"2026-11-13T14:00:00Z")]
    def test_logged_within_transition(self):
        o=audit(self.forecasts,evidence())
        self.assertEqual(o["races"][0]["status"],"CONSISTENT_WITH_REPORTED_REGULATOR_TIMELINE")
        self.assertFalse(o["races"][0]["bsp_matching_eligible"])
        self.assertEqual(o["audit_sha256"],fingerprint({k:v for k,v in o.items() if k!="audit_sha256"}))
    def test_later_than_model_snapshot(self):
        out=audit(self.forecasts,evidence("2026-11-13T15:00:00Z"))
        self.assertEqual(out["races"][0]["status"],"INCONSISTENT_OR_INCOMPLETE_TIMELINE")
    def test_missing_log_requires_manual(self):
        out=audit(self.forecasts,evidence(None))
        self.assertEqual(out["races"][0]["status"],"FINAL_NONRUNNER_STATUS_ONLY_NO_LOGGED_TIMES")
    def test_wrong_nonrunner_name(self):
        d=evidence();d["races"][0]["nonrunners"][0]["name"]="Unknown Runner"
        self.assertEqual(audit(self.forecasts,d)["races"][0]["status"],"UNKNOWN_NONRUNNER_NAME")
    def test_duplicate_entries_rejected(self):
        d=evidence();d["races"][0]["nonrunners"].append(copy.deepcopy(d["races"][0]["nonrunners"][0]))
        with self.assertRaises(ValueError):audit(self.forecasts,d)
    def test_unsafe_gate_rejected(self):
        d=evidence();d["publication_gate"]="OPEN"
        with self.assertRaises(ValueError):audit(self.forecasts,d)
    def test_hash_tamper_discarded(self):
        records=copy.deepcopy(self.forecasts);records[1]["runners"][0]["name"]="Changed"
        out=audit(records,evidence())
        self.assertEqual(out["invalid_forecast_receipts"],1)
        self.assertEqual(out["races"][0]["status"],"ONLY_ONE_FORECAST")
    def test_off_time_not_future(self):
        with self.assertRaises(ValueError):audit(self.forecasts,evidence("2026-11-13T21:00:00Z"))

if __name__=="__main__":unittest.main()
