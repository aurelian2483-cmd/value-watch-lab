"""Provider-neutral WSGI presence-only pilot. No public listener or execution routes."""
import hashlib
import json
import os
import re
import sqlite3
import stat
from pathlib import Path
from presence import Presence, ROLES, hex_string, need

HOST=re.compile(r"(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z](?:[a-z0-9-]{0,61}[a-z0-9])?")
AUTH=re.compile(r"Bearer ([a-f0-9]{64})")
ROUTES={"/qa/pc-cursor":set(),"/qa/pc-heartbeat":{"sequence","gpu"}}
MAX_BODY=1024
ENV_ROLES={"operator":"SKY_OPERATOR_DIGEST","hosted-qa":"SKY_CPU_DIGEST","observer":"SKY_OBSERVER_DIGEST","pc-qa":"SKY_PC_DIGEST"}

def configuration(env):
    need(env.get("SKY_MODE")=="PRESENCE_ONLY_QA","Explicit pilot mode required")
    host=env.get("SKY_APPROVED_HOST","")
    need(isinstance(host,str) and HOST.fullmatch(host),"Approved hostname required")
    revision=env.get("SKY_APPROVED_REVISION","")
    need(hex_string(revision,40),"Pinned revision required")
    digests={role:env.get(key,"") for role,key in ENV_ROLES.items()}
    need(all(hex_string(x,64) for x in digests.values()) and len(set(digests.values()))==4,"Distinct credential digests required")
    path=Path(env.get("SKY_STATE_DIR",""))
    need(path.is_absolute() and path.resolve()==path and path.is_dir(),"Existing canonical private state directory required")
    if os.name=="posix":
        info=path.stat()
        need(info.st_uid==os.geteuid() and not info.st_mode&0o077,"State directory must be private and owner-controlled")
    return host,revision,digests,path/"presence.sqlite3"

def check_file(path):
    info=path.lstat()
    need(stat.S_ISREG(info.st_mode) and info.st_nlink==1,"Regular private state file required")
    if os.name=="posix":
        need(info.st_uid==os.geteuid() and not info.st_mode&0o077,"State file must be private and owner-controlled")

def provision(env,*,clock=None):
    """Explicit one-time provisioning in an already private operator directory."""
    _,revision,digests,path=configuration(env)
    fd=os.open(path,os.O_CREAT|os.O_EXCL|os.O_WRONLY,0o600)
    os.close(fd)
    # Do not erase an incomplete provisioning attempt automatically.
    return Presence(path,digests,revision,clock=clock)

def existing(env,*,clock=None):
    host,revision,digests,path=configuration(env)
    check_file(path)
    registry=Presence(path,digests,revision,clock=clock,initialize=False)
    info=path.stat()
    return host,registry,path,(info.st_dev,info.st_ino)

def strict_object(pairs):
    out={}
    for k,v in pairs:
        need(k not in out,"Duplicate JSON key")
        out[k]=v
    return out

def create_app(env,*,clock=None):
    host,registry,path,identity=existing(env,clock=clock)
    def app(request,start_response):
        def reply(status,payload):
            raw=json.dumps(payload,sort_keys=True,separators=(",",":"),allow_nan=False).encode()
            start_response(status,[("Content-Type","application/json"),("Content-Length",str(len(raw))),("Cache-Control","no-store"),("X-Content-Type-Options","nosniff"),("Referrer-Policy","no-referrer")])
            return [raw]
        # Scheme and authority must be established by the configured trusted
        # serving adapter, not by application use of forwarded headers.
        if request.get("wsgi.url_scheme")!="https" or request.get("HTTP_HOST")!=host:
            return reply("403 Forbidden",{"error":"request rejected"})
        if request.get("REQUEST_METHOD")!="POST":
            return reply("405 Method Not Allowed",{"error":"request rejected"})
        route=request.get("PATH_INFO")
        if route not in ROUTES or request.get("QUERY_STRING","") or request.get("SCRIPT_NAME",""):
            return reply("404 Not Found",{"error":"request rejected"})
        auth=AUTH.fullmatch(request.get("HTTP_AUTHORIZATION",""))
        if not auth:
            return reply("403 Forbidden",{"error":"request rejected"})
        if request.get("HTTP_TRANSFER_ENCODING") or request.get("HTTP_EXPECT"):
            return reply("400 Bad Request",{"error":"request rejected"})
        length=request.get("CONTENT_LENGTH","")
        if not re.fullmatch(r"[1-9][0-9]{0,3}",length) or int(length)>MAX_BODY:
            return reply("413 Payload Too Large",{"error":"request rejected"})
        if request.get("CONTENT_TYPE")!="application/json":
            return reply("415 Unsupported Media Type",{"error":"request rejected"})
        try:
            check_file(path)
            current=path.stat()
            need((current.st_dev,current.st_ino)==identity,"State file replaced")
        except (ValueError,OSError):
            return reply("503 Service Unavailable",{"error":"state unavailable"})
        try:
            token=auth.group(1)
            registry.auth("pc-qa",token)
            raw=request["wsgi.input"].read(int(length))
            need(len(raw)==int(length),"Truncated body")
            payload=json.loads(raw.decode("utf-8"),object_pairs_hook=strict_object,
                               parse_constant=lambda _: (_ for _ in ()).throw(ValueError("Invalid constant")))
            need(type(payload) is dict and set(payload)==ROUTES[route],"Invalid request fields")
            if route=="/qa/pc-cursor":
                result=registry.cursor(token)
            else:
                result=registry.heartbeat(token,payload["sequence"],payload["gpu"])
            return reply("200 OK",{"result":result})
        except (sqlite3.Error,OSError):
            return reply("503 Service Unavailable",{"error":"state unavailable"})
        except (ValueError,TypeError,KeyError,UnicodeError,RecursionError):
            return reply("403 Forbidden",{"error":"request rejected"})
    return app

def factory():
    return create_app(os.environ)
