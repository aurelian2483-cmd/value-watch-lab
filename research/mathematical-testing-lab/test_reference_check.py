import unittest
import copy
import json
import subprocess
from pathlib import Path
from reference_check import check_report

HERE = Path(__file__).resolve().parent
class ReferenceTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.report = json.loads(subprocess.check_output(["node",str(HERE/"suite.mjs"),"f4eed5998c89dd884de98ff3875bde04addb9c2a"], text=True))

    def test_independent_analytic_references(self):
        self.assertEqual(check_report(self.report)["counts"], {"total":5,"passed":5,"failed":0})

    def test_detect_inaccurate_output_despite_reported_pass(self):
        report = copy.deepcopy(self.report)
        row = next(r for r in report["results"] if r["id"]=="quadratic-trapezoid")
        # A value within the integral tolerance is still wrong for this particular discrete rule.
        row["observed"] = row["expected"]
        row["absoluteError"] = 0
        self.assertEqual(check_report(report)["counts"]["failed"],1)

    def test_reject_changed_tolerance_or_missing_fixture(self):
        report = copy.deepcopy(self.report)
        report["results"][0]["tolerance"] = 1
        with self.assertRaises(ValueError):
            check_report(report)
        report = copy.deepcopy(self.report)
        report["results"].pop()
        with self.assertRaises(ValueError):
            check_report(report)

    def test_reject_promotion_flags_and_bad_counts(self):
        for patch in ({"validationAuthorized":True},{"counts":{"total":5,"passed":0,"failed":5}}):
            with self.assertRaises(ValueError):
                check_report({**self.report,**patch})
