"""Single-provider observed result tests: never promote to independent outcome."""
import importlib.util
import json
import unittest
from datetime import datetime,timezone,timedelta
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]/'scripts'
import sys
sys.path.insert(0,str(ROOT))
import capture_prospective_research as cap
import observe_pending_results as obs
NOW=datetime(2026,11,20,18,tzinfo=timezone.utc)
START=cap.iso(NOW-timedelta(days=1))
HASH='c'*64
def pred(sport='tennis'):
    event_id='atp-555' if sport=='tennis' else 'nfl-555'
    return {'prediction_id':sport+':'+event_id+':PRED','sport':sport,'event_id':event_id,
            'market':cap.MARKETS[sport],'source_url':'https://site.api.espn.com/apis/site/v2/sports/'+('tennis/atp/' if sport=='tennis' else 'football/nfl/')+'scoreboard?dates=20261119',
            'event_start_utc':START,'participant_ids':['a','b'],'probabilities':{'a':.6,'b':.4,'tie':0.001} if sport=='nfl' else {'a':.6,'b':.4}}
def comp(sport='tennis'):
    ps=[{'id':'a','type':'athlete' if sport=='tennis' else 'team','winner':True,'score':'24'},
        {'id':'b','type':'athlete' if sport=='tennis' else 'team','winner':False,'score':'17'}]
    return {'id':'555','date':START,'status':{'type':{'name':'STATUS_FINAL','completed':True}},'competitors':ps}
def doc(sport='tennis',c=None):
    c=c or comp(sport)
    return {'events':[{'competitions':[c]}]} if sport=='nfl' else {'events':[{'groupings':[{'grouping':{'slug':'mens-singles'},'competitions':[c]}]}]}
def archive():
    return {'schema_version':1,'research_only':True,'publication_gate':'BLOCKED','observations':[]}
def ledger(*records):
    return {'schemaVersion':1,'kind':'PROSPECTIVE_PREDICTION_LEDGER','records':list(records)}

class ObservedResults(unittest.TestCase):
    def test_tennis_final_observation_stays_unverified(self):
        results=archive()
        r=obs.collect(ledger(pred()),results,NOW,fetcher=lambda u:(doc(),HASH))
        self.assertEqual(r['new_observations'],1)
        row=results['observations'][0]
        self.assertEqual(row['actual_outcome'],'a')
        self.assertFalse(row['independently_verified'])
        self.assertFalse(row['betting_eligible'])
        self.assertEqual(row['status'],'SINGLE_PROVIDER_FINAL_UNVERIFIED')
        again=obs.collect(ledger(pred()),results,NOW+timedelta(hours=1),fetcher=lambda u:(doc(),HASH))
        self.assertEqual(again['new_observations'],0)
        self.assertEqual(len(results['observations']),1)
    def test_nfl_final_scores(self):
        r=archive()
        self.assertEqual(obs.collect(ledger(pred('nfl')),r,NOW,lambda u:(doc('nfl'),HASH))['new_observations'],1)
        self.assertEqual(r['observations'][0]['actual_outcome'],'a')
    def test_nfl_tie(self):
        c=comp('nfl');c['competitors'][1]['score']='24'
        r=archive()
        obs.collect(ledger(pred('nfl')),r,NOW,lambda u:(doc('nfl',c),HASH))
        self.assertEqual(r['observations'][0]['actual_outcome'],'tie')
    def test_unfinalized_and_wrong_id_are_withheld(self):
        c=comp();c['status']['type']['name']='STATUS_IN_PROGRESS'
        r=archive()
        self.assertEqual(obs.collect(ledger(pred()),r,NOW,lambda u:(doc(c=c),HASH))['new_observations'],0)
        c=comp();c['competitors'][1]['id']='other'
        self.assertEqual(obs.collect(ledger(pred()),r,NOW,lambda u:(doc(c=c),HASH))['new_observations'],0)
        self.assertEqual(r['observations'],[])
    def test_walkover_retirement_and_reschedule_rejected(self):
        c=comp();c['notes']=[{'text':'Retired due to injury'}]
        r=archive();obs.collect(ledger(pred()),r,NOW,lambda u:(doc(c=c),HASH))
        self.assertEqual(len(r['observations']),0)
        c=comp();c['date']=cap.iso(NOW+timedelta(days=2))
        obs.collect(ledger(pred()),r,NOW,lambda u:(doc(c=c),HASH))
        self.assertEqual(len(r['observations']),0)
    def test_cannot_observe_pre_final_or_wrong_sport_url(self):
        recent=pred();recent['event_start_utc']=cap.iso(NOW-timedelta(hours=1))
        called=[]
        obs.collect(ledger(recent),archive(),NOW,lambda u:called.append(u))
        self.assertEqual(called,[])
        x=pred('nfl');x['source_url']=pred()['source_url']
        self.assertFalse(obs.safe_url(x['source_url'],x['sport']))
        self.assertEqual(obs.collect(ledger(x),archive(),NOW,lambda u:called.append(u))['source_requests'],0)
    def test_no_provider_call_when_no_predictions(self):
        self.assertEqual(obs.collect(ledger(),archive(),NOW,lambda u:None)['source_requests'],0)
    def test_no_independent_feed_written(self):
        a=archive()
        obs.collect(ledger(pred()),a,NOW,lambda u:(doc(),HASH))
        self.assertNotIn('records',a)
        self.assertNotIn('independently_verified',a)
    def test_source_failure_remains_pending(self):
        def fail(url):raise OSError('Down')
        a=archive()
        result=obs.collect(ledger(pred()),a,NOW,fail)
        self.assertEqual(result['new_observations'],0)
        self.assertEqual(result['source_errors'],1)
        self.assertEqual(a['observations'],[])
if __name__=='__main__':unittest.main()
