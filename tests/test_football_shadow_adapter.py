import copy
from pathlib import Path
import unittest

from scripts import football_producer_adapter as adapter

ROOT = adapter.evidence.ROOT


class ProducerAdapterTests(unittest.TestCase):
    def test_premier_league_snapshot_projects_only_present_fields(self):
        doc = adapter.evidence.load(ROOT / 'research-dashboard-data.json')
        row = doc['experimental_model_forecasts'][0]
        before = copy.deepcopy(row)
        result = adapter.adapt_forecast(row, 'premier-league')
        self.assertEqual(result['eligibility'], 'ineligible')
        self.assertIsNone(result['candidate'])
        self.assertEqual(result['original'], before)
        self.assertEqual(result['source_row_sha256'], adapter.contract.sha(before))
        self.assertEqual(result['known_canonical_fields']['probabilities'],
                         [row['prob_home'], row['prob_draw'], row['prob_away']])
        self.assertNotIn('id', result['known_canonical_fields']['event'])
        self.assertNotIn('frozen_at', result['known_canonical_fields'])
        self.assertIn('training_basis', result['omitted_fields'])
        result['original']['home'] = 'not the same'
        self.assertEqual(row, before)

    def test_expanded_projection_rejects_bad_identity_dates_and_hashes(self):
        row = {'league': 'E1', 'espn_event_id': '123', 'home': 'München Test', 'away': 'Away Test',
               'kickoff_utc': '2026-09-15T18:00:00Z', 'generated_at_utc': '2026-09-15T17:00:00Z'}
        row['record_sha256'] = adapter.producer_digest(row)
        good = adapter.adapt_forecast(row, 'expanded')
        self.assertEqual(good['known_canonical_fields']['event']['id'], '123')
        self.assertEqual(good['chronology'], 'source_generation_pre_kickoff_unattested')
        self.assertNotIn('producer_record_digest_mismatch', good['reasons'])
        edits = [
            ({'espn_event_id': '0123'}, 'missing_or_invalid_provider_event_id'),
            ({'kickoff_utc': '2026-09-15'}, 'missing_or_invalid_kickoff'),
            ({'generated_at_utc': '2026-09-15T18:00:00Z'}, 'source_generation_at_or_after_kickoff'),
            ({'home': 'Away Test'}, 'missing_or_ambiguous_ordered_teams'),
            ({'home': row['away'], 'away': row['home']}, 'producer_record_digest_mismatch'),
            ({'record_sha256': '0' * 64}, 'producer_record_digest_mismatch'),
        ]
        for changes, reason in edits:
            with self.subTest(changes=changes):
                report = adapter.adapt_forecast({**row, **changes}, 'expanded')
                self.assertIn(reason, report['reasons'])
                self.assertIsNone(report['candidate'])
