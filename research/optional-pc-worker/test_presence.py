import hashlib
import tempfile
import unittest
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor
from presence import Presence,ROLES

class PresenceTests(unittest.TestCase):
    def setUp(self):
        self.temp=tempfile.TemporaryDirectory()
        self.path=Path(self.temp.name)/"presence.db"
        self.tokens={r:str(i)*64 for i,r in enumerate(ROLES,1)}
        self.digests={k:hashlib.sha256(v.encode()).hexdigest() for k,v in self.tokens.items()}
        self.now=10
        self.p=self.registry()
    def tearDown(self):
        self.temp.cleanup()
    def registry(self):
        return Presence(self.path,self.digests,"a"*40,clock=lambda:self.now)
    def test_freshness_and_no_attestation(self):
        self.assertEqual(self.p.status(self.tokens["observer"])["state"],"NEVER_SEEN")
        self.p.heartbeat(self.tokens["pc-qa"],1,"AVAILABLE_REPORTED")
        s=self.p.status(self.tokens["observer"])
        self.assertEqual(s["state"],"REPORTED_RECENT")
        self.assertEqual(s["gpuReported"],"AVAILABLE_REPORTED")
        self.assertFalse(s["hardwareAttested"])
        self.assertFalse(s["gpuDispatchAuthorized"])
        self.now=130
        s=self.p.status(self.tokens["observer"])
        self.assertEqual(s["state"],"STALE")
        self.assertEqual(s["gpuReported"],"UNKNOWN")
    def test_replay_and_rate_limit_and_restart(self):
        self.p.heartbeat(self.tokens["pc-qa"],1,"UNKNOWN")
        q=self.registry()
        for seq in (1,2,3):
            with self.assertRaises(ValueError):
                q.heartbeat(self.tokens["pc-qa"],seq,"UNKNOWN")
        self.now=11
        q.heartbeat(self.tokens["pc-qa"],2,"UNAVAILABLE_REPORTED")
        self.assertEqual(q.status(self.tokens["observer"])["sequence"],2)
    def test_revocation_persists(self):
        self.p.heartbeat(self.tokens["pc-qa"],1,"UNKNOWN")
        self.p.revoke(self.tokens["operator"])
        q=self.registry()
        self.now=20
        with self.assertRaises(ValueError):
            q.heartbeat(self.tokens["pc-qa"],2,"AVAILABLE_REPORTED")
        self.assertEqual(q.status(self.tokens["observer"])["state"],"REVOKED")
    def test_role_isolation(self):
        for role in ("operator","hosted-qa","observer"):
            with self.assertRaises(ValueError):
                self.p.heartbeat(self.tokens[role],1,"UNKNOWN")
        with self.assertRaises(ValueError):
            self.p.status(self.tokens["pc-qa"])
        with self.assertRaises(ValueError):
            self.p.revoke(self.tokens["pc-qa"])
    def test_policy_and_clock_rollback(self):
        self.p.heartbeat(self.tokens["pc-qa"],1,"UNKNOWN")
        self.now=9
        self.assertEqual(self.p.status(self.tokens["observer"])["state"],"CLOCK_ROLLBACK")
        with self.assertRaises(ValueError):
            self.p.heartbeat(self.tokens["pc-qa"],2,"UNKNOWN")
        with self.assertRaises(ValueError):
            Presence(self.path,self.digests,"b"*40)
    def test_concurrent_replay_and_read_only(self):
        a,b=self.p,self.registry()
        def send(registry):
            try:
                return registry.heartbeat(self.tokens["pc-qa"],1,"UNKNOWN")["accepted"]
            except ValueError:
                return False
        with ThreadPoolExecutor(max_workers=2) as pool:
            self.assertEqual(sum(pool.map(send,(a,b))),1)
        before=self.path.read_bytes()
        self.assertEqual(a.status(self.tokens["observer"])["sequence"],1)
        self.assertEqual(before,self.path.read_bytes())
    def test_invalid_reports(self):
        for seq,gpu in [(True,"UNKNOWN"),(0,"UNKNOWN"),(1,"GPU VERIFIED"),(1,{}),(2,"UNKNOWN")]:
            with self.assertRaises(ValueError):
                self.p.heartbeat(self.tokens["pc-qa"],seq,gpu)
        self.assertEqual(self.p.status(self.tokens["observer"])["sequence"],0)
