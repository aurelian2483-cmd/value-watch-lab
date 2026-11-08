import json
import hashlib
import sys
import unittest
from pathlib import Path
from unittest.mock import patch
sys.path.insert(0, str(Path(__file__).resolve().parents[1]/'scripts'))
import collect_other_sports as m
import collect_future_racing as racing


class ScheduleCoverage(unittest.TestCase):
    def setUp(self):
        self.now = m.datetime(2026, 11, 8, 20, tzinfo=m.timezone.utc)
        self.ratings, self.counts = m.fit([])

    def game(self, identifier, date, state='pre'):
        return {'id': identifier, 'date': date, 'timeValid': True,
                'status': {'type': {'state': state}}, 'competitors': [
                    {'id': 'a', 'type': 'team', 'team': {'displayName': 'Test A'}},
                    {'id': 'b', 'type': 'team', 'team': {'displayName': 'Test B'}}]}

    def slate(self, week, games):
        return {'season': {'year': 2026, 'type': 2}, 'week': {'number': week},
                'events': [{'season': {'year': 2026, 'type': 2}, 'competitions': games}]}

    def test_current_and_next_slate_keep_uk_tuesday_and_next_sunday(self):
        docs = [self.slate(9, [self.game('mon', '2026-11-10T01:15Z'), self.game('past', '2026-11-08T18:00Z', 'in')]),
                self.slate(10, [self.game('sun', '2026-11-15T18:00Z')])]
        with patch.object(m, 'NOW', self.now), patch.object(m, 'batch', return_value=docs) as fetch:
            rows, coverage = m.nfl_schedule(2026, 9, self.ratings, self.counts, [])
        self.assertEqual([r['id'] for r in rows], ['nfl-mon', 'nfl-sun'])
        self.assertEqual([r['competition'] for r in rows], ['NFL · Week 9', 'NFL · Week 10'])
        self.assertIn('week=10', fetch.call_args.args[0][1])
        self.assertEqual([c['accepted_upcoming_games'] for c in coverage], [1, 1])
        self.assertTrue(all(r['forecast'] is None for r in rows))

    def test_mismatched_week_and_duplicate_identity_fail_closed(self):
        for docs in ([self.slate(9, []), self.slate(9, [])],
                     [self.slate(9, [self.game('x', '2026-11-10T01:15Z')]), self.slate(10, [self.game('x', '2026-11-15T18:00Z')])]):
            with patch.object(m, 'NOW', self.now), patch.object(m, 'batch', return_value=docs), self.assertRaises(ValueError):
                m.nfl_schedule(2026, 9, self.ratings, self.counts, [])

    def test_week_18_does_not_invent_next_regular_season_week(self):
        with patch.object(m, 'batch', return_value=[self.slate(18, [])]) as fetch:
            m.nfl_schedule(2026, 18, self.ratings, self.counts, [])
        self.assertEqual(len(fetch.call_args.args[0]), 1)

    def test_tennis_draw_slots_are_classified_by_actual_date(self):
        timed = self.game('x', '2026-11-09T12:00Z')
        timed['competitors'] = [{'id': p, 'type': 'athlete', 'athlete': {'displayName': p}} for p in ('A', 'B')]
        unknown = {**timed, 'id': 'unknown', 'date': '2026-11-12T05:00Z', 'timeValid': False}
        placeholder = {**unknown, 'competitors': []}
        doc = {'events': [{'groupings': [{'grouping': {'slug': 'mens-singles'}, 'competitions': [timed, unknown, placeholder]}]}]}
        counts = m.tennis_source_counts(doc, 'atp', self.now)
        self.assertEqual(counts['tournaments'], 1)
        self.assertEqual(counts['actual_date_counts']['2026-11-12']['raw_singles_slots'], 2)
        self.assertEqual(counts['actual_date_counts']['2026-11-12']['time_unconfirmed'], 1)
        self.assertEqual(counts['actual_date_counts']['2026-11-12']['participants_unconfirmed'], 1)

    def test_changed_page_hash_cannot_hide_ignored_racing_date_selector(self):
        def fetch(url):
            return ('<script id="__NEXT_DATA__">'+json.dumps({'props': {'pageProps': {
                'requested': url, 'meetings': [{'meeting_summary': {'date': '2026-11-08'}}]}}})+'</script>').encode()
        result = racing.collect(fetch=fetch, now=self.now)
        self.assertEqual(result['races'], [])
        self.assertEqual(len(result['days']), 7)
        self.assertEqual({d['status'] for d in result['days']}, {'SOURCE_DATE_MISMATCH'})

    def test_source_linked_meeting_recovers_real_card_and_original_receipt(self):
        fixture={'date':'2026-11-09','course':'Test-Course','source_url':'https://www.sportinglife.com/racing/meeting/2026-11-09/test-course/12'}
        summary={'meeting_reference':{'id':12},'date':fixture['date'],'visible':True,
                 'course':{'name':'Test Course','country':{'short_name':'ENG'}}}
        card={'race_summary':{'race_summary_reference':{'id':123},'course_name':'Test Course','date':fixture['date'],
              'time':'13:00','ride_count':2,'race_stage':'DORMANT','name':'Synthetic Test Hurdle'},
              'rides':[{'ride_reference':{'id':i},'ride_status':'RUNNER','horse':{'horse_reference':{'id':i},'name':'Test Horse '+str(i),'previous_results':[]}} for i in (1,2)]}
        raw=('<script id="__NEXT_DATA__">'+json.dumps({'props':{'pageProps':{'hasError':False,
             'fastResults':{'meeting_summary':summary,'fast_results':[{'race':card}]}}}})+'</script>').encode()
        rows,receipts=racing.collect_meeting_cards([fixture],self.now,lambda _:raw)
        self.assertEqual(len(rows),1)
        self.assertEqual(len(rows[0]['runners']),2)
        self.assertEqual(rows[0]['runner_source'],fixture['source_url'])
        self.assertEqual(rows[0]['runner_source_sha256'],hashlib.sha256(raw).hexdigest())
        self.assertEqual(rows[0]['runner_data_status'],'SINGLE_SOURCE_RUNNERS_OBSERVED')
        self.assertIsNone(rows[0]['prediction'])
        self.assertEqual(receipts[0]['runners'],2)
        bad={**fixture,'date':'2026-11-10','source_url':fixture['source_url'].replace('11-09','11-10')}
        rows,receipts=racing.collect_meeting_cards([bad],self.now,lambda _:raw)
        self.assertEqual(rows,[])
        self.assertEqual(receipts[0]['status'],'COLLECTION_FAILED')


if __name__ == '__main__':
    unittest.main()
