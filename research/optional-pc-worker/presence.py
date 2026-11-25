"""Optional PC presence registry. Reported availability is not hardware attestation."""
import hashlib
import secrets
import sqlite3
import time
from contextlib import contextmanager
from pathlib import Path

ROLES=("operator","hosted-qa","observer","pc-qa")
GPU_STATES=("UNKNOWN","AVAILABLE_REPORTED","UNAVAILABLE_REPORTED")
TTL_SECONDS=120
MAX_SEQUENCE=2**31-1

def need(ok,msg):
    if not ok:
        raise ValueError(msg)

def hex_string(value,n):
    return isinstance(value,str) and len(value)==n and all(c in "0123456789abcdef" for c in value)

class Presence:
    def __init__(self,path,credentials,revision,*,clock=None):
        need(isinstance(credentials,dict) and set(credentials)==set(ROLES),"Explicit credentials required")
        need(all(hex_string(v,64) for v in credentials.values()) and len(set(credentials.values()))==len(ROLES),"Distinct credential digests required")
        need(hex_string(revision,40),"Pinned revision required")
        self.path=Path(path).resolve()
        self._digests=dict(credentials)
        self._revision=revision
        self._clock=clock if clock is not None else lambda:time.time_ns()//1_000_000_000
        self._policy=hashlib.sha256("|".join([revision]+[credentials[k] for k in ROLES]).encode()).hexdigest()
        with self.tx() as db:
            db.execute("CREATE TABLE IF NOT EXISTS presence_policy(id INTEGER PRIMARY KEY CHECK(id=1),digest TEXT NOT NULL)")
            db.execute("CREATE TABLE IF NOT EXISTS pc_presence(id INTEGER PRIMARY KEY CHECK(id=1),sequence INTEGER NOT NULL,last_seen INTEGER,gpu TEXT NOT NULL,revoked INTEGER NOT NULL CHECK(revoked IN (0,1)),last_clock INTEGER NOT NULL)")
            db.execute("INSERT OR IGNORE INTO presence_policy VALUES(1,?)",(self._policy,))
            self.check_policy(db)
            db.execute("INSERT OR IGNORE INTO pc_presence VALUES(1,0,NULL,'UNKNOWN',0,0)")
    @contextmanager
    def tx(self,readonly=False):
        db=sqlite3.connect(self.path.as_uri()+"?mode=ro",uri=True,timeout=10,isolation_level=None) if readonly else sqlite3.connect(self.path,timeout=10,isolation_level=None)
        db.row_factory=sqlite3.Row
        try:
            if not readonly:
                db.execute("PRAGMA synchronous=FULL")
            db.execute("BEGIN" if readonly else "BEGIN IMMEDIATE")
            yield db
            db.commit()
        except BaseException:
            db.rollback()
            raise
        finally:
            db.close()
    def check_policy(self,db):
        row=db.execute("SELECT digest FROM presence_policy WHERE id=1").fetchone()
        need(row is not None and row["digest"]==self._policy,"Policy mismatch")
    def auth(self,role,token):
        need(hex_string(token,64),"Unauthorized")
        need(secrets.compare_digest(hashlib.sha256(token.encode()).hexdigest(),self._digests[role]),"Unauthorized")
    def now(self):
        n=self._clock()
        need(type(n) is int and 0<=n<=2**53-1,"Invalid server clock")
        return n
    def heartbeat(self,token,sequence,gpu):
        self.auth("pc-qa",token)
        need(type(sequence) is int and 1<=sequence<=MAX_SEQUENCE and isinstance(gpu,str) and gpu in GPU_STATES,"Invalid report")
        with self.tx() as db:
            self.check_policy(db)
            row=db.execute("SELECT * FROM pc_presence WHERE id=1").fetchone()
            now=self.now()
            need(not row["revoked"],"Worker revoked")
            need(now>=row["last_clock"],"Clock rollback")
            need(sequence==row["sequence"]+1,"Unexpected sequence")
            need(row["last_seen"] is None or now>row["last_seen"],"Heartbeat rate exceeded")
            db.execute("UPDATE pc_presence SET sequence=?,last_seen=?,gpu=?,last_clock=? WHERE id=1",(sequence,now,gpu,now))
        return {"sequence":sequence,"accepted":True,"gpuDispatchAuthorized":False}
    def revoke(self,token):
        self.auth("operator",token)
        with self.tx() as db:
            self.check_policy(db)
            row=db.execute("SELECT last_clock FROM pc_presence WHERE id=1").fetchone()
            now=self.now()
            need(now>=row["last_clock"],"Clock rollback")
            db.execute("UPDATE pc_presence SET revoked=1,last_clock=? WHERE id=1",(now,))
    def status(self,token):
        self.auth("observer",token)
        with self.tx(readonly=True) as db:
            self.check_policy(db)
            row=db.execute("SELECT * FROM pc_presence WHERE id=1").fetchone()
            now=self.now()
            if row["revoked"]:
                state="REVOKED"
            elif now<row["last_clock"]:
                state="CLOCK_ROLLBACK"
            elif row["last_seen"] is None:
                state="NEVER_SEEN"
            elif now-row["last_seen"]>=TTL_SECONDS:
                state="STALE"
            else:
                state="REPORTED_RECENT"
            return {"kind":"OPTIONAL_PC_PRESENCE_QA","worker":"pc-qa","revision":self._revision,
                    "state":state,"lastSeen":row["last_seen"],"sequence":row["sequence"],
                    "gpuReported":row["gpu"] if state=="REPORTED_RECENT" else "UNKNOWN",
                    "hardwareAttested":False,"gpuDispatchAuthorized":False,
                    "productionDispatchAuthorized":False,"publicationGate":"BLOCKED",
                    "researchStatus":"UNVALIDATED"}
