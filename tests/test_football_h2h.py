import datetime as dt
import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts"))
from football_h2h import head_to_head, conflict_with_forecast


class H2HTests(unittest.TestCase):
    def setUp(self):
        self.cutoff = dt.datetime(2026, 11, 6, 19, tzinfo=dt.timezone.utc)
        self.rows = [
            {"home": "Derby County", "away": "Bolton Wanderers", "date": "2026-10-01", "score_home": 2, "score_away": 0},
            {"home": "Bolton Wanderers", "away": "Derby County", "date": "2025-04-01", "score_home": 0, "score_away": 1},
            {"home": "Derby County", "away": "Bolton Wanderers", "date": "2026-11-06", "score_home": 0, "score_away": 5},
            {"home": "Derby County", "away": "Other FC", "date": "2026-01-01", "score_home": 0, "score_away": 5},
        ]

    def test_no_lookahead_and_venue_counts(self):
        result = head_to_head(self.rows, "Derby County", "Bolton Wanderers", self.cutoff)
        self.assertEqual(result["sample_size"], 2)
        self.assertEqual(result["home_team_wins"], 2)
        self.assertEqual(result["at_current_home_venue"]["sample_size"], 1)
        self.assertIsNone(result["probability_adjustment"])

    def test_conflict_is_descriptive(self):
        evidence = head_to_head(self.rows, "Derby County", "Bolton Wanderers", self.cutoff)
        self.assertEqual(conflict_with_forecast(evidence, .2, .2, .6, minimum=2),
                         "H2H_DISAGREES_WITH_AWAY_FAVOURITE")
        self.assertEqual(conflict_with_forecast(evidence, .2, .2, .6), "INSUFFICIENT_H2H_SAMPLE")

    def test_duplicate_history_rejected(self):
        with self.assertRaisesRegex(ValueError, "Duplicate historical fixture"):
            head_to_head(self.rows + [dict(self.rows[0])],
                         "Derby County", "Bolton Wanderers", self.cutoff)

    def test_rejects_naive_cutoff(self):
        with self.assertRaises(ValueError):
            head_to_head(self.rows, "Derby County", "Bolton Wanderers", dt.datetime(2026, 11, 6))


if __name__ == "__main__":
    unittest.main()
