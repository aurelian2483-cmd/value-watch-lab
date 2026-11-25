"""Offline validation of portable hosted receipts and optional worker boundaries."""
import copy,unittest
from receipt import verify,render
from hosted import FLAGS,digest

def sample():
    rows=[
        {"id":"catalogue","status":"PASS","metrics":{"registered":331,"target":1000,"qualified":0},"reportSha256":"a"*64},
        {"id":"numerical","status":"PASS","metrics":{"total":250,"passed":250,"methods":4},"reportSha256":"a"*64},
        {"id":"forecast","status":"PASS","metrics":{"total":250,"passed":250,"methods":8},"reportSha256":"a"*64},
        {"id":"cpu","status":"PASS","metrics":{"workloadsPassed":2,"benchmarkRows":4},"reportSha256":"a"*64},
        {"id":"references","status":"REVIEW_REQUIRED","metrics":{"sources":1,"claims":1,"independentlyReviewed":0,"rightsVerified":0},"reportSha256":"a"*64}]
    s={"kind":"HOSTED_FIXED_QA_RECEIPT","schemaVersion":1,"observedAt":"2026-11-25T00:00:00.000Z","revision":"a"*40,"runId":"1",
       "worker":{"kind":"HOSTED_LINUX_CPU","homePcRequired":False,"gpuAvailable":False,"identityAttestation":"CI_CONTEXT_NOT_WORKER_SIGNATURE"},
       "queue":{"planSha256":"a"*64,"eventSha256":"b"*64,"eventCount":5,"jobs":[{"id":"probe","kind":"cpu-probe","backend":"CPU","timeoutSeconds":15,"status":"PASSED"},{"id":"local","kind":"local-qa","backend":"CPU","timeoutSeconds":180,"status":"PASSED"},{"id":"gpu","kind":"gpu-qa","backend":"GPU","timeoutSeconds":0,"status":"BLOCKED_GPU"}]},
       "producers":rows,"syntheticCases":500,"empiricallyQualifiedMethods":0,"optionalWorker":{"state":"NOT_CONNECTED","backend":"GPU","dispatchAuthorized":False},"productionDispatchAuthorized":False,"measurementFreshness":"UNKNOWN",**FLAGS}
    return {**s,"receiptSha256":digest(s)}
class ReceiptTests(unittest.TestCase):
    def test_valid(self):
        s=sample();self.assertEqual(verify(s),s)
        page=render(s)
        for t in ("Home PC required: No","500 / 500","NOT CONNECTED","PRODUCTION DISPATCH BLOCKED"):self.assertIn(t,page)
        self.assertNotIn("<script",page)
    def test_tamper(self):
        s=sample();s["observedAt"]="2026-11-25T01:00:00.000Z"
        with self.assertRaises(ValueError):verify(s)
    def test_rehashed_unsafe_claims(self):
        for path,value in [(("worker","homePcRequired"),True),(("optionalWorker","dispatchAuthorized"),True),(("productionDispatchAuthorized",),True),(("empiricallyQualifiedMethods",),1),(("queue","eventCount"),4),(("syntheticCases",),499)]:
            s=sample();x=s
            for k in path[:-1]:x=x[k]
            x[path[-1]]=value
            s["receiptSha256"]=digest({k:v for k,v in s.items() if k!="receiptSha256"})
            with self.subTest(path=path),self.assertRaises(ValueError):verify(s)
if __name__=="__main__":unittest.main()
