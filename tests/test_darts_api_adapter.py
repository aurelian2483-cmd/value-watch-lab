import unittest
from datetime import datetime,timezone,timedelta
from pathlib import Path
import sys
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'scripts'))
from darts_api_adapter import result,fixture,adapt
from collect_darts_research import collect
from unittest.mock import patch
import collect_darts_research as collector

NOW=datetime(2026,11,15,20,tzinfo=timezone.utc)
A={'player_id':'pl_ABC123','name':'Player A'}
B={'player_id':'pl_XYZ987','name':'Player B'}
RESULT={'match_id':'mt_18Z0NJ52TSNEX5Y7BRTK','played_on':'2026-10-25','winner':A,'loser':B,'result_status':'final'}
FIX={'fixture_id':'fx_18Z0NJ52TSNEX5Y7BRTK','starts_at':'2026-11-17T18:00:00Z','date_confirmed':True,'players':[A,B],'competition':{'name':'Research Event'}}
class Adapter(unittest.TestCase):
 def test_known_result_date_is_not_claimed_actual(self):
  r=result(RESULT,NOW)
  self.assertEqual(r['played_at'],'2026-10-25T12:00:00Z')
  self.assertEqual(r['source_date_precision'],'DAY_ONLY')
  self.assertTrue(r['timestamp_is_carrier'])
 def test_same_day_result_blocked(self):
  self.assertIsNone(result({**RESULT,'played_on':'2026-11-15'},NOW))
 def test_future_result_blocked(self):
  self.assertIsNone(result({**RESULT,'played_on':'2026-11-16'},NOW))
 def test_invalid_player_blocked(self):
  self.assertIsNone(result({**RESULT,'winner':{'player_id':'bad','name':'A'}},NOW))
 def test_fixture_requires_confirmed_time(self):
  self.assertEqual(fixture(FIX,NOW)['start_utc'],'2026-11-17T18:00:00Z')
  self.assertEqual(fixture(FIX,NOW)['competition'],'Research Event')
  self.assertIsNone(fixture({**FIX,'date_confirmed':None},NOW))
  self.assertIsNone(fixture({**FIX,'starts_at':None},NOW))
 def test_fixture_near_start_blocked(self):
  self.assertIsNone(fixture({**FIX,'starts_at':'2026-11-15T20:01:00Z'},NOW))
 def test_duplicate_match_rejected(self):
  with self.assertRaisesRegex(ValueError,'Duplicated'):adapt([RESULT,RESULT],[FIX],NOW)
 def test_valid_envelope(self):
  a,b=adapt([RESULT],[FIX],NOW)
  self.assertEqual((len(a),len(b)),(1,1))
 def test_collector_does_not_need_api_for_adapter(self):
  self.assertIsNone(result({},NOW))
class CollectorPagination(unittest.TestCase):
 def test_day_slices_are_complete_and_disjoint(self):
  calls=[]
  def fake_pages(endpoint,params,key,maxpages):
   calls.append((endpoint,params,maxpages))
   return [],[]
  with patch.object(collector,'pages',side_effect=fake_pages):
   report=collect(NOW,'test-secret')
  days=[c for c in calls if c[0]=='/v1/results']
  self.assertEqual(len(days),28)
  dates=[x[1]['from'] for x in days]
  self.assertEqual(len(set(dates)),28)
  self.assertEqual(dates[0],'2026-10-11')
  self.assertEqual(dates[-1],'2026-11-07')
  self.assertEqual(dates,[x[1]['to'] for x in days])
  self.assertEqual(report['coverage']['pagination_complete'],True)
  self.assertEqual(report['coverage']['diagnostic_window'],'TWENTY_EIGHT_FULL_DAY_WINDOWS')
 def test_truncated_day_fails_whole_run(self):
  def mock_pages(endpoint,params,key,maxpages):
   if endpoint=='/v1/results' and params['from']=='2026-10-18':
    raise RuntimeError('Pagination exceeded safe page cap; partial feed withheld')
   return [],[]
  with patch.object(collector,'pages',side_effect=mock_pages):
   with self.assertRaisesRegex(RuntimeError,'partial feed withheld'):collect(NOW,'test-secret')
 def test_request_budget_fails_before_network(self):
  with patch.object(collector,'REQUEST_COUNT',collector.REQUEST_LIMIT):
   with self.assertRaisesRegex(RuntimeError,'request budget exhausted'):
    collector.request('/v1/results',{},'not-a-real-key')

class CoverageProbe(unittest.TestCase):
 def test_probe_uses_only_four_bounded_queries(self):
  calls=[]
  def fake_request(endpoint,params,key):
   calls.append((endpoint,params))
   return {'data':[],'meta':{'next_cursor':None,'data_as_of':'2026-11-07T00:00:00Z'}},'a'*64
  with patch.object(collector,'request',side_effect=fake_request):
   report=collector.coverage_probe(NOW,'not-a-real-key')
  self.assertEqual(len(calls),4)
  self.assertEqual([x[1]['from'] for x in calls[:3]],['2026-10-18','2026-11-01','2026-11-07'])
  self.assertEqual(calls[3][0],'/v1/fixtures')
  self.assertFalse(report['complete_history_collected'])
  self.assertTrue(report['public_feed_unchanged'])
  self.assertEqual(report['publication_gate'],'BLOCKED')
 def test_probe_records_nonmatching_dates_not_fake_results(self):
  def fake_request(endpoint,params,key):
   if endpoint=='/v1/results':
    return {'data':[{'played_on':'2026-09-01','match_id':'mt_sample'}],'meta':{'next_cursor':'opaque','data_as_of':None}},'a'*64
   return {'data':[{'fixture_id':'fx_sample','starts_at':None}],'meta':{'next_cursor':None}},'b'*64
  with patch.object(collector,'request',side_effect=fake_request):
   report=collector.coverage_probe(NOW,'not-a-real-key')
  self.assertEqual(report['audits'][0]['date_filter_violations'],1)
  self.assertTrue(report['audits'][0]['has_next_page'])
  self.assertEqual(report['audits'][-1]['sample_has_confirmed_time'],0)

class BoundedDartsPublication(unittest.TestCase):
 def test_source_sample_is_research_only_and_date_only_is_not_a_prediction(self):
  calls=[]
  def fake_request(endpoint,params,key):
   calls.append((endpoint,params))
   if endpoint=='/v1/results':
    row={**RESULT,'played_on':params['from']}
    return {'data':[row], 'meta':{'next_cursor':None}},'a'*64
   undated={**FIX,'date_confirmed':False,'starts_at':None,'date':'2026-11-17'}
   return {'data':[undated], 'meta':{'next_cursor':None}},'b'*64
  with patch.object(collector,'request',side_effect=fake_request):
   d=collector.bounded_public_snapshot(NOW,'secret')
  self.assertEqual(len(calls),4)
  self.assertEqual(len(d['results']),1)  # repeated provider match ID is deduplicated
  self.assertEqual(len(d['fixtures']),0)
  self.assertEqual(len(d['tentative_fixtures']),1)
  self.assertEqual(d['tentative_fixtures'][0]['status'],'DATE_ONLY_UNCONFIRMED')
  self.assertTrue(d['coverage']['sample_only'])
  self.assertEqual(d['source_verification'],'PROVIDER_OBSERVED_UNCORROBORATED')
  self.assertEqual(d['publication_gate'],'BLOCKED')
 def test_off_window_result_does_not_become_training_data(self):
  def fake_request(endpoint,params,key):
   if endpoint=='/v1/results':
    return {'data':[RESULT], 'meta':{'next_cursor':'another-page'}},'a'*64
   return {'data':[], 'meta':{'next_cursor':None}},'b'*64
  with patch.object(collector,'request',side_effect=fake_request):
   d=collector.bounded_public_snapshot(NOW,'secret')
  self.assertEqual(len(d['results']),0)
  self.assertTrue(d['coverage']['checks'][0]['has_more'])

if __name__=='__main__':unittest.main()
