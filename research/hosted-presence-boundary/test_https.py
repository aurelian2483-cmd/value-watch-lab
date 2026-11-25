"""Actual HTTPS request to the WSGI boundary, loopback only, disposable certificate."""
import hashlib
import http.client
import json
import ssl
import subprocess
import tempfile
import threading
import unittest
from pathlib import Path
from wsgiref.simple_server import make_server,WSGIRequestHandler
from wsgiref.validate import validator
from boundary import ENV_ROLES,create_app,provision

class TLSHandler(WSGIRequestHandler):
    def get_environ(self):
        env=super().get_environ()
        env["HTTPS"]="on"
        return env
    def log_message(self,*args):
        pass

class HostedTLSTests(unittest.TestCase):
    def setUp(self):
        self.temp=tempfile.TemporaryDirectory()
        root=Path(self.temp.name).resolve()
        self.cert=root/"cert.pem"
        key=root/"key.pem"
        subprocess.run(["openssl","req","-x509","-newkey","rsa:2048","-nodes","-keyout",str(key),"-out",str(self.cert),"-days","1","-subj","/CN=localhost","-addext","subjectAltName=IP:127.0.0.1"],check=True,capture_output=True,timeout=20)
        self.tokens={role:str(i)*64 for i,role in enumerate(ENV_ROLES,1)}
        self.env={"SKY_MODE":"PRESENCE_ONLY_QA","SKY_APPROVED_HOST":"qa.example.test","SKY_APPROVED_REVISION":"a"*40,"SKY_STATE_DIR":str(root)}
        self.env.update({k:hashlib.sha256(self.tokens[r].encode()).hexdigest() for r,k in ENV_ROLES.items()})
        self.registry=provision(self.env,clock=lambda:10)
        self.server=make_server("127.0.0.1",0,validator(create_app(self.env,clock=lambda:10)),handler_class=TLSHandler)
        ctx=ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
        ctx.minimum_version=ssl.TLSVersion.TLSv1_2
        ctx.load_cert_chain(self.cert,key)
        self.server.socket=ctx.wrap_socket(self.server.socket,server_side=True)
        self.thread=threading.Thread(target=self.server.serve_forever,kwargs={"poll_interval":0.02},daemon=True)
        self.thread.start()
    def tearDown(self):
        self.server.shutdown()
        self.server.server_close()
        self.thread.join(timeout=5)
        self.temp.cleanup()
    def request(self,path,body,role="pc-qa"):
        c=http.client.HTTPSConnection("127.0.0.1",self.server.server_port,timeout=5,context=ssl.create_default_context(cafile=str(self.cert)))
        try:
            c.request("POST",path,body=body,headers={"Host":"qa.example.test","Authorization":"Bearer "+self.tokens[role],"Content-Type":"application/json"})
            r=c.getresponse()
            return r.status,json.loads(r.read())
        finally:
            c.close()
    def test_real_https_roundtrip_and_denial(self):
        self.assertEqual(self.request("/qa/pc-cursor","{}")[1]["result"]["sequence"],0)
        self.assertEqual(self.request("/qa/pc-heartbeat",'{"sequence":1,"gpu":"UNKNOWN"}')[0],200)
        self.assertEqual(self.request("/qa/pc-cursor","{}")[1]["result"]["sequence"],1)
        self.assertEqual(self.request("/qa/pc-cursor","{}",role="observer")[0],403)
        self.assertEqual(self.request("/qa/claim","{}")[0],404)
        self.registry.revoke(self.tokens["operator"])
        self.assertEqual(self.request("/qa/pc-cursor","{}")[0],403)
