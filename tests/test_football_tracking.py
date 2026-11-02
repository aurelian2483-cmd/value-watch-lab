import copy
import datetime as dt
import importlib.util
import json
from pathlib import Path
import sys
import tempfile
import subprocess
import unittest
from unittest.mock import patch

HERE=Path(__file__).resolve().parent
# Also works when this test is installed under tests/ in the repository.
SCRIPTS=HERE if (HERE/'experiment106_prospective_archive.py').exists() else HERE.parent/'scripts'
sys.path.insert(0,str(SCRIPTS))
import experiment106_prospective_archive as archive
import experiment90_archive_result_scoring as scorer
from football_result_integrity import load_archives,validate_result

class TrackingTests(unittest.TestCase):
 def setUp(self):
  self.tmp=tempfile.TemporaryDirectory();self.root=Path(self.tmp.name)
  self.now=dt.datetime(2020,1,1,12,tzinfo=dt.timezone.utc)
  f={'home':'Newcastle United','away':'Everton','kickoff_utc':'2020-01-02T20:00:00Z',
   'model':'MODEL_TEST','prob_home':.4,'prob_draw':.3,'prob_away':.3,'research_only':True,
   'publication_gate':'BLOCKED','model_validation':'UNVALIDATED','challenge_eligible':0,'odds':None,'expected_value':None}
  self.feed={'generated_at_utc':self.now.isoformat(),'research_only':True,'publication_gate':'BLOCKED',
   'model_validation':'UNVALIDATED','official_challenge':{'completed':0},
   'experimental_model_audit':{'training_sha256':'a'*64},'experimental_model_forecasts':[f],
   'upcoming_fixtures':[{'home':f['home'],'away':f['away'],'kickoff_utc':f['kickoff_utc'],'verification':'SCHEDULE_CROSS_CHECK'}]}
  self.primary=self.root/'research/forecast-archive/v2';self.revisions=self.root/'research/forecast-revisions/v2'
 def tearDown(self):self.tmp.cleanup()
 def save(self,feed=None,now=None):return archive.archive(feed or self.feed,now or self.now,self.primary,self.revisions)
 def test_primary_idempotence_revision_and_integrity(self):
  self.assertEqual(self.save()['new_primary_records'],1)
  path=next(self.primary.glob('*.json'));original=path.read_bytes()
  self.assertEqual(self.save()['unchanged'],1)
  changed=copy.deepcopy(self.feed);changed['experimental_model_forecasts'][0].update(prob_home=.5,prob_draw=.2)
  self.assertEqual(self.save(changed)['revisions'],1);self.assertEqual(original,path.read_bytes())
  self.assertEqual(len(list(self.revisions.glob('*.json'))),1)
  record=json.loads(original);record['prob_home']=.9;path.write_text(json.dumps(record))
  with self.assertRaises(ValueError):self.save()
 def test_no_postkickoff_backfill_or_stale_feed(self):
  now=dt.datetime(2020,1,2,21,tzinfo=dt.timezone.utc);self.feed['generated_at_utc']=now.isoformat()
  self.assertEqual(self.save(now=now)['skipped_started'],1);self.assertFalse(self.primary.exists())
  self.feed['generated_at_utc']='2019-12-01T00:00:00Z'
  with self.assertRaises(ValueError):self.save()
 def test_batch_rejects_unsafe_duplicate_or_invalid_probability(self):
  for change in ['unsafe','duplicate','probability']:
   data=copy.deepcopy(self.feed)
   if change=='unsafe':data['publication_gate']='OPEN'
   elif change=='duplicate':data['experimental_model_forecasts']*=2
   else:data['experimental_model_forecasts'][0]['prob_home']=float('nan')
   with self.assertRaises(ValueError):self.save(data)
   self.assertFalse(self.primary.exists())
 def test_two_source_scoring_disagreement_and_no_rescoring(self):
  self.save();scorer.ROOT=self.root;scorer.OUT=self.root/'audit';scorer.OUT.mkdir()
  event={'id':'test','date':'2020-01-02T20:00:00Z','status':{'type':{'state':'post','completed':True,'detail':'FT'}},
   'competitions':[{'competitors':[{'homeAway':'home','score':'2','team':{'displayName':'Newcastle'}},
    {'homeAway':'away','score':'1','team':{'displayName':'Everton'}}]}]}
  def fetch(url):
   raw=json.dumps({'leagues':[{'slug':'eng.1'}],'events':[event]}).encode() if 'espn.com' in url else b'Div,Date,Time,HomeTeam,AwayTeam,FTHG,FTAG,FTR\nE0,02/01/2020,20:00,Newcastle,Everton,2,1,H\n'
   return raw,{'url':url,'sha256':'a'*64,'received_at_utc':'2020-01-03T00:00:00Z'}
  with patch.object(scorer,'fetch',fetch):scorer.main()
  report=json.loads((scorer.OUT/'report.json').read_text());self.assertEqual(len(report['scored']),1)
  self.assertEqual(report['scored'][0]['model'],'MODEL_TEST');self.assertAlmostEqual(report['scored'][0]['multiclass_brier_score'],.54)
  event['competitions'][0]['competitors'][0]['score']='3'
  with patch.object(scorer,'fetch',fetch):scorer.main()
  self.assertEqual(len(json.loads((scorer.OUT/'report.json').read_text())['scored']),0)
  ledger=self.root/'research/results-ledger/v1/verified-results.json'
  audit_path=self.root/'successful-audit.json';audit_path.write_text(json.dumps(report))
  with patch.object(sys,'argv',['ledger-test']):
   spec=importlib.util.spec_from_file_location('ledger_test',SCRIPTS/'experiment92_results_ledger.py')
   module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)
  module.ROOT=self.root;module.LEDGER=ledger;module.AUDIT=audit_path;module.main();before=ledger.read_bytes();module.main()
  self.assertEqual(before,ledger.read_bytes())
  history=self.root/'history.json'
  subprocess.run([sys.executable,str(SCRIPTS/'experiment93_public_history.py'),str(ledger),str(history)],check=True,capture_output=True)
  public=json.loads(history.read_text());self.assertEqual(public['unique_fixture_count'],1)
  self.assertEqual(public['model_metrics']['MODEL_TEST']['scored_forecasts'],1)
  self.assertEqual(public['official_challenge'],'0/100')
  with patch.object(scorer,'fetch',side_effect=AssertionError('must not refetch immutable scored entry')):scorer.main()
 def test_extra_time_wrong_competition_and_wrong_csv_kickoff_are_rejected(self):
  self.save();scorer.ROOT=self.root;scorer.OUT=self.root/'audit';scorer.OUT.mkdir()
  for detail,slug,csvtime in [('AET','eng.1','20:00'),('FT-Pens','eng.1','20:00'),('FT','esp.1','20:00'),('FT','eng.1','19:00')]:
   event={'id':'test','date':'2020-01-02T20:00:00Z','status':{'type':{'state':'post','completed':True,'detail':detail}},'competitions':[{'competitors':[{'homeAway':'home','score':'2','team':{'displayName':'Newcastle'}},{'homeAway':'away','score':'1','team':{'displayName':'Everton'}}]}]}
   def fetch(url):
    raw=json.dumps({'leagues':[{'slug':slug}],'events':[event]}).encode() if 'espn.com' in url else ('Div,Date,Time,HomeTeam,AwayTeam,FTHG,FTAG,FTR\nE0,02/01/2020,'+csvtime+',Newcastle,Everton,2,1,H\n').encode()
    return raw,{'url':url,'sha256':'a'*64}
   with patch.object(scorer,'fetch',fetch):
    try:scorer.main()
    except SystemExit:pass
   self.assertEqual(json.loads((scorer.OUT/'report.json').read_text())['scored'],[])
 def test_public_result_metrics_identity_and_source_hosts_are_bound_to_archive(self):
  self.save();records=load_archives(self.root);digest=next(iter(records))
  entry={'record_sha256':digest,'home':'Newcastle','away':'Everton','kickoff_utc':'2020-01-02T20:00:00Z','model':'MODEL_TEST','score_home':2,'score_away':1,'actual_outcome':'H','multiclass_brier_score':.54,'log_loss':-__import__('math').log(.4),'source_receipts':[{'url':'https://site.api.espn.com/test','sha256':'a'*64},{'url':'https://www.football-data.co.uk/test','sha256':'b'*64}]}
  validate_result(entry,records)
  for field,value in [('log_loss',99),('home','Other'),('model','Other'),('source_receipts',[{'url':'https://site.api.espn.com.attacker.invalid/test','sha256':'a'*64},entry['source_receipts'][1]])]:
   changed=copy.deepcopy(entry);changed[field]=value
   with self.assertRaises(ValueError):validate_result(changed,records)

if __name__=='__main__':unittest.main()
