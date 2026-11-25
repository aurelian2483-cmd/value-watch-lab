"""Loopback-only TLS QA transport. Never expose this test server to the internet."""
import http.client
import json
import re
import ssl
from http.server import BaseHTTPRequestHandler, HTTPServer
from controller import HEX, ID, need

MAX_BODY=4096
MAX_RESPONSE=1048576
ROUTES={"/qa/claim":set(),"/qa/submit":{"job","lease","receipt_hash"},"/qa/status":set(),"/qa/pc-heartbeat":{"sequence","gpu"},"/qa/pc-status":set()}

def strict_object(pairs):
    out={}
    for k,v in pairs:
        need(k not in out,"Duplicate JSON key")
        out[k]=v
    return out

def decode(raw):
    return json.loads(raw.decode("utf-8"),object_pairs_hook=strict_object,
                      parse_constant=lambda _: (_ for _ in ()).throw(ValueError("Invalid constant")))

class Handler(BaseHTTPRequestHandler):
    protocol_version="HTTP/1.0"
    def log_message(self,*args):
        pass  # Never log Authorization, lease tokens, request bodies or paths.
    def reply(self,status,payload):
        raw=json.dumps(payload,separators=(",",":"),allow_nan=False).encode("utf-8")
        if len(raw)>MAX_RESPONSE:
            status,raw=503,b'{"error":"response unavailable"}'
        self.send_response(status)
        self.send_header("Content-Type","application/json")
        self.send_header("Cache-Control","no-store")
        self.send_header("Connection","close")
        self.send_header("Content-Length",str(len(raw)))
        self.end_headers()
        self.wfile.write(raw)
    def do_GET(self):
        self.reply(405,{"error":"method not allowed"})
    def do_POST(self):
        try:
            if self.path not in ROUTES:
                return self.reply(404,{"error":"unknown route"})
            if self.path in ("/qa/pc-heartbeat","/qa/pc-status") and self.server.presence is None:
                return self.reply(404,{"error":"unknown route"})
            auth=self.headers.get_all("Authorization",[])
            if len(auth)!=1 or not re.fullmatch(r"Bearer [a-f0-9]{64}",auth[0]):
                return self.reply(403,{"error":"request rejected"})
            if self.headers.get_all("Transfer-Encoding",[]) or self.headers.get_all("Expect",[]):
                return self.reply(400,{"error":"invalid framing"})
            lengths=self.headers.get_all("Content-Length",[])
            if len(lengths)!=1 or not re.fullmatch(r"[0-9]{1,4}",lengths[0]):
                return self.reply(400,{"error":"invalid framing"})
            n=int(lengths[0])
            if not 1<=n<=MAX_BODY:
                return self.reply(413,{"error":"invalid size"})
            if self.headers.get_all("Content-Type",[])!=["application/json"]:
                return self.reply(415,{"error":"invalid content type"})
            raw=self.rfile.read(n)
            need(len(raw)==n,"Truncated request")
            payload=decode(raw)
            need(type(payload) is dict and set(payload)==ROUTES[self.path],"Invalid request")
            token=auth[0][7:]
            service=self.server.service
            if self.path=="/qa/claim":
                result=service.claim(token)
            elif self.path=="/qa/status":
                result=service.status(token)
            elif self.path=="/qa/pc-heartbeat":
                result=self.server.presence.heartbeat(token,payload["sequence"],payload["gpu"])
            elif self.path=="/qa/pc-status":
                service.status(token)  # Honor durable observer revocation before reading presence.
                result=self.server.presence.status(token)
            else:
                need(isinstance(payload["job"],str) and ID.fullmatch(payload["job"]),"Invalid job")
                need(all(isinstance(payload[k],str) and HEX.fullmatch(payload[k]) for k in ("lease","receipt_hash")),"Invalid receipt")
                result=service.submit(token,payload["job"],payload["lease"],payload["receipt_hash"])
            return self.reply(200,{"result":result})
        except (ValueError,TypeError,UnicodeError,RecursionError):
            return self.reply(403,{"error":"request rejected"})
        except (OSError,TimeoutError):
            self.close_connection=True

class LoopbackServer(HTTPServer):
    allow_reuse_address=False
    def __init__(self,service,certfile,keyfile,*,presence=None):
        self.service=service
        self.presence=presence
        if presence is not None:
            presence.assert_service_scope(service._credentials,service._revision)
        self.context=ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
        self.context.minimum_version=ssl.TLSVersion.TLSv1_2
        self.context.load_cert_chain(certfile,keyfile)
        super().__init__(("127.0.0.1",0),Handler)
    def get_request(self):
        sock,addr=super().get_request()
        try:
            sock.settimeout(3)
            return self.context.wrap_socket(sock,server_side=True),addr
        except BaseException:
            sock.close()
            raise

class WorkerClient:
    """Test client pins a supplied trust root and verifies localhost certificate."""
    def __init__(self,port,cafile,token):
        need(type(port) is int and 0<port<=65535,"Invalid port")
        need(isinstance(token,str) and HEX.fullmatch(token),"Invalid credential")
        self.port=port
        self._token=token
        self.context=ssl.create_default_context(cafile=cafile)
        self.context.minimum_version=ssl.TLSVersion.TLSv1_2
    def request(self,path,payload):
        need(path in ROUTES and type(payload) is dict and set(payload)==ROUTES[path],"Invalid request")
        raw=json.dumps(payload,separators=(",",":"),allow_nan=False).encode()
        need(len(raw)<=MAX_BODY,"Invalid size")
        conn=http.client.HTTPSConnection("127.0.0.1",self.port,context=self.context,timeout=5)
        try:
            conn.request("POST",path,body=raw,headers={"Authorization":"Bearer "+self._token,"Content-Type":"application/json","Connection":"close"})
            response=conn.getresponse()
            need(response.status==200,"Request rejected")
            body=response.read(MAX_RESPONSE+1)
            need(len(body)<=MAX_RESPONSE,"Oversize response")
            data=decode(body)
            need(type(data) is dict and set(data)=={"result"},"Invalid response")
            return data["result"]
        finally:
            conn.close()
