"""No backdating, no fake outcomes, first-write-wins, source freshness and strict identity."""
import copy
import importlib.util
import json
import tempfile
import unittest
from datetime import datetime, timezone, timedelta
from pathlib import Path

SCRIPT=Path(__file__).resolve().parents[1]/'scripts'/'capture_prospective_research.py'
spec=importlib.util.spec_from_file_location('capture_prospective_research',SCRIPT)
cap=importlib.util.module_from_spec(spec)
spec.loader.exec_module(cap)

NOW=datetime(2026,11,16,10,0,tzinfo=timezone.utc)
iso=cap.iso
start=iso(NOW+timedelta(days=1))
source_at=iso(NOW-timedelta(minutes=2))
forecast_at=iso(NOW-timedelta(minutes=1))
trained=iso(NOW-timedelta(hours=8))
HASH='a'*64
def event(sport='tennis'):
    participants=[{'id':'a','name':'Alpha'},{'id':'b','name':'Beta'}]
    probs=[{'id':'a','probability':.6},{'id':'b','probability':.4}]
    if sport=='nfl':
        probs=[{'id':'a','probability':.58},{'id':'tie','probability':.02},{'id':'b','probability':.4}]
    return {'id':'test-1','startUTC':start,'participants':participants,'source':'https://site.api.espn.com/apis/site/v2/sports/tennis/atp/scoreboard?dates=20261117',
            'source_sha256':HASH,'source_collected_at_utc':source_at,
            'forecast':{'model':'FIXED_ELO_K24_V1','market':cap.MARKETS[sport],
                        'calibrated':False,'odds':None,'expected_value':None,'training_matches':70,
                        'training_sha256':HASH,'training_latest_start_utc':trained,
                        'generated_at_utc':forecast_at,'outcomes':probs}}
def feed(sport='tennis'):
    return {'research_only':True,'model_validation':'UNVALIDATED','publication_gate':'BLOCKED','generated_at_utc':iso(NOW),
            'sports':{'tennis':{'events':[]},'nfl':{'events':[]},sport:{'events':[event(sport)]}}}
def ledger():
    return {'schemaVersion':1,'kind':'PROSPECTIVE_PREDICTION_LEDGER','modelValidated':False,'records':[],'policy':'Research only'}
def results():
    return {'schemaVersion':1,'kind':'VERIFIED_OUTCOME_FEED','records':[]}

class CaptureTests(unittest.TestCase):
    def test_accept_and_keep_first_forecast(self):
        items,a=cap.snapshot_candidates(feed(),NOW)
        self.assertEqual(len(items),1)
        self.assertEqual(a['eligible'],1)
        l=ledger()
        self.assertEqual(cap.append_only(l,items),1)
        original=copy.deepcopy(l['records'][0])
        later=copy.deepcopy(items[0]);later['probabilities']={'a':.2,'b':.8}
        self.assertEqual(cap.append_only(l,[later]),0)
        self.assertEqual(l['records'][0],original)
        self.assertEqual(l['records'][0]['recorded_at_utc'],iso(NOW))
        self.assertEqual(cap.append_only(l,items),0)
        self.assertEqual(len(l['records']),1)
    def test_football_absent_nothing_invented(self):
        f=feed();f['sports']['tennis']['events']=[]
        a,report=cap.snapshot_candidates(f,NOW)
        self.assertEqual(a,[])
        self.assertEqual(report['eligible'],0)
    def test_stale_and_bad_research_gates_fail_closed(self):
        f=feed();f['publication_gate']='OPEN'
        with self.assertRaises(ValueError):cap.snapshot_candidates(f,NOW)
        f=feed();f['generated_at_utc']=iso(NOW-timedelta(days=3))
        with self.assertRaises(ValueError):cap.snapshot_candidates(f,NOW)
    def test_post_start_cannot_capture(self):
        f=feed();f['sports']['tennis']['events'][0]['startUTC']=iso(NOW+timedelta(minutes=4))
        items,report=cap.snapshot_candidates(f,NOW)
        self.assertEqual(items,[])
        self.assertEqual(report['rejected']['STARTED_OR_TOO_SOON'],1)
    def test_timestamp_and_probability_safety(self):
        f=feed();f['sports']['tennis']['events'][0]['source_collected_at_utc']=iso(NOW+timedelta(days=1))
        self.assertEqual(cap.snapshot_candidates(f,NOW)[0],[])
        f=feed();f['sports']['tennis']['events'][0]['forecast']['outcomes'][0]['probability']=.7
        self.assertEqual(cap.snapshot_candidates(f,NOW)[0],[])
        f=feed();f['sports']['tennis']['events'][0]['forecast']['outcomes'][0]['id']='unknown'
        self.assertEqual(cap.snapshot_candidates(f,NOW)[0],[])
        f=feed();f['sports']['tennis']['events'][0]['forecast']['generated_at_utc']=iso(NOW+timedelta(hours=1))
        self.assertEqual(cap.snapshot_candidates(f,NOW)[0],[])
    def test_nfl_market_and_tie(self):
        f=feed('nfl')
        items,_=cap.snapshot_candidates(f,NOW)
        self.assertEqual(len(items),1)
        self.assertEqual(set(items[0]['probabilities']),{'a','b','tie'})
        self.assertEqual(items[0]['market'],'GAME_RESULT_INCLUDING_OVERTIME')
    def test_result_review_queue_does_not_claim_verification(self):
        l=ledger();l['records']=[{**cap.snapshot_candidates(feed(),NOW)[0][0],
          'event_start_utc':iso(NOW-timedelta(days=1))}]
        q=cap.review_queue(l,results(),NOW)
        self.assertEqual(q['pending_count'],1)
        self.assertFalse(q['pending'][0]['automatic_settlement'])
        self.assertEqual(q['pending'][0]['status'],'AWAITING_INDEPENDENT_FINAL_RESULT')
    def test_append_conflict_and_existing_duplicates_block(self):
        items,_=cap.snapshot_candidates(feed(),NOW)
        a=copy.deepcopy(items[0]);b=copy.deepcopy(a);b['probabilities']={'a':.3,'b':.7}
        with self.assertRaises(ValueError):cap.append_only(ledger(),[a,b])
        l=ledger();l['records']=[a,a]
        with self.assertRaises(ValueError):cap.append_only(l,[])
    def test_full_run_no_network_and_repeat_is_idempotent(self):
        with tempfile.TemporaryDirectory() as folder:
            root=Path(folder)
            (root/'other-sports-data.json').write_text(json.dumps(feed()))
            (root/'prediction-ledger.json').write_text(json.dumps(ledger()))
            (root/'results-feed.json').write_text(json.dumps(results()))
            first=cap.run(root,NOW);self.assertEqual(first['appended'],1)
            frozen=(root/'prediction-ledger.json').read_bytes()
            again=cap.run(root,NOW+timedelta(minutes=1))
            self.assertEqual(again['appended'],0)
            self.assertEqual((root/'prediction-ledger.json').read_bytes(),frozen)
            q=json.loads((root/'research'/'pending-independent-results.json').read_text())
            self.assertEqual(q['pending_count'],0)

if __name__=='__main__':unittest.main()
