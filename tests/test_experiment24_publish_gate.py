import datetime as dt,pathlib,sys,unittest
sys.path.insert(0,str(pathlib.Path(__file__).resolve().parents[1]/"scripts"))
from experiment24_publish_gate import gate
NOW=dt.datetime(2026,11,1,tzinfo=dt.timezone.utc)
def rec():
 return {"league":"E0","home":"Everton","away":"Coventry City","kickoff_utc":"2026-11-06T20:00:00Z","generated_at_utc":"2026-10-31T22:47:49Z","source_verified_at_utc":"2026-10-31T21:00:00Z","fixture_source":"https://example.org/fixture","prob_home":0.55,"prob_draw":0.25,"prob_away":0.20,"model_sha256":"a"*64,"data_sha256":"b"*64,"status":"PROSPECTIVE_RESEARCH_UNVALIDATED"}
def att(r):
 return {"fixture_key":[r["league"],r["home"],r["away"],r["kickoff_utc"]],"source_url":r["fixture_source"],"verified_at_utc":r["source_verified_at_utc"],"independent":True,"training_cutoff_utc":"2026-10-30T23:59:59Z","training_data_complete":True}
class GateTests(unittest.TestCase):
 def test_valid_attestation_structure(self):
  r=rec();self.assertFalse(gate(r,[],NOW,att(r))["publication_authorised"])
 def test_missing_attestation(self):
  with self.assertRaises(ValueError):gate(rec(),[],NOW)
 def test_duplicate(self):
  r=rec()
  with self.assertRaises(ValueError):gate(r,[r],NOW,att(r))
 def test_unverified(self):
  r=rec();a=att(r);a["independent"]=False
  with self.assertRaises(ValueError):gate(r,[],NOW,a)
 def test_stale(self):
  r=rec();r["source_verified_at_utc"]="2026-10-30T20:00:00Z";a=att(r)
  with self.assertRaises(ValueError):gate(r,[],NOW,a)
 def test_future_cutoff(self):
  r=rec();a=att(r);a["training_cutoff_utc"]="2026-11-02T00:00:00Z"
  with self.assertRaises(ValueError):gate(r,[],NOW,a)
 def test_incomplete_training(self):
  r=rec();a=att(r);a["training_data_complete"]=False
  with self.assertRaises(ValueError):gate(r,[],NOW,a)
 def test_wrong_fixture(self):
  r=rec();a=att(r);a["fixture_key"][1]="Arsenal"
  with self.assertRaises(ValueError):gate(r,[],NOW,a)
if __name__=="__main__":unittest.main()
