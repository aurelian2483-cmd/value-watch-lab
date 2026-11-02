import copy
import datetime as dt
import json
from pathlib import Path
import sys
import tempfile
import unittest
HERE=Path(__file__).resolve().parent
sys.path.insert(0,str(HERE.parent/'scripts') if HERE.name=='tests' else str(HERE))
import horse_model_pipeline as m
class FormModelTests(unittest.TestCase):
 def setUp(self):
  self.tmp=tempfile.TemporaryDirectory();self.root=Path(self.tmp.name);self.now=dt.datetime(2026,11,2,12,tzinfo=dt.timezone.utc)
  self.race={'race_id':'123','racecourse':'Test','name':'Test race','surface':'POLYTRACK','startUTC':'2026-11-02T13:00:00Z',
   'source':'https://www.sportinglife.com/racing/racecards/test/racecard/123/test','runner_data_status':'SINGLE_SOURCE_RUNNERS_OBSERVED',
   'capture_phase':'PRE_EVENT','race_stage':'DORMANT','runner_observed_at_utc':self.now.isoformat(),'runner_source_sha256':'a'*64,'active_runner_count':2,'runners':[]}
  for horse,pos in [('1',1),('2',5)]:
   self.race['runners'].append({'horse_id':horse,'name':'Horse '+horse,'active_runner':True,'runner_status':'RUNNER',
    'previous_results':[{'race_id':str(i),'date':day,'position':pos,'runner_count':8,'run_type':'FLAT'} for i,day in enumerate(['2026-10-10','2026-09-10','2026-08-10'])]})
  self.data={'research_only':True,'publication_gate':'BLOCKED','model_validation':'UNVALIDATED','generated_at_utc':self.now.isoformat(),'races':[self.race]}
 def tearDown(self):self.tmp.cleanup()
 def archive(self):return m.archive_forecasts(self.data,self.now,self.root/'archive')
 def test_full_field_form_probabilities_and_no_future_history(self):
  self.race['runners'][1]['previous_results'].append({'race_id':'future','date':'2026-11-03','position':1,'runner_count':8,'run_type':'FLAT'})
  r,reason=m.forecast(self.race,self.now);self.assertIsNone(reason)
  self.assertGreater(r['runners'][0]['model_probability'],r['runners'][1]['model_probability'])
  self.assertAlmostEqual(sum(x['model_probability'] for x in r['runners']),1)
  self.assertTrue(all(x['form_features']['usable_runs']==3 for x in r['runners']))
 def test_missing_history_nonrunners_and_late_capture(self):
  self.race['runners'][0]['previous_results']=[]
  self.assertEqual(m.forecast(self.race,self.now)[1],'INSUFFICIENT_FORM_FOR_FULL_FIELD')
  self.assertEqual(m.forecast(self.race,self.now+dt.timedelta(minutes=58))[1],'NOT_PRE_EVENT_WITH_BUFFER')
 def test_immutable_repeat_and_changed_field_revision(self):
  r,all,a=self.archive();self.assertEqual(a['new_archived_records'],1);old=r[0]['record_sha256']
  r,all,a=self.archive();self.assertEqual(a['new_archived_records'],0)
  self.race['runners'][0]['previous_results'][0]['position']=2
  r,all,a=self.archive();self.assertEqual(r[0]['revision_of'],old);self.assertEqual(len(all),2)
 def raw_result(self,field=('1','2'),winners=('1',)):
  rides=[{'horse':{'horse_reference':{'id':i}},'ride_status':'RUNNER','finish_position':1 if i in winners else 2} for i in field]
  p={'hasError':False,'race':{'race_summary':{'race_summary_reference':{'id':123},'course_name':'Test','date':'2026-11-02','time':'13:00','race_stage':'WEIGHEDIN'},'rides':rides}}
  return ('<script id="__NEXT_DATA__">'+json.dumps({'props':{'pageProps':p}})+'</script>').encode()
 def test_provisional_metrics_benchmark_repeat_and_tamper(self):
  r,all,a=self.archive();ledger=self.root/'results.json';now=self.now+dt.timedelta(hours=2)
  result=m.score_provisional(all,now,ledger,fetch=lambda record:self.raw_result())
  self.assertEqual(result['scored_forecasts'],1);self.assertEqual(result['independently_verified_results'],0)
  self.assertLess(result['metrics']['mean_log_loss'],result['metrics']['mean_equal_chance_log_loss'])
  result=m.score_provisional(all,now,ledger,fetch=lambda record:(_ for _ in ()).throw(AssertionError('must not refetch')))
  old=json.loads(ledger.read_text());old['entries'][0]['log_loss']=99;ledger.write_text(json.dumps(old))
  with self.assertRaises(ValueError):m.score_provisional(all,now,ledger)
 def test_changed_final_field_and_dead_heat_never_scored(self):
  r,all,a=self.archive();result,reason=m.parse_final(self.raw_result(field=('1','3')),r[0]);self.assertIsNone(result);self.assertEqual(reason,'VOID_FIELD_CHANGED_AFTER_CAPTURE')
  result,reason=m.parse_final(self.raw_result(winners=('1','2')),r[0]);self.assertIsNone(result);self.assertEqual(reason,'DEAD_HEAT_OR_WINNER_UNRESOLVED')
 def test_archive_tampering_fails(self):
  self.archive();p=next((self.root/'archive').glob('*.json'));d=json.loads(p.read_text());d['runners'][0]['model_probability']=.99;p.write_text(json.dumps(d))
  with self.assertRaises(ValueError):self.archive()
if __name__=='__main__':unittest.main()
