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
 def test_corrected_winner_appends_amendment_and_preserves_original(self):
  _,records,_=self.archive();path=self.root/'corrections.json';first=self.now+dt.timedelta(hours=2)
  m.score_provisional(records,first,path,fetch=lambda r:self.raw_result())
  original=copy.deepcopy(json.loads(path.read_text())['entries'])
  later=first+dt.timedelta(hours=6)
  result=m.score_provisional(records,later,path,fetch=lambda r:self.raw_result(winners=('2',)))
  ledger=json.loads(path.read_text());self.assertEqual(ledger['entries'],original)
  self.assertEqual(result['entries'][0]['winner_horse_id'],'2');self.assertEqual(result['amendment_count'],1)
  amendment=ledger['amendments'][0];self.assertEqual(amendment['previous_entry'],original[0]);self.assertEqual(amendment['action'],'REPLACE')
  self.assertAlmostEqual(result['metrics']['mean_log_loss'],-m.math.log(records[0]['runners'][1]['model_probability']))
  repeated=m.score_provisional(records,later,path,fetch=lambda r:(_ for _ in ()).throw(AssertionError('must not refetch')))
  self.assertEqual(repeated['entries'][0]['winner_horse_id'],'2')
  ledger['amendments'][0]['reason']='tampered';path.write_text(json.dumps(ledger))
  with self.assertRaises(ValueError):m.score_provisional(records,later,path)
 def test_unchanged_result_recheck_has_no_amendment_and_respects_window(self):
  _,records,_=self.archive();path=self.root/'unchanged.json';first=self.now+dt.timedelta(hours=2)
  m.score_provisional(records,first,path,fetch=lambda r:self.raw_result());original=json.loads(path.read_text())['entries']
  result=m.score_provisional(records,first+dt.timedelta(hours=6),path,fetch=lambda r:self.raw_result())
  self.assertEqual(result['amendment_count'],0);self.assertEqual(result['entries'][0]['result_recheck_status'],'LATEST_SOURCE_CONFIRMED')
  self.assertEqual(json.loads(path.read_text())['entries'],original)
  m.score_provisional(records,first+dt.timedelta(hours=49),path,fetch=lambda r:(_ for _ in ()).throw(AssertionError('outside window')))
 def test_source_error_retains_flagged_provisional_score(self):
  _,records,_=self.archive();path=self.root/'source-error.json';first=self.now+dt.timedelta(hours=2)
  m.score_provisional(records,first,path,fetch=lambda r:self.raw_result())
  def unavailable(r):raise TimeoutError('offline')
  result=m.score_provisional(records,first+dt.timedelta(hours=6),path,fetch=unavailable)
  self.assertEqual(result['scored_forecasts'],1);self.assertEqual(result['amendment_count'],0)
  self.assertEqual(result['source_unavailable_rechecks'],1)
  self.assertEqual(result['entries'][0]['result_recheck_status'],'SOURCE_UNAVAILABLE_PREVIOUS_PROVISIONAL_RETAINED')
  self.assertEqual(m.settled_history(records,result)[0]['result_recheck_status'],'SOURCE_UNAVAILABLE_PREVIOUS_PROVISIONAL_RETAINED')
 def test_invalidated_final_withholds_score_and_restoration_is_auditable(self):
  _,records,_=self.archive();path=self.root/'withheld.json';first=self.now+dt.timedelta(hours=2)
  m.score_provisional(records,first,path,fetch=lambda r:self.raw_result());original=json.loads(path.read_text())['entries']
  invalid=m.score_provisional(records,first+dt.timedelta(hours=6),path,fetch=lambda r:self.raw_result(field=('1','3')))
  self.assertEqual(invalid['scored_forecasts'],0);self.assertEqual(invalid['withheld_results'],1)
  self.assertIsNone(invalid['metrics']['mean_log_loss']);self.assertEqual(json.loads(path.read_text())['entries'],original)
  restored=m.score_provisional(records,first+dt.timedelta(hours=12),path,fetch=lambda r:self.raw_result())
  self.assertEqual(restored['scored_forecasts'],1);self.assertEqual(restored['withheld_results'],0)
  self.assertEqual(restored['amendment_count'],2)
  self.assertEqual(json.loads(path.read_text())['amendments'][-1]['reason'],'SOURCE_RESULT_RESTORED')
 def test_invalid_source_structure_withholds_previous_score(self):
  _,records,_=self.archive();path=self.root/'invalid-source.json';first=self.now+dt.timedelta(hours=2)
  m.score_provisional(records,first,path,fetch=lambda r:self.raw_result())
  invalid=m.score_provisional(records,first+dt.timedelta(hours=6),path,fetch=lambda r:b'bad page')
  self.assertEqual(invalid['scored_forecasts'],0);self.assertEqual(invalid['withheld_results'],1)
 def test_result_batch_rotates_past_unavailable_records(self):
  _,archived,_=self.archive();records=[]
  for i in range(31):
   r=copy.deepcopy(archived[0]);r['race_id']=str(i);r['record_sha256']=m.sha(r);records.append(r)
  path=self.root/'fair-results.json';now=self.now+dt.timedelta(hours=2);runs=[]
  for _ in range(2):
   attempted=[]
   def unavailable(record):
    attempted.append(record['race_id']);raise ValueError('source unavailable')
   m.score_provisional(records,now,path,fetch=unavailable);runs.append(attempted)
  self.assertEqual(len(runs[0]),30);self.assertEqual(len(runs[1]),30)
  self.assertEqual(set(runs[0]+runs[1]),{str(i) for i in range(31)})
  counts=json.loads(path.read_text())['result_attempt_counts']
  self.assertEqual(len(counts),31);self.assertTrue(all(1<=v<=2 for v in counts.values()))
 def test_changed_final_field_and_dead_heat_never_scored(self):
  r,all,a=self.archive();result,reason=m.parse_final(self.raw_result(field=('1','3')),r[0]);self.assertIsNone(result);self.assertEqual(reason,'VOID_FIELD_CHANGED_AFTER_CAPTURE')
  result,reason=m.parse_final(self.raw_result(winners=('1','2')),r[0]);self.assertIsNone(result);self.assertEqual(reason,'DEAD_HEAT_OR_WINNER_UNRESOLVED')
 def test_archive_tampering_fails(self):
  self.archive();p=next((self.root/'archive').glob('*.json'));d=json.loads(p.read_text());d['runners'][0]['model_probability']=.99;p.write_text(json.dumps(d))
  with self.assertRaises(ValueError):self.archive()
 def test_return_to_previous_form_preserves_latest_revision(self):
  original=copy.deepcopy(self.data);_,records,_=self.archive()
  self.race['runners'][0]['previous_results'][0]['position']=2
  _,records,_=m.archive_forecasts(self.data,self.now+dt.timedelta(minutes=1),self.root/'archive')
  current,records,a=m.archive_forecasts(original,self.now+dt.timedelta(minutes=2),self.root/'archive')
  self.assertEqual(a['new_archived_records'],1);self.assertEqual(len(records),3)
  self.assertEqual(current[0]['generated_at_utc'],(self.now+dt.timedelta(minutes=2)).isoformat())
  _,records,a=m.archive_forecasts(original,self.now+dt.timedelta(minutes=3),self.root/'archive')
  self.assertEqual(a['new_archived_records'],0)
 def test_result_identity_and_source_tampering_are_rejected(self):
  _,records,_=self.archive();path=self.root/'results.json';now=self.now+dt.timedelta(hours=2)
  m.score_provisional(records,now,path,fetch=lambda r:self.raw_result());original=path.read_text()
  for field,value in [('race_id','other'),('model','other'),('source_receipt',{'url':'https://other.invalid','sha256':'a'*64})]:
   data=json.loads(original);data['entries'][0][field]=value;path.write_text(json.dumps(data))
   with self.assertRaises(ValueError):m.score_provisional(records,now,path)
 def test_settled_history_preserves_pre_event_probabilities_and_winner(self):
  _,records,_=self.archive();before=copy.deepcopy(records)
  p=m.score_provisional(records,self.now+dt.timedelta(hours=2),self.root/'results.json',fetch=lambda r:self.raw_result())
  p['cross_source_entries']=[p['entries'][0]]
  rows=m.settled_history(records,p)
  self.assertEqual(rows[0]['runners'][0]['model_probability'],records[0]['runners'][0]['model_probability'])
  self.assertEqual(rows[0]['winner_horse_id'],'1');self.assertEqual(rows[0]['result_verification'],'TWO_PUBLISHER_CORROBORATED')
  self.assertEqual(rows[0]['generated_at_utc'],records[0]['generated_at_utc']);self.assertEqual(records,before)
  self.assertEqual(m.settled_history(records,p,limit=0),[])
 def test_finished_card_differs_from_unsupported_upcoming_race(self):
  data={**self.data,'race_date_uk':'2026-11-02'}
  self.assertEqual(m.race_cycle(data,[],self.now)['status'],'NO_SUPPORTED_UPCOMING_FORECASTS')
  self.assertEqual(m.race_cycle(data,[],self.now+dt.timedelta(hours=2))['status'],'COLLECTED_CARD_FINISHED')
 def test_latest_field_observation_is_separate_from_frozen_capture(self):
  current,records,_=self.archive();original=copy.deepcopy(records)
  self.race['runner_observed_at_utc']=(self.now+dt.timedelta(minutes=10)).isoformat()
  checks=m.current_field_checks(self.data,current,self.now+dt.timedelta(minutes=11))
  self.assertEqual(checks[current[0]['record_sha256']]['status'],'FRESH_MATCHING_FIELD');self.assertEqual(records,original)
  checks=m.current_field_checks(self.data,current,self.now+dt.timedelta(minutes=41))
  self.assertEqual(checks[current[0]['record_sha256']]['status'],'STALE_RUNNER_OBSERVATION')
  self.race['runners'][0]['active_runner']=False
  checks=m.current_field_checks(self.data,current,self.now+dt.timedelta(minutes=11))
  self.assertEqual(checks[current[0]['record_sha256']]['status'],'FIELD_DIFFERS_FROM_FROZEN_FORECAST')
if __name__=='__main__':unittest.main()
