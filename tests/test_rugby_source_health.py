"""Regression: empty rugby source responses must publish fresh audit metadata."""
import datetime as dt
import json
import unittest
from pathlib import Path
import sys
import urllib.parse
import urllib.error
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'scripts'))
from collect_rugby import collect

NOW=dt.datetime(2026,11,16,10,tzinfo=dt.timezone.utc)

class RugbySourceHealth(unittest.TestCase):
 def test_every_date_checked_and_future_game_not_missed(self):
  requested=[]
  def fetch(url):
   query=urllib.parse.parse_qs(urllib.parse.urlparse(url).query)
   requested.append((query['s'][0],query['d'][0]))
   rows=[]
   if query['s']==['Rugby'] and query['d']==['2026-11-21']:
    rows=[{'idEvent':'12345','strSport':'Rugby','strHomeTeam':'A','strAwayTeam':'B','strLeague':'Example League','idLeague':'100','strTimestamp':'2026-11-21T15:00:00Z'}]
   return json.dumps({'events':rows}).encode()
  output=collect(NOW,fetch)
  self.assertEqual(len(set(requested)),28)
  self.assertEqual(len(output['upcoming_fixtures']),1)
  self.assertEqual(output['upcoming_fixtures'][0]['code'],'RU')
  self.assertFalse(output['upcoming_fixtures'][0]['forecast_eligible'])
 def test_rate_limit_stops_remaining_requests_for_sport(self):
  calls=[]
  def fetch(url):
   calls.append(url)
   raise urllib.error.HTTPError(url,429,'rate limit',{},None)
  output=collect(NOW,fetch)
  self.assertLessEqual(len(calls),2)
  for code in ('RU','RL'):
   self.assertFalse(output['source_health'][code]['all_dates_checked'])
   self.assertEqual(output['source_health'][code]['days_succeeded'],0)
 def test_conflicting_identity_stays_withheld(self):
  base={'idEvent':'12345','strSport':'Rugby','strHomeTeam':'A','strAwayTeam':'B','strLeague':'Example League','idLeague':'100','strTimestamp':'2026-11-21T15:00:00Z'}
  rows=[base,{**base,'strAwayTeam':'C'},base]
  output=collect(NOW,lambda url:json.dumps({'events':rows}).encode())
  self.assertEqual(output['upcoming_fixtures'],[])
 def test_valid_empty_source_is_current_not_stale(self):
  output=collect(NOW,lambda url:json.dumps({'events':None}).encode())
  self.assertEqual(output['generated_at_utc'],'2026-11-16T10:00:00Z')
  self.assertEqual(output['upcoming_fixtures'],[])
  for code in ('RU','RL'):
   h=output['source_health'][code]
   self.assertEqual(h['days_succeeded'],14)
   self.assertEqual(h['days_requested'],14)
   self.assertEqual(h['horizon_days'],14)
   self.assertFalse(h['complete_horizon_coverage'])
   self.assertTrue(h['all_dates_checked'])
   self.assertEqual(h['collection_status'],'NO_CONFIRMED_FIXTURES_IN_SAMPLE')
   self.assertEqual(h['rows_returned'],0)
  self.assertEqual(output['publication_gate'],'BLOCKED')
 def test_provider_failure_is_not_misreported_as_empty_schedule(self):
  def failed(url):raise OSError('Unreachable')
  output=collect(NOW,failed)
  for code in ('RU','RL'):
   self.assertEqual(output['source_health'][code]['collection_status'],'SOURCE_UNAVAILABLE')
   self.assertEqual(output['source_health'][code]['days_succeeded'],0)
  self.assertEqual(output['upcoming_fixtures'],[])
 def test_date_only_source_does_not_invent_kickoff(self):
  example={'idEvent':'12345','strSport':'Rugby','strHomeTeam':'A','strAwayTeam':'B','strLeague':'Example League','idLeague':'100','strTimestamp':None}
  output=collect(NOW,lambda url:json.dumps({'events':[example]}).encode())
  self.assertEqual(output['upcoming_fixtures'],[])
  self.assertEqual(output['source_health']['RU']['rows_without_confirmed_start'],14)
  self.assertEqual(output['source_health']['RL']['rows_matching_sport'],0)
  self.assertEqual(output['source_health']['RL']['days_requested'],14)

if __name__=='__main__': unittest.main()
