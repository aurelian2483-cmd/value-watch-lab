"""Regression: empty rugby source responses must publish fresh audit metadata."""
import datetime as dt
import json
import unittest
from pathlib import Path
import sys
import urllib.parse
import urllib.error
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'scripts'))
from collect_rugby import collect, source_start, parse_nrl_calendar

NOW=dt.datetime(2026,11,16,10,tzinfo=dt.timezone.utc)

class RugbySourceHealth(unittest.TestCase):
 def test_documented_provider_utc_timestamp_without_z(self):
  self.assertEqual(source_start('2026-11-21T20:10:00'),dt.datetime(2026,11,21,20,10,tzinfo=dt.timezone.utc))
  self.assertEqual(source_start('2026-11-21T21:10:00+01:00'),source_start('2026-11-21T20:10:00'))
  for missing in (None,'2026-11-21','20:10:00','2026-11-21 20:10:00'):
   with self.assertRaises(ValueError):source_start(missing)
 def test_every_date_checked_and_future_game_not_missed(self):
  requested=[]
  def fetch(url):
   query=urllib.parse.parse_qs(urllib.parse.urlparse(url).query)
   requested.append((query['s'][0],query['d'][0]))
   rows=[]
   if query['s']==['Rugby'] and query['d']==['2026-11-21']:
    rows=[{'idEvent':'12345','strSport':'Rugby','strHomeTeam':'A','strAwayTeam':'B','strLeague':'Example League','idLeague':'100','strTimestamp':'2026-11-21T15:00:00'}]
   return json.dumps({'events':rows}).encode()
  output=collect(NOW,fetch)
  self.assertEqual(len(set(requested)),28)
  self.assertEqual([r[0] for r in requested[:2]],['Rugby','Rugby League'])
  self.assertEqual(len(output['upcoming_fixtures']),1)
  self.assertEqual(output['upcoming_fixtures'][0]['code'],'RU')
  self.assertFalse(output['upcoming_fixtures'][0]['forecast_eligible'])
 def test_rate_limit_stops_remaining_requests_for_sport(self):
  calls=[]
  def fetch(url):
   calls.append(url)
   raise urllib.error.HTTPError(url,429,'rate limit',{},None)
  output=collect(NOW,fetch)
  self.assertEqual(len(calls),1)
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

class NrlCalendarTests(unittest.TestCase):
 def calendar(self, kickoff='20270304T090500Z', stamp='20261116T080000Z', host='www.nrl.com'):
  return ('BEGIN:VCALENDAR\nVERSION:2.0\nBEGIN:VEVENT\n'
          'UID:nrl-2027-round-1-roosters-v-broncos@jordthedan.github.io\n'
          f'DTSTART:{kickoff}\nDTSTAMP:{stamp}\n'
          'SUMMARY:Roosters vs Broncos\n'
          f'URL:https://{host}/draw/nrl-premiership/2027/round-1/roosters-v-broncos/\n'
          'BEGIN:VALARM\nSUMMARY:ignored alarm\nEND:VALARM\nEND:VEVENT\nEND:VCALENDAR\n').encode()
 def test_future_and_fresh_are_rugby_league_schedule_only(self):
  d=parse_nrl_calendar(self.calendar(),NOW)
  self.assertEqual(d['status'],'FUTURE_FIXTURES_OBSERVED')
  self.assertEqual(d['fixtures'][0]['home'],'Sydney Roosters')
  self.assertEqual(d['fixtures'][0]['kickoff_utc'],'2027-03-04T09:05:00Z')
  self.assertFalse(d['fixtures'][0]['forecast_eligible'])
 def test_historical_stale_or_unlinked_rows_do_not_become_fixtures(self):
  self.assertEqual(parse_nrl_calendar(self.calendar(kickoff='20261004T083000Z'),NOW)['status'],'NO_FUTURE_FIXTURES_OBSERVED')
  self.assertEqual(parse_nrl_calendar(self.calendar(stamp='20261110T050000Z'),NOW)['status'],'STALE')
  self.assertEqual(parse_nrl_calendar(self.calendar(host='example.com'),NOW)['withheld_fixtures'],1)
  with self.assertRaises(ValueError):parse_nrl_calendar(self.calendar(kickoff='20270304T090500'),NOW)

if __name__=='__main__': unittest.main()
