"""Offline contracts for receipt validation and read-only website."""
import copy,json,tempfile,unittest
from pathlib import Path
from producers import FLAGS,encode,history,sha,validate
from viewer import render,view

def receipt():
    return {"kind":"LOCAL_FIXED_QA_PRODUCER_BATCH","schemaVersion":1,"sequence":1,"previousSha256":None,
            "revision":"a"*40,"observedAt":"2026-11-25T00:00:00.000Z","status":"FIXED_QA_COMPLETE_RESEARCH_BLOCKED",**FLAGS,
            "producers":[{"id":p,"status":status,"metrics":m,"reportSha256":"b"*64}
             for p,status,m in [
                ("catalogue","PASS",{"registered":331,"target":1000,"qualified":0}),
                ("numerical","PASS",{"total":250,"passed":250,"methods":4}),
                ("forecast","PASS",{"total":250,"passed":250,"methods":8}),
                ("cpu","PASS",{"workloadsPassed":2,"benchmarkRows":4}),
                ("references","REVIEW_REQUIRED",{"sources":3,"claims":3,"independentlyReviewed":0,"rightsVerified":0})]]}

class Contract(unittest.TestCase):
    def test_record_and_mutations(self):
        r=receipt();self.assertEqual(validate(r),r)
        for key,value in (("executionAuthorized",True),("dispatchAuthorized",True),("protectedEvaluationAuthorized",True),("publicationGate","OPEN"),("sequence",0)):
            a=copy.deepcopy(r);a[key]=value
            with self.assertRaises(ValueError):validate(a)
        a=copy.deepcopy(r);a["producers"][1]["metrics"]["passed"]=249
        with self.assertRaises(ValueError):validate(a)
    def test_failure_is_not_success(self):
        a=receipt();a["producers"][0].update(status="FAILED",metrics={},reportSha256=None)
        with self.assertRaises(ValueError):validate(a)
        a["status"]="QA_FAILURE_REVIEW_REQUIRED";self.assertEqual(validate(a),a)
    def test_history_sequence_and_corruption(self):
        with tempfile.TemporaryDirectory() as tmp:
            root=Path(tmp).resolve()
            self.assertEqual(history(root),(None,None))
            first=encode(receipt());(root/"batch-001.json").write_bytes(first)
            r=receipt();r.update(sequence=2,previousSha256=sha(first));p=root/"batch-002.json";p.write_bytes(encode(r))
            self.assertEqual(history(root),(r,sha(encode(r))))
            r["previousSha256"]="c"*64;p.write_bytes(encode(r))
            with self.assertRaises(ValueError):history(root)
            p.unlink();(root/"batch-003.json").write_bytes(encode(r))
            with self.assertRaises(ValueError):history(root)
    def test_unexpected_store_members(self):
        with tempfile.TemporaryDirectory() as tmp:
            root=Path(tmp).resolve();(root/"arbitrary.json").write_text("{}")
            with self.assertRaises(ValueError):history(root)
    def test_website_waiting_and_recorded(self):
        page='<html><head></head><body><nav aria-label="Research navigation" class="nav"></nav><section id="overview"></section></body></html>'
        with tempfile.TemporaryDirectory() as tmp:
            root=Path(tmp).resolve()
            self.assertIn('data-live-state="waiting"',render(page,view(root)))
            (root/"batch-001.json").write_bytes(encode(receipt()))
            output=render(page,view(root),True)
            self.assertIn('Local receipt 1',output)
            self.assertIn('content="15"',output)
            self.assertEqual(output.count("data-producer="),5)
            self.assertIn("No live external data",output)
            self.assertNotIn("<script",output)

if __name__=="__main__":unittest.main()
