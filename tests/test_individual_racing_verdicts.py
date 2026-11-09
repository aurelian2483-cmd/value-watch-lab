import datetime as dt
import sys
import unittest
from pathlib import Path
from unittest.mock import patch
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'scripts'))
from enrich_horse_runners import publisher_verdict
from collect_future_racing import collect_individual_cards
from published_racing_selections import collect

class IndividualVerdicts(unittest.TestCase):
 def setUp(self):
  self.now=dt.datetime(2026,11,9,19,tzinfo=dt.timezone.utc)
  self.race={'race_id':'12','startUTC':'2026-11-10T13:00:00+00:00','source':'https://www.sportinglife.com/racing/racecards/2026-11-10/test/racecard/12/test','racecourse':'Test','source_runner_count':2}
  self.horses=[{'horse_id':'7','name':'Example (IRE)','active_runner':True},{'horse_id':'8','name':'Other','active_runner':True}]
 def verdict(self,text):return publisher_verdict({'verdict':text},self.horses,self.race,self.now,b'raw')
 def test_only_explicit_rank_one(self):
  v=self.verdict('<p>Other mentioned first</p><ol><li><b>Example</b></li><li><b>Other</b></li></ol>')
  self.assertEqual(v['horse_id'],'7');self.assertIsNone(v['original_publication_at_utc'])
  for text in ['Example is favourite','<b>Example</b>','<ol><li><b>Unknown</b></li></ol>','<ol><li><b>Example</b></li></ol><ol><li><b>Other</b></li></ol>']:
   self.assertNotEqual(self.verdict(text)['status'],'EXPLICIT_FIRST_CHOICE_OBSERVED')
 def test_inactive_or_after_start_rejected(self):
  self.horses[0]['active_runner']=False
  self.assertNotEqual(self.verdict('<ol><li><b>Example</b></li></ol>')['status'],'EXPLICIT_FIRST_CHOICE_OBSERVED')
  self.horses[0]['active_runner']=True;self.now+=dt.timedelta(days=2)
  self.assertNotEqual(self.verdict('<ol><li><b>Example</b></li></ol>')['status'],'EXPLICIT_FIRST_CHOICE_OBSERVED')
 def test_failure_retains_row_and_reports_reason(self):
  original=dict(self.race)
  receipts=collect_individual_cards([self.race],self.now,lambda _:b'invalid')
  self.assertEqual(self.race,original);self.assertEqual(receipts[0]['status'],'COLLECTION_FAILED')
 def test_wrong_date_never_fetched(self):
  self.race['source']=self.race['source'].replace('2026-11-10','2026-11-11')
  with patch('collect_future_racing.parse_card') as parse:
   result=collect_individual_cards([self.race],self.now,lambda _:b'raw')
   parse.assert_not_called();self.assertEqual(result[0]['status'],'COLLECTION_FAILED')
 def test_two_day_horizon_and_limit(self):
  with patch('collect_future_racing.parse_card',return_value={'market_observation':{'status':'TEST'},'publisher_verdict':{'status':'NONE'}}):
   rows=[dict(self.race) for _ in range(70)]
   self.assertEqual(len(collect_individual_cards(rows,self.now,lambda _:b'raw')),64)
   self.assertEqual(collect_individual_cards([self.race],self.now-dt.timedelta(days=3),lambda _:b'raw'),[])
 def test_native_unknown_publication_ingested_without_faking_date(self):
  v=self.verdict('<ol><li><b>Example</b></li></ol>')
  self.race.update(publisher_verdict=v,runner_source=v['url'],runner_source_sha256=v['sha256'],runners=self.horses)
  entries,_=collect([self.race],self.now,lambda _:b'blocked')
  self.assertEqual(len(entries),1);self.assertIsNone(entries[0]['published_at_utc']);self.assertIsNone(entries[0]['publication_date'])
  self.race['runner_source_sha256']='b'*64
  self.assertEqual(collect([self.race],self.now,lambda _:b'blocked')[0],[])

if __name__=='__main__':unittest.main()
