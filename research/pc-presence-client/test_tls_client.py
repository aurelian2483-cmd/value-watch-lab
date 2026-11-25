import hashlib
import subprocess
import tempfile
import threading
import unittest
from pathlib import Path
from controller import Controller
from service import Service
from transport import LoopbackServer,WorkerClient
from presence import Presence,ROLES
from client import PresenceClient

class ClientTLS(unittest.TestCase):
    def setUp(self):
        self.temp=tempfile.TemporaryDirectory()
        self.root=Path(self.temp.name)
        self.cert=self.root/"cert.pem"
        self.key=self.root/"key.pem"
        subprocess.run(["openssl","req","-x509","-newkey","rsa:2048","-nodes","-keyout",str(self.key),"-out",str(self.cert),"-days","1","-subj","/CN=localhost","-addext","subjectAltName=IP:127.0.0.1"],check=True,capture_output=True,timeout=20)
        self.tokens={r:str(i)*64 for i,r in enumerate(ROLES,1)}
        self.digests={k:hashlib.sha256(v.encode()).hexdigest() for k,v in self.tokens.items()}
        self.now=10
        self.rev="a"*40
        self.s=Service(Controller(self.root/"queue.db"),{k:v for k,v in self.digests.items() if k!="pc-qa"},self.rev,clock=lambda:self.now)
        self.p=Presence(self.root/"presence.db",self.digests,self.rev,clock=lambda:self.now)
        self.server=LoopbackServer(self.s,self.cert,self.key,presence=self.p)
        self.thread=threading.Thread(target=self.server.serve_forever,kwargs={"poll_interval":0.02},daemon=True)
        self.thread.start()
    def tearDown(self):
        self.server.shutdown()
        self.server.server_close()
        self.thread.join(timeout=5)
        self.temp.cleanup()
    def client(self,role="pc-qa",revision=None):
        return PresenceClient("127.0.0.1",self.server.server_port,revision or self.rev,self.tokens[role],cafile=str(self.cert))
    def test_restart_and_lost_ack(self):
        a=self.client()
        self.assertEqual(a.cursor(),0)
        # Simulate the server accepting a report whose acknowledgement is not retained.
        a.request("/qa/pc-heartbeat",{"sequence":1,"gpu":"UNKNOWN"})
        self.now=11
        b=self.client()
        self.assertEqual(b.report_once()["sequence"],2)
        self.assertEqual(self.p.status(self.tokens["observer"])["sequence"],2)
        self.assertFalse(self.p.status(self.tokens["observer"])["gpuDispatchAuthorized"])
        self.assertEqual(self.s.status(self.tokens["observer"])["jobs"],[])
    def test_role_revision_and_revocation(self):
        for role in ("observer","operator","hosted-qa"):
            with self.assertRaises(ValueError): self.client(role).cursor()
        with self.assertRaises(ValueError): self.client(revision="b"*40).report_once()
        self.assertEqual(self.p.status(self.tokens["observer"])["sequence"],0)
        self.p.revoke(self.tokens["operator"])
        with self.assertRaises(ValueError): self.client().report_once()
    def test_cursor_read_only_and_no_job_permission(self):
        before=(self.root/"presence.db").read_bytes()
        self.assertEqual(self.client().cursor(),0)
        self.assertEqual(before,(self.root/"presence.db").read_bytes())
        pc=WorkerClient(self.server.server_port,str(self.cert),self.tokens["pc-qa"])
        for path in ("/qa/status","/qa/claim","/qa/pc-status"):
            with self.assertRaises(ValueError): pc.request(path,{})
        self.assertEqual(self.s.status(self.tokens["observer"])["jobs"],[])
