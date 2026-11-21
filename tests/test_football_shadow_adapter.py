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


def legacy_forecast():
    return {'id': 'synthetic-forecast', 'isProspective': True, 'sportCode': 'FOOTBALL',
            'marketCode': 'FULL_TIME_1X2', 'providerMatchId': 123, 'selectionCode': 'DRAW',
            'eventStartUTC': '2026-09-15T18:00:00Z', 'recordedAtUTC': '2026-09-15T17:00:00Z'}


def legacy_outcome():
    return {'predictionId': 'synthetic-forecast', 'verified': True, 'result': 'LOSS',
            'marketCode': 'FULL_TIME_1X2', 'fullTimeScore': {'home': 1, 'away': 0},
            'source': 'https://api.football-data.org/v4/matches/123',
            'observedAtUTC': '2026-09-15T20:00:00Z'}


class LegacyBridgeTests(unittest.TestCase):
    def test_supported_fields_round_trip_without_eligibility(self):
        from scripts import football_legacy_adapter as legacy
        for kind, row in (('forecast', legacy_forecast()), ('result', legacy_outcome())):
            mapped = legacy.bridge(row, kind)
            self.assertEqual(legacy.restore(mapped), row)
            self.assertEqual(mapped['eligibility'], 'ineligible')
            with self.assertRaisesRegex(ValueError, 'hash changed'):
                legacy.restore({**mapped, 'source_row_sha256': 'b' * 64})

    def test_rejects_unknown_fields_ambiguous_ids_and_invalid_chronology(self):
        from scripts import football_legacy_adapter as legacy
        row = legacy_forecast()
        for field, value, error in (('event_id', 'guessed', 'schema'), ('providerMatchId', True, 'identity'),
                                    ('recordedAtUTC', '2026-09-15T18:00:00Z', 'kickoff'),
                                    ('recordedAtUTC', '2026-09-15T17:00:00', 'UTC offset')):
            with self.subTest(field=field), self.assertRaisesRegex(ValueError, error):
                legacy.bridge({**row, field: value}, 'forecast')
        with self.assertRaisesRegex(ValueError, 'duplicate'):
            legacy.bridge_batch([row, {**row, 'id': 'another'}], 'forecast')
        with self.assertRaisesRegex(ValueError, 'duplicate'):
            legacy.bridge_batch([legacy_outcome(), legacy_outcome()], 'result')
        with self.assertRaisesRegex(ValueError, 'unsupported legacy source'):
            legacy.bridge({**legacy_outcome(), 'source': 'https://api.football-data.org/v4/matches/0123'}, 'result')
