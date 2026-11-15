"""Tests for isolated, race-level publisher-market benchmark. No network required."""
import datetime as dt
import math
import sys
import unittest
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/"scripts"))
import horse_market_benchmark_v1 as B

def fixture():
    start="2026-11-15T15:00:00+00:00"
    model={"race_id":"100","startUTC":start,"racecourse":"Newcastle","model":"FORM_PERCENTILE_SOFTMAX_RESEARCH_V1",
           "generated_at_utc":"2026-11-15T11:00:00+00:00",
           "runners":[{"horse_id":"A","model_probability":.6},{"horse_id":"B","model_probability":.4}],
           "research_only":True,"publication_gate":"BLOCKED","model_validation":"UNVALIDATED"}
    model["record_sha256"]=B.fingerprint(model)
    market={"schema_version":1,"kind":"HORSE_SOURCE_MARKET_CAPTURE",
            "race_id":"100","racecourse":"Newcastle","startUTC":start,
            "observed_at_utc":"2026-11-15T10:55:00+00:00",
            "bookmaker":"Sky Bet","publisher":"Sporting Life","bookmaker_race_id":"bm100",
            "bookmaker_market_id":"m100","active_runner_ids":["A","B"],
            "quotes":[{"horse_id":"A","decimal":1.8},{"horse_id":"B","decimal":2.2}],
            "source":"https://www.sportinglife.com","source_sha256":"a"*64,
            "executable_verified":False,"research_only":True,"model_validation":"UNVALIDATED",
            "publication_gate":"BLOCKED","challenge_eligible":0}
    market["record_sha256"]=B.fingerprint(market)
    result={"record_sha256":model["record_sha256"],"race_id":"100","startUTC":start,
            "model":model["model"],"winner_horse_id":"A",
            "scored_at_utc":"2026-11-15T16:00:00+00:00",
            "source_receipt":{"observed_at_utc":"2026-11-15T15:40:00+00:00","sha256":"b"*64},
            "verification":"SINGLE_SOURCE_PROVISIONAL","independently_verified":False,
            "publication_gate":"BLOCKED","challenge_eligible":0}
    return model,market,result

class TestMarketBenchmark(unittest.TestCase):
    def test_demargin_proportional_and_power(self):
        odds={"A":1.8,"B":2.2}
        for method in ("proportional","power"):
            row=B.demargin(odds,method)
            self.assertAlmostEqual(sum(row["probabilities"].values()),1,places=10)
            self.assertGreater(row["raw_overround"],1)
            self.assertGreater(row["probabilities"]["A"],row["probabilities"]["B"])
    def test_true_probabilities_and_brier(self):
        s=B.proper({"A":.6,"B":.4},"A")
        self.assertAlmostEqual(s["log_loss"],-math.log(.6))
        self.assertAlmostEqual(s["multiclass_brier"],.32)
    def test_one_paired_race(self):
        model,market,result=fixture()
        output=B.evaluate([model],[market],[result])
        self.assertEqual(output["eligible_rows"],1)
        self.assertEqual(output["rows"][0]["winner_horse_id"],"A")
        self.assertIsNone(output["clv"])
        self.assertIsNone(output["expected_value"])
        self.assertEqual(output["publication_gate"],"BLOCKED")
        self.assertEqual(output["price_tier"],"UNVERIFIED_PUBLISHER_OBSERVATIONS_NOT_BSP")
        self.assertEqual(output["report_sha256"],B.fingerprint({k:v for k,v in output.items() if k!="report_sha256"}))
    def test_future_market_quote_excluded(self):
        model,market,result=fixture()
        market["observed_at_utc"]="2026-11-15T11:05:00+00:00"
        market["record_sha256"]=B.fingerprint({k:v for k,v in market.items() if k!="record_sha256"})
        o=B.evaluate([model],[market],[result])
        self.assertEqual(o["eligible_rows"],0)
        self.assertEqual(o["exclusions"]["NO_MATCHING_PRICE_AT_FORECAST_TIME"],1)
    def test_wrong_runner_field_excluded(self):
        model,market,result=fixture()
        market["quotes"][0]["horse_id"]="WRONG"
        market["record_sha256"]=B.fingerprint({k:v for k,v in market.items() if k!="record_sha256"})
        o=B.evaluate([model],[market],[result])
        self.assertEqual(o["eligible_rows"],0)
    def test_corrupted_price_record_excluded(self):
        model,market,result=fixture()
        market["quotes"][0]["decimal"]=7.0
        o=B.evaluate([model],[market],[result])
        self.assertEqual(o["eligible_rows"],0)
    def test_corrupt_model_rejected(self):
        model,market,result=fixture()
        model["runners"][0]["model_probability"]=.8
        o=B.evaluate([model],[market],[result])
        self.assertEqual(o["eligible_rows"],0)
        self.assertEqual(o["exclusions"]["INVALID_OR_UNMATCHED_FORECAST"],1)
    def test_result_before_race_rejected(self):
        model,market,result=fixture()
        result["source_receipt"]["observed_at_utc"]="2026-11-15T14:00:00+00:00"
        self.assertEqual(B.evaluate([model],[market],[result])["eligible_rows"],0)
    def test_no_pretend_bsp(self):
        model,market,result=fixture()
        market["bookmaker"]="Betfair"
        market["record_sha256"]=B.fingerprint({k:v for k,v in market.items() if k!="record_sha256"})
        o=B.evaluate([model],[market],[result])
        self.assertEqual(o["eligible_rows"],0)
    def test_zero_evidence_is_valid_output(self):
        result=B.evaluate([],[],[])
        self.assertEqual(result["eligible_rows"],0)
        self.assertEqual(result["models"],{})
        self.assertIsNone(result["sharp_closing_benchmark"])
    def test_invalid_margin_inputs_rejected(self):
        with self.assertRaises(ValueError):B.demargin({"A":2,"B":2},"shin")
        with self.assertRaises(ValueError):B.demargin({"A":2,"B":2,"C":1},"power")
    def test_offset_aware_dates(self):
        with self.assertRaises(ValueError):B.when("2026-11-15T10:00:00")

if __name__=="__main__":unittest.main()
