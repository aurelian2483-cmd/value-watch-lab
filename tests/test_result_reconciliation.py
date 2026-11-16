"""Reconciliation must never fabricate independent outcome approval."""
import copy
import unittest
from datetime import datetime,timezone,timedelta
from pathlib import Path
import sys
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'scripts'))
import reconcile_result_evidence as R
from capture_prospective_research import iso
NOW=datetime(2026,11,20,18,tzinfo=timezone.utc)
START=iso(NOW-timedelta(days=1))
def prediction():
    return {'prediction_id':'tennis:atp-123:MATCH_WINNER:TEST','sport':'tennis','market':'MATCH_WINNER',
      'event_id':'atp-123','event_start_utc':START,'research_only':True,
      'source_url':'https://site.api.espn.com/apis/site/v2/sports/tennis/atp/scoreboard',
      'participant_ids':['p1','p2'],'probabilities':{'p1':.6,'p2':.4}}
def primary():
    return {'prediction_id':prediction()['prediction_id'],'sport':'tennis','event_id':'atp-123',
     'market':'MATCH_WINNER','actual_outcome':'p1','status':'SINGLE_PROVIDER_FINAL_UNVERIFIED',
     'independently_verified':False,'betting_eligible':False}
def secondary():
    return {'prediction_id':prediction()['prediction_id'],'sport':'tennis','event_id':'atp-123',
     'market':'MATCH_WINNER','actual_outcome':'p1','status':'SECONDARY_UNVERIFIED',
     'independently_verified':False,'source_url':'https://results.other-provider.example/abc',
     'response_sha256':'b'*64,'observed_at_utc':iso(NOW-timedelta(hours=1)),
     'participant_ids':['p1','p2']}
def ledger(records=None):
    return {'schemaVersion':1,'kind':'PROSPECTIVE_PREDICTION_LEDGER','records':[prediction()] if records is None else records}
def group(rows=None):
    return {'schema_version':1,'publication_gate':'BLOCKED','observations':[] if rows is None else rows}
def test(p=None,s=None,records=None):
    return R.reconcile(ledger(records),group([primary()] if p is None else p),
                       group([] if s is None else s),NOW)
class Review(unittest.TestCase):
    def test_waiting_primary(self):
        x=test(p=[])
        self.assertEqual(x['status_counts']['AWAITING_PRIMARY_FINAL'],1)
        self.assertEqual(x['independently_verified_results_added'],0)
    def test_no_secondary_no_result(self):
        x=test()
        self.assertEqual(x['status_counts']['AWAITING_INDEPENDENT_SOURCE'],1)
        self.assertFalse(x['items'][0]['auto_certified'])
    def test_agreement_needs_human(self):
        x=test(s=[secondary()])
        self.assertEqual(x['status_counts']['READY_FOR_HUMAN_REVIEW'],1)
        self.assertEqual(x['independently_verified_results_added'],0)
        self.assertEqual(x['publication_gate'],'BLOCKED')
    def test_conflict_blocks(self):
        s=secondary();s['actual_outcome']='p2'
        x=test(s=[s])
        self.assertEqual(x['status_counts']['SECONDARY_CONFLICT'],1)
    def test_espn_as_second_provider_blocked(self):
        s=secondary();s['source_url']=prediction()['source_url']
        x=test(s=[s])
        self.assertEqual(x['status_counts']['SECONDARY_INVALID'],1)
    def test_unsafe_secondary_receipt_blocked(self):
        for patch in [{'response_sha256':'bad'},{'observed_at_utc':START},
                      {'participant_ids':['p1','wrong']},{'independently_verified':True},
                      {'status':'VERIFIED'},{'source_url':'http://example.com'}]:
            s=secondary();s.update(patch)
            self.assertEqual(test(s=[s])['status_counts']['SECONDARY_INVALID'],1)
    def test_duplicate_or_bad_primary(self):
        self.assertEqual(test(p=[primary(),primary()])['status_counts']['IDENTITY_CONFLICT'],1)
        p=primary();p['sport']='nfl'
        self.assertEqual(test(p=[p])['status_counts']['IDENTITY_CONFLICT'],1)
    def test_awaiting_event(self):
        p=prediction();p['event_start_utc']=iso(NOW+timedelta(hours=2))
        self.assertEqual(test(records=[p])['status_counts']['AWAITING_EVENT'],1)
    def test_archive_fails_closed(self):
        with self.assertRaises(ValueError):R.reconcile({},group(),group(),NOW)
        with self.assertRaises(ValueError):test(records=[prediction(),prediction()])
    def test_no_explicit_secondary_is_not_certified(self):
        x=test(s=[])
        self.assertEqual(x['status_counts']['AWAITING_INDEPENDENT_SOURCE'],1)
        self.assertEqual(x['independently_verified_results_added'],0)
if __name__=='__main__':unittest.main()
