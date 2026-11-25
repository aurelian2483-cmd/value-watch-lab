import hashlib
import tempfile
import unittest
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from controller import Controller
from service import Service
from scheduler import Scheduler,digest

class SchedulerTests(unittest.TestCase):
    def setUp(self):
        self.temp=tempfile.TemporaryDirectory()
        self.path=Path(self.temp.name)/"queue.db"
        self.tokens={r:str(i)*64 for i,r in enumerate(("operator","hosted-qa","observer"),1)}
        self.digests={k:hashlib.sha256(v.encode()).hexdigest() for k,v in self.tokens.items()}
        self.now=10
        self.plan={"schema":1,"revision":"a"*40,"opensAt":20,"closesAt":30,"scope":"FIXED_QA_ONLY"}
        self.anchor=digest(self.plan)
        self.service=self.new_service()
        self.schedule=self.new_scheduler(self.service)
    def tearDown(self):
        self.temp.cleanup()
    def new_service(self):
        return Service(Controller(self.path),self.digests,"a"*40,clock=lambda:self.now)
    def new_scheduler(self,s):
        return Scheduler(s,self.tokens["operator"],self.plan,self.anchor)
    def poll(self):
        return self.schedule.poll(self.tokens["operator"])
    def test_window_and_cpu_independence(self):
        self.assertEqual(self.poll()["state"],"WAITING")
        self.assertIsNone(self.service.claim(self.tokens["hosted-qa"]))
        self.now=20
        result=self.poll()
        self.assertEqual(result["state"],"ADMITTED")
        self.assertFalse(result["homePcRequired"])
        self.assertFalse(result["productionDispatchAuthorized"])
        self.assertEqual([j["state"] for j in self.service.status(self.tokens["observer"])["jobs"]],["QUEUED","QUEUED","BLOCKED_GPU"])
        self.assertEqual(self.service.claim(self.tokens["hosted-qa"])["kind"],"cpu-probe")
    def test_concurrent_poll_and_restart(self):
        other=self.new_scheduler(self.new_service())
        self.now=25
        with ThreadPoolExecutor(max_workers=2) as pool:
            results=list(pool.map(lambda q:q.poll(self.tokens["operator"]),(self.schedule,other)))
        self.assertEqual(results[0],results[1])
        self.assertEqual(len(self.service.status(self.tokens["observer"])["events"]),3)
        self.assertEqual(self.new_scheduler(self.new_service()).status(self.tokens["observer"])["state"],"ADMITTED")
    def test_missed_and_rollback(self):
        self.now=30
        self.assertEqual(self.poll()["state"],"MISSED")
        self.now=25
        with self.assertRaises(ValueError):
            self.poll()
        self.now=31
        self.assertEqual(self.poll()["state"],"MISSED")
        self.assertEqual(self.service.status(self.tokens["observer"])["jobs"],[])
    def test_cancel_is_terminal(self):
        self.assertEqual(self.schedule.poll(self.tokens["operator"],cancel=True)["state"],"CANCELLED")
        self.now=25
        self.assertEqual(self.poll()["state"],"CANCELLED")
        self.assertEqual(self.service.status(self.tokens["observer"])["jobs"],[])
    def test_anchor_scope_and_policy(self):
        for plan in (self.plan|{"opensAt":19},self.plan|{"scope":"PRODUCTION"},self.plan|{"closesAt":4000},self.plan|{"revision":"b"*40}):
            with self.assertRaises(ValueError):
                Scheduler(self.service,self.tokens["operator"],plan,digest(plan))
        with self.assertRaises(ValueError):
            Scheduler(self.service,self.tokens["operator"],self.plan,"b"*64)
    def test_roles_and_read_only(self):
        with self.assertRaises(ValueError):
            self.schedule.poll(self.tokens["observer"])
        with self.assertRaises(ValueError):
            self.schedule.status(self.tokens["hosted-qa"])
        before=self.path.read_bytes()
        self.assertEqual(self.schedule.status(self.tokens["observer"])["state"],"WAITING")
        self.assertEqual(before,self.path.read_bytes())
        self.service.revoke(self.tokens["operator"],"observer")
        with self.assertRaises(ValueError):
            self.schedule.status(self.tokens["observer"])
    def test_existing_queue_fails_closed(self):
        with self.assertRaises(ValueError):
            self.service.enqueue(self.tokens["operator"],"probe","cpu-probe")
        # Trusted administrative storage bypass is still detected by admission.
        self.service._controller.enqueue("probe","a"*40,"cpu-probe",self.now)
        self.now=25
        with self.assertRaises(ValueError):
            self.poll()
        self.assertEqual(len(self.service.status(self.tokens["observer"])["jobs"]),1)
        self.assertEqual(self.schedule.status(self.tokens["observer"])["state"],"WAITING")
    def test_schedule_survives_isolated_restore(self):
        from recovery import backup,restore_isolated
        self.now=25
        self.poll()
        archived=self.path.with_name("archive.db")
        restored=self.path.with_name("restored.db")
        anchor=backup(self.path,archived)
        restore_isolated(archived,restored,anchor)
        s=Service(Controller(restored),self.digests,"a"*40,clock=lambda:self.now)
        q=self.new_scheduler(s)
        self.assertEqual(q.poll(self.tokens["operator"])["state"],"ADMITTED")
        self.assertEqual(len(s.status(self.tokens["observer"])["events"]),3)
    def test_no_second_schedule(self):
        self.now=25
        self.poll()
        with self.assertRaises(ValueError):
            Scheduler(self.service,self.tokens["operator"],self.plan|{"opensAt":21},digest(self.plan|{"opensAt":21}))
