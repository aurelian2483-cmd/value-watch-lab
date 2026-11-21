import copy
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


class ShadowReportTests(unittest.TestCase):
    def test_pinned_snapshot_inventory_and_separate_synthetic_counts(self):
        from scripts import football_shadow_report as shadow
        manifest = shadow.evidence.load(ROOT / shadow.DIRECTORY / 'manifest.json')
        before = {path: (ROOT / path).read_bytes() for path in manifest['input_sha256']}
        report = shadow.report(ROOT)
        self.assertEqual(report, shadow.report(ROOT))
        self.assertEqual(report['status'], 'insufficient_data')
        self.assertEqual(report['ineligible_repository_forecasts'], 47)
        self.assertEqual(report['eligible_real_forecasts'], 0)
        self.assertEqual(report['eligible_real_outcomes'], 0)
        self.assertEqual(report['synthetic_example_only']['eligibility_diagnostics'], {'synthetic_test_fixture_only': 1})
        self.assertEqual(report['synthetic_example_only']['scored_records'], 0)
        self.assertEqual(report['separate_evidence_tiers'], {'expanded_finals':66, 'legacy_archive':18,
                                                           'retrospective':608, 'single_source_unverified':734})
        self.assertEqual({path: (ROOT / path).read_bytes() for path in before}, before)

    def test_stale_and_future_snapshots_use_explicit_review_clock(self):
        from scripts import football_shadow_report as shadow
        stamp = shadow.contract.instant('2026-09-15T00:00:00Z')
        for source, state in (('2026-09-13T00:00:00Z', 'stale'), ('2026-09-15T00:00:00.000001Z', 'future_snapshot'),
                              ('2026-09-15', 'missing_or_invalid')):
            self.assertEqual(shadow.freshness(source, stamp), state)

    def test_tampered_snapshots_and_manifest_are_rejected(self):
        import tempfile
        from pathlib import Path
        from scripts import football_shadow_report as shadow
        with tempfile.TemporaryDirectory(prefix='football shadow pins ') as directory:
            workspace = Path(directory)
            target = workspace / shadow.DIRECTORY
            target.mkdir(parents=True)
            manifest = (ROOT / shadow.DIRECTORY / 'manifest.json').read_bytes()
            (target / 'manifest.json').write_bytes(manifest + b'\n')
            with self.assertRaisesRegex(ValueError, 'shadow manifest SHA-256 mismatch'):
                shadow.report(workspace)
            (target / 'manifest.json').write_bytes(manifest)
            source = shadow.INPUTS[0]
            (workspace / source).write_bytes((ROOT / source).read_bytes() + b'\n')
            with self.assertRaisesRegex(ValueError, 'snapshot SHA-256 mismatch'):
                shadow.report(workspace)

    def test_read_only_shadow_cli_is_byte_deterministic(self):
        import os
        import subprocess
        import sys
        import tempfile
        from pathlib import Path
        args = [sys.executable, str(ROOT / 'scripts/football_shadow_report.py')]
        with tempfile.TemporaryDirectory(prefix='football shadow CLI ') as directory:
            first = subprocess.check_output(args, cwd=directory, env={**os.environ, 'PYTHONHASHSEED':'1'})
            second = subprocess.check_output(args, cwd=directory, env={**os.environ, 'PYTHONHASHSEED':'97'})
            self.assertEqual(first, second)
            self.assertEqual(list(Path(directory).iterdir()), [])

    def test_lookalike_canonical_fields_never_create_a_candidate(self):
        row = {'home': 'Home', 'away': 'Away', 'league': 'E1', 'espn_event_id': '123',
               'kickoff_utc': '2026-09-15T18:00:00Z', 'season': '2026/27',
               'frozen_at': '2026-09-15T17:00:00Z', 'origin': 'prospective',
               'version_sha256': 'a' * 64, 'configuration_sha256': 'b' * 64, 'candidate': True}
        result = adapter.adapt_forecast(row, 'expanded')
        self.assertIsNone(result['candidate'])
        for field in ('season', 'frozen_at', 'origin', 'candidate'):
            self.assertIn(field, result['omitted_fields'])

    def test_legacy_pair_checks_provider_identity_chronology_and_result(self):
        from scripts import football_legacy_adapter as legacy
        first, result = legacy_forecast(), legacy_outcome()
        self.assertEqual(legacy.review_pair(first, result), 'legacy_pair_consistent_diagnostic_only')
        cases = [({'source': 'https://api.football-data.org/v4/matches/124'}, 'provider identities'),
                 ({'observedAtUTC': first['eventStartUTC']}, 'kickoff'),
                 ({'result': 'WIN'}, 'contradicts')]
        for changes, reason in cases:
            with self.subTest(changes=changes), self.assertRaisesRegex(ValueError, reason):
                legacy.review_pair(first, {**result, **changes})

    def test_legacy_pair_diagnostic_cannot_choose_between_duplicate_provider_results(self):
        from scripts import football_shadow_report as shadow
        forecast, outcome = legacy_forecast(), legacy_outcome()
        self.assertEqual(shadow.legacy_diagnostics([forecast], [outcome])['pair_states'],
                         {'legacy_pair_consistent_diagnostic_only': 1})
        duplicate = {**outcome, 'predictionId': 'another'}
        result = shadow.legacy_diagnostics([forecast], [outcome, duplicate])
        self.assertEqual(result['outcomes']['state'], 'legacy_batch_rejected')
        self.assertEqual(result['pair_states'], {})
