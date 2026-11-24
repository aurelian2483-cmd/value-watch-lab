import copy
import json
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch
from acceptance_receipt import make_receipt
from supervisor import supervise
from status import read_status,render,MAX_RECEIPT_BYTES

REV="a"*40
class StatusTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.receipt=make_receipt("cpu",REV,supervise("cpu"),supervise("cpu",workload="benchmark"))
    def test_read_only_cpu_status(self):
        with tempfile.TemporaryDirectory() as folder:
            root=Path(folder)
            p=root/"local-cpu-receipt.json"
            p.write_text(json.dumps(self.receipt),encoding="utf-8")
            before=p.read_bytes()
            with patch("acceptance_receipt.supervise",side_effect=AssertionError("unexpected compute")):
                result=read_status(root,REV)
            self.assertEqual(result["cpu"]["status"],"RECORDED_LOCAL_PASS")
            self.assertEqual(result["gpu"]["status"],"NOT_SUPPLIED")
            self.assertIsNone(result["gpu"]["benchmarkRows"])
            self.assertFalse(result["hardwareIndependentlyVerified"])
            self.assertEqual(result["cpu"]["benchmarkRows"],4)
            self.assertEqual(p.read_bytes(),before)
            self.assertEqual(list(root.iterdir()),[p])
            self.assertIn("PUBLICATION BLOCKED",render(result))
    def test_cpu_receipt_cannot_pass_gpu(self):
        with tempfile.TemporaryDirectory() as folder:
            p=Path(folder)/"local-gpu-receipt.json"
            p.write_text(json.dumps(self.receipt),encoding="utf-8")
            self.assertEqual(read_status(folder,REV)["gpu"]["status"],"MODE_OR_REVISION_MISMATCH")
    def test_invalid_receipts(self):
        with tempfile.TemporaryDirectory() as folder:
            p=Path(folder)/"local-cpu-receipt.json"
            for data in (b"bad",b'{"mode":"cpu","mode":"gpu"}',b" "*(MAX_RECEIPT_BYTES+1)):
                p.write_bytes(data)
                self.assertNotEqual(read_status(folder,REV)["cpu"]["status"],"RECORDED_LOCAL_PASS")
            altered=copy.deepcopy(self.receipt)
            altered["executionAuthorized"]=True
            p.write_text(json.dumps(altered),encoding="utf-8")
            self.assertEqual(read_status(folder,REV)["cpu"]["status"],"INVALID_RECEIPT")
            p.write_text(json.dumps(self.receipt),encoding="utf-8")
            self.assertEqual(read_status(folder,"b"*40)["cpu"]["status"],"MODE_OR_REVISION_MISMATCH")
    def test_missing_evidence_and_html_escaping(self):
        with tempfile.TemporaryDirectory() as folder:
            r=read_status(folder,REV)
            self.assertEqual(r["status"],"CPU_EVIDENCE_INCOMPLETE")
            self.assertIsNone(r["cpu"]["passedWorkloads"])
            r["gpu"]["deviceName"]="<script>alert(1)</script>"
            self.assertNotIn("<script>",render(r))
            self.assertIn("&lt;script&gt;",render(r))
