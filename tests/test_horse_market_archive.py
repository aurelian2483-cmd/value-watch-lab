import copy
import datetime as dt
import json
import sys
import tempfile
import unittest
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'scripts'))
import archive_horse_markets as M

class MarketArchiveTests(unittest.TestCase):
 def race(self,when='2026-11-04T06:00:00Z',prices=(3.,5.)):
  source='https://www.sportinglife.com/card'
  return {'race_id':'1','racecourse':'Test','startUTC':'2026-11-04T20:00:00Z','runner_data_status':'SINGLE_SOURCE_RUNNERS_OBSERVED','runner_source':source,'runner_source_sha256':'a'*64,
   'runners':[{'horse_id':str(i),'active_runner':True,'runner_status':'RUNNER'}for i in range(2)],
   'market_observation':{'status':'COMPLETE_SOURCE_OBSERVATION','observed_at_utc':when,'bookmaker':'Sky Bet','publisher':'Sporting Life','bookmaker_race_id':'r','bookmaker_market_id':'m','source':source,'source_sha256':'a'*64,'executable_verified':False,
    'quotes':[{'horse_id':str(i),'decimal':p,'fractional':str(p-1)+'/1'}for i,p in enumerate(prices)]}}
 def test_append_only_hashes_and_matching_capture_comparison(self):
  with tempfile.TemporaryDirectory() as folder:
   archive=Path(folder);first={'races':[self.race()]};self.assertEqual(M.update(first,archive),1)
   self.assertEqual(M.update(copy.deepcopy(first),archive),0)
   second={'races':[self.race('2026-11-04T06:30:00Z',(2.,6.))]};M.update(second,archive)
   market=second['races'][0]['market_observation'];self.assertEqual(market['history_status'],'COMPARABLE_SOURCE_OBSERVATIONS');self.assertEqual([x['direction']for x in market['movements']],['SHORTENED','DRIFTED']);self.assertEqual(len(list(archive.rglob('*.json'))),2)
 def test_field_or_market_changes_never_compared_as_steam(self):
  old=M.snapshot(self.race());new=copy.deepcopy(old);new['active_runner_ids']=['0'];self.assertEqual(M.comparison(new,old)['history_status'],'FIELD_CHANGED');self.assertEqual(M.comparison(new,old)['movements'],[])
  new=copy.deepcopy(old);new['bookmaker_market_id']='different';self.assertEqual(M.comparison(new,old)['history_status'],'MARKET_CHANGED');self.assertEqual(M.comparison(new,old)['movements'],[])
 def test_tampering_blocks_history(self):
  with tempfile.TemporaryDirectory()as folder:
   archive=Path(folder);M.update({'races':[self.race()]},archive);p=next(archive.rglob('*.json'));body=json.loads(p.read_text());body['quotes'][0]['decimal']=9;p.write_text(json.dumps(body))
   with self.assertRaises(ValueError):M.update({'races':[self.race('2026-11-04T06:30:00Z')]},archive)
 def test_unconfirmed_or_post_event_field_not_archived(self):
  r=self.race();r['runner_data_status']='RUNNER_FIELD_UNCONFIRMED';self.assertIsNone(M.snapshot(r))
  self.assertIsNone(M.snapshot(self.race('2026-11-04T20:01:00Z')))

if __name__=='__main__':unittest.main()
