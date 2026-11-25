import hashlib
import tempfile
import unittest
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor
from controller import Controller
from service import Service

class DurablePolicyTests(unittest.TestCase):
    def setUp(self):
        self.temp=tempfile.TemporaryDirectory()
        self.path=Path(self.temp.name)/"queue.db"
        self.rev="a"*40
        self.tokens={"operator":"1"*64,"hosted-qa":"2"*64,"observer":"3"*64}
        self.digests={k:hashlib.sha256(v.encode()).hexdigest() for k,v in self.tokens.items()}
    def tearDown(self):
        self.temp.cleanup()
    def service(self, **kwargs):
        return Service(Controller(self.path),self.digests,self.rev,clock=lambda:10,**kwargs)
    def test_revocation_survives_restart_and_quarantines(self):
        a=self.service()
        a.enqueue(self.tokens["operator"],"probe","cpu-probe")
        lease=a.claim(self.tokens["hosted-qa"])
        a.revoke(self.tokens["operator"],"hosted-qa")
        b=self.service()
        with self.assertRaises(ValueError):
            b.claim(self.tokens["hosted-qa"])
        with self.assertRaises(ValueError):
            b.submit(self.tokens["hosted-qa"],"probe",lease["token"],"b"*64)
        self.assertEqual(b.status(self.tokens["observer"])["jobs"][0]["state"],"QUARANTINED")
        self.assertEqual(b.status(self.tokens["observer"])["events"][-1]["action"],"WORKER_REVOKED")
    def test_policy_cannot_be_changed_on_restart(self):
        self.service()
        with self.assertRaises(ValueError):
            Service(Controller(self.path),self.digests,"b"*40)
        with self.assertRaises(ValueError):
            Service(Controller(self.path),self.digests|{"observer":"f"*64},self.rev)
    def test_observer_revocation_shared_across_instances(self):
        a,b=self.service(),self.service()
        a.revoke(self.tokens["operator"],"observer")
        with self.assertRaises(ValueError):
            b.status(self.tokens["observer"])
    def test_claim_revoke_race(self):
        a,b=self.service(),self.service()
        a.enqueue(self.tokens["operator"],"probe","cpu-probe")
        def claim():
            try:
                return a.claim(self.tokens["hosted-qa"])
            except ValueError:
                return None
        with ThreadPoolExecutor(max_workers=2) as pool:
            x=pool.submit(claim)
            y=pool.submit(b.revoke,self.tokens["operator"],"hosted-qa")
            lease=x.result()
            y.result()
        state=b.status(self.tokens["observer"])["jobs"][0]["state"]
        self.assertEqual(state,"QUARANTINED" if lease else "QUEUED")
        with self.assertRaises(ValueError):
            a.claim(self.tokens["hosted-qa"])
    def test_repeated_revocation_has_no_duplicate_job_event(self):
        a=self.service()
        a.enqueue(self.tokens["operator"],"probe","cpu-probe")
        a.claim(self.tokens["hosted-qa"])
        a.revoke(self.tokens["operator"],"hosted-qa")
        a.revoke(self.tokens["operator"],"hosted-qa")
        events=a.status(self.tokens["observer"])["events"]
        self.assertEqual(sum(e["action"]=="WORKER_REVOKED" for e in events),1)
