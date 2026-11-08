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

    def test_fixture_fallback_preserves_separate_meeting_records(self):
        now=dt.datetime(2026,11,8,12,tzinfo=dt.timezone.utc)
        dates=[(now.date()+dt.timedelta(days=i)).isoformat() for i in range(1,8)]
        fixture_html=(''.join('<a href="/racing/meeting/{}/carlisle/{}">Carlisle</a>'.format(day,122400+i) for i,day in enumerate(dates))).encode()
        def fetch(url):
            if url.endswith('/racing/going'):return fixture_html
            raise OSError('unavailable')
        from free_racing_sources import collect_free
        result=collect_free(dates,now,fetch=fetch)
        self.assertEqual(len(result['meetings']),7)
        self.assertEqual(result['status'],'SOURCE_OBSERVED')
        self.assertTrue(all(row['record_type']=='MEETING_FIXTURE' for row in result['meetings']))
        self.assertTrue(all('startUTC' not in row and 'runners' not in row for row in result['meetings']))

    def test_publish_gate_accepts_observed_fixture_only_snapshot(self):
        days=[{'date':'2026-11-%02d'%i} for i in range(9,16)]
        fixture={'date':'2026-11-09','course':'Carlisle','record_type':'MEETING_FIXTURE',
                 'race_times_status':'NOT_SUPPLIED','declarations_status':'NOT_VERIFIED'}
        data={'schema_version':1,'research_only':True,'publication_gate':'BLOCKED',
              'model_validation':'UNVALIDATED','fixture_source_status':'SOURCE_OBSERVED','days':days,'races':[],'fixture_meetings':[fixture]}
        self.assertTrue(module.validate_publishable_snapshot(data))
        for field,value in [('startUTC','2026-11-09T12:00:00Z'),('runners',[]),('odds',{})]:
            invalid={**data,'fixture_meetings':[{**fixture,field:value}]}
            with self.subTest(field=field),self.assertRaises(ValueError):
                module.validate_publishable_snapshot(invalid)
        with self.assertRaises(ValueError):
            module.validate_publishable_snapshot({**data,'fixture_meetings':[]})
        with self.assertRaises(ValueError):
            module.validate_publishable_snapshot({**data,'publication_gate':'OPEN'})
        with self.assertRaises(ValueError):
            module.validate_publishable_snapshot({**data,'fixture_source_status':'COLLECTION_FAILED'})
        with self.assertRaises(ValueError):
            module.validate_publishable_snapshot({**data,'days':days[:-1]+[days[0]]})

if __name__=='__main__':
    unittest.main()
