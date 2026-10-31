import datetime as dt,pathlib,sys,unittest
sys.path.insert(0,str(pathlib.Path(__file__).resolve().parents[1]/"scripts"))
from experiment26_server_receipt import verify_receipt
SHA="a"*40
def record():return {"generated_at_utc":"2026-10-31T22:47:49Z","kickoff_utc":"2026-11-06T20:00:00Z"}
def run():return {"head_sha":SHA,"event":"push","status":"completed","conclusion":"success","id":123,"html_url":"https://github.com/example/repo/actions/runs/123","created_at":"2026-10-31T22:49:00Z","updated_at":"2026-10-31T22:50:00Z"}
class ReceiptTests(unittest.TestCase):
 def test_consistent_but_not_eligible(self):self.assertFalse(verify_receipt(record(),run(),SHA)["challenge_eligible"])
 def test_wrong_sha(self):
  r=run();r["head_sha"]="b"*40
  with self.assertRaises(ValueError):verify_receipt(record(),r,SHA)
 def test_after_kickoff(self):
  r=run();r["created_at"]="2026-11-06T21:00:00Z";r["updated_at"]="2026-11-06T21:01:00Z"
  with self.assertRaises(ValueError):verify_receipt(record(),r,SHA)
 def test_failed_run(self):
  r=run();r["conclusion"]="failure"
  with self.assertRaises(ValueError):verify_receipt(record(),r,SHA)
 def test_invalid_event(self):
  r=run();r["event"]="pull_request"
  with self.assertRaises(ValueError):verify_receipt(record(),r,SHA)
 def test_reversed_times(self):
  r=run();r["updated_at"]="2026-10-31T22:48:00Z"
  with self.assertRaises(ValueError):verify_receipt(record(),r,SHA)
 def test_missing_run_id(self):
  r=run();r.pop("id")
  with self.assertRaises(ValueError):verify_receipt(record(),r,SHA)
 def test_generation_after_run(self):
  r=record();r["generated_at_utc"]="2026-10-31T23:00:00Z"
  with self.assertRaises(ValueError):verify_receipt(r,run(),SHA)
if __name__=="__main__":unittest.main()
