import datetime as dt
import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts"))
from football_h2h_backtest import paired_backtest, challenger_probabilities, chronological_weight_selection


class ChallengerTests(unittest.TestCase):
    def test_default_does_not_change_probabilities(self):
        evidence = {"sample_size": 6, "home_team_wins": 6, "draws": 0, "away_team_wins": 0}
        self.assertEqual(challenger_probabilities((.2, .3, .5), evidence), (.2, .3, .5))

    def test_probability_adjustment_rejects_weight_above_30_percent(self):
        evidence = {"sample_size": 6, "home_team_wins": 6, "draws": 0, "away_team_wins": 0}
        with self.assertRaisesRegex(ValueError, "Invalid challenger parameters"):
            challenger_probabilities((.2, .3, .5), evidence, weight=.35)
        with self.assertRaisesRegex(ValueError, "Invalid challenger parameters"):
            challenger_probabilities((.2, .3, .5), evidence, weight=float("nan"))

    def test_adjustment_preserves_probability_sum(self):
        evidence = {"sample_size": 6, "home_team_wins": 6, "draws": 0, "away_team_wins": 0}
        p = challenger_probabilities((.2, .3, .5), evidence, weight=.25)
        self.assertAlmostEqual(sum(p), 1)
        self.assertGreater(p[0], .2)

    def test_backtest_excludes_future_history(self):
        utc = dt.timezone.utc
        forecast = {"league": "E1", "home": "Home", "away": "Away",
                    "generated_at": dt.datetime(2026, 1, 1, tzinfo=utc),
                    "kickoff": dt.datetime(2026, 1, 2, tzinfo=utc),
                    "probabilities": (.5, .3, .2), "outcome": 0}
        history = [{"league": "E1", "home": "Home", "away": "Away", "date": "2026-01-02",
                    "score_home": 0, "score_away": 5}]
        result = paired_backtest([forecast], history, weight=.5, minimum=1)
        self.assertEqual(result["records"][0]["h2h_sample"], 0)
        self.assertEqual(result["baseline_mean_brier"], result["challenger_mean_brier"])
        self.assertFalse(result["comparison_active"])
        self.assertEqual(result["eligible_h2h_fixtures"], 0)
        self.assertEqual(result["delta_brier_challenger_minus_baseline"], 0)

    def test_custom_h2h_weight_above_30_percent_rejected(self):
        utc = dt.timezone.utc
        def fixture(day):
            return {"league": "E1", "home": "Home", "away": "Away",
                    "generated_at": dt.datetime(2026, 1, day, tzinfo=utc),
                    "kickoff": dt.datetime(2026, 1, day + 1, tzinfo=utc),
                    "probabilities": (.5, .3, .2), "outcome": 0}
        with self.assertRaisesRegex(ValueError, "Invalid candidate weight"):
            chronological_weight_selection([fixture(1)], [fixture(3)], [],
                                           candidate_weights=(0.0, 0.35))

    def test_chronological_split_rejects_overlap(self):
        utc = dt.timezone.utc
        f = {"league": "E1", "home": "Home", "away": "Away",
             "generated_at": dt.datetime(2026, 1, 1, tzinfo=utc),
             "kickoff": dt.datetime(2026, 1, 2, tzinfo=utc),
             "probabilities": (.5, .3, .2), "outcome": 0}
        with self.assertRaisesRegex(ValueError, "Calibration must finish"):
            chronological_weight_selection([f], [f], [])

    def test_small_calibration_keeps_zero_weight(self):
        utc = dt.timezone.utc
        def fixture(day):
            return {"league": "E1", "home": "Home", "away": "Away",
                    "generated_at": dt.datetime(2026, 1, day, tzinfo=utc),
                    "kickoff": dt.datetime(2026, 1, day + 1, tzinfo=utc),
                    "probabilities": (.5, .3, .2), "outcome": 0}
        result = chronological_weight_selection([fixture(1)], [fixture(3)], [])
        self.assertEqual(result["selected_weight"], 0.0)
        self.assertFalse(result["evaluation"]["comparison_active"])

    def test_chronological_default_grid_includes_every_five_percent_step(self):
        from inspect import signature
        weights = signature(chronological_weight_selection).parameters["candidate_weights"].default
        self.assertEqual(weights, (0.0, 0.05, 0.10, 0.15, 0.20, 0.25, 0.30))
        self.assertEqual(len(set(weights)), 7)
        self.assertTrue(all(0 <= weight <= 0.30 for weight in weights))

    def test_late_forecast_rejected(self):
        utc = dt.timezone.utc
        instant = dt.datetime(2026, 1, 2, tzinfo=utc)
        with self.assertRaises(ValueError):
            paired_backtest([{"home": "Home", "away": "Away", "generated_at": instant,
                              "kickoff": instant, "probabilities": (.5, .3, .2),
                              "outcome": 0}], [])


if __name__ == "__main__":
    unittest.main()
