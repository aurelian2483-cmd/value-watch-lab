import datetime as dt,hashlib,sys,unittest,pathlib
sys.path.insert(0,str(pathlib.Path(__file__).resolve().parents[1]/"scripts"))
from experiment21_ledger import propose,validate_ledger
NOW=dt.datetime(2026,11,1,tzinfo=dt.timezone.utc)
def record():
    return {"league":"E0","home":"Everton","away":"Coventry City","kickoff_utc":"2026-11-06T20:00:00Z","generated_at_utc":"2026-10-31T22:47:49Z","source_verified_at_utc":"2026-10-31T21:00:00Z","fixture_source":"https://example.org/fixture","prob_home":0.55,"prob_draw":0.25,"prob_away":0.20,"model_sha256":"a"*64,"data_sha256":"b"*64,"status":"PROSPECTIVE_RESEARCH_UNVALIDATED"}
class LedgerTests(unittest.TestCase):
    def test_valid(self):self.assertEqual(len(propose([], [record()], NOW)),1)
    def test_duplicate(self):
        with self.assertRaises(ValueError):propose([record()],[record()],NOW)
    def test_bad_sum(self):
        r=record();r["prob_away"]=0.9
        with self.assertRaises(ValueError):propose([],[r],NOW)
    def test_after_kickoff(self):
        r=record();r["generated_at_utc"]="2026-11-07T00:00:00Z"
        with self.assertRaises(ValueError):propose([],[r],NOW)
    def test_dry_run_rejected(self):
        r=record();r["status"]="DRY_RUN_UNVALIDATED_NOT_CHALLENGE"
        with self.assertRaises(ValueError):propose([],[r],NOW)
    def test_missing_hash(self):
        r=record();r["model_sha256"]=""
        with self.assertRaises(ValueError):propose([],[r],NOW)
    def test_existing_not_mutated(self):
        r=record();ledger=[r];another=dict(r,home="Leeds",away="Tottenham")
        propose(ledger,[another],NOW)
        self.assertEqual(ledger,[r])
if __name__=="__main__":unittest.main()
