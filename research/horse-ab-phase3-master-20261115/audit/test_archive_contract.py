import copy,datetime as dt,json,sys,unittest
from pathlib import Path
P=Path(__file__).parent
sys.path.insert(0,str(P/'source/scripts'))
import horse_context_pipeline as context
from enrich_horse_runners import stamp

class ArchiveContract(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.records=[json.loads(x.read_text()) for x in (P/'raw76').glob('*.json')]
    def test_all_original_archive_hashes_and_vectors(self):
        self.assertEqual(len(self.records),76)
        for r in self.records:context.validate_record(r)
    def test_naive_timestamps_rejected(self):
        with self.assertRaises(ValueError):stamp('2026-11-15T12:00:00')
    def test_offsets_represent_same_instant(self):
        self.assertEqual(stamp('2026-07-15T13:00:00+01:00'),stamp('2026-07-15T12:00:00Z'))
    def test_tampering_without_rehash_rejected(self):
        r=copy.deepcopy(self.records[0]);r['runners'][0]['model_probability']+=.001
        with self.assertRaises(ValueError):context.validate_record(r)
    def test_duplicate_runner_rejected_even_if_rehashed(self):
        r=copy.deepcopy(self.records[0]);r['runners'][1]['horse_id']=r['runners'][0]['horse_id'];r.pop('record_sha256');r['record_sha256']=context.sha(r)
        with self.assertRaises(ValueError):context.validate_record(r)
    def test_non_normalized_vector_rejected_even_if_rehashed(self):
        r=copy.deepcopy(self.records[0]);r['runners'][0]['model_probability']+=.001;r.pop('record_sha256');r['record_sha256']=context.sha(r)
        with self.assertRaises(ValueError):context.validate_record(r)
    def test_post_event_forecast_rejected_even_if_rehashed(self):
        r=copy.deepcopy(self.records[0]);r['generated_at_utc']=r['startUTC'];r.pop('record_sha256');r['record_sha256']=context.sha(r)
        with self.assertRaises(ValueError):context.validate_record(r)
if __name__=='__main__':unittest.main(verbosity=2)
