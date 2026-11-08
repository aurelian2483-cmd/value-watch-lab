import datetime as dt
import json
import importlib.util
import pathlib
import sys
import unittest
from unittest.mock import patch

ROOT=pathlib.Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'scripts'))
import collect_future_racing as module

class FutureRacingTests(unittest.TestCase):
    def test_seven_days_and_dashboard_fields(self):
        now=dt.datetime(2026,11,8,12,tzinfo=dt.timezone.utc)
        def fetch(url):
            return ('<html><script id="__NEXT_DATA__" type="application/json">'+json.dumps({'props':{'pageProps':{'meetings':[{'meeting_summary':{'date':url.split('date=')[-1]}}]}}})+'</script></html>').encode('utf-8')
        def discover(raw,observed,target_date):
            start=dt.datetime.combine(target_date,dt.time(13),dt.timezone.utc).isoformat()
            return {'races':[{'race_id':target_date.isoformat(),'racecourse':'Test course',
                'name':'Test race','startUTC':start,
                'source':'https://www.sportinglife.com/racing/racecards/'+target_date.isoformat()+'/test/racecard/1/test',
                'source_link_type':'PAGE_LINK','source_runner_count':0,
                'observedAtUTC':observed.isoformat(),'verification':'SINGLE_SOURCE_UNVERIFIED'}]}
        with patch.object(module,'discover',discover):
            d=module.collect(fetch=fetch,now=now)
        self.assertEqual(len(d['days']),7)
        self.assertEqual(len(d['races']),7)
        self.assertEqual(d['days'][0]['date'],'2026-11-09')
        self.assertEqual(d['days'][-1]['date'],'2026-11-15')
        self.assertTrue(all(r['source_url'] and r['scheduled_start_time_utc'] for r in d['races']))
        self.assertTrue(all(r['declaration_stage']=='NOT_VERIFIED' for r in d['races']))
        self.assertEqual(d['publication_gate'],'BLOCKED')

    def test_repeated_source_pages_are_rejected(self):
        now=dt.datetime(2026,11,8,12,tzinfo=dt.timezone.utc)
        def fake_discover(raw,observed,target_date):
            return {'races':[]}
        with patch.object(module,'discover',fake_discover):
            d=module.collect(fetch=lambda url:b'<html><script id="__NEXT_DATA__">{"props":{"pageProps":{"meetings":[]}}}</script></html>',now=now)
        self.assertEqual(d['days'][0]['status'],'NO_MATCHING_RACES_OBSERVED')
        self.assertTrue(all(x['status']=='COLLECTION_FAILED' for x in d['days'][1:]))
        self.assertTrue(all('Identical response' in x['error'] for x in d['days'][1:]))

    def test_source_failure_is_not_a_zero_race_claim(self):
        now=dt.datetime(2026,11,8,12,tzinfo=dt.timezone.utc)
        d=module.collect(fetch=lambda url: (_ for _ in ()).throw(OSError('offline')),now=now)
        self.assertEqual(len(d['days']),7)
        self.assertTrue(all(x['status']=='COLLECTION_FAILED' for x in d['days']))
        self.assertEqual(d['races'],[])

    def test_authenticated_api_seven_dates_and_research_gates(self):
        now=dt.datetime(2026,11,8,12,tzinfo=dt.timezone.utc)
        def fetch_json(url):
            day=url.rsplit('/',1)[-1]
            return {'data':[{'date':day,'course':'Test course','races':[{
                'race_id':'race-'+day,'time':'13:30:00','name':'Test race','runners':8
            }]}]}
        d=module.collect_api(now=now,fetch_json=fetch_json)
        self.assertEqual(len(d['days']),7)
        self.assertEqual(len(d['races']),7)
        self.assertEqual(d['failed_dates'],[])
        self.assertEqual(d['publication_gate'],'BLOCKED')
        self.assertEqual(d['model_validation'],'UNVALIDATED')
        self.assertTrue(all(r['verification']=='SINGLE_SOURCE_UNVERIFIED' for r in d['races']))
        self.assertTrue(all(r['runners']==[] for r in d['races']))

    def test_authenticated_api_rejects_wrong_date_without_fabricating_coverage(self):
        now=dt.datetime(2026,11,8,12,tzinfo=dt.timezone.utc)
        def fetch_json(url):
            return {'data':[{'date':'2026-11-08','course':'Test','races':[]}]}
        d=module.collect_api(now=now,fetch_json=fetch_json)
        self.assertEqual(d['races'],[])
        self.assertEqual(len(d['failed_dates']),7)
        self.assertTrue(all(day['status']=='COLLECTION_FAILED' for day in d['days']))

if __name__=='__main__':
    unittest.main()
