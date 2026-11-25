"""Durable, transaction-bound QA authentication. No network or remote enrollment."""
import hashlib
import secrets
import time
from types import MappingProxyType
from controller import HEX, REV, need

ROLES = ("operator", "hosted-qa", "observer")

class Service:
    def __init__(self, controller, credentials, approved_revision, *, clock=None):
        need(isinstance(approved_revision,str) and REV.fullmatch(approved_revision), "Invalid revision")
        need(isinstance(credentials,dict) and set(credentials)==set(ROLES), "Explicit roles required")
        need(all(isinstance(v,str) and HEX.fullmatch(v) for v in credentials.values()), "Invalid credential digest")
        need(len(set(credentials.values()))==len(ROLES), "Distinct credentials required")
        self._controller=controller
        self._credentials=MappingProxyType(dict(credentials))
        self._revision=approved_revision
        self._clock=clock if clock is not None else lambda: time.time_ns()//1_000_000_000
        # Bind the entire policy once. A process cannot silently replace the approved
        # revision or credential digests by restarting with new configuration.
        fingerprint=hashlib.sha256("|".join([approved_revision]+[credentials[r] for r in ROLES]).encode("ascii")).hexdigest()
        with controller.tx() as db:
            db.execute("CREATE TABLE IF NOT EXISTS service_policy(id INTEGER PRIMARY KEY CHECK(id=1), fingerprint TEXT NOT NULL)")
            db.execute("CREATE TABLE IF NOT EXISTS revoked_roles(role TEXT PRIMARY KEY, revoked_at INTEGER NOT NULL)")
            db.execute("INSERT OR IGNORE INTO service_policy VALUES(1,?)",(fingerprint,))
            need(db.execute("SELECT fingerprint FROM service_policy WHERE id=1").fetchone()[0]==fingerprint,"Policy mismatch")
        self._fingerprint=fingerprint

    def _guard(self, role, token, *, scope=False):
        need(role in ROLES and isinstance(token,str) and HEX.fullmatch(token), "Unauthorized")
        hashed=hashlib.sha256(token.encode("ascii")).hexdigest()
        need(secrets.compare_digest(self._credentials[role],hashed), "Unauthorized")
        def check(db):
            need(db.execute("SELECT fingerprint FROM service_policy WHERE id=1").fetchone()[0]==self._fingerprint,"Policy mismatch")
            need(not db.execute("SELECT 1 FROM revoked_roles WHERE role=?",(role,)).fetchone(),"Unauthorized")
            if scope:
                need(not db.execute("SELECT 1 FROM jobs WHERE revision<>? LIMIT 1",(self._revision,)).fetchone(),"Unapproved stored revision")
        return check

    def enqueue(self, token, job, kind):
        auth=self._guard("operator",token,scope=True)
        def guard(db):
            auth(db)
            need(not db.execute("SELECT 1 FROM sqlite_master WHERE type='table' AND name='qa_schedule'").fetchone(),"Scheduled queue cannot be populated directly")
        return self._controller.enqueue(job,self._revision,kind,self._clock(),guard=guard)

    def claim(self, token):
        return self._controller.claim("hosted-qa",self._clock(),ttl=240,guard=self._guard("hosted-qa",token,scope=True))

    def submit(self, token, job, lease, receipt_hash):
        return self._controller.submit(job,"hosted-qa",lease,receipt_hash,self._clock(),guard=self._guard("hosted-qa",token,scope=True))

    def reconcile(self, token):
        return self._controller.snapshot(self._clock(),guard=self._guard("operator",token))

    def status(self, token):
        return self._controller.read_only_status(guard=self._guard("observer",token))

    def revoke(self, token, role):
        """Persist revocation and invalidate active leases atomically; no process kill."""
        need(role in ("hosted-qa","observer"),"Cannot revoke this role")
        guard=self._guard("operator",token)
        with self._controller.tx() as db:
            guard(db)
            now=self._clock()
            self._controller.tick(db,now)
            self._controller.expire(db,now)
            db.execute("INSERT OR IGNORE INTO revoked_roles VALUES(?,?)",(role,now))
            if role=="hosted-qa":
                for row in db.execute("SELECT id FROM jobs WHERE state='LEASED' AND worker=?",(role,)).fetchall():
                    db.execute("UPDATE jobs SET state='QUARANTINED',token_hash=NULL WHERE id=?",(row["id"],))
                    self._controller.event(db,row["id"],"WORKER_REVOKED",now)
