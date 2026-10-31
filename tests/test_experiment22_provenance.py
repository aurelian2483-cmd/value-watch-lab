import datetime as dt,hashlib,json,pathlib,sys,tempfile,unittest
sys.path.insert(0,str(pathlib.Path(__file__).resolve().parents[1]/"scripts"))
from experiment22_provenance import check_manifest
NOW=dt.datetime(2026,11,1,tzinfo=dt.timezone.utc)
def record(model_hash,data_hash):
    return {"league":"E0","home":"Everton","away":"Coventry City","kickoff_utc":"2026-11-06T20:00:00Z","generated_at_utc":"2026-10-31T22:47:49Z","source_verified_at_utc":"2026-10-31T21:00:00Z","fixture_source":"https://example.org/fixture","prob_home":0.55,"prob_draw":0.25,"prob_away":0.20,"model_sha256":model_hash,"data_sha256":data_hash,"status":"PROSPECTIVE_RESEARCH_UNVALIDATED"}
class ProvenanceTests(unittest.TestCase):
    def setUp(self):
        self.temp=tempfile.TemporaryDirectory();root=pathlib.Path(self.temp.name)
        self.model=root/"model.py";self.model.write_bytes(b"model v1")
        self.data=root/"input.csv";self.data.write_bytes(b"input v1")
        self.mhash=hashlib.sha256(self.model.read_bytes()).hexdigest()
        item=[{"name":self.data.name,"sha256":hashlib.sha256(self.data.read_bytes()).hexdigest()}]
        self.dhash=hashlib.sha256(json.dumps(item,sort_keys=True,separators=(",",":")).encode()).hexdigest()
    def tearDown(self):self.temp.cleanup()
    def test_valid(self):self.assertEqual(check_manifest(record(self.mhash,self.dhash),self.model,[self.data],NOW)["model_sha256"],self.mhash)
    def test_modified_model(self):
        self.model.write_bytes(b"model changed")
        with self.assertRaises(ValueError):check_manifest(record(self.mhash,self.dhash),self.model,[self.data],NOW)
    def test_modified_input(self):
        self.data.write_bytes(b"input changed")
        with self.assertRaises(ValueError):check_manifest(record(self.mhash,self.dhash),self.model,[self.data],NOW)
    def test_missing_input(self):
        self.data.unlink()
        with self.assertRaises(ValueError):check_manifest(record(self.mhash,self.dhash),self.model,[self.data],NOW)
    def test_missing_input_list(self):
        with self.assertRaises(ValueError):check_manifest(record(self.mhash,self.dhash),self.model,[],NOW)
    def test_duplicate_input(self):
        with self.assertRaises(ValueError):check_manifest(record(self.mhash,self.dhash),self.model,[self.data,self.data],NOW)
if __name__=="__main__":unittest.main()
