import sys
import unittest
import json
import tempfile
from unittest.mock import patch
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'scripts'))
import collect_other_sports as m

class Controls(unittest.TestCase):
    def test_updates_conserve_rating_and_increase_winner(self):
        rs,cs=m.fit([{'a':'a','b':'b','result':1}])
        self.assertAlmostEqual(rs['a']+rs['b'],3000)
        self.assertGreater(m.probability(rs['a'],rs['b']),.5)
        self.assertEqual(cs['a'],1)
    def test_unseen_player_has_no_forecast(self):
        rs,cs=m.fit([])
        self.assertIsNone(m.forecast([{'id':'a'},{'id':'b'}],rs,cs,[],'athlete'))
    def test_conflicting_result_identity_stops_training(self):
        with self.assertRaises(ValueError):
            m.unique([{'id':'x','date':'2025-01-01','result':1},{'id':'x','date':'2025-01-01','result':0}])
    def test_future_result_cannot_train(self):
        c={'id':'x','date':m.stamp(m.NOW+m.timedelta(days=1)),'status':{'type':{'name':'STATUS_FINAL','completed':True}},'competitors':[{'id':'a','type':'athlete','winner':True,'athlete':{'displayName':'A'}},{'id':'b','type':'athlete','winner':False,'athlete':{'displayName':'B'}}]}
        self.assertIsNone(m.final(c,'athlete'))
    def test_nfl_tie_vector_sums_to_one(self):
        history=[{'id':str(i),'date':'2025-01-01','a':'a','b':'b','result':.5}for i in range(10)]
        rs,cs=m.fit(history)
        f=m.forecast([{'id':'a','team':{'displayName':'A'}},{'id':'b','team':{'displayName':'B'}}],rs,cs,history,'team')
        self.assertAlmostEqual(sum(o['probability']for o in f['outcomes']),1)
        self.assertEqual(f['market'],'GAME_RESULT_INCLUDING_OVERTIME')
    def test_doubles_and_placeholders_rejected(self):
        self.assertIsNone(m.pair({'competitors':[{'id':'a','type':'team'},{'id':'b','type':'team'}]},'athlete'))

class CollectionIntegrity(unittest.TestCase):
    def setUp(self):
        self.start = m.datetime(2026, 11, 4, 12, 0, tzinfo=m.timezone.utc)
        self.part = {'events': [
            {'id': 'too-soon', 'startUTC': m.stamp(self.start+m.timedelta(minutes=8)), 'forecast': {'model': 'EXPERIMENT'}},
            {'id': 'future', 'startUTC': m.stamp(self.start+m.timedelta(hours=2)), 'forecast': {'model': 'EXPERIMENT'}}]}

    def test_completion_boundary_excludes_events_admitted_at_run_start(self):
        completed = self.start+m.timedelta(minutes=10)
        part = m.finalize_part(self.part, self.start, completed)
        self.assertEqual([e['id'] for e in part['events']], ['future'])
        self.assertEqual(part['generated_at_utc'], m.stamp(completed))
        self.assertEqual(part['events'][0]['forecast']['generated_at_utc'], m.stamp(completed))

    def test_retained_part_preserves_age_and_error(self):
        old = m.finalize_part(self.part, self.start, self.start)
        previous = {'research_only': True, 'model_validation': 'UNVALIDATED', 'publication_gate': 'BLOCKED', 'sports': {'tennis': old}}
        retained = m.previous_part(previous, 'tennis', self.start+m.timedelta(minutes=10), 'Timeout')
        self.assertEqual(retained['generated_at_utc'], old['generated_at_utc'])
        self.assertEqual(retained['collection_status'], 'RETAINED_AFTER_COLLECTION_ERROR')
        self.assertEqual(retained['last_collection_error'], 'Timeout')
        self.assertEqual([e['id'] for e in retained['events']], ['future'])
        self.assertIsNone(m.previous_part(previous, 'tennis', self.start+m.timedelta(hours=37), 'Timeout'))
        self.assertIsNone(m.previous_part(previous, 'tennis', self.start-m.timedelta(minutes=1), 'Timeout'))
        self.assertIsNone(m.previous_part({**previous, 'publication_gate': 'OPEN'}, 'tennis', self.start, 'Timeout'))

    def test_archive_rechecks_first_sport_after_slow_second_sport(self):
        # Tennis was safe at 12:00, but its 12:08 match must not be archived at 12:10.
        times = [self.start, self.start, self.start, self.start,
                 self.start+m.timedelta(minutes=10), self.start+m.timedelta(minutes=10)]
        with tempfile.TemporaryDirectory() as directory, patch.object(m, 'ROOT', Path(directory)), patch.object(m, 'RECEIPTS', []), patch.object(m, 'tennis', return_value=self.part), patch.object(m, 'nfl', return_value=self.part), patch.object(m, 'current_time', side_effect=times):
            document = m.main()
            self.assertEqual(document['generated_at_utc'], m.stamp(self.start+m.timedelta(minutes=10)))
            self.assertEqual([e['id'] for e in document['sports']['tennis']['events']], ['future'])
            self.assertEqual(document['result_tracking_status'], 'NOT_IMPLEMENTED')

    def test_isolated_failure_keeps_safe_old_part_and_successful_new_part(self):
        with tempfile.TemporaryDirectory() as directory:
            previous = {'research_only': True, 'model_validation': 'UNVALIDATED', 'publication_gate': 'BLOCKED',
                        'sports': {'tennis': m.finalize_part(self.part, self.start, self.start)}, 'source_receipts': []}
            (Path(directory)/'other-sports-data.json').write_text(json.dumps(previous))
            with patch.object(m, 'ROOT', Path(directory)), patch.object(m, 'RECEIPTS', []), patch.object(m, 'tennis', side_effect=TimeoutError('Source timeout')), patch.object(m, 'nfl', return_value=self.part), patch.object(m, 'current_time', return_value=self.start+m.timedelta(minutes=10)):
                document = m.main()
                self.assertEqual(document['sports']['tennis']['generated_at_utc'], m.stamp(self.start))
                self.assertEqual(document['sports']['nfl']['generated_at_utc'], m.stamp(self.start+m.timedelta(minutes=10)))
                self.assertIn('tennis', document['collection_errors'])

    def test_live_and_historical_cache_ttls_are_distinct(self):
        self.assertEqual(m.cache_ttl('tennis/atp/scoreboard?dates=20261001-20261031&limit=100', self.start), 7*86400)
        self.assertEqual(m.cache_ttl('tennis/atp/scoreboard?dates=20261104&limit=100', self.start), 900)
        self.assertEqual(m.cache_ttl('football/nfl/scoreboard?dates=2025&week=1', self.start), 7*86400)
        self.assertEqual(m.cache_ttl('football/nfl/scoreboard?dates=2026&week=1', self.start), 900)

    def test_current_season_rows_cannot_hide_missing_previous_season_games(self):
        previous = [{'id': str(r)+'-'+str(i), 'date': '2025-10-01', 'a': str(i), 'b': str(i+16), 'result': 1.0, 'season': 2025} for r in range(17) for i in range(16)]
        self.assertEqual(m.validate_nfl_coverage(previous, 2025)['previous_season_completed_games'], 272)
        current = [{**r, 'id': 'current-'+r['id'], 'season': 2026} for r in previous[:100]]
        with self.assertRaises(ValueError):
            m.validate_nfl_coverage(previous[:-1]+current, 2025)

    def test_invalid_final_scores_are_rejected_instead_of_becoming_ties(self):
        c = {'id': 'x', 'date': m.stamp(m.NOW-m.timedelta(days=1)), 'status': {'type': {'name': 'STATUS_FINAL', 'completed': True}},
             'competitors': [{'id': 'a', 'type': 'team', 'score': 'nan', 'team': {'displayName': 'A'}}, {'id': 'b', 'type': 'team', 'score': '10', 'team': {'displayName': 'B'}}]}
        for score in ['nan', 'inf', '-1', '10.5']:
            c['competitors'][0]['score'] = score
            self.assertIsNone(m.final(c, 'team'))

class TennisScheduleCoverage(unittest.TestCase):
    """Synthetic schedule payloads test the real collector without network access."""
    def setUp(self):
        self.now = m.datetime(2026, 11, 8, 10, 0, tzinfo=m.timezone.utc)
        self.history = [{'id': str(i), 'date': '2026-01-02T12:00:00Z', 'a': 'a', 'b': 'b', 'result': 1.0} for i in range(100)]
        self.ratings, self.counts = m.fit(self.history)

    def competition(self, identifier='match', days=1, **updates):
        return {'id': identifier, 'date': m.stamp(self.now+m.timedelta(days=days)),
                'status': {'type': {'state': 'pre'}}, 'timeValid': True,
                'competitors': [{'id': 'a', 'type': 'athlete', 'athlete': {'displayName': 'Test Player A'}},
                                {'id': 'b', 'type': 'athlete', 'athlete': {'displayName': 'Test Player B'}}], **updates}

    def document(self, rows, tour='atp'):
        return {'events': [{'name': 'Synthetic Test Tournament', 'groupings': [
            {'grouping': {'slug': 'mens-singles' if tour == 'atp' else 'womens-singles'}, 'competitions': rows}]}]}

    def collect(self, docs, tour='atp'):
        with patch.object(m, 'NOW', self.now), patch.object(m, 'batch', return_value=docs) as fetch:
            rows, rejected = m.tennis_schedule(tour, self.now, self.ratings, self.counts, self.history)
            self.assertEqual(len(fetch.call_args.args[0]), 7, 'requests remain bounded per tour')
            return rows, rejected

    def test_paths_are_seven_uk_days_including_summer_midnight(self):
        paths = m.tennis_schedule_paths('atp', m.datetime(2026, 6, 1, 23, 30, tzinfo=m.timezone.utc))
        self.assertEqual(len(paths), 7)
        self.assertEqual(paths[0][0].isoformat(), '2026-06-02')
        self.assertEqual(paths[-1][0].isoformat(), '2026-06-08')
        self.assertIn('dates=20260602&', paths[0][1])
        year_end = m.tennis_schedule_paths('wta', m.datetime(2026, 12, 29, 12, tzinfo=m.timezone.utc))
        self.assertEqual(year_end[-1][0].isoformat(), '2027-01-04')
        with self.assertRaises(ValueError):
            m.tennis_schedule_paths('unknown', self.now)

    def test_daily_duplicates_keep_actual_source_and_original_baseline(self):
        match = self.competition(days=3)
        docs = [self.document([]), self.document([match]), self.document([match])]+[self.document([]) for _ in range(4)]
        rows, conflicts = self.collect(docs)
        self.assertEqual(len(rows), 1)
        self.assertEqual(conflicts, [])
        self.assertEqual(rows[0]['id'], 'atp-match')
        self.assertEqual(rows[0]['source'], m.BASE+'tennis/atp/scoreboard?dates=20261109&limit=100')
        self.assertEqual(rows[0]['forecast'], m.forecast(match['competitors'], self.ratings, self.counts, self.history, 'athlete'))

    def test_conflicting_reschedule_is_withheld_instead_of_replaced(self):
        docs = [self.document([self.competition('changed', 1), self.competition('safe', 2)]),
                self.document([self.competition('changed', 3)])]+[self.document([]) for _ in range(5)]
        rows, conflicts = self.collect(docs)
        self.assertEqual([row['id'] for row in rows], ['atp-safe'])
        self.assertEqual(conflicts, [{'id': 'atp-changed', 'reason': 'CONFLICTING_DAILY_SCHEDULE_OBSERVATIONS'}])

    def test_cancellation_on_another_daily_page_invalidates_prior_pre_event(self):
        docs = [self.document([self.competition()]), self.document([self.competition(status={'type': {'state': 'post'}})])]+[self.document([]) for _ in range(5)]
        rows, conflicts = self.collect(docs)
        self.assertEqual(rows, [])
        self.assertEqual(conflicts[0]['id'], 'atp-match')

    def test_future_draw_unknown_times_and_outside_window_are_not_invented(self):
        unknown = self.competition('unknown')
        unknown['competitors'][0]['athlete']['displayName'] = 'TBD'
        doubles = self.competition('doubles')
        doubles['competitors'][0]['type'] = 'team'
        docs = [self.document([self.competition('outside', 7), self.competition('too-soon', date=m.stamp(self.now+m.timedelta(minutes=4))),
                               self.competition('no-time', timeValid=False), unknown, doubles])]+[self.document([]) for _ in range(6)]
        rows, _ = self.collect(docs)
        self.assertEqual(rows, [])

    def test_receipts_retain_original_source_collection_time(self):
        source = m.BASE+'tennis/atp/scoreboard?dates=20261108&limit=100'
        receipt = {'url': source, 'collected_at_utc': '2026-11-08T09:50:00Z', 'sha256': 'a'*64}
        with patch.object(m, 'RECEIPTS', [receipt]):
            rows, _ = self.collect([self.document([self.competition()])]+[self.document([]) for _ in range(6)])
        self.assertEqual(rows[0]['source_collected_at_utc'], receipt['collected_at_utc'])
        self.assertEqual(rows[0]['source_sha256'], receipt['sha256'])

    def test_missing_daily_response_does_not_claim_complete_collection(self):
        with self.assertRaisesRegex(ValueError, 'event list'):
            self.collect([self.document([]), {}]+[self.document([]) for _ in range(5)])

    def test_full_tennis_collects_both_tours_without_changing_training_window(self):
        calls = []
        def fake_batch(paths):
            calls.append(paths)
            documents = []
            for path in paths:
                tour = path.split('/')[1]
                if '-' in path.split('dates=')[1].split('&')[0]:
                    rows = [self.competition('history-'+str(i), date='2026-01-02T12:00:00Z', status={'type': {'name': 'STATUS_FINAL', 'completed': True}},
                                             competitors=[{'id': 'a', 'type': 'athlete', 'winner': True, 'athlete': {'displayName': 'Test Player A'}},
                                                          {'id': 'b', 'type': 'athlete', 'winner': False, 'athlete': {'displayName': 'Test Player B'}}]) for i in range(100)]
                    documents.append(self.document(rows, tour))
                else:
                    documents.append(self.document([self.competition(tour+'-future', 3)], tour))
            return documents
        with patch.object(m, 'NOW', self.now), patch.object(m, 'batch', side_effect=fake_batch):
            result = m.tennis()
        self.assertEqual(result['schedule_window_uk'], ['2026-11-08', '2026-11-14'])
        self.assertEqual(result['schedule_days_requested'], 7)
        self.assertEqual(len(result['events']), 2)
        self.assertEqual([len(call) for call in calls], [22, 7, 7])
        self.assertTrue(all(event['forecast']['training_latest_start_utc'] == '2026-01-02T12:00:00Z' for event in result['events']))
        self.assertTrue(all(event['forecast']['odds'] is None and event['forecast']['expected_value'] is None for event in result['events']))


if __name__=='__main__':unittest.main()
