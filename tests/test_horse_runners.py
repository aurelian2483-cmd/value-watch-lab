import copy
import datetime as dt
import json
from pathlib import Path
import sys
import unittest
HERE=Path(__file__).resolve().parent
sys.path.insert(0,str(HERE.parent/'scripts') if HERE.name=='tests' else str(HERE))
from enrich_horse_runners import parse_card
class RunnerTests(unittest.TestCase):
 def setUp(self):
  self.race={'race_id':'123','racecourse':'Test Course','startUTC':'2026-11-02T17:00:00Z','source_runner_count':1,'source':'https://www.sportinglife.com/racing/racecards/test/racecard/123/test'}
  ride={'ride_reference':{'id':5},'ride_status':'RUNNER','horse':{'horse_reference':{'id':9},'name':'Test Horse','previous_results':[
   {'race_id':111,'date':'2026-10-10','position':2},{'race_id':123,'date':'2026-11-02','position':1},{'race_id':999,'date':'2026-11-03','position':1}]}}
  self.props={'hasError':False,'race':{'race_summary':{'race_summary_reference':{'id':123},'course_name':'Test Course','date':'2026-11-02','time':'17:00','ride_count':1,'race_stage':'DORMANT'},'rides':[ride]}}
  self.now=dt.datetime(2026,11,2,16,tzinfo=dt.timezone.utc)
 def raw(self,p=None):return ('<script id="__NEXT_DATA__">'+json.dumps({'props':{'pageProps':p or self.props}})+'</script>').encode()
 def test_nonrunner_identity_and_history_filter(self):
  nr=copy.deepcopy(self.props['race']['rides'][0]);nr['horse']['horse_reference']['id']=10;nr['ride_status']='NONRUNNER';self.props['race']['rides'].append(nr)
  r=parse_card(self.raw(),self.race,self.now)
  self.assertEqual((r['active_runner_count'],r['non_runner_count']),(1,1))
  self.assertEqual(len(r['runners'][0]['previous_results']),1);self.assertIsNone(r['runners'][0]['win_probability'])
  self.assertFalse(r['forecast_eligible']);self.assertEqual(r['capture_phase'],'PRE_EVENT')
 def test_withdrawn_horse_is_retained_but_inactive(self):
  withdrawn=copy.deepcopy(self.props['race']['rides'][0]);withdrawn['horse']['horse_reference']['id']=77;withdrawn['ride_status']='WITHDRAWN'
  self.props['race']['rides'].append(withdrawn)
  r=parse_card(self.raw(),self.race,self.now)
  self.assertEqual(r['active_runner_count'],1);self.assertEqual(r['non_runner_count'],1);self.assertEqual(r['withdrawn_count'],1)
  self.assertEqual(r['runners'][1]['runner_status'],'WITHDRAWN');self.assertFalse(r['runners'][1]['active_runner'])
 def test_mismatched_identity_time_and_counts_rejected(self):
  for field,value in [('course_name','Wrong course'),('time','18:00'),('ride_count',3)]:
   p=copy.deepcopy(self.props);p['race']['race_summary'][field]=value
   with self.assertRaises(ValueError):parse_card(self.raw(p),self.race,self.now)
 def test_duplicate_unknown_status_and_generic_page_rejected(self):
  p=copy.deepcopy(self.props);p['race']['rides']*=2
  with self.assertRaises(ValueError):parse_card(self.raw(p),self.race,self.now)
  p=copy.deepcopy(self.props);p['race']['rides'][0]['ride_status']='UNKNOWN'
  with self.assertRaises(ValueError):parse_card(self.raw(p),self.race,self.now)
  with self.assertRaises(ValueError):parse_card(b'<html>No racecard</html>',self.race,self.now)
 def test_doubtful_runner_is_visible_but_field_is_not_forecast_ready(self):
  r=copy.deepcopy(self.props['race']['rides'][0]);r['horse']['horse_reference']['id']=88;r['ride_status']='DOUBTFUL';self.props['race']['rides'].append(r);self.props['race']['race_summary']['ride_count']=2
  result=parse_card(self.raw(),self.race,self.now)
  self.assertEqual(result['runner_data_status'],'RUNNER_FIELD_UNCONFIRMED');self.assertEqual(result['doubtful_runner_count'],1);self.assertEqual(result['market_observation']['favourite_horse_ids'],[])
 def test_postevent_capture_not_treated_as_prematch(self):
  r=parse_card(self.raw(),self.race,self.now+dt.timedelta(hours=3))
  self.assertEqual(r['capture_phase'],'NOT_PRE_EVENT');self.assertFalse(r['forecast_eligible'])
 def test_current_conditions_are_from_racecard_and_nonfinish_history_is_preserved(self):
  summary=self.props['race']['race_summary'];summary.update(name='Example Handicap Hurdle (GBB Race)',going='Soft',distance='2m',race_class='4',course_surface={'surface':'TURF'})
  self.race['going']='Good'
  past=self.props['race']['rides'][0]['horse']['previous_results'][0];past.update(position=None,casualty={'reason':'Fell'},run_type='HURDLE')
  result=parse_card(self.raw(),self.race,self.now)
  self.assertEqual(result['going'],'Soft');self.assertIn('going',result['conditions_changed_since_discovery'])
  self.assertEqual(result['run_type'],'HURDLE');self.assertEqual(result['run_type_basis'],'EXPLICIT_RACE_TITLE_TERM')
  hist=result['runners'][0]['previous_results'][0];self.assertEqual(hist['finish_status'],'NON_FINISHER');self.assertEqual(hist['nonfinish_reason'],'Fell')
 def test_flat_turf_is_not_assumed_for_unknown_or_mixed_histories(self):
  summary=self.props['race']['race_summary'];summary.update(name='Example Handicap',course_surface={'surface':'TURF'})
  past=self.props['race']['rides'][0]['horse']['previous_results'][0]
  result=parse_card(self.raw(),self.race,self.now);self.assertIsNone(result['run_type'])
  past['run_type']='FLAT';result=parse_card(self.raw(),self.race,self.now)
  self.assertEqual(result['run_type'],'FLAT');self.assertEqual(result['run_type_basis'],'INFERRED_FULL_FIELD_HISTORY')
  summary['name']='Hurdle Chase';result=parse_card(self.raw(),self.race,self.now);self.assertIsNone(result['run_type']);self.assertEqual(result['run_type_basis'],'CONFLICTING_SOURCE_TITLE_TERMS')
if __name__=='__main__':unittest.main()

