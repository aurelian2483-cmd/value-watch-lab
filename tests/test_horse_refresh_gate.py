import datetime as dt
import sys
import unittest
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'scripts'))
from horse_refresh_gate import should_refresh


class HorseRefreshGateTests(unittest.TestCase):
    def setUp(self):
        self.now = dt.datetime(2026, 11, 6, 14, tzinfo=dt.timezone.utc)
        self.upstream = {'conclusion': 'success', 'head_branch': 'main'}

    def test_fallback_is_bounded_by_age(self):
        fresh = {'generated_at_utc': '2026-11-06T13:46:00Z'}
        stale = {'generated_at_utc': '2026-11-06T13:45:00Z'}
        self.assertFalse(should_refresh('workflow_run', fresh, self.now, self.upstream)[0])
        self.assertTrue(should_refresh('workflow_run', stale, self.now, self.upstream)[0])

    def test_missing_invalid_or_future_snapshot_needs_refresh(self):
        for data in [{}, {'generated_at_utc': 'bad'}, {'generated_at_utc': '2026-11-06T15:00:00Z'}, {'generated_at_utc': '2026-11-06T14:00:00'}]:
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

    def test_overnight_fallback_is_hourly_not_every_upstream_run(self):
        now = self.now.replace(hour=1)
        self.assertFalse(should_refresh('workflow_run', {'generated_at_utc':'2026-11-06T00:01:00Z'}, now, self.upstream)[0])
        self.assertTrue(should_refresh('workflow_run', {'generated_at_utc':'2026-11-06T00:00:00Z'}, now, self.upstream)[0])
