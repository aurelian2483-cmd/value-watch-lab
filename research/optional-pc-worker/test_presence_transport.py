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

class PresenceTransportTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.certdir=tempfile.TemporaryDirectory()
        cls.cert=Path(cls.certdir.name)/"cert.pem"
        cls.key=Path(cls.certdir.name)/"key.pem"
        subprocess.run(["openssl","req","-x509","-newkey","rsa:2048","-nodes","-keyout",str(cls.key),"-out",str(cls.cert),"-days","1","-subj","/CN=localhost","-addext","subjectAltName=IP:127.0.0.1"],check=True,capture_output=True,timeout=20)
    @classmethod
    def tearDownClass(cls):
        cls.certdir.cleanup()
    def setUp(self):
        self.temp=tempfile.TemporaryDirectory()
        self.root=Path(self.temp.name)
        self.tokens={r:str(i)*64 for i,r in enumerate(ROLES,1)}
        self.digests={k:hashlib.sha256(v.encode()).hexdigest() for k,v in self.tokens.items()}
        self.s=Service(Controller(self.root/"queue.db"),{k:v for k,v in self.digests.items() if k!="pc-qa"},"a"*40,clock=lambda:10)
        self.p=Presence(self.root/"presence.db",self.digests,"a"*40,clock=lambda:10)
        self.server=None
    def start(self,presence=None):
        self.server=LoopbackServer(self.s,self.cert,self.key,presence=presence)
        self.thread=threading.Thread(target=self.server.serve_forever,kwargs={"poll_interval":0.02},daemon=True)
        self.thread.start()
    def tearDown(self):
        if self.server:
            self.server.shutdown()
            self.server.server_close()
            self.thread.join(timeout=5)
        self.temp.cleanup()
    def client(self,role):
        return WorkerClient(self.server.server_port,str(self.cert),self.tokens[role])
    def test_presence_only_no_job_permission(self):
        self.start(self.p)
        self.s.enqueue(self.tokens["operator"],"probe","cpu-probe")
        self.s.enqueue(self.tokens["operator"],"gpu","gpu-qa")
        pc=self.client("pc-qa")
        p={"sequence":1,"gpu":"AVAILABLE_REPORTED"}
        self.assertTrue(pc.request("/qa/pc-heartbeat",p)["accepted"])
        with self.assertRaises(ValueError):
            pc.request("/qa/pc-heartbeat",p)
        with self.assertRaises(ValueError):
            pc.request("/qa/claim",{})
        with self.assertRaises(ValueError):
            pc.request("/qa/submit",{"job":"probe","lease":"a"*64,"receipt_hash":"b"*64})
        with self.assertRaises(ValueError):
            pc.request("/qa/pc-status",{})
        status=self.client("observer").request("/qa/pc-status",{})
        self.assertFalse(status["gpuDispatchAuthorized"])
        self.assertFalse(status["hardwareAttested"])
        self.assertEqual(status["state"],"REPORTED_RECENT")
        self.assertEqual(self.client("hosted-qa").request("/qa/claim",{})["kind"],"cpu-probe")
    def test_disabled_routes(self):
        self.start()
        with self.assertRaises(ValueError):
            self.client("pc-qa").request("/qa/pc-heartbeat",{"sequence":1,"gpu":"UNKNOWN"})
        with self.assertRaises(ValueError):
            self.client("observer").request("/qa/pc-status",{})
    def test_scope_mismatch(self):
        other=Presence(self.root/"other.db",self.digests,"b"*40)
        with self.assertRaises(ValueError):
            LoopbackServer(self.s,self.cert,self.key,presence=other)
    def test_revoked_observer_and_pc(self):
        self.start(self.p)
        self.s.revoke(self.tokens["operator"],"observer")
        with self.assertRaises(ValueError):
            self.client("observer").request("/qa/pc-status",{})
        self.p.revoke(self.tokens["operator"])
        with self.assertRaises(ValueError):
            self.client("pc-qa").request("/qa/pc-heartbeat",{"sequence":1,"gpu":"UNKNOWN"})
