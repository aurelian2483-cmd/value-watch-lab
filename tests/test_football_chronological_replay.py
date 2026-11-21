import copy
from datetime import date, timedelta
import math
from pathlib import Path
from tempfile import TemporaryDirectory
from types import SimpleNamespace
import unittest

from scripts import football_chronological_replay as replay


def result(day, home, away, score=None, season='2024-25'):
    return {'season': season, 'date': day, 'home': home, 'away': away,
            'ft': [2, 1] if score is None else score, 'id': f'{season}|{day}|{home}|{away}'}


def synthetic_history():
    dates = [str(date(2024, 8, 1) + timedelta(days=i)) for i in range(30)]
    return [result(day, 'A', f'F{i}') for i, day in enumerate(dates)] + [
        result(day, f'G{i}', 'B') for i, day in enumerate(dates[:3])]


def configuration():
    return {'pseudo_matches': 5, 'grid_max': 11, 'form_last': 5, 'form_alpha': .025, 'lambda_range': [.15, 4]}


def capture():
    inputs = []
    def stats(rows):
        inputs.append(rows)
        return {}, 2, 1
    def forecast(fixture, _, training):
        if 'kickoff_utc' in fixture or training['source_receipts'] or fixture['league'] != 'PL':
            raise AssertionError('invented timing, league or provenance')
        return {'training_basis':{'mode':'CURRENT_SEASON_SMALL_SAMPLE', 'lambda_home':2, 'lambda_away':1},
                'prob_home':.5, 'prob_draw':.25, 'prob_away':.25}
    return SimpleNamespace(norm=str.casefold, stats=stats, model_forecast=forecast), inputs


class ChronologicalReplayTests(unittest.TestCase):
    def setUp(self):
        self.rule = replay.evidence.load(replay.DIRECTORY / 'protocol.json')
        self.cfg = configuration()

    def test_reordered_rows_deterministic_and_target_day_results_do_not_leak(self):
        history = synthetic_history()
        a = result('2024-09-01','A','B')
        b = result('2024-09-01','K','L', [1, 0])
        records = history + [a, b]
        expanded, calls = capture()
        original = replay.walk_forward(records, self.rule, self.cfg, expanded)
        changed = replay.walk_forward(list(reversed(records)), self.rule, self.cfg, expanded)
        self.assertEqual(original, changed)
        altered = replay.walk_forward(history + [{**a, 'ft': [0, 10]}, {**b, 'ft': [5, 4]}],
                                      self.rule, self.cfg, expanded)
        rows = {row['id']: row for row in original}
        delta = {row['id']: row for row in altered}
        for target in (a, b):
            identifier = target['id']
            for key in ('features', 'training_results_sha256', 'probabilities', 'exclusion_reason'):
                self.assertEqual(rows[identifier][key], delta[identifier][key])
            self.assertEqual(rows[identifier]['cutoff_date_exclusive'], '2024-09-01')
            self.assertEqual(rows[identifier]['last_history_date'], '2024-08-30')
        self.assertIsNotNone(rows[a['id']]['probabilities'])
        self.assertTrue(all(row['home'] != 'K' and not (row['home']=='A' and row['away']=='B')
                            for row in calls[-1]))

    def test_season_reset_and_bounds(self):
        second = result('2025-08-01','A','B',season='2025-26')
        data = replay.walk_forward(synthetic_history() + [second], self.rule, self.cfg, capture()[0])
        self.assertEqual(data[-1]['features']['prior_results'], 0)
        self.assertEqual(data[-1]['exclusion_reason'], 'insufficient_earlier_league_results')
        with self.assertRaisesRegex(ValueError, 'outside canonical season'):
            replay.validate_results([result('2025-07-01','A','B')])
        with self.assertRaisesRegex(ValueError, 'season coverage differs'):
            replay.validate_results([second], {'2024-25':1})

    def test_duplicate_reverse_conflicting_and_mixed_evidence_rejected(self):
        original = result('2024-08-01','A','B')
        for other, message in (
            (original, 'duplicate'),
            ({**original, 'ft':[9,0]}, 'duplicate'),
            (result('2024-08-01','B','A'), 'reordered fixture'),
            ({**original, 'id':'2024-25|2024-08-01|B|A'}, 'ordered fixture'),
            ({**original, 'ft':[True,0]}, 'score'),
            ({**original, 'event_id':'unmatched-single-source'}, 'schema'),
        ):
            with self.subTest(other=other), self.assertRaisesRegex(ValueError, message):
                replay.validate_results([original, other])
        alias_collision = result('2024-08-02','A FC','C')
        expanded, _ = capture()
        expanded.norm = lambda value: value.lower().removesuffix(' fc')
        with self.assertRaisesRegex(ValueError, 'aliases collide'):
            replay.walk_forward([original, alias_collision], self.rule, self.cfg, expanded)

    def test_zero_league_goal_mean_withholds_joint_cohort(self):
        records = [{**row, 'ft': [2, 0]} for row in synthetic_history()] + [result('2024-09-01','A','B')]
        expanded, calls = capture()
        final = replay.walk_forward(records, self.rule, self.cfg, expanded)[-1]
        self.assertEqual(final['exclusion_reason'], 'nonpositive_league_goal_mean')
        self.assertIsNone(final['probabilities'])
        self.assertFalse(calls)

    def test_archive_projection_rejects_missing_config_or_unsupported_fields(self):
        archive = replay.evidence.load(replay.ROOT / self.rule['input']['path'])
        archive['rows'] = [copy.deepcopy(archive['rows'][0])]
        projection = replay.eligible_source(archive, self.cfg)
        self.assertEqual(set(projection[0]), set(replay.RESULT_FIELDS))
        with self.assertRaisesRegex(ValueError, 'configuration'):
            replay.eligible_source(archive, {key:value for key,value in self.cfg.items() if key != 'form_alpha'})
        archive['rows'][0]['market'] = {'unverified_quote': 2}
        with self.assertRaisesRegex(ValueError, 'schema'):
            replay.eligible_source(archive, self.cfg)
        with self.assertRaisesRegex(ValueError, 'wrong retrospective evidence tier'):
            replay.eligible_source({'records': []}, self.cfg)

    def test_exact_pin_rejects_even_equal_json_with_different_bytes(self):
        raw = b'{"kind":"sample"}\n'
        with TemporaryDirectory(prefix='football pin ') as temp:
            path = Path(temp) / 'date-only.json'
            path.write_bytes(raw.replace(b'\n', b'\r\n'))
            with self.assertRaisesRegex(ValueError, 'input SHA-256 mismatch'):
                replay.pinned_json(path, replay.evidence.digest(raw), 'input')

    def test_metrics_use_same_rows_and_unscaled_brier(self):
        variants = self.rule['variant_order']
        row = {**result('2024-09-01', 'A','B'), 'exclusion_reason':None,
               'probabilities':{key: [.5,.3,.2] for key in variants},
               'standalone':{'form_delta':0}}
        excluded = {**result('2024-09-02','C','D'), 'exclusion_reason':'insufficient_earlier_venue_results'}
        summary = replay.metrics([row,excluded], variants)['2024-25']
        self.assertEqual((summary['eligible'],summary['excluded']), (1,1))
        for variant in variants:
            score = summary['variants'][variant]
            self.assertEqual(score['n'], 1)
            self.assertAlmostEqual(score['log_loss'], math.log(2), places=9)
            self.assertEqual(score['brier'], .38)
        self.assertEqual(summary['paired_form_component']['score_difference'], {'log_loss':0, 'brier':0})
