"""Website status contract must not leak betting recommendation fields."""
import copy
import sys
import unittest
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/"scripts"))
from build_horse_evidence_dashboard import build
from export_horse_research_site_status import make_web_summary
from horse_market_benchmark_v1 import fingerprint

def sample():
    return build([],[],[],"2026-11-15T14:00:00+00:00")

class WebStatus(unittest.TestCase):
    def test_valid_readonly_metrics(self):
        out=make_web_summary(sample())
        self.assertEqual(out["publication_gate"],"BLOCKED")
        self.assertFalse(out["model_recommendations_enabled"])
        self.assertFalse(out["betting_eligible"])
        self.assertEqual(out["receipt_sha256"],fingerprint({k:v for k,v in out.items() if k!="receipt_sha256"}))
    def test_no_unsafe_or_betting_fields(self):
        report=sample()
        report["selections"]=[{"horse":"winner","odds":4,"expected_value":7,"stake":50}]
        report["report_sha256"]=fingerprint({k:v for k,v in report.items() if k!="report_sha256"})
        out=make_web_summary(report)
        data=str(out).lower()
        for term in ("winner","stake","expected_value","selection","profit","odds"):
            self.assertNotIn(term,data)
    def test_tamper_fails(self):
        report=sample()
        report["coverage"]["v3_frozen_forecasts"]=42
        with self.assertRaises(ValueError):make_web_summary(report)
    def test_open_publication_fails(self):
        report=sample()
        report["publication_gate"]="OPEN"
        report["report_sha256"]=fingerprint({k:v for k,v in report.items() if k!="report_sha256"})
        with self.assertRaises(ValueError):make_web_summary(report)
    def test_negative_metric_fails(self):
        report=sample()
        report["coverage"]["v1_frozen_forecasts"]=-1
        report["report_sha256"]=fingerprint({k:v for k,v in report.items() if k!="report_sha256"})
        with self.assertRaises(ValueError):make_web_summary(report)
    def test_incorrect_type_fails(self):
        report=sample()
        report["coverage"]["v1_frozen_forecasts"]=True
        report["report_sha256"]=fingerprint({k:v for k,v in report.items() if k!="report_sha256"})
        with self.assertRaises(ValueError):make_web_summary(report)
if __name__=="__main__":unittest.main()
