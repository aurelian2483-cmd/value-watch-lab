import copy
import datetime as dt
import json
from pathlib import Path
import sys
import tempfile
import unittest
HERE=Path(__file__).resolve().parent
sys.path.insert(0,str(HERE.parent/'scripts') if HERE.name=='tests' else str(HERE))
import expanded_football as m
class ExpandedTests(unittest.TestCase):
 def setUp(self):
  self.now=dt.datetime(2026,11,2,12,tzinfo=dt.timezone.utc);self.tmp=tempfile.TemporaryDirectory();self.root=Path(self.tmp.name)
  self.f={'league':'E1','home':'Coventry City','away':'Hull City','kickoff_utc':'2026-11-02T20:00:00Z','verification':'SCHEDULE_CROSS_CHECK'}
  stat={'hgf':20,'hga':10,'hn':12,'agf':12,'aga':16,'an':12}
  self.training={'teams':{m.norm(self.f['home']):copy.deepcopy(stat),m.norm(self.f['away']):copy.deepcopy(stat)},'avg_home_goals':1.5,'avg_away_goals':1.1,'matches':552,'source_receipts':[],'training_sha256':'a'*64}
 def tearDown(self):self.tmp.cleanup()
 def test_league_identity_and_explicit_aliases(self):
  self.assertEqual(m.norm('Atlético Madrid'),m.norm('Ath Madrid'));self.assertEqual(m.norm('AFC Bournemouth'),m.norm('Bournemouth'))
  self.assertNotEqual(m.identity(self.f),m.identity({**self.f,'league':'UCL'}))
  self.assertIsNone(m.corroborate(self.f,[{**self.f,'league':'SP1'}]))
  self.assertIsNone(m.corroborate(self.f,[self.f,self.f]))
 def test_reviewed_source_aliases(self):
  for a,b in [('SC Freiburg','Freiburg'),('Paris SG','Paris Saint-Germain'),('Deportivo','Deportivo La Coruna'),('Blackburn','Blackburn Rovers'),('Mönchengladbach','Borussia Monchengladbach'),('SV 07 Elversberg','SV Elversberg')]:self.assertEqual(m.norm(a),m.norm(b))
  self.assertNotEqual(m.norm('Paris FC'),m.norm('Paris SG'))
 def test_model_probabilities_and_unknown_teams(self):
  r=m.model_forecast(self.f,self.training);m.validate_forecast(r);self.assertAlmostEqual(sum(r[k] for k in ('prob_home','prob_draw','prob_away')),1)
  self.assertIsNone(m.model_forecast({**self.f,'home':'Unknown'},self.training))
  current=copy.deepcopy(self.training)
  for v in current['teams'].values():v['hn']=v['an']=3
  r=m.model_forecast(self.f,{'teams':{}},current);self.assertTrue(r['training_basis']['small_sample'])
 def test_archive_repeat_tampering_and_time_buffer(self):
  f=m.model_forecast(self.f,self.training);path=self.root/'archive';r,a,n=m.archive_forecasts([f],self.now,path);self.assertEqual(n,1)
  r,a,n=m.archive_forecasts([f],self.now,path);self.assertEqual(n,0)
  late={**f,'kickoff_utc':'2026-11-02T12:03:00Z'};self.assertEqual(m.archive_forecasts([late],self.now,self.root/'late')[0],[])
  p=next(path.glob('*.json'));d=json.loads(p.read_text());d['prob_home']=.99;p.write_text(json.dumps(d))
  with self.assertRaises(ValueError):m.archive_forecasts([f],self.now,path)
 def test_capture_requires_inputs_already_received(self):
  f=m.model_forecast(self.f,self.training);f['training_basis']['source_receipts']=[{'observed_at_utc':m.stamp(self.now+dt.timedelta(seconds=1))}]
  with self.assertRaises(ValueError):m.archive_forecasts([f],self.now,self.root/'future-input')
 def test_return_to_previous_inputs_is_a_new_latest_revision(self):
  a=m.model_forecast(self.f,self.training);b=copy.deepcopy(a);b.update(prob_home=.5,prob_draw=.3,prob_away=.2);path=self.root/'revert'
  _,records,_=m.archive_forecasts([a],self.now,path)
  changed,records,_=m.archive_forecasts([b],self.now+dt.timedelta(minutes=1),path)
  current,records,n=m.archive_forecasts([a],self.now+dt.timedelta(minutes=2),path)
  self.assertEqual(n,1);self.assertEqual(len(records),3)
  self.assertEqual(current[0]['prob_home'],a['prob_home']);self.assertEqual(current[0]['revision_of'],changed[0]['record_sha256'])
  current,records,n=m.archive_forecasts([a],self.now+dt.timedelta(minutes=3),path)
  self.assertEqual(n,0);self.assertEqual(current[0]['generated_at_utc'],m.stamp(self.now+dt.timedelta(minutes=2)))
 def test_duplicate_batch_does_not_partially_write_archive(self):
  a=m.model_forecast(self.f,self.training);path=self.root/'duplicate'
  with self.assertRaises(ValueError):m.archive_forecasts([a,a],self.now,path)
  self.assertFalse(path.exists())
 def espn(self,detail='FT',league='eng.2'):
  return json.dumps({'leagues':[{'slug':league}],'events':[{'id':'1','date':self.f['kickoff_utc'],'status':{'type':{'state':'post','completed':True,'detail':detail}},'competitions':[{'competitors':[{'homeAway':'home','team':{'displayName':'Coventry'},'score':'2'},{'homeAway':'away','team':{'displayName':'Hull'},'score':'1'}]}]}]}).encode()
 def test_regulation_time_only_and_competition_guard(self):
  self.assertEqual(len(m.espn_rows(self.espn(),'E1','post')),1)
  self.assertEqual(m.espn_rows(self.espn('AET'),'E1','post'),[])
  self.assertEqual(m.espn_rows(self.espn('FT-Pens'),'E1','post'),[])
  with self.assertRaises(ValueError):m.espn_rows(self.espn(league='esp.1'),'E1','post')
 def test_sky_wrong_month_and_wrong_competition(self):
  r={'competition':{'name':{'full':'EFL Championship'}},'matchState':'pre','isFixture':True,'start':{'date':'Monday 2nd November','time':'20:00'},'teams':{'home':{'name':{'full':'Coventry City'}},'away':{'name':{'full':'Hull City'}}}}
  import html
  raw=('<a id="currently-selected-day" data-date-string="11.2026"></a><div data-component-name="ui-sport-match-score" data-state="'+html.escape(json.dumps(r),quote=True)+'"></div>').encode()
  self.assertEqual(len(m.sky_rows(raw,'E1','2026-11','pre')),1);self.assertEqual(m.sky_rows(raw,'SP1','2026-11','pre'),[])
  with self.assertRaises(ValueError):m.sky_rows(raw,'E1','2027-11','pre')
 def test_csv_cutoff_and_regulation_result_matching(self):
  raw=b'Div,Date,Time,HomeTeam,AwayTeam,FTHG,FTAG,FTR\nE1,02/11/2026,20:00,Coventry,Hull,2,1,H\n'
  self.assertEqual(m.csv_rows(raw,'E1',self.now,'2627'),[])
  rows=m.csv_finals(raw,'E1');self.assertIsNotNone(m.corroborate(self.f,rows))
 def test_two_source_scoring_and_disagreement(self):
  f=m.model_forecast(self.f,self.training);r,all,n=m.archive_forecasts([f],self.now,self.root/'archive')
  class Fetch:
   def get(inner,url):
    raw=self.espn() if 'espn.com' in url else b'Div,Date,Time,HomeTeam,AwayTeam,FTHG,FTAG,FTR\nE1,02/11/2026,20:00,Coventry,Hull,2,1,H\n'
    return raw,{'url':url,'sha256':'a'*64}
  perf=m.score_results(all,Fetch(),self.now+dt.timedelta(days=1),self.root/'results.json')
  self.assertEqual(perf['by_league']['E1']['scored_races'],1);self.assertEqual(perf['by_league']['UCL']['scored_races'],0)
  perf=m.score_results(all,Fetch(),self.now+dt.timedelta(days=1),self.root/'results.json');self.assertEqual(len(perf['entries']),1)
  class Disagree(Fetch):
   def get(inner,url):
    raw,receipt=super().get(url)
    return (raw.replace(b',2,1,H',b',1,1,D') if 'football-data' in url else raw),receipt
  pending=m.score_results(all,Disagree(),self.now+dt.timedelta(days=1),self.root/'disagreement.json');self.assertEqual(pending['entries'],[])
  bad=json.loads((self.root/'results.json').read_text());bad['entries'][0]['source_receipts']=[];(self.root/'results.json').write_text(json.dumps(bad))
  with self.assertRaises(ValueError):m.score_results(all,Fetch(),self.now+dt.timedelta(days=1),self.root/'results.json')
 def test_oldest_first_settlement_order_and_tie_break(self):
  fixtures=[
   {'kickoff_utc':'2026-11-05T20:00:00Z','record_sha256':'c'},
   {'kickoff_utc':'2026-11-02T20:00:00Z','record_sha256':'b'},
   {'kickoff_utc':'2026-11-02T20:00:00Z','record_sha256':'a'},
  ]
  ordered=m.oldest_first_unresolved(fixtures)
  self.assertEqual([r['record_sha256'] for r in ordered],['a','b','c'])
  self.assertEqual(fixtures[0]['record_sha256'],'c')

 def test_unresolved_diagnostics_do_not_count_future_as_due(self):
  f=m.model_forecast(self.f,self.training)
  _,records,_=m.archive_forecasts([f],self.now,self.root/'archive')
  class NoFetch:
   def get(inner,url):raise AssertionError('Future result requested')
  perf=m.score_results(records,NoFetch(),self.now,self.root/'future-diagnostics.json')
  cycle=perf['cycle_audit']
  self.assertEqual(cycle['due_unresolved_reason_counts'],{})
  self.assertEqual(cycle['due_unresolved_sample'],[])
  self.assertEqual(cycle['pending_reasons'],{'WAITING_FOR_FINAL':1})

 def test_future_forecasts_never_request_results(self):
  f=m.model_forecast(self.f,self.training);_,records,_=m.archive_forecasts([f],self.now,self.root/'archive')
  class NoFetch:
   def get(inner,url):raise AssertionError('Future results must not be requested')
  perf=m.score_results(records,NoFetch(),self.now,self.root/'future.json')
  self.assertEqual(perf['cycle_audit']['status'],'AWAITING_FIRST_KICKOFF')
  self.assertEqual(perf['cycle_audit']['not_started'],1)
  self.assertIsNone(perf['by_league']['E1']['mean_brier_difference'])
  self.assertEqual(perf['cycle_audit']['next_result_check_eligible_utc'],'2026-11-02T23:00:00Z')
 def test_baseline_comparison_and_revision_do_not_inflate_sample(self):
  f=m.model_forecast(self.f,self.training);_,records,_=m.archive_forecasts([f],self.now,self.root/'archive')
  revised=copy.deepcopy(f);revised['prob_home']=.5;revised['prob_draw']=.3;revised['prob_away']=.2
  _,records,_=m.archive_forecasts([revised],self.now+dt.timedelta(minutes=1),self.root/'archive')
  class Fetch:
   def get(inner,url):
    raw=self.espn() if 'espn.com' in url else b'Div,Date,Time,HomeTeam,AwayTeam,FTHG,FTAG,FTR\nE1,02/11/2026,20:00,Coventry,Hull,2,1,H\n'
    return raw,{'url':url,'sha256':'a'*64}
  perf=m.score_results(records,Fetch(),self.now+dt.timedelta(days=1),self.root/'revised.json')
  stats=perf['by_league']['E1'];self.assertEqual(stats['scored_matches'],1)
  self.assertAlmostEqual(stats['mean_brier_score'],.38)
  self.assertAlmostEqual(stats['mean_brier_difference'],.38-2/3)
  self.assertEqual(perf['entries'][0]['record_sha256'],records[-1]['record_sha256'])
  self.assertEqual(perf['cycle_audit']['status'],'VERIFIED_RESULTS_AVAILABLE')
  self.assertEqual(perf['cycle_audit']['due_unresolved'],0)
if __name__=='__main__':unittest.main()
