import copy
import tempfile
import unittest
import hashlib
from pathlib import Path
from controller import FLAGS
from scheduler import digest
from status_export import project,export,render,EXPECTED_EVENTS,EXPECTED_JOBS

class ExportTests(unittest.TestCase):
    def setUp(self):
        self.rev="a"*40
        self.admission={"kind":"FIXED_QA_ADMISSION","approvalSha256":digest({"schema":1,"revision":self.rev,"opensAt":10,"closesAt":20,"scope":"FIXED_QA_ONLY"}),
                        "revision":self.rev,"opensAt":10,"closesAt":20,"state":"ADMITTED","decidedAt":10,"homePcRequired":False,
                        "gpuDispatchAuthorized":False,"productionDispatchAuthorized":False,"publicationGate":"BLOCKED","researchStatus":"UNVALIDATED"}
        jobs=[]
        for i,(job,kind,backend,state) in enumerate(EXPECTED_JOBS):
            jobs.append({"id":job,"kind":kind,"backend":backend,"state":state,"revision":self.rev,"worker":"hosted-qa" if i<2 else None,"expires":250 if i<2 else None,"receipt_hash":str(i+1)*64 if i<2 else None})
        self.snapshot={"kind":"LOCAL_CONTROLLER_QA_SNAPSHOT","freshness":"STORED_STATE_ONLY",**FLAGS,"jobs":jobs,
                       "events":[{"seq":i,"job":j,"action":a,"at":10+i} for i,(j,a) in enumerate(EXPECTED_EVENTS,1)]}
    def check(self):
        return project(self.snapshot,self.admission,self.rev,"123","1")
    def test_redaction_and_static_page(self):
        r=self.check()
        self.assertEqual(r["hostedCpuJobs"],2)
        self.assertEqual(r["measurementFreshness"],"UNKNOWN")
        page=render(r)
        for text in ("Historical hosted test snapshot","Physical PC not connected","PUBLICATION BLOCKED","/runs/123/attempts/1"):
            self.assertIn(text,page)
        for text in ("<script","<form","<button","1111111111111111","receipt_hash","token"):
            self.assertNotIn(text,page)
    def test_unsafe_gates_rejected(self):
        self.snapshot["productionDispatchAuthorized"]=True
        with self.assertRaises(ValueError): self.check()
    def test_gpu_claim_and_duplicate_rejected(self):
        original=copy.deepcopy(self.snapshot)
        self.snapshot["jobs"][2]["worker"]="pc-qa"
        with self.assertRaises(ValueError): self.check()
        self.snapshot=original
        self.snapshot["jobs"][1]["receipt_hash"]=self.snapshot["jobs"][0]["receipt_hash"]
        with self.assertRaises(ValueError): self.check()
    def test_bad_provenance_rejected(self):
        with self.assertRaises(ValueError): project(self.snapshot,self.admission,self.rev,"<script>","1")
        self.admission["approvalSha256"]="b"*64
        with self.assertRaises(ValueError): self.check()
    def test_events_and_unexpected_fields_rejected(self):
        self.snapshot["events"].pop()
        with self.assertRaises(ValueError): self.check()
        self.snapshot["events"]=[{"seq":i,"job":j,"action":a,"at":10+i} for i,(j,a) in enumerate(EXPECTED_EVENTS,1)]
        self.snapshot["token"]="secret"
        with self.assertRaises(ValueError): self.check()
    def test_export_bytes(self):
        with tempfile.TemporaryDirectory() as tmp:
            dest=Path(tmp)/"site"
            export(self.snapshot,self.admission,self.rev,dest,"123","1")
            self.assertEqual(set(p.name for p in dest.iterdir()),{"index.html","status.json","status.sha256"})
            self.assertEqual((dest/"status.sha256").read_text().split()[0],hashlib.sha256((dest/"status.json").read_bytes()).hexdigest())
            with self.assertRaises(FileExistsError): export(self.snapshot,self.admission,self.rev,dest,"123","1")
