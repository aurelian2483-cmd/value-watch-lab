import hashlib
import io
import json
import os
import tempfile
import unittest
from pathlib import Path
from boundary import ENV_ROLES,create_app,provision,existing

class BoundaryTests(unittest.TestCase):
    def setUp(self):
        self.temp=tempfile.TemporaryDirectory()
        self.root=Path(self.temp.name).resolve()
        self.tokens={role:str(i)*64 for i,role in enumerate(ENV_ROLES,1)}
        self.env={"SKY_MODE":"PRESENCE_ONLY_QA","SKY_APPROVED_HOST":"qa.example.test","SKY_APPROVED_REVISION":"a"*40,
                  "SKY_STATE_DIR":str(self.root)}
        self.env.update({k:hashlib.sha256(self.tokens[r].encode()).hexdigest() for r,k in ENV_ROLES.items()})
        self.now=10
        self.clock=lambda:self.now
        self.registry=provision(self.env,clock=self.clock)
        self.app=create_app(self.env,clock=self.clock)
    def tearDown(self):
        self.temp.cleanup()
    def request(self,path="/qa/pc-cursor",body=b"{}",role="pc-qa",**changes):
        request={"REQUEST_METHOD":"POST","PATH_INFO":path,"QUERY_STRING":"","SCRIPT_NAME":"","HTTP_HOST":"qa.example.test",
                 "wsgi.url_scheme":"https","HTTP_AUTHORIZATION":"Bearer "+self.tokens[role],"CONTENT_LENGTH":str(len(body)),
                 "CONTENT_TYPE":"application/json","wsgi.input":io.BytesIO(body)}
        request.update(changes)
        response=[]
        result=b"".join(self.app(request,lambda status,headers:response.append((status,dict(headers)))))
        return response[0],json.loads(result)
    def test_roundtrip_and_restart(self):
        self.assertEqual(self.request()[1]["result"]["sequence"],0)
        status,r=self.request("/qa/pc-heartbeat",b'{"sequence":1,"gpu":"UNKNOWN"}')
        self.assertEqual(status[0],"200 OK")
        self.assertFalse(r["result"]["gpuDispatchAuthorized"])
        self.assertEqual(status[1]["Cache-Control"],"no-store")
        self.app=create_app(self.env,clock=self.clock)
        self.assertEqual(self.request()[1]["result"]["sequence"],1)
        self.assertEqual(self.request("/qa/pc-heartbeat",b'{"sequence":1,"gpu":"UNKNOWN"}')[0][0],"403 Forbidden")
    def test_never_create_on_start_or_after_deletion(self):
        path=self.root/"presence.sqlite3"
        path.unlink()
        with self.assertRaises(OSError):create_app(self.env,clock=self.clock)
        self.assertEqual(self.request()[0][0],"503 Service Unavailable")
        self.assertFalse(path.exists())
    def test_provision_cannot_overwrite(self):
        path=self.root/"presence.sqlite3"
        before=path.read_bytes()
        with self.assertRaises(FileExistsError):provision(self.env,clock=self.clock)
        self.assertEqual(path.read_bytes(),before)
    def test_revoke_and_restart(self):
        self.registry.revoke(self.tokens["operator"])
        self.app=create_app(self.env,clock=self.clock)
        self.assertEqual(self.request()[0][0],"403 Forbidden")
        self.assertEqual(self.request("/qa/pc-heartbeat",b'{"sequence":1,"gpu":"UNKNOWN"}')[0][0],"403 Forbidden")
    def test_roles_and_routes(self):
        for role in ("operator","observer","hosted-qa"):
            self.assertEqual(self.request(role=role)[0][0],"403 Forbidden")
        for route in ("/qa/claim","/qa/submit","/qa/pc-status","/qa/revoke","/qa/execute","/"):
            self.assertEqual(self.request(route)[0][0],"404 Not Found")
    def test_scheme_host_and_forwarded_headers(self):
        for changes in ({"wsgi.url_scheme":"http","HTTP_X_FORWARDED_PROTO":"https"},
                        {"HTTP_HOST":"other.example.test","HTTP_X_FORWARDED_HOST":"qa.example.test"},
                        {"HTTP_HOST":"qa.example.test:443"}):
            self.assertEqual(self.request(**changes)[0][0],"403 Forbidden")
    def test_bad_framing_and_payload(self):
        for changes,status in [({"HTTP_TRANSFER_ENCODING":"chunked"},"400 Bad Request"),({"CONTENT_LENGTH":"9999"},"413 Payload Too Large"),
                               ({"CONTENT_LENGTH":"0"},"413 Payload Too Large"),({"CONTENT_TYPE":"text/plain"},"415 Unsupported Media Type"),
                               ({"REQUEST_METHOD":"GET"},"405 Method Not Allowed"),({"QUERY_STRING":"x=1"},"404 Not Found")]:
            self.assertEqual(self.request(**changes)[0][0],status)
        for b in (b'{"sequence":1,"sequence":2,"gpu":"UNKNOWN"}',b'{"sequence":true,"gpu":"UNKNOWN"}',b'{"sequence":1,"gpu":"UNKNOWN","command":"x"}'):
            self.assertEqual(self.request("/qa/pc-heartbeat",b)[0][0],"403 Forbidden")
        self.assertEqual(self.request()[1]["result"]["sequence"],0)
    def test_policy_and_state_replacement(self):
        with self.assertRaises(ValueError):create_app(self.env|{"SKY_APPROVED_REVISION":"b"*40},clock=self.clock)
        path=self.root/"presence.sqlite3"
        path.rename(self.root/"old.sqlite3")
        provision(self.env,clock=self.clock)
        self.assertEqual(self.request()[0][0],"503 Service Unavailable")
    def test_private_permissions(self):
        if os.name=="posix":
            path=self.root/"presence.sqlite3"
            path.chmod(0o644)
            with self.assertRaises(ValueError):create_app(self.env,clock=self.clock)
            self.assertEqual(self.request()[0][0],"503 Service Unavailable")
    def test_incomplete_database_not_reinitialized(self):
        path=self.root/"presence.sqlite3"
        import sqlite3
        db=sqlite3.connect(path)
        db.execute("DELETE FROM pc_presence")
        db.commit();db.close()
        with self.assertRaises(ValueError):create_app(self.env,clock=self.clock)
        with sqlite3.connect(path) as db:
            self.assertEqual(db.execute("SELECT COUNT(*) FROM pc_presence").fetchone()[0],0)
