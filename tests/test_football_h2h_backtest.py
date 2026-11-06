import datetime as dt
import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts"))
from football_h2h_backtest import paired_backtest, challenger_probabilities


class ChallengerTests(unittest.TestCase):
    def test_default_does_not_change_probabilities(self):
        evidence = {"sample_size": 6, "home_team_wins": 6, "draws": 0, "away_team_wins": 0}
        self.assertEqual(challenger_probabilities((.2, .3, .5), evidence), (.2, .3, .5))

    def test_adjustment_preserves_probability_sum(self):
        evidence = {"sample_size": 6, "home_team_wins": 6, "draws": 0, "away_team_wins": 0}
        p = challenger_probabilities((.2, .3, .5), evidence, weight=.25)
        self.assertAlmostEqual(sum(p), 1)
        self.assertGreater(p[0], .2)

    def test_backtest_excludes_future_history(self):
        utc = dt.timezone.utc
        forecast = {"home": "Home", "away": "Away",
                    "generated_at": dt.datetime(2026, 1, 1, tzinfo=utc),
                    "kickoff": dt.datetime(2026, 1, 2, tzinfo=utc),
                    "probabilities": (.5, .3, .2), "outcome": 0}
        history = [{"home": "Home", "away": "Away", "date": "2026-01-02",
                    "score_home": 0, "score_away": 5}]
        result = paired_backtest([forecast], history, weight=.5, minimum=1)
        self.assertEqual(result["records"][0]["h2h_sample"], 0)
        self.assertEqual(result["baseline_mean_brier"], result["challenger_mean_brier"])

    def test_late_forecast_rejected(self):
        utc = dt.timezone.utc
        instant = dt.datetime(2026, 1, 2, tzinfo=utc)
        with self.assertRaises(ValueError):
            paired_backtest([{"home": "Home", "away": "Away", "generated_at": instant,
                              "kickoff": instant, "probabilities": (.5, .3, .2),
                              "outcome": 0}], [])


if __name__ == "__main__":
    unittest.main()
