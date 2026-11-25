"""Contract tests of the fixed dispatch pilot; no provider feeds or protected data."""
import copy,json,tempfile,unittest
from pathlib import Path
from unittest.mock import patch
from dispatch import (encode,sha,initialize,load_plan,read_state,emit,operate,run_worker,utc)

class DispatchTests(unittest.TestCase):
    def setUp(self):
        self.tmp=tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.base=Path(self.tmp.name).resolve()
        self.root=self.base/"store";self.root.mkdir();initialize(self.root)
        self.path=self.base/"plan.json"
        self.plan={"kind":"APPROVED_FIXED_QA_DISPATCH","schemaVersion":1,"revision":"a"*40,
                   "jobs":[{"id":"cpu","kind":"cpu-probe","backend":"CPU","timeoutSeconds":15},
                           {"id":"gpu","kind":"gpu-qa","backend":"GPU","timeoutSeconds":0},
                           {"id":"lab","kind":"local-qa","backend":"CPU","timeoutSeconds":180}]}
        self.raw=encode(self.plan);self.path.write_bytes(self.raw);self.anchor=sha(self.raw)
    def state(self):return read_state(self.root,self.plan,self.anchor)
    def action(self,previous,action="advance",job=None):
        with patch("dispatch.checkout"):
            return operate(self.root,self.path,self.anchor,previous,action,job)
    def test_plan_guard(self):
        self.assertEqual(load_plan(self.path,self.anchor)[2],self.plan)
        for mutate in ("timeout","backend","arbitrary","duplicate","extra"):
            p=copy.deepcopy(self.plan)
            if mutate=="timeout":p["jobs"][0]["timeoutSeconds"]=99
            elif mutate=="backend":p["jobs"][1]["backend"]="CPU"
            elif mutate=="arbitrary":p["jobs"][0]["kind"]="shell"
            elif mutate=="duplicate":p["jobs"][1]["id"]="cpu"
            else:p["jobs"][0]["command"]="anything"
            raw=encode(p);self.path.write_bytes(raw)
            with self.subTest(mutate=mutate),self.assertRaises(ValueError):load_plan(self.path,sha(raw))
        with self.assertRaises(ValueError):load_plan(self.path,self.anchor)
    def test_cancel_pending_and_gpu_gate(self):
        s=self.action(None,"cancel","cpu")
        self.assertEqual(s["jobs"][0]["status"],"CANCELLED")
        with self.assertRaisesRegex(ValueError,"anchor"):self.action(None)
        with patch("dispatch.run_worker") as w:
            s=self.action(s["eventSha256"])
            self.assertEqual(s["jobs"][1]["status"],"BLOCKED_GPU")
            w.assert_not_called()
        s=self.action(s["eventSha256"],"cancel","lab")
        self.assertEqual(s["status"],"FIXED_QA_QUEUE_TERMINAL")
        self.assertFalse(s["productionDispatchAuthorized"])
        self.assertEqual(s["publicationGate"],"BLOCKED")
    def test_terminal_failure_and_timeout_retained(self):
        with patch("dispatch.run_worker",return_value=("TIMED_OUT",None)):
            s=self.action(None)
        self.assertEqual(s["jobs"][0]["status"],"TIMED_OUT")
        self.assertEqual(s["eventCount"],2)
        self.assertEqual(self.state(),s)
        with self.assertRaises(ValueError):self.action(s["eventSha256"],"cancel","cpu")
    def test_active_interruption_stops_without_retry(self):
        with patch("dispatch.run_worker",side_effect=OSError("interrupted")):
            with self.assertRaises(OSError):self.action(None)
        s=self.state()
        self.assertEqual(s["active"],"cpu")
        self.assertEqual(s["status"],"INTERRUPTED_OR_RUNNING_REVIEW_REQUIRED")
        with self.assertRaisesRegex(ValueError,"requires review"):
            self.action(s["eventSha256"])
    def test_chain_tampering_and_lock(self):
        s=self.action(None,"cancel","cpu")
        p=self.root/"events"/"001.json";original=p.read_bytes()
        e=json.loads(original);e["previousSha256"]="1"*64;p.write_bytes(encode(e))
        with self.assertRaisesRegex(ValueError,"chain"):self.state()
        p.write_bytes(original);(self.root/".lock").mkdir()
        with self.assertRaises(FileExistsError):self.action(s["eventSha256"])
    def test_actual_process_timeout(self):
        # Deliberately tiny limit only for a direct trusted worker test;
        # approval contract itself rejects changing the fixed budget.
        job={**self.plan["jobs"][0],"timeoutSeconds":.001}
        self.assertEqual(run_worker(self.root,job,self.plan["revision"]),("TIMED_OUT",None))
        self.assertFalse((self.root/"outputs"/"cpu.json").exists())
if __name__=="__main__":unittest.main()
