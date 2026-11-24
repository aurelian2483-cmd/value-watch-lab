import unittest
from unittest.mock import patch
from compute import fixture,cpu_matmul,check_result,run,SHAPES

class ComputeTests(unittest.TestCase):
    def test_exact_known_answers(self):
        for n in SHAPES:
            a,b,e=fixture(n)
            self.assertEqual(cpu_matmul(a,b),e)
    def test_invalid_shapes(self):
        for n in (0,129,True,8.0):
            with self.assertRaises(ValueError):
                fixture(n)
    def test_nonfinite_wrong_and_missing_results(self):
        self.assertEqual(check_result([[float("nan")]],[[1]])["status"],"FAIL")
        self.assertEqual(check_result([[2]],[[1]])["status"],"FAIL")
        self.assertEqual(check_result([],[[1]])["status"],"FAIL")
    def test_cpu_does_not_probe_gpu(self):
        with patch("compute.gpu_suite",side_effect=AssertionError("unexpected probe")):
            r=run("cpu")
        self.assertEqual(r["status"],"PASS")
        self.assertEqual(r["gpu"]["status"],"NOT_REQUESTED")
        self.assertFalse(r["validationAuthorized"])
    def test_explicit_gpu_failure_is_not_cpu_fallback(self):
        with patch("compute.gpu_suite",return_value={"status":"BACKEND_UNAVAILABLE","deviceCount":None,"results":[]}):
            r=run("gpu")
        self.assertEqual(r["status"],"FAIL")
        self.assertTrue(all(x["status"]=="PASS" for x in r["cpu"]))
    def test_reject_arbitrary_mode(self):
        with self.assertRaises(ValueError):
            run("arbitrary")
