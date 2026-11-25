import hashlib
import http.client
import ssl
import subprocess
import tempfile
import threading
import unittest
from pathlib import Path
from controller import Controller
from service import Service
from transport import LoopbackServer, WorkerClient

class TransportTests(unittest.TestCase):
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
        self.c=Controller(Path(self.temp.name)/"queue.db")
        self.tokens={"operator":"1"*64,"hosted-qa":"2"*64,"observer":"3"*64}
        self.digests={k:hashlib.sha256(v.encode()).hexdigest() for k,v in self.tokens.items()}
        self.s=Service(self.c,self.digests,"a"*40,clock=lambda:10)
        self.s.enqueue(self.tokens["operator"],"probe","cpu-probe")
        self.server=LoopbackServer(self.s,self.cert,self.key)
        self.thread=threading.Thread(target=self.server.serve_forever,kwargs={"poll_interval":0.02},daemon=True)
        self.thread.start()
        self.port=self.server.server_port
    def tearDown(self):
        self.server.shutdown()
        self.server.server_close()
        self.thread.join(timeout=5)
        self.temp.cleanup()
    def client(self,role):
        return WorkerClient(self.port,str(self.cert),self.tokens[role])
    def raw(self,path,body,token,content_type="application/json"):
        ctx=ssl.create_default_context(cafile=str(self.cert))
        conn=http.client.HTTPSConnection("127.0.0.1",self.port,context=ctx,timeout=5)
        try:
            conn.request("POST",path,body=body,headers={"Authorization":"Bearer "+token,"Content-Type":content_type})
            r=conn.getresponse()
            return r.status,r.read()
        finally:
            conn.close()
    def test_tls_roundtrip_and_replay(self):
        worker=self.client("hosted-qa")
        lease=worker.request("/qa/claim",{})
        self.assertEqual(lease["id"],"probe")
        p={"job":"probe","lease":lease["token"],"receipt_hash":"b"*64}
        self.assertTrue(worker.request("/qa/submit",p))
        self.assertFalse(worker.request("/qa/submit",p))
        snap=self.client("observer").request("/qa/status",{})
        self.assertEqual(snap["jobs"][0]["state"],"RECEIPT_PENDING_REVIEW")
        self.assertNotIn(lease["token"],str(snap))
    def test_untrusted_cert_rejected(self):
        conn=http.client.HTTPSConnection("127.0.0.1",self.port,context=ssl.create_default_context(),timeout=5)
        try:
            with self.assertRaises(ssl.SSLCertVerificationError):
                conn.request("POST","/qa/claim",body=b"{}")
        finally:
            conn.close()
        self.assertEqual(self.c.read_only_status()["jobs"][0]["state"],"QUEUED")
    def test_wrong_role_and_revocation(self):
        with self.assertRaises(ValueError):
            self.client("observer").request("/qa/claim",{})
        worker=self.client("hosted-qa")
        lease=worker.request("/qa/claim",{})
        self.s.revoke(self.tokens["operator"],"hosted-qa")
        with self.assertRaises(ValueError):
            worker.request("/qa/submit",{"job":"probe","lease":lease["token"],"receipt_hash":"b"*64})
        self.assertEqual(self.c.read_only_status()["jobs"][0]["state"],"QUARANTINED")
    def test_bad_requests_no_mutation(self):
        token=self.tokens["hosted-qa"]
        for path,body,status in [("/qa/claim",b'{"x":1}',403),("/qa/claim",b'{"x":1,"x":2}',403),("/qa/claim",b'x'*4097,413),("/qa/execute",b'{}',404)]:
            self.assertEqual(self.raw(path,body,token)[0],status)
        self.assertEqual(self.raw("/qa/claim",b"{}","f"*64)[0],403)
        self.assertEqual(self.raw("/qa/claim",b"{}",token,"text/plain")[0],415)
        self.assertEqual(self.c.read_only_status()["jobs"][0]["state"],"QUEUED")
    def test_gpu_blocked_over_transport(self):
        self.s.enqueue(self.tokens["operator"],"gpu","gpu-qa")
        self.assertEqual(self.client("hosted-qa").request("/qa/claim",{})["kind"],"cpu-probe")
        self.assertEqual(self.c.read_only_status()["jobs"][1]["state"],"BLOCKED_GPU")
