import copy
import unittest
from supervisor import supervise
from benchmark_contract import verify_benchmark
from acceptance_receipt import make_receipt,verify_receipt

class AcceptanceTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.smoke=supervise("cpu")
        cls.bench=supervise("cpu",workload="benchmark")
    def test_supervised_repeated_benchmark(self):
        self.assertEqual(self.bench["status"],"PASS")
        self.assertTrue(verify_benchmark(self.bench["report"],"cpu"))
    def test_reject_invalid_report(self):
        for field,value in (("fixtureSha256","a"*64),("medianSeconds",-1),("checks",[]),("size",99)):
            report=copy.deepcopy(self.bench["report"])
            report["results"][0][field]=value
            self.assertFalse(verify_benchmark(report,"cpu"))
        self.assertFalse(verify_benchmark(self.bench["report"],"gpu"))
    def test_receipt_integrity_and_scope(self):
        r=make_receipt("cpu","a"*40,self.smoke,self.bench)
        self.assertEqual(r["status"],"LOCAL_SYNTHETIC_CHECKS_PASSED")
        self.assertTrue(verify_receipt(r))
        self.assertFalse(r["hardwareIndependentlyVerified"])
        self.assertFalse(verify_receipt({**r,"executionAuthorized":True}))
        self.assertEqual(make_receipt("gpu","a"*40,self.smoke,self.bench)["status"],"LOCAL_SYNTHETIC_CHECKS_FAILED")
    def test_unknown_workload(self):
        with self.assertRaises(ValueError):
            supervise("cpu",workload="external")
