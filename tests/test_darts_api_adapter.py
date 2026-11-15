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
FIX={'fixture_id':'fx_18Z0NJ52TSNEX5Y7BRTK','starts_at':'2026-11-17T18:00:00Z','date_confirmed':True,'players':[A,B],'event':{'name':'Research Event'}}
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
 def test_week_slices_are_complete_and_disjoint(self):
  calls=[]
  def fake_pages(endpoint,params,key,maxpages):
   calls.append((endpoint,params,maxpages))
   return [],[]
  with patch.object(collector,'pages',side_effect=fake_pages):
   report=collect(NOW,'test-secret')
  weeks=[c for c in calls if c[0]=='/v1/results']
  self.assertEqual(len(weeks),4)
  self.assertEqual([x[1]['from'] for x in weeks],['2026-10-11','2026-10-18','2026-10-25','2026-11-01'])
  self.assertEqual([x[1]['to'] for x in weeks],['2026-10-17','2026-10-24','2026-10-31','2026-11-07'])
  self.assertEqual(report['coverage']['pagination_complete'],True)
  self.assertEqual(report['coverage']['diagnostic_window'],'FOUR_FULL_SEVEN_DAY_WINDOWS')
 def test_truncated_week_fails_whole_run(self):
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

if __name__=='__main__':unittest.main()
