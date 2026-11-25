import subprocess
import sys
import unittest
from pathlib import Path
from unittest.mock import patch
from client import PresenceClient,endpoint

class ClientTests(unittest.TestCase):
    def setUp(self):
        self.rev="a"*40
        self.c=PresenceClient("127.0.0.1",12345,self.rev,"b"*64)
    def cursor(self,sequence):
        return {"kind":"PC_HEARTBEAT_CURSOR","revision":self.rev,"sequence":sequence,"gpuDispatchAuthorized":False}
    def test_dry_run(self):
        r=subprocess.run([sys.executable,"-B",str(Path(__file__).with_name("client.py"))],capture_output=True,text=True,check=True,timeout=10)
        self.assertIn('"networkUsed": false',r.stdout)
    def test_endpoint_and_tls(self):
        for host,port,allow in [("example.com",443,False),("https://example.com",443,True),("example.com",80,True),("evil.test/path",443,True),("192.0.2.1",443,True)]:
            with self.assertRaises(ValueError): endpoint(host,port,allow)
        endpoint("example.com",443,True)
        self.assertTrue(self.c.context.check_hostname)
        self.assertEqual(self.c.context.verify_mode,2)
    def test_one_report(self):
        with patch.object(self.c,"request",side_effect=[self.cursor(7),{"sequence":8,"accepted":True,"gpuDispatchAuthorized":False}]) as call:
            r=self.c.report_once()
            self.assertFalse(r["hardwareAttested"])
            self.assertFalse(r["gpuDispatchAuthorized"])
            self.assertEqual(call.call_args_list[1].args,("/qa/pc-heartbeat",{"sequence":8,"gpu":"UNKNOWN"}))
    def test_bad_cursor_never_sends(self):
        for bad in [self.cursor(True),self.cursor(2**31-1),self.cursor(0)|{"revision":"c"*40},self.cursor(0)|{"gpuDispatchAuthorized":True}]:
            with patch.object(self.c,"request",return_value=bad) as call:
                with self.assertRaises(ValueError): self.c.report_once()
                self.assertEqual(call.call_count,1)
    def test_lost_ack_no_retry_and_next_invocation_recovers(self):
        with patch.object(self.c,"request",side_effect=[self.cursor(7),OSError("lost acknowledgement")]) as call:
            with self.assertRaises(OSError): self.c.report_once()
            self.assertEqual(call.call_count,2)
        with patch.object(self.c,"request",side_effect=[self.cursor(8),{"sequence":9,"accepted":True,"gpuDispatchAuthorized":False}]) as call:
            self.assertEqual(self.c.report_once()["sequence"],9)
            self.assertEqual(call.call_count,2)
    def test_bad_ack_denied(self):
        for bad in [{"sequence":1,"accepted":True,"gpuDispatchAuthorized":True},{"sequence":True,"accepted":True,"gpuDispatchAuthorized":False},{"sequence":2,"accepted":True,"gpuDispatchAuthorized":False}]:
            with patch.object(self.c,"request",side_effect=[self.cursor(0),bad]):
                with self.assertRaises(ValueError): self.c.report_once()
    def test_no_arbitrary_route(self):
        with self.assertRaises(ValueError): self.c.request("/qa/claim",{})
