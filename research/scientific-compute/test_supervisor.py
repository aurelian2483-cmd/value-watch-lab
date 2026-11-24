import copy
import json
import subprocess
import unittest
from unittest.mock import patch
from compute import run
from supervisor import supervise,verify_report,LIMIT_BYTES

class SupervisorTests(unittest.TestCase):
    def test_real_cpu_child(self):
        r=supervise("cpu")
        self.assertEqual(r["status"],"PASS")
        self.assertEqual(r["report"]["gpu"]["status"],"NOT_REQUESTED")
        self.assertFalse(r["validationAuthorized"])
    def test_deadline_failure(self):
        with patch("supervisor.subprocess.run",side_effect=subprocess.TimeoutExpired("fixed",1)):
            r=supervise("cpu",1)
        self.assertEqual(r["reason"],"TIMEOUT")
        self.assertEqual(r["status"],"FAIL")
    def test_malformed_output(self):
        for data in (b"not-json",b" "*(LIMIT_BYTES+1)):
            with patch("supervisor.subprocess.run",return_value=subprocess.CompletedProcess([],0,data,b"")):
                self.assertEqual(supervise("cpu")["status"],"FAIL")
    def test_wrong_evidence_rejected(self):
        report=run("cpu")
        self.assertTrue(verify_report(report,"cpu"))
        for key,value in (("status","FAIL"),("publicationGate","OPEN"),("cpu",[])):
            altered=copy.deepcopy(report)
            altered[key]=value
            self.assertFalse(verify_report(altered,"cpu"))
        self.assertFalse(verify_report(report,"gpu"))
    def test_nonzero_exit_cannot_pass(self):
        with patch("supervisor.subprocess.run",return_value=subprocess.CompletedProcess([],1,json.dumps(run("cpu")).encode(),b"")):
            self.assertEqual(supervise("cpu")["status"],"FAIL")
    def test_invalid_parameters(self):
        for timeout in (0,121,float("nan"),True):
            with self.assertRaises(ValueError):
                supervise("cpu",timeout)
        with self.assertRaises(ValueError):
            supervise("arbitrary")
