import unittest
from datetime import datetime,timezone,timedelta
from pathlib import Path
import sys
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'scripts'))
from darts_api_adapter import result,fixture,adapt
from collect_darts_research import collect

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
if __name__=='__main__':unittest.main()
