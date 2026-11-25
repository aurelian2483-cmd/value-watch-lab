import tempfile
import unittest
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor
from controller import Controller

class ControllerTests(unittest.TestCase):
    def setUp(self):
        self.temp=tempfile.TemporaryDirectory()
        self.path=Path(self.temp.name)/"queue.db"
        self.c=Controller(self.path)
        self.rev="a"*40
    def tearDown(self):
        self.temp.cleanup()
    def test_restart_and_idempotence(self):
        self.assertEqual(self.c.enqueue("probe",self.rev,"cpu-probe",1),"QUEUED")
        self.assertEqual(Controller(self.path).enqueue("probe",self.rev,"cpu-probe",1),"QUEUED")
        with self.assertRaises(ValueError):
            self.c.enqueue("other",self.rev,"cpu-probe",1)
        self.assertEqual(len(self.c.snapshot(1)["events"]),1)
    def test_concurrent_claim(self):
        self.c.enqueue("probe",self.rev,"cpu-probe",1)
        self.c.enqueue("local",self.rev,"local-qa",1)
        def claim(_):
            return Controller(self.path).claim("hosted-qa",2)
        with ThreadPoolExecutor(max_workers=8) as pool:
            leases=list(pool.map(claim,range(8)))
        self.assertEqual(sum(x is not None for x in leases),1)
    def test_receipt_not_acceptance(self):
        self.c.enqueue("probe",self.rev,"cpu-probe",1)
        lease=self.c.claim("hosted-qa",2)
        self.assertFalse(self.c.submit("probe","hosted-qa","0"*64,"b"*64,3))
        self.assertTrue(Controller(self.path).submit("probe","hosted-qa",lease["token"],"b"*64,3))
        self.assertFalse(self.c.submit("probe","hosted-qa",lease["token"],"b"*64,3))
        snap=self.c.snapshot(4)
        self.assertEqual(snap["jobs"][0]["state"],"RECEIPT_PENDING_REVIEW")
        self.assertNotIn(lease["token"],str(snap))
        self.assertFalse(snap["productionDispatchAuthorized"])
    def test_expiry_no_retry(self):
        self.c.enqueue("probe",self.rev,"cpu-probe",1)
        lease=self.c.claim("hosted-qa",2,ttl=3)
        self.assertFalse(self.c.submit("probe","hosted-qa",lease["token"],"b"*64,5))
        self.assertIsNone(self.c.claim("hosted-qa",6))
        self.assertEqual(self.c.snapshot(6)["jobs"][0]["state"],"QUARANTINED")
        with self.assertRaises(ValueError):
            self.c.snapshot(4)
    def test_gpu_and_unknown_jobs_blocked(self):
        self.assertEqual(self.c.enqueue("gpu",self.rev,"gpu-qa",1),"BLOCKED_GPU")
        with self.assertRaises(ValueError):
            self.c.claim("pc-qa",2)
        with self.assertRaises(ValueError):
            self.c.enqueue("command",self.rev,"arbitrary",2)
        self.assertIsNone(self.c.claim("hosted-qa",2))
    def test_conflicting_id(self):
        self.c.enqueue("probe",self.rev,"cpu-probe",1)
        with self.assertRaises(ValueError):
            self.c.enqueue("probe","b"*40,"cpu-probe",2)
        self.assertEqual(self.c.snapshot(2)["jobs"][0]["revision"],self.rev)

if __name__=="__main__":
    unittest.main()
