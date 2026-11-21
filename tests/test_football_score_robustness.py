import copy
import math
import unittest

from scripts import football_score_robustness as review
from test_football_chronological_replay import capture, configuration, result, synthetic_history


class RobustnessTests(unittest.TestCase):
    def setUp(self):
        self.protocol = review.evidence.load(review.DIRECTORY / 'protocol.json')

    def test_scores_clipping_order_and_unscaled_brier(self):
        self.assertEqual(review.score([1, 0, 0], 0, 1e-15), {'log_loss': 0, 'brier': 0})
        self.assertEqual(review.score([1, 0, 0], 2, 1e-15),
                         {'log_loss': -math.log(1e-15), 'brier': 2})
        self.assertAlmostEqual(review.score([.5, .3, .2], 2, 1e-15)['log_loss'], math.log(5))
        for invalid in ([True, 0, 0], [math.nan, .5, .5], [.4, .4, .4], [10**500, 0, 0]):
            with self.assertRaisesRegex(ValueError, 'probability'):
                review.score(invalid, 0, 1e-15)

    def test_paired_ties_use_unrounded_differences(self):
        result = review.describe([-4e-10, -5e-13, 5e-13, 4e-10], self.protocol['tie_tolerance'])
        self.assertEqual(result['mean'], 0)
        self.assertEqual([result[name] for name in ('left_lower', 'tie', 'left_higher')], [1, 2, 1])

    def test_resampling_is_reproducible_stratified_and_fixture_weighted(self):
        a, b = ('2024-25', '2024-08-01'), ('2024-25', '2024-08-02')
        c = ('2025-26', '2025-08-01')
        rows = [dict(season=season, date=day) for season, day in [a, a, b, c]]
        rules = {**self.protocol['bootstrap'], 'minimum_dates_per_season': 1, 'replicates': 20}
        counts, draws = review.date_draws(rows, rules)
        self.assertEqual((counts, draws), review.date_draws(list(reversed(rows)), rules))
        self.assertEqual(counts, {'2024-25':2, '2025-26':1})
        self.assertTrue(all(sample.count(c) == 1 for sample in draws))
        expected = review.date_interval(rows, [0, 2, 4, 10], [(a,b,c)], [.025,.975])
        self.assertEqual(expected['interval'], [4,4])
        with self.assertRaisesRegex(ValueError, 'not aligned'):
            review.date_interval(rows, [0], draws, [.025, .975])
        self.assertEqual(review.date_draws(rows, self.protocol['bootstrap'])[1], [])

    def fixture_set(self):
        source = synthetic_history() + [result('2024-09-01', 'A', 'B'), result('2024-09-01', 'C', 'D'),
                                       result('2025-08-01', 'A', 'B', season='2025-26')]
        rule = review.evidence.load(review.replay.DIRECTORY / 'protocol.json')
        return source, review.replay.walk_forward(source, rule, configuration(), capture()[0])

    def test_cohort_membership_reorder_and_threshold_changes(self):
        rows, fixtures = self.fixture_set()
        included, withheld = review.scored_rows(fixtures, rows, 1e-15)
        self.assertEqual((included, withheld), review.scored_rows(fixtures[::-1], rows[::-1], 1e-15))
        self.assertEqual(len(included),1)
        self.assertEqual(sum(withheld['2025-26'].values()), 1)
        report = review.season_report(included, len(rows)-1, withheld['2024-25'], self.protocol)
        self.assertEqual([report['coverage_sensitivity'][str(n)]['scores']['n'] for n in (3,4,10)], [1,0,0])
        calibration = report['calibration'][review.VARIANTS[0]]['home']
        self.assertEqual(sum(item['n'] for item in calibration), 1)
        self.assertTrue(all(item['observed_rate_interval']['status'] == 'sparse_bin' for item in calibration))
        self.assertEqual(review.bin_index(1, [0,.2,.4,.6,.8,1]), 4)
        self.assertEqual(review.bin_index(.4, [0,.2,.4,.6,.8,1]), 2)

    def test_missing_predictions_or_results_and_chronology_fail_closed(self):
        rows, fixtures = self.fixture_set()
        for change, message in (
            (lambda row: row.__setitem__('probabilities', None), 'prediction path'),
            (lambda row: row.pop('ft'), 'changed a result'),
            (lambda row: row.__setitem__('last_history_date', row['date']), 'cutoff'),
            (lambda row: row.__setitem__('season', '2025-26'), 'ordered fixture'),
        ):
            edited = copy.deepcopy(fixtures)
            target = next(row for row in edited if row['probabilities'] is not None)
            change(target)
            with self.subTest(message=message), self.assertRaisesRegex(ValueError, message):
                review.scored_rows(edited, rows, 1e-15)
        with self.assertRaisesRegex(ValueError, 'duplicate'):
            review.scored_rows(fixtures + [fixtures[0]], rows, 1e-15)
        with self.assertRaisesRegex(ValueError, 'mismatched'):
            review.scored_rows(fixtures[:-1], rows, 1e-15)

    def test_committed_output_never_claims_prospective_eligibility(self):
        data = review.evidence.load(review.DIRECTORY / 'report.json')
        self.assertTrue(data['arithmetic_verified'])
        self.assertEqual(data['eligible_real_forecasts'], 0)
        self.assertEqual(data['eligible_real_outcomes'], 0)
        self.assertEqual(data['model_validation'], 'UNVALIDATED')
        self.assertEqual(data['publication_gate'], 'BLOCKED')
        self.assertNotIn('recommended_model', data)
