import copy
import unittest
from supervisor import supervise,verify_report
from benchmark_contract import verify_benchmark
from acceptance_receipt import make_receipt,verify_receipt

class AuditTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.smoke=supervise("cpu")
        cls.bench=supervise("cpu",workload="benchmark")
    def test_applied_policy_is_recorded(self):
        self.assertEqual(self.smoke["status"],"PASS")
        self.assertEqual(self.smoke["appliedResourcePolicy"],self.smoke["report"]["appliedResourcePolicy"])
        if self.smoke["resourcePolicy"]["status"]=="LINUX_RLIMIT_REQUESTED":
            self.assertEqual(self.smoke["appliedResourcePolicy"]["status"],"LINUX_RLIMIT_APPLIED")
    def test_smoke_fixture_binding(self):
        r=copy.deepcopy(self.smoke["report"])
        r["cpu"][0]["fixtureSha256"]="0"*64
        self.assertFalse(verify_report(r,"cpu"))
    def test_contradictory_error(self):
        r=copy.deepcopy(self.bench["report"])
        r["results"][0]["checks"][0]["maxAbsoluteError"]=100
        self.assertFalse(verify_benchmark(r,"cpu"))
    def test_receipt_type_tamper(self):
        receipt=make_receipt("cpu","a"*40,self.smoke,self.bench)
        self.assertTrue(verify_receipt(receipt))
        receipt["hardwareIndependentlyVerified"]=0
        self.assertFalse(verify_receipt(receipt))
