"""Independent targeted regressions; all temporary stores are synthetic."""
import copy,hashlib,json,subprocess,sys,tempfile,unittest
from pathlib import Path
from datetime import timedelta
P=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(P))
import phase3_ab as ab
from test_phase3 import ResearchPipelineTests

class ReviewFixes(unittest.TestCase):
    @classmethod
    def setUpClass(cls):ResearchPipelineTests.setUpClass()
    def setUp(self):
        self.tmp=tempfile.TemporaryDirectory(prefix='independent-review-synthetic-',dir=P/'state')
        self.root=Path(self.tmp.name);self.now=ResearchPipelineTests.now
        ab.register(self.root,self.now-timedelta(minutes=5))
    def tearDown(self):self.tmp.cleanup()
    def test_numeric_overflow_json_is_rejected(self):
        with self.assertRaises(ab.ResearchError):ab.strict_json('{"overflow":1e9999}')
    def test_schedule_revision_does_not_inflate_races(self):
        r=copy.deepcopy(ResearchPipelineTests.fixture);ab.capture(r,self.root,self.now)
        r['startUTC']=(ab.stamp(r['startUTC'])+timedelta(minutes=10)).isoformat();ResearchPipelineTests.seal(r)
        try:ab.capture(r,self.root,self.now+timedelta(seconds=1))
        except ab.ResearchError:pass
        _,s=ab.analyze(self.root,self.now+timedelta(seconds=2))
        self.assertEqual(s['genuinely_pre_event_paired_races'],1)
    def test_null_runner_has_structured_rejection(self):
        r=copy.deepcopy(ResearchPipelineTests.fixture);r['runners'][0]=None;ResearchPipelineTests.seal(r)
        with self.assertRaises(ab.ResearchError):ab.capture(r,self.root,self.now)
        self.assertTrue(any(e['event']=='CAPTURE_EXCLUDED' for _,e in ab.objects(self.root,'events')))
    def test_actual_collection_receipt_git_hash(self):
        feed=P/'acquisition'/'horse-predictions-data.json'
        # Feed can age beyond freshness limit; receipt still preserves exact bytes.
        cp=subprocess.run([sys.executable,str(P/'collect_research.py'),'--ref','9bdc35c9581744bb19495ab38663c585076445c0','--local',str(feed),'--store',str(self.root)],capture_output=True,text=True,timeout=20)
        receipts=[s for _,s in ab.objects(self.root,'snapshots') if s.get('transport')=='PINNED_CONNECTOR_SNAPSHOT_LOCAL']
        self.assertEqual(len(receipts),1)
        b=feed.read_bytes();correct=hashlib.sha1(b'blob '+str(len(b)).encode()+b'\0'+b).hexdigest()
        self.assertEqual(receipts[0]['git_blob_sha1'],correct)

if __name__=='__main__':unittest.main(verbosity=2)
