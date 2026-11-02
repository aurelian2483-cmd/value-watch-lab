import copy
import datetime as dt
import json
from pathlib import Path
import sys
import tempfile
import unittest
HERE=Path(__file__).resolve().parent
sys.path.insert(0,str(HERE.parent/'scripts') if HERE.name=='tests' else str(HERE))
from horse_reference_baseline import build
class ReferenceTests(unittest.TestCase):
 def setUp(self):
  self.now=dt.datetime(2026,11,2,12,tzinfo=dt.timezone.utc);self.tmp=tempfile.TemporaryDirectory();self.archive=Path(self.tmp.name)/'archive'
  rs=[{'horse_id':str(i),'name':'Horse '+str(i),'active_runner':i<3,'runner_status':'RUNNER' if i<3 else 'NONRUNNER'} for i in range(4)]
  self.data={'research_only':True,'publication_gate':'BLOCKED','model_validation':'UNVALIDATED','generated_at_utc':self.now.isoformat(),
   'races':[{'race_id':'1','racecourse':'Test','startUTC':'2026-11-02T13:00:00Z','runner_data_status':'SINGLE_SOURCE_RUNNERS_OBSERVED',
    'capture_phase':'PRE_EVENT','race_stage':'DORMANT','runner_observed_at_utc':self.now.isoformat(),'runners':rs,
    'active_runner_count':3,'non_runner_count':1,'runner_source_sha256':'a'*64}]}
 def tearDown(self):self.tmp.cleanup()
 def test_uniform_sum_nonrunner_exclusion_idempotence(self):
  r,a=build(self.data,self.now,self.archive);self.assertEqual(len(r[0]['runners']),3);self.assertAlmostEqual(sum(x['reference_probability'] for x in r[0]['runners']),1)
  self.assertTrue(r[0]['reference_only']);self.assertEqual(a['new_archived_records'],1)
  r,a=build(self.data,self.now,self.archive);self.assertEqual(a['new_archived_records'],0)
 def test_withdrawn_horse_is_excluded_from_reference(self):
  self.data['races'][0]['runners'][0].update(active_runner=False,runner_status='WITHDRAWN')
  self.data['races'][0]['active_runner_count']=2;self.data['races'][0]['non_runner_count']=2
  r,a=build(self.data,self.now,self.archive)
  self.assertEqual(len(r[0]['runners']),2);self.assertNotIn('0',[x['horse_id'] for x in r[0]['runners']])
  self.assertTrue(all(x['reference_probability']==.5 for x in r[0]['runners']))
 def test_changed_field_keeps_previous_record(self):
  r,a=build(self.data,self.now,self.archive);old=r[0]['record_sha256']
  self.data['races'][0]['runners'][0].update(active_runner=False,runner_status='NONRUNNER');self.data['races'][0]['active_runner_count']=2;self.data['races'][0]['non_runner_count']=2
  r,a=build(self.data,self.now+dt.timedelta(minutes=1),self.archive)
  self.assertEqual(r[0]['supersedes_record_sha256'],old);self.assertEqual(len(list(self.archive.glob('*.json'))),2)
 def test_late_stale_and_tampered_records(self):
  r,a=build(self.data,self.now+dt.timedelta(minutes=58),self.archive);self.assertEqual(r,[])
  r,a=build(self.data,self.now+dt.timedelta(minutes=31),self.archive);self.assertEqual(r,[])
  build(self.data,self.now,self.archive);p=next(self.archive.glob('*.json'));v=json.loads(p.read_text());v['active_runner_count']=99;p.write_text(json.dumps(v))
  with self.assertRaises(ValueError):build(self.data,self.now,self.archive)
 def test_unsafe_data_rejected(self):
  self.data['publication_gate']='OPEN'
  with self.assertRaises(ValueError):build(self.data,self.now,self.archive)
if __name__=='__main__':unittest.main()
