import base64,datetime as dt,json,pathlib,sys,unittest
sys.path.insert(0,str(pathlib.Path(__file__).resolve().parents[1]/"scripts"))
from experiment27_live_receipt_audit import audit
SHA="a"*40
def record():return {"generated_at_utc":"2026-10-31T22:47:49Z","kickoff_utc":"2026-11-06T20:00:00Z","home":"Everton"}
def fake(record_value=None,wrong_sha=False,missing=False):
 r=record() if record_value is None else record_value
 def get(url,token):
  if "/actions/runs/" in url:return {"head_sha":("b"*40 if wrong_sha else SHA),"event":"push","status":"completed","conclusion":"success","id":123,"html_url":"https://github.com/example/repo/actions/runs/123","created_at":"2026-10-31T22:49:00Z","updated_at":"2026-10-31T22:50:00Z"}
  if missing:raise ValueError("not found")
  return {"type":"file","path":"records/test.json","content":base64.b64encode(json.dumps(r).encode()).decode()}
 return get
class LiveAuditTests(unittest.TestCase):
 def test_record_present_but_not_challenge_eligible(self):
  x=audit("example/repo",123,"records/test.json",SHA,record(),get_fn=fake())
  self.assertTrue(x["record_present_at_run_head"]);self.assertFalse(x["challenge_eligible"])
 def test_mismatched_run_sha(self):
  with self.assertRaises(ValueError):audit("example/repo",123,"records/test.json",SHA,record(),get_fn=fake(wrong_sha=True))
 def test_mismatched_stored_content(self):
  with self.assertRaises(ValueError):audit("example/repo",123,"records/test.json",SHA,record(),get_fn=fake({"home":"Different"}))
 def test_missing_record(self):
  with self.assertRaises(ValueError):audit("example/repo",123,"records/test.json",SHA,record(),get_fn=fake(missing=True))
 def test_reject_non_record_path(self):
  with self.assertRaises(ValueError):audit("example/repo",123,"scripts/model.py",SHA,record(),get_fn=fake())
if __name__=="__main__":unittest.main()
