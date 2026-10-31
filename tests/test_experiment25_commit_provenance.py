import datetime as dt,pathlib,sys,unittest
sys.path.insert(0,str(pathlib.Path(__file__).resolve().parents[1]/"scripts"))
from experiment25_commit_provenance import verify
NOW=dt.datetime(2026,11,1,tzinfo=dt.timezone.utc)
def record():
 return {"league":"E0","home":"Everton","away":"Coventry City","kickoff_utc":"2026-11-06T20:00:00Z","generated_at_utc":"2026-10-31T22:47:49Z","source_verified_at_utc":"2026-10-31T21:00:00Z","fixture_source":"https://example.org/fixture","prob_home":0.55,"prob_draw":0.25,"prob_away":0.20,"model_sha256":"a"*64,"data_sha256":"b"*64,"status":"PROSPECTIVE_RESEARCH_UNVALIDATED"}
def commit():return {"sha":"a"*40,"author_date":"2026-10-31T22:48:00Z","committer_date":"2026-10-31T22:48:10Z"}
class CommitTests(unittest.TestCase):
 def test_consistent_not_verified(self):self.assertFalse(verify(record(),commit(),NOW)["challenge_eligible"])
 def test_after_kickoff(self):
  c=commit();c["committer_date"]="2026-11-07T00:00:00Z"
  with self.assertRaises(ValueError):verify(record(),c,NOW)
 def test_invalid_sha(self):
  c=commit();c["sha"]="bad"
  with self.assertRaises(ValueError):verify(record(),c,NOW)
 def test_author_after_commit(self):
  c=commit();c["author_date"]="2026-10-31T22:49:00Z"
  with self.assertRaises(ValueError):verify(record(),c,NOW)
 def test_generation_after_commit(self):
  r=record();r["generated_at_utc"]="2026-10-31T22:50:00Z"
  with self.assertRaises(ValueError):verify(r,commit(),NOW)
if __name__=="__main__":unittest.main()
