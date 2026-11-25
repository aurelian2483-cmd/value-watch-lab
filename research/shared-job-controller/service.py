"""In-process authenticated QA boundary. Not an HTTP service or remote worker."""
import hashlib
import secrets
import threading
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
        self._lock=threading.Lock()
        self._revoked=set()

    def _auth(self, role, token):
        need(role in ROLES and role not in self._revoked, "Unauthorized")
        need(isinstance(token,str) and HEX.fullmatch(token), "Unauthorized")
        hashed=hashlib.sha256(token.encode("ascii")).hexdigest()
        need(secrets.compare_digest(self._credentials[role],hashed), "Unauthorized")

    def enqueue(self, token, job, kind):
        with self._lock:
            self._auth("operator",token)
            return self._controller.enqueue(job,self._revision,kind,self._clock())

    def claim(self, token):
        with self._lock:
            self._auth("hosted-qa",token)
            # Verify the queue is scoped to the explicitly approved revision.
            # Direct storage access is a trusted administrative boundary.
            need(all(j["revision"]==self._revision for j in self._controller.read_only_status()["jobs"]),
                 "Unapproved stored revision")
            return self._controller.claim("hosted-qa",self._clock(),ttl=240)

    def submit(self, token, job, lease, receipt_hash):
        with self._lock:
            self._auth("hosted-qa",token)
            need(all(j["revision"]==self._revision for j in self._controller.read_only_status()["jobs"]),
                 "Unapproved stored revision")
            return self._controller.submit(job,"hosted-qa",lease,receipt_hash,self._clock())

    def reconcile(self, token):
        with self._lock:
            self._auth("operator",token)
            return self._controller.snapshot(self._clock())

    def status(self, token):
        with self._lock:
            self._auth("observer",token)
            return self._controller.read_only_status()

    def revoke(self, token, role):
        """In-process kill switch only. Persistent identity revocation is outstanding."""
        with self._lock:
            self._auth("operator",token)
            need(role in ("hosted-qa","observer"), "Cannot revoke this role")
            self._revoked.add(role)
