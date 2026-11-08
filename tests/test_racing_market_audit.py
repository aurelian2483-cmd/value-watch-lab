import unittest
from scripts.racing_market_audit import breakeven, audit_exchange, closing_line_value


class MarketAuditTests(unittest.TestCase):
    def setUp(self):
        self.open = dict(runner_id="horse1", market_id="win123", decimal_odds=2.0,
                         observed_at_utc="2026-11-08T10:00:00Z",
                         matched_volume_gbp=100, source_url="https://example.org/market/123")
        self.last = dict(self.open, decimal_odds=2.4,
                         observed_at_utc="2026-11-08T11:00:00Z",
                         matched_volume_gbp=2500)

    def test_breakeven(self):
        self.assertEqual(breakeven(1.4), 71.43)
        self.assertIsNone(breakeven(1))

    def test_drift_threshold(self):
        result = audit_exchange(self.open, self.last)
        self.assertEqual(result["status"], "OBSERVED")
        self.assertEqual(result["trend"], "Drifter")
        self.assertTrue(result["drift_20pct_warning"])

    def test_low_liquidity_cannot_raise_confirmed_drift(self):
        last = dict(self.last, matched_volume_gbp=500)
        result = audit_exchange(self.open, last)
        self.assertEqual(result["status"], "LOW_LIQUIDITY")
        self.assertFalse(result["drift_20pct_warning"])

    def test_mismatched_market_fails_closed(self):
        last = dict(self.last, market_id="different")
        self.assertEqual(audit_exchange(self.open, last)["status"], "UNKNOWN")

    def test_missing_provenance_fails_closed(self):
        last = dict(self.last, source_url="")
        self.assertEqual(audit_exchange(self.open, last)["status"], "UNKNOWN")

    def test_clv_requires_proven_preoff_and_sp_source(self):
        self.assertEqual(closing_line_value(3, 2.5, "2026-11-08T10:00:00Z",
            "2026-11-08T12:00:00Z", "https://example.org/sp")["clv_pct"], 20.0)
        self.assertEqual(closing_line_value(3, 2.5, "2026-11-08T13:00:00Z",
            "2026-11-08T12:00:00Z", "https://example.org/sp")["status"], "UNKNOWN")


if __name__ == "__main__":
    unittest.main()
