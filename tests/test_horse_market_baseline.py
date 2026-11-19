import copy
import datetime as dt
import json
import math
from pathlib import Path
import sys
import unittest
sys.path.insert(0, str(Path(__file__).resolve().parents[1]/'scripts'))
from audit_horse_market_baseline import compare
from archive_horse_markets import digest, stamp

class MarketBaselineTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        root = Path(__file__).resolve().parents[1]
        records = [json.loads(p.read_text()) for p in (root/'research/horse-context-archive/v1').glob('*.json')]
        markets = [json.loads(p.read_text()) for p in (root/'research/horse-market-archive').rglob('*.json')]
        entries = json.loads((root/'horse-context-data.json').read_text())['performance']['entries']
        pair = compare(records, entries, markets)['pairs'][0]
        cls.f = next(r for r in records if r['record_sha256'] == pair['forecast_sha256'])
        cls.m = next(m for m in markets if m['record_sha256'] == pair['market_sha256'])
        cls.e = next(e for e in entries if e['record_sha256'] == pair['forecast_sha256'])
    def changed(self, **values):
        m = copy.deepcopy(self.m); m.update(values); m.pop('record_sha256')
        m['record_sha256'] = digest(m)
        return m
    def run_comparison(self, markets):
        return compare([self.f], [self.e], markets)
    def test_score_matches_independent_arithmetic(self):
        r = self.run_comparison([self.m]); qs = self.m['quotes']
        total = sum(1/q['decimal'] for q in qs)
        wp = next(1/q['decimal']/total for q in qs if str(q['horse_id']) == str(self.e['winner_horse_id']))
        self.assertAlmostEqual(r['mean_log_loss_context_minus_market'], self.e['log_loss']+math.log(wp))
        self.assertEqual(r['publication_gate'], 'BLOCKED')
    def test_future_and_stale_quotes_excluded(self):
        freeze = stamp(self.f['generated_at_utc'])
        for seconds in (1, -1801):
            m = self.changed(observed_at_utc=(freeze+dt.timedelta(seconds=seconds)).isoformat())
            self.assertEqual(self.run_comparison([m])['matched_races'], 0)
    def test_changed_field_excluded(self):
        m = self.changed(quotes=self.m['quotes'][:-1], active_runner_ids=self.m['active_runner_ids'][:-1])
        # The sorted quote and active-ID lists have the same order in these archives.
        self.assertEqual(self.run_comparison([m])['matched_races'], 0)
    def test_conflicting_same_time_capture_is_not_cherry_picked(self):
        qs = copy.deepcopy(self.m['quotes']); qs[0]['decimal'] += 1
        m = self.changed(quotes=qs)
        self.assertEqual(self.run_comparison([self.m,m])['exclusions'], {'AMBIGUOUS_LATEST_CAPTURE': 1})
    def test_integrity_and_duplicate_settlement_rejected(self):
        m = copy.deepcopy(self.m); m['quotes'][0]['decimal'] += 1
        with self.assertRaises(ValueError):self.run_comparison([m])
        with self.assertRaises(ValueError):compare([self.f],[self.e,self.e],[self.m])
    def test_empty_match_is_unknown_not_zero_performance(self):
        self.assertIsNone(self.run_comparison([])['mean_log_loss_context_minus_market'])

if __name__ == '__main__':unittest.main()
