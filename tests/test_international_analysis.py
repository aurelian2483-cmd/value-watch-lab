import datetime as dt
import sys,unittest
from pathlib import Path
from unittest.mock import patch
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'scripts'))
from international_football_analysis import completed,analyse,collect
class InternationalAnalysis(unittest.TestCase):
 def setUp(self):
  self.now=dt.datetime(2026,11,9,21,tzinfo=dt.timezone.utc)
  self.fixture={'home':'Example A','away':'Example B','home_team_id':'1','away_team_id':'2','kickoff_utc':'2026-11-12T12:00:00Z'}
  self.receipt={'url':'https://site.api.espn.com/test','sha256':'a'*64,'observed_at_utc':self.now.isoformat()}
 def event(self):return {'id':'42','date':'2026-11-01T12:00:00Z','competitions':[{'status':{'type':{'name':'STATUS_FULL_TIME','completed':True,'state':'post'}},'competitors':[{'homeAway':'home','score':'2','team':{'id':'1','displayName':'Example A'}},{'homeAway':'away','score':'1','team':{'id':'2','displayName':'Example B'}}]}]}
 def results(self,n=5):
  rows=[]
  for i in range(n):
   e=self.event();e['id']=str(i);e['date']=(self.now-dt.timedelta(days=i+1)).isoformat();rows.append(completed(e,'fifa.friendly',self.receipt,self.now))
  return rows
 def test_only_completed_regulation_scores(self):
  self.assertIsNotNone(completed(self.event(),'fifa.friendly',self.receipt,self.now))
  for state in ['STATUS_FINAL_AET','STATUS_FINAL_PEN','STATUS_ABANDONED','STATUS_IN_PROGRESS']:
   e=self.event();e['competitions'][0]['status']['type']['name']=state;self.assertIsNone(completed(e,'test',self.receipt,self.now))
 def test_future_old_or_invalid_result_rejected(self):
  for date in ['2026-11-10T12:00:00Z','2024-11-01T12:00:00Z','2026-11-09T20:00:00Z']:
   e=self.event();e['date']=date;self.assertIsNone(completed(e,'test',self.receipt,self.now))
  e=self.event();e['competitions'][0]['competitors'][0]['score']='?';self.assertIsNone(completed(e,'test',self.receipt,self.now))
 def test_minimum_sample_and_no_invented_estimates(self):
  a=analyse(self.fixture,self.results(4),self.now);self.assertEqual(a['status'],'INSUFFICIENT_CAPTURED_RESULTS');self.assertNotIn('prob_home',a)
  a=analyse(self.fixture,self.results(),self.now);self.assertEqual(a['status'],'EXPERIMENTAL_COMPARISON_AVAILABLE');self.assertAlmostEqual(a['prob_home']+a['prob_draw']+a['prob_away'],1);self.assertIsNone(a['odds']);self.assertEqual(a['publication_gate'],'BLOCKED')
 def test_team_ids_not_same_name_and_sample_bounded(self):
  rows=self.results(15);a=analyse(self.fixture,rows,self.now);self.assertEqual(a['home_matches'],10)
  self.fixture['home_team_id']='999';a=analyse(self.fixture,rows,self.now);self.assertEqual(a['home_matches'],0)
 def test_fixture_and_capture_cutoff_prevent_leakage(self):
  self.fixture['kickoff_utc']='2026-10-01T12:00:00Z';a=analyse(self.fixture,self.results(),self.now);self.assertEqual(a['home_matches'],0)
 def test_source_failures_reported_not_assumed_empty_calendar(self):
  with patch('international_football_analysis.COMPETITIONS',{'fifa.friendly':'Friendly'}):
   data=collect(self.now,lambda u:b'{}')
  self.assertEqual(data['results'],[]);self.assertTrue(all(a.get('status')=='FAILED' for a in data['collection_audits'] ))
 def test_conflicting_duplicate_event_is_excluded(self):
  import json
  def fetch(url):
   e=self.event()
   import copy
   other=copy.deepcopy(e);other['competitions'][0]['competitors'][0]['score']='3'
   return json.dumps({'events':[e,other] if 'dates=2026' in url else []}).encode()
  with patch('international_football_analysis.COMPETITIONS',{'test':'Test'}):d=collect(self.now,fetch)
  self.assertEqual(d['results'],[]);self.assertEqual(d['conflicting_events_excluded'],['42'])
 def test_duplicate_results_and_future_receipt_cannot_fill_sample(self):
  rows=self.results(4);a=analyse(self.fixture,rows+rows,self.now);self.assertEqual(a['home_matches'],4)
  for r in rows:r['source_receipt']={**self.receipt,'observed_at_utc':'2026-11-10T12:00:00Z'}
  self.assertEqual(analyse(self.fixture,rows,self.now)['home_matches'],0)
 def test_wrong_year_and_truncated_feed_are_reported(self):
  import json
  for events in [[self.event()]*1000,[{**self.event(),'date':'2024-01-01T00:00:00Z'}]]:
   with patch('international_football_analysis.COMPETITIONS',{'test':'Test'}):d=collect(self.now,lambda u:json.dumps({'events':events}).encode())
   self.assertEqual(d['results'],[]);self.assertTrue(all(a['status']=='FAILED' for a in d['collection_audits']))
if __name__=='__main__':unittest.main()
