"""Fixed-QA shared-controller storage prototype. No network, execution or enrollment."""
import hashlib
import re
import secrets
import sqlite3
from contextlib import contextmanager

KINDS = {"cpu-probe": "CPU", "local-qa": "CPU", "gpu-qa": "GPU"}
WORKERS = {"hosted-qa": "CPU", "pc-qa": "GPU"}
FLAGS = {"researchStatus": "UNVALIDATED", "productionDispatchAuthorized": False,
         "publicationGate": "BLOCKED", "remoteEnrollmentEnabled": False}
HEX = re.compile(r"[a-f0-9]{64}")
REV = re.compile(r"[a-f0-9]{40}")
ID = re.compile(r"[a-z0-9][a-z0-9-]{0,63}")

def need(ok, msg):
    if not ok:
        raise ValueError(msg)

def hash_token(token):
    need(isinstance(token, str) and HEX.fullmatch(token), "Invalid lease token")
    return hashlib.sha256(token.encode("ascii")).hexdigest()

class Controller:
    """Single-controller SQLite store. Worker labels are trusted in-process inputs only."""
    def __init__(self, path):
        self.path = path
        need(str(path) != ":memory:", "Persistent store required")
        with self.tx() as db:
            db.execute("CREATE TABLE IF NOT EXISTS jobs (id TEXT PRIMARY KEY, revision TEXT NOT NULL, kind TEXT NOT NULL, backend TEXT NOT NULL, state TEXT NOT NULL, worker TEXT, token_hash TEXT, expires INTEGER, receipt_hash TEXT, UNIQUE(revision,kind))")
            db.execute("CREATE TABLE IF NOT EXISTS events (seq INTEGER PRIMARY KEY, job TEXT NOT NULL REFERENCES jobs(id), action TEXT NOT NULL, at INTEGER NOT NULL)")
            db.execute("CREATE TABLE IF NOT EXISTS clock (id INTEGER PRIMARY KEY CHECK(id=1), last INTEGER NOT NULL)")
            db.execute("INSERT OR IGNORE INTO clock VALUES (1,0)")

    @contextmanager
    def tx(self):
        db = sqlite3.connect(self.path, timeout=10, isolation_level=None)
        db.row_factory = sqlite3.Row
        try:
            db.execute("PRAGMA foreign_keys=ON")
            db.execute("PRAGMA synchronous=FULL")
            db.execute("BEGIN IMMEDIATE")
            yield db
            db.commit()
        except BaseException:
            db.rollback()
            raise
        finally:
            db.close()

    @staticmethod
    def tick(db, now):
        need(type(now) is int and 0 <= now <= 2**53-1, "Invalid trusted clock")
        last = db.execute("SELECT last FROM clock WHERE id=1").fetchone()[0]
        need(now >= last, "Clock rollback")
        db.execute("UPDATE clock SET last=? WHERE id=1", (now,))

    @staticmethod
    def event(db, job, action, now):
        db.execute("INSERT INTO events(job,action,at) VALUES (?,?,?)", (job,action,now))

    def expire(self, db, now):
        for row in db.execute("SELECT id FROM jobs WHERE state='LEASED' AND expires<=?", (now,)).fetchall():
            db.execute("UPDATE jobs SET state='QUARANTINED',token_hash=NULL WHERE id=?", (row["id"],))
            self.event(db,row["id"],"LEASE_EXPIRED",now)

    def enqueue(self, job, revision, kind, now):
        need(isinstance(job,str) and ID.fullmatch(job), "Invalid job ID")
        need(isinstance(revision,str) and REV.fullmatch(revision), "Invalid pinned revision")
        need(isinstance(kind,str) and kind in KINDS, "Unapproved job kind")
        with self.tx() as db:
            self.tick(db,now)
            prior=db.execute("SELECT * FROM jobs WHERE id=?", (job,)).fetchone()
            if prior:
                need(prior["revision"]==revision and prior["kind"]==kind, "Job ID conflict")
                return prior["state"]
            need(not db.execute("SELECT 1 FROM jobs WHERE revision=? AND kind=?", (revision,kind)).fetchone(), "Duplicate logical job")
            # GPU registration and dispatch deliberately remain blocked.
            state="QUEUED" if KINDS[kind]=="CPU" else "BLOCKED_GPU"
            db.execute("INSERT INTO jobs(id,revision,kind,backend,state) VALUES(?,?,?,?,?)",(job,revision,kind,KINDS[kind],state))
            self.event(db,job,"ENQUEUED",now)
            return state

    def claim(self, worker, now, ttl=60):
        need(worker=="hosted-qa", "Remote/GPU workers not enrolled")
        need(type(ttl) is int and 1<=ttl<=300, "Invalid lease duration")
        with self.tx() as db:
            self.tick(db,now)
            self.expire(db,now)
            if db.execute("SELECT 1 FROM jobs WHERE worker=? AND state='LEASED'",(worker,)).fetchone():
                return None
            row=db.execute("SELECT id,revision,kind FROM jobs WHERE state='QUEUED' AND backend='CPU' ORDER BY rowid LIMIT 1").fetchone()
            if not row:
                return None
            token=secrets.token_hex(32)
            db.execute("UPDATE jobs SET state='LEASED',worker=?,token_hash=?,expires=? WHERE id=?",(worker,hash_token(token),now+ttl,row["id"]))
            self.event(db,row["id"],"LEASED",now)
            return dict(row)|{"token":token,"expires":now+ttl}

    def submit(self, job, worker, token, receipt_hash, now):
        need(worker=="hosted-qa", "Worker not enrolled")
        need(isinstance(receipt_hash,str) and HEX.fullmatch(receipt_hash), "Invalid receipt hash")
        hashed=hash_token(token)
        with self.tx() as db:
            self.tick(db,now)
            self.expire(db,now)
            row=db.execute("SELECT * FROM jobs WHERE id=?", (job,)).fetchone()
            if not row or row["state"]!="LEASED" or row["worker"]!=worker or not secrets.compare_digest(row["token_hash"],hashed):
                return False
            # Hash alone is not evidence authenticity or acceptance.
            db.execute("UPDATE jobs SET state='RECEIPT_PENDING_REVIEW',receipt_hash=?,token_hash=NULL WHERE id=?",(receipt_hash,job))
            self.event(db,job,"UNVERIFIED_RECEIPT_RECORDED",now)
            return True

    def snapshot(self, now):
        with self.tx() as db:
            self.tick(db,now)
            self.expire(db,now)
            rows=db.execute("SELECT id,revision,kind,backend,state,worker,expires,receipt_hash FROM jobs ORDER BY rowid").fetchall()
            events=db.execute("SELECT seq,job,action,at FROM events ORDER BY seq").fetchall()
            return {"kind":"LOCAL_CONTROLLER_QA_SNAPSHOT","jobs":[dict(r) for r in rows],
                    "events":[dict(r) for r in events],**FLAGS}
