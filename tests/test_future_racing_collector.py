import datetime as dt
import json
import importlib.util
import pathlib
import sys
import tempfile
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
                 'race_times_status':'NOT_SUPPLIED','declarations_status':'NOT_VERIFIED',
                 'source_url':'https://www.sportinglife.com/racing/meeting/2026-11-09/carlisle/122465'}
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
            module.validate_publishable_snapshot({**data,'fixture_meetings':[{**fixture,'source_url':'https://example.org/racing/meeting/2026-11-09/carlisle/122465'}]})
        atr_fixture={**fixture,'source_url':'https://www.attheraces.com/racing-calendar'}
        self.assertTrue(module.validate_publishable_snapshot({**data,'fixture_meetings':[atr_fixture]}))
        racingpost_fixture={**fixture,'source_url':'https://www.racingpost.com/racecards/2026-11-09/1/carlisle'}
        self.assertTrue(module.validate_publishable_snapshot({**data,'fixture_meetings':[racingpost_fixture]}))
        with self.assertRaises(ValueError):
            module.validate_publishable_snapshot({**data,'fixture_meetings':[{**fixture,'source_url':'https://www.racingpost.com/racecards/2026-11-10/1/carlisle'}]})
        with self.assertRaises(ValueError):
            module.validate_publishable_snapshot({**data,'days':days[:-1]+[{'date':'2026-11-17'}]})
        with self.assertRaises(ValueError):
            module.validate_publishable_snapshot({**data,'days':days[:-1]+[{'date':'2026-11-99'}]})
        with self.assertRaises(ValueError):
            module.validate_publishable_snapshot({**data,'days':days[:-1]+[days[0]]})

    def test_snapshot_write_keeps_previous_file_when_validation_fails(self):
        days=[{'date':'2026-11-%02d'%i} for i in range(9,16)]
        fixture={'date':'2026-11-09','course':'Carlisle',
                 'source_url':'https://www.sportinglife.com/racing/meeting/2026-11-09/carlisle/122465',
                 'record_type':'MEETING_FIXTURE','race_times_status':'NOT_SUPPLIED',
                 'declarations_status':'NOT_VERIFIED'}
        data={'schema_version':1,'research_only':True,'publication_gate':'BLOCKED',
              'model_validation':'UNVALIDATED','fixture_source_status':'SOURCE_OBSERVED',
              'days':days,'races':[],'fixture_meetings':[fixture]}
        with tempfile.TemporaryDirectory() as tmp:
            target=pathlib.Path(tmp)/'racing-future-data.json'
            target.write_text('previous-good-snapshot')
            module.write_validated_snapshot(data,target)
            published=json.loads(target.read_text())
            self.assertEqual(published['fixture_meetings'][0]['course'],'Carlisle')
            previous=target.read_text()
            with self.assertRaises(ValueError):
                module.write_validated_snapshot({**data,'publication_gate':'OPEN'},target)
            self.assertEqual(target.read_text(),previous)
            self.assertEqual(list(pathlib.Path(tmp).glob('*.tmp')),[])
            with patch.object(module.os,'replace',side_effect=OSError('simulated interrupted replacement')):
                with self.assertRaises(OSError):
                    module.write_validated_snapshot(data,target)
            self.assertEqual(target.read_text(),previous)
            self.assertEqual(list(pathlib.Path(tmp).glob('*.tmp')),[])

    def test_fixture_provider_to_published_dashboard_contract(self):
        from free_racing_sources import collect_free
        now=dt.datetime(2026,11,8,12,tzinfo=dt.timezone.utc)
        dates=[(now.date()+dt.timedelta(days=i)).isoformat() for i in range(1,8)]
        href='/racing/meeting/2026-11-09/carlisle/122465'
        raw=('<html><a href="'+href+'">Carlisle</a></html>').encode()
        def fetch(url):
            if url=='https://www.sportinglife.com/racing/going':
                return raw
            raise OSError('provider unavailable')
        collected=collect_free(dates,now,fetch=fetch)
        self.assertEqual(collected['status'],'SOURCE_OBSERVED')
        self.assertEqual(len(collected['meetings']),1)
        data={'schema_version':1,'research_only':True,'publication_gate':'BLOCKED',
              'model_validation':'UNVALIDATED','fixture_source_status':collected['status'],
              'days':[{'date':day,'status':'COLLECTION_FAILED','count':0} for day in dates],
              'races':[],'fixture_meetings':collected['meetings']}
        with tempfile.TemporaryDirectory() as tmp:
            output=pathlib.Path(tmp)/'racing-future-data.json'
            module.write_validated_snapshot(data,output)
            dashboard=json.loads(output.read_text())
        fixture=dashboard['fixture_meetings'][0]
        self.assertEqual(fixture['record_type'],'MEETING_FIXTURE')
        self.assertEqual(fixture['date'],'2026-11-09')
        self.assertTrue(fixture['source_url'].startswith('https://www.sportinglife.com/'))
        self.assertEqual(fixture['race_times_status'],'NOT_SUPPLIED')
        self.assertEqual(fixture['declarations_status'],'NOT_VERIFIED')
        self.assertNotIn('runners',fixture)
        self.assertNotIn('odds',fixture)

if __name__=='__main__':
    unittest.main()
