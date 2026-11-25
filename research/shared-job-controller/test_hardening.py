import hashlib
import tempfile
import unittest
from pathlib import Path
from controller import Controller, MAX_JOBS
from service import Service

class HardeningTests(unittest.TestCase):
    def setUp(self):
        self.temp=tempfile.TemporaryDirectory()
        self.path=Path(self.temp.name)/"queue.db"
        self.c=Controller(self.path)
        self.rev="a"*40
        self.now=1
        self.tokens={"operator":"1"*64,"hosted-qa":"2"*64,"observer":"3"*64}
        self.digests={k:hashlib.sha256(v.encode()).hexdigest() for k,v in self.tokens.items()}
        self.s=Service(self.c,self.digests,self.rev,clock=lambda:self.now)
    def tearDown(self):
        self.temp.cleanup()
    def test_roles_and_pinned_revision(self):
        with self.assertRaises(ValueError):
            self.s.enqueue(self.tokens["observer"],"probe","cpu-probe")
        with self.assertRaises(ValueError):
            self.s.claim(self.tokens["operator"])
        self.assertEqual(self.s.enqueue(self.tokens["operator"],"probe","cpu-probe"),"QUEUED")
        lease=self.s.claim(self.tokens["hosted-qa"])
        self.assertEqual(lease["revision"],self.rev)
        self.assertEqual(lease["expires"],241)
        self.assertTrue(self.s.submit(self.tokens["hosted-qa"],"probe",lease["token"],"a"*64))
    def test_status_does_not_mutate_or_reconcile(self):
        self.s.enqueue(self.tokens["operator"],"probe","cpu-probe")
        self.s.claim(self.tokens["hosted-qa"])
        self.now=300
        before=self.path.read_bytes()
        status=self.s.status(self.tokens["observer"])
        self.assertEqual(status["jobs"][0]["state"],"LEASED")
        self.assertEqual(status["freshness"],"STORED_STATE_ONLY")
        self.assertEqual(before,self.path.read_bytes())
        self.assertEqual(self.s.reconcile(self.tokens["operator"])["jobs"][0]["state"],"QUARANTINED")
    def test_revocation_and_bad_secret(self):
        with self.assertRaises(ValueError):
            self.s.claim("f"*64)
        self.s.revoke(self.tokens["operator"],"hosted-qa")
        with self.assertRaises(ValueError):
            self.s.claim(self.tokens["hosted-qa"])
        with self.assertRaises(ValueError):
            self.s.revoke(self.tokens["observer"],"observer")
    def test_wrong_stored_revision(self):
        self.c.enqueue("other","b"*40,"cpu-probe",1)
        with self.assertRaises(ValueError):
            self.s.claim(self.tokens["hosted-qa"])
    def test_duplicate_receipt_across_jobs(self):
        for job,kind in [("probe","cpu-probe"),("local","local-qa")]:
            self.s.enqueue(self.tokens["operator"],job,kind)
        a=self.s.claim(self.tokens["hosted-qa"])
        self.assertTrue(self.s.submit(self.tokens["hosted-qa"],a["id"],a["token"],"c"*64))
        b=self.s.claim(self.tokens["hosted-qa"])
        self.assertFalse(self.s.submit(self.tokens["hosted-qa"],b["id"],b["token"],"c"*64))
        self.assertTrue(self.s.submit(self.tokens["hosted-qa"],b["id"],b["token"],"d"*64))
    def test_capacity_and_invalid_clock(self):
        for i in range(MAX_JOBS):
            self.c.enqueue("job-"+str(i),format(i,"040x"),"cpu-probe",1)
        with self.assertRaises(ValueError):
            self.c.enqueue("extra","f"*40,"cpu-probe",1)
        with self.assertRaises(ValueError):
            self.c.snapshot(2**53)
        self.assertEqual(len(self.c.read_only_status()["jobs"]),MAX_JOBS)
    def test_configuration_fail_closed(self):
        with self.assertRaises(ValueError):
            Service(self.c,{k:"a"*64 for k in self.tokens},self.rev)
        with self.assertRaises(ValueError):
            Service(self.c,self.digests,"main")
    def test_expired_idempotent_enqueue(self):
        self.c.enqueue("probe",self.rev,"cpu-probe",1)
        self.c.claim("hosted-qa",1,ttl=2)
        self.assertEqual(self.c.enqueue("probe",self.rev,"cpu-probe",3),"QUARANTINED")
