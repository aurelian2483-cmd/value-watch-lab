import datetime as dt
import sys
import unittest
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'scripts'))
from horse_refresh_gate import should_refresh, snapshot_health


class HorseRefreshGateTests(unittest.TestCase):
    def setUp(self):
        self.now = dt.datetime(2026, 11, 6, 14, tzinfo=dt.timezone.utc)
        self.upstream = {'conclusion': 'success', 'head_branch': 'main'}

    def card(self, timestamp):
        return {'generated_at_utc': timestamp, 'race_date_uk': '2026-11-06',
                'races': [{'startUTC': '2026-11-06T00:10:00Z', 'runners': []}]}

    def test_fallback_is_bounded_by_age(self):
        fresh = self.card('2026-11-06T13:46:00Z')
        stale = self.card('2026-11-06T13:45:00Z')
        self.assertFalse(should_refresh('workflow_run', fresh, self.now, self.upstream)[0])
        self.assertTrue(should_refresh('workflow_run', stale, self.now, self.upstream)[0])

    def test_missing_invalid_or_future_snapshot_needs_refresh(self):
        for data in [{}, {'generated_at_utc': 'bad'}, self.card('2026-11-06T15:00:00Z'), self.card('2026-11-06T14:00:00')]:
            self.assertTrue(should_refresh('workflow_run', data, self.now, self.upstream)[0])

    def test_failed_or_other_branch_does_not_collect(self):
        for upstream in [None, {'conclusion': 'failure', 'head_branch': 'main'}, {'conclusion': 'success', 'head_branch': 'other'}]:
            self.assertFalse(should_refresh('workflow_run', {}, self.now, upstream)[0])
        self.assertTrue(should_refresh('workflow_run', {}, self.now.replace(hour=23), self.upstream)[0])

    def test_early_morning_fallback_collection(self):
        self.assertTrue(should_refresh('workflow_run', {}, self.now.replace(hour=4), self.upstream)[0])
        self.assertTrue(should_refresh('workflow_run', {}, self.now.replace(hour=3), self.upstream)[0])

    def test_primary_triggers_remain_available(self):
        for event in ['push', 'schedule', 'workflow_dispatch']:
            self.assertTrue(should_refresh(event, {}, self.now.replace(hour=1))[0])

    def test_overnight_fallback_keeps_prices_within_thirty_minute_limit(self):
        now = self.now.replace(hour=1)
        self.assertFalse(should_refresh('workflow_run', self.card('2026-11-06T00:46:00Z'), now, self.upstream)[0])
        self.assertTrue(should_refresh('workflow_run', self.card('2026-11-06T00:45:00Z'), now, self.upstream)[0])

    def test_recent_today_cannot_hide_stale_or_missing_future(self):
        today=self.card('2026-11-06T13:59:00Z')
        for future in [{}, self.card('2026-11-06T13:30:00Z')]:
            run,reason=should_refresh('workflow_run',today,self.now,self.upstream,future=future)
            self.assertTrue(run);self.assertEqual(reason,'STALE_OR_MISSING_FUTURE_RACECARDS')
        self.assertFalse(should_refresh('workflow_run',today,self.now,self.upstream,future=today)[0])

    def test_new_envelope_cannot_hide_old_upcoming_runner_capture(self):
        today=self.card('2026-11-06T13:59:00Z')
        future={**today,'races':[{'startUTC':'2026-11-07T13:00:00Z','runners':[{'name':'Synthetic'}],'runner_observed_at_utc':'2026-11-06T13:00:00Z'}]}
        self.assertTrue(should_refresh('workflow_run',today,self.now,self.upstream,future=future)[0])
        future['races'][0]['runner_observed_at_utc']='2026-11-06T13:59:00Z'
        self.assertFalse(should_refresh('workflow_run',today,self.now,self.upstream,future=future)[0])


    def test_fresh_wrong_day_and_empty_rows_do_not_suppress_fallback(self):
        fresh = self.card('2026-11-06T13:59:00Z')
        self.assertEqual(snapshot_health(dict(fresh, race_date_uk='2026-11-05'), self.now)['reason'],
                         'WRONG_LONDON_CARD_DATE')
        self.assertEqual(snapshot_health(dict(fresh, races=[]), self.now)['reason'], 'RACE_ROWS_MISSING')

    def test_distinguishes_absent_and_impossible_runner_receipts(self):
        fresh = self.card('2026-11-06T13:59:00Z')
        row = {'startUTC': '2026-11-06T16:00:00Z', 'runners': [{}]}
        self.assertEqual(snapshot_health(dict(fresh, races=[row]), self.now)['missing_runner_receipts'], 1)
        row['runner_observed_at_utc'] = '2026-11-06T13:59:30Z'
        health = snapshot_health(dict(fresh, races=[row]), self.now)
        self.assertEqual(health['reason'], 'RUNNER_RECEIPT_AFTER_SNAPSHOT')

    def test_envelope_with_no_observed_upcoming_fields_needs_daily_refresh(self):
        fresh = self.card('2026-11-06T13:59:00Z')
        fresh['races'].append({'startUTC': '2026-11-06T16:00:00Z', 'runners': []})
        self.assertEqual(snapshot_health(fresh, self.now)['reason'], 'RUNNER_RECEIPTS_MISSING')
        self.assertTrue(should_refresh('workflow_run', fresh, self.now, self.upstream)[0])
        self.assertEqual(snapshot_health(fresh, self.now, future=True)['reason'], 'CURRENT_SNAPSHOT')
