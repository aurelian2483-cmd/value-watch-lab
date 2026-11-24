import unittest
from unittest.mock import patch
from benchmark import cases,assess,measure,run,REPEATS,WARMUPS
from compute import cpu_matmul

class BenchmarkTests(unittest.TestCase):
    def test_exact_oracles(self):
        for _,_,a,b,e in cases():
            self.assertEqual(assess(cpu_matmul(a,b),e,"float64")["status"],"PASS")
    def test_repeated_cpu_measurements(self):
        r=run("cpu")
        self.assertEqual(r["status"],"PASS")
        self.assertEqual(len(r["results"]),4)
        self.assertEqual(r["gpu"]["status"],"NOT_REQUESTED")
        for row in r["results"]:
            self.assertEqual(len(row["samplesSeconds"]),REPEATS)
            self.assertEqual(len(row["checks"]),REPEATS+WARMUPS)
            self.assertLessEqual(row["minSeconds"],row["medianSeconds"])
            self.assertLessEqual(row["medianSeconds"],row["maxSeconds"])
    def test_failed_warmup_preserved(self):
        outputs=iter([[[2.0]]]+[[[1.0]]]*REPEATS)
        r=measure(lambda:next(outputs),[[1.0]],"float64")
        self.assertEqual(r["status"],"FAIL")
        self.assertEqual(r["checks"][0]["status"],"FAIL")
    def test_invalid_numeric_results(self):
        for value in (float("nan"),float("inf"),True,2.0):
            self.assertEqual(assess([[value]],[[1.0]],"float64")["status"],"FAIL")
        self.assertEqual(assess([],[[1.0]],"float32")["status"],"FAIL")
    def test_gpu_unavailable_is_not_cpu_success(self):
        with patch.dict("sys.modules",{"cupy":None}):
            r=run("gpu")
        self.assertEqual(r["status"],"FAIL")
        self.assertEqual(r["gpu"]["status"],"BACKEND_UNAVAILABLE")
        self.assertEqual(len(r["results"]),4)
    def test_no_arbitrary_workloads(self):
        with self.assertRaises(ValueError):
            run("external")
