import unittest

from scripts import football_prospective_contract as contract


def fixture(namespace='canonical', identifier='event-1', starts='2026-09-15T18:00:00Z'):
    return {'namespace': namespace, 'id': identifier, 'competition': 'synthetic-league',
            'season': '2026/27', 'home': 'München Test', 'away': 'Away Test', 'starts_at': starts}


def provenance(char='a'):
    return {'source': {'kind': 'permitted_receipt_reference', 'reference': f'synthetic-ref-{char}'},
            'sha256': char * 64}


def known(value):
    return {'state': 'known', 'value': value}


def seal(row):
    row.pop('content_sha256', None)
    row['content_sha256'] = contract.sha(row)
    return row


def forecast(event=None):
    record = {
        'origin': 'synthetic', 'event': event or fixture(), 'market': contract.MARKET,
        'settlement_scope': 'regulation_time',
        'model': {'name': 'synthetic-candidate', 'version_sha256': 'a' * 64, 'configuration_sha256': 'b' * 64},
        'outcome_order': ['home', 'draw', 'away'], 'probabilities': [0.5, 0.3, 0.2],
        'created_at': '2026-09-14T16:00:00Z', 'frozen_at': '2026-09-14T16:01:00Z',
        'input_cutoff': '2026-09-01T00:00:00Z',
        'input_receipts': [{'period': 'training', 'observed_at': '2026-08-01T08:00:00Z', 'provenance': provenance()}],
        'market_observation': {'state': 'unavailable', 'value': None},
    }
    record['record_id'] = contract.forecast_id(record)
    return seal(record)


def packet(kind, *rows):
    return {'schema_version': 1, 'kind': kind, 'records': list(rows)}


class FrozenForecastTests(unittest.TestCase):
    def test_immutable_forecast_and_duplicate(self):
        item = forecast()
        contract.forecast(item)
        changed = {**item, 'probabilities': [0.7, 0.1, 0.2]}
        with self.assertRaisesRegex(ValueError, 'content SHA-256'):
            contract.forecast(changed)
        with self.assertRaisesRegex(ValueError, 'duplicate forecast immutable ID'):
            contract.records(packet('football-frozen-forecasts', item, seal(changed)),
                             'football-frozen-forecasts', contract.forecast, enforce_unique=True)

    def test_vector_and_chronology_fail_closed(self):
        for probabilities in ([float('nan'), 0, 1], [float('inf'), 0, 0], [True, 0, 0],
                              [0.5, 0.5, 0.1], [-0.1, 0.5, 0.6], [0.5, 0.5]):
            with self.subTest(probabilities=probabilities), self.assertRaisesRegex(ValueError, 'probabilities'):
                contract.forecast({**forecast(), 'probabilities': probabilities})
        for stamp in ('2026-11-01T01:30:00', '2026-09-15T18:00:00Z', '2026-09-14T16:01:00-00:00',
                      '2026-09-14T16:01:00+01:60', '2026-09-14'):
            with self.subTest(stamp=stamp), self.assertRaisesRegex(ValueError, 'timestamp|chronology'):
                contract.forecast({**forecast(), 'frozen_at': stamp})
        self.assertEqual(contract.instant('2026-11-01T01:30:00-04:00').hour, 5)
        self.assertEqual(contract.instant('2026-11-01T01:30:00-05:00').hour, 6)

    def test_market_prices_require_exact_event_and_receipt(self):
        item = forecast()
        quote = {'event': item['event'], 'market': contract.MARKET, 'market_id': 'market-test',
                 'settlement_scope': 'regulation_time', 'bookmaker': 'synthetic-bookmaker',
                 'observed_at': '2026-09-14T15:31:00Z', 'completeness': 'complete',
                 'quotes': {'home': 2, 'draw': 3, 'away': 4}, 'provenance': provenance('b')}
        contract.forecast(seal({**item, 'market_observation': known(quote)}))
        reversed_event = {**item['event'], 'home': item['event']['away'], 'away': item['event']['home']}
        for changes, reason in (
            ({'event': reversed_event}, 'participant order'),
            ({'observed_at': '2026-09-14T15:30:59Z'}, 'stale'),
            ({'observed_at': '2026-09-15T18:01:00Z'}, 'after forecast freeze'),
            ({'provenance': {}}, 'provenance'),
            ({'quotes': {'home': 2}}, 'completeness'),
        ):
            with self.subTest(changes=changes), self.assertRaisesRegex(ValueError, reason):
                contract.forecast(seal({**item, 'market_observation': known({**quote, **changes})}))

    def test_post_cutoff_inputs_and_retrospective_rows_fail(self):
        item = forecast()
        late = {**item['input_receipts'][0], 'observed_at': '2026-09-01T00:00:00.000001Z'}
        with self.assertRaisesRegex(ValueError, 'after cutoff'):
            contract.forecast(seal({**item, 'input_receipts': [late]}))
        with self.assertRaisesRegex(ValueError, 'forecast origin'):
            contract.forecast(seal({**item, 'origin': 'retrospective'}))


def outcome(index=1, **changes):
    receipt = {
        'receipt_id': f'synthetic-receipt-{index}', 'origin': 'synthetic',
        'event': fixture(f'provider-{index}', f'provider-fixture-{index}'),
        'provider': f'provider-{index}', 'acquisition_lineage': f'direct-{index}',
        'status': 'final', 'settlement_scope': 'regulation_time', 'score': known([1, 0]),
        'observed_at': '2026-09-15T20:00:00Z', 'retrieved_at': '2026-09-15T20:01:00Z',
        'provenance': provenance(str(index)),
    }
    return seal({**receipt, **changes})


def review(*receipts):
    return {'event': fixture(), 'outcome_sha256': [row['content_sha256'] for row in receipts],
            'reviewed_at': '2026-09-16T00:00:00Z',
            'decision': 'exact_fixture_and_independent_sources_reviewed', 'provenance': provenance('c')}


class OutcomeContractTests(unittest.TestCase):
    def assess(self, receipts, link=None):
        from scripts.football_prospective_outcomes import OutcomeIndex
        for receipt in receipts:
            contract.outcome(receipt)
        if link:
            contract.review(link)
        return OutcomeIndex(receipts).resolve(forecast(), link, contract.instant('2026-09-17T00:00:00Z'))

    def test_exact_reviewed_receipt_set_requires_independent_claims(self):
        a, b = outcome(), outcome(2)
        self.assertEqual(self.assess([a, b], review(a, b)), ('outcome_reviewed', 'home'))
        self.assertEqual(self.assess([a, b])[0], 'missing_reviewed_fixture_link')
        self.assertEqual(self.assess([a, b, outcome(3)], review(a, b))[0], 'reviewed_receipt_set_mismatch')
        shared = outcome(2, acquisition_lineage=a['acquisition_lineage'])
        self.assertEqual(self.assess([a, shared], review(a, shared))[0], 'duplicate_or_shared_outcome_source')
        duplicate_payload = outcome(2, provenance=a['provenance'])
        self.assertEqual(self.assess([a, duplicate_payload], review(a, duplicate_payload))[0], 'duplicate_outcome_payload')

    def test_status_scope_conflict_and_future_receipts(self):
        a = outcome()
        for status in ('abandoned', 'void', 'postponed'):
            self.assertEqual(self.assess([outcome(status=status)])[0], f'outcome_{status}')
        for scope in ('including_extra_time', 'including_penalties'):
            self.assertEqual(self.assess([outcome(settlement_scope=scope)])[0], f'outcome_{scope}')
        for other, expected in (
            (outcome(2, status='abandoned'), 'conflicting_outcome_status'),
            (outcome(2, settlement_scope='including_extra_time'), 'conflicting_settlement_scopes'),
            (outcome(2, score=known([0, 0])), 'conflicting_regulation_scores'),
            (outcome(2, retrieved_at='2026-09-18T00:00:00Z'), 'future_outcome_receipt'),
            (a, 'duplicate_outcome_receipt'),
        ):
            with self.subTest(expected=expected):
                self.assertEqual(self.assess([a, other])[0], expected)

    def test_swapped_teams_and_event_id_collisions_are_unresolved(self):
        original = fixture()
        swapped = {**original, 'home': original['away'], 'away': original['home']}
        self.assertEqual(self.assess([outcome(event=swapped)])[0], 'outcome_event_identity_conflict')
        self.assertEqual(self.assess([outcome(event=original), outcome(2, event=swapped)])[0],
                         'outcome_event_identity_conflict')
        with self.assertRaisesRegex(ValueError, 'invalid final'):
            contract.outcome(outcome(observed_at='2026-09-15T17:59:00Z'))


def synthetic_bundle(*items, receipts=None):
    from scripts import football_prospective_evaluation as evaluation
    complete = [outcome(), outcome(2)] if receipts is None else receipts
    data = {
        'schema_version': 1, 'kind': evaluation.MANIFEST_KIND, 'as_of': '2026-09-17T00:00:00Z',
        'split': {
            'training': {'start': '2026-07-01T00:00:00Z', 'end': '2026-08-15T00:00:00Z'},
            'calibration': {'start': '2026-08-15T00:00:00Z', 'end': '2026-09-01T00:00:00Z'},
            'evaluation': {'start': '2026-09-01T00:00:00Z', 'end': '2026-10-01T00:00:00Z'},
            'fixtures': [{'partition': 'evaluation', 'event': item['event']} for item in items],
        },
        'freeze_attestations': [
            {'record_id': item['record_id'], 'forecast_sha256': item['content_sha256'],
             'observed_at': item['frozen_at'], 'provenance': provenance('d')} for item in items
        ],
        'outcome_reviews': [review(*complete)] if len(complete) >= 2 else [],
    }
    return packet(evaluation.FORECAST_KIND, *items), packet(evaluation.OUTCOME_KIND, *complete), data


class EvaluationTests(unittest.TestCase):
    def evaluate(self, forecasts, outcomes, manifest, trusted=False, admit_test_lineage=True):
        from scripts import football_prospective_evaluation as evaluation
        raw = contract.evidence.canonical(manifest)
        pin = contract.evidence.digest(raw) if trusted else None
        # Exercise the scoring path only with a temporary synthetic registry.
        if admit_test_lineage:
            from unittest.mock import patch
            with patch.object(evaluation.lineage, 'ADMITTED_CONFIGURATIONS',
                              frozenset({('synthetic-candidate', 'a' * 64, 'b' * 64)})):
                return evaluation.evaluate(forecasts, outcomes, raw, pin)
        return evaluation.evaluate(forecasts, outcomes, raw, pin)

    def test_metrics_against_hand_calculated_examples(self):
        import math
        from scripts import football_prospective_evaluation as evaluation
        result = evaluation.scores([0.5, 0.3, 0.2], 'home')
        self.assertAlmostEqual(result['log_loss'], math.log(2))
        self.assertAlmostEqual(result['brier'], 0.38)
        self.assertAlmostEqual(evaluation.scores([1, 0, 0], 'draw')['log_loss'], -math.log(1e-15))
        self.assertEqual(evaluation.scores([1, 0, 0], 'draw')['brier'], 2)
        self.assertEqual(evaluation.scores([1, 0, 0], 'home')['brier'], 0)

    def test_empty_and_complete_synthetic_sets_always_have_no_real_scores(self):
        empty = self.evaluate(*synthetic_bundle(receipts=[]))
        self.assertEqual(empty['status'], 'insufficient_data')
        result = self.evaluate(*synthetic_bundle(forecast()), trusted=True)
        self.assertEqual(result['status'], 'insufficient_data')
        self.assertEqual(result['coverage'], {'synthetic_test_fixture_only': 1})
        self.assertEqual(result['eligible_real_forecasts'], 0)
        self.assertEqual(result['model_metrics'], [])

    def test_real_path_requires_external_pin_and_exact_frozen_hash(self):
        item = seal({**forecast(), 'origin': 'prospective'})
        inputs = synthetic_bundle(item, receipts=[outcome(origin='prospective'), outcome(2, origin='prospective')])
        # These are synthetic tests of the prospective-labelled code path,
        # never evidence of a real forecast, attestation, or observed result.
        self.assertEqual(self.evaluate(*inputs)['coverage'], {'untrusted_manifest': 1})
        result = self.evaluate(*inputs, trusted=True)
        self.assertEqual(result['eligible_real_forecasts'], 1)
        self.assertEqual(result['eligible_real_adjudicated_outcomes'], 1)
        self.assertAlmostEqual(result['model_metrics'][0]['candidate']['brier'], 0.38)
        self.assertEqual(result['model_metrics'][0]['n'], 1)
        self.assertEqual(set(result['model_metrics'][0]['baselines']), {'uniform', 'fixed_home_weighted'})
        inputs[0]['records'][0] = seal({**item, 'probabilities': [0.7, 0.1, 0.2]})
        self.assertEqual(self.evaluate(*inputs, trusted=True)['coverage'], {'frozen_content_hash_mismatch': 1})

    def test_missing_roster_rows_withhold_scores_for_partial_cohort(self):
        item = seal({**forecast(), 'origin': 'prospective'})
        bundle = synthetic_bundle(item, receipts=[outcome(origin='prospective'), outcome(2, origin='prospective')])
        missing = forecast(fixture(identifier='absent', starts='2026-09-16T19:00:00Z'))
        bundle[2]['split']['fixtures'].append({'partition': 'evaluation', 'event': missing['event']})
        bundle[2]['freeze_attestations'].append({
            'record_id': missing['record_id'], 'forecast_sha256': missing['content_sha256'],
            'observed_at': missing['frozen_at'], 'provenance': provenance('e')})
        result = self.evaluate(*bundle, trusted=True)
        self.assertEqual(result['status'], 'insufficient_data')
        self.assertEqual(result['evaluation_roster_without_forecast'], 1)
        self.assertEqual(result['attested_forecasts_missing_from_input'], 1)
        self.assertEqual(result['coverage'], {'cohort_incomplete': 1})
        self.assertEqual(result['model_metrics'], [])
        self.assertNotIn('candidate_scores', result['records'][0])

    def test_same_payload_cannot_be_a_prematch_input_and_evaluation_outcome(self):
        item = forecast()
        first = outcome(origin='prospective')
        second = outcome(2, origin='prospective')
        # Keep self-consistent content hashes and a trusted synthetic review.
        # Reusing an exact result digest as a training input contradicts the
        # offered timestamp metadata even though both independently parse.
        item['origin'] = 'prospective'
        item['input_receipts'][0]['provenance'] = first['provenance']
        bundle = synthetic_bundle(seal(item), receipts=[first, second])
        report = self.evaluate(*bundle, trusted=True)
        self.assertEqual(report['coverage'], {'evaluation_outcome_payload_reused_as_prematch_input': 1})
        self.assertEqual(report['model_metrics'], [])

    def test_resealed_market_evidence_and_model_configuration_cannot_bypass_admission(self):
        item = forecast()
        item['origin'] = 'prospective'
        first, second = outcome(origin='prospective'), outcome(2, origin='prospective')
        quote = {'event': item['event'], 'market': contract.MARKET, 'market_id': 'synthetic-market',
                 'settlement_scope': 'regulation_time', 'bookmaker': 'synthetic-bookmaker',
                 'observed_at': '2026-09-14T16:00:00Z', 'completeness': 'complete',
                 'quotes': {'home': 2, 'draw': 3, 'away': 4}, 'provenance': second['provenance']}
        item['market_observation'] = known(quote)
        bundle = synthetic_bundle(seal(item), receipts=[first, second])
        self.assertEqual(self.evaluate(*bundle, trusted=True)['coverage'],
                         {'evaluation_outcome_payload_reused_as_prematch_input': 1})
        item['model']['configuration_sha256'] = 'c' * 64
        item['record_id'] = contract.forecast_id(item)
        bundle = synthetic_bundle(seal(item), receipts=[first, second])
        self.assertEqual(self.evaluate(*bundle, trusted=True)['coverage'], {'unregistered_model': 1})

    def test_late_or_missing_freeze_attestation_excludes(self):
        inputs = synthetic_bundle(forecast())
        inputs[2]['freeze_attestations'][0]['observed_at'] = '2026-09-15T18:00:00Z'
        self.assertEqual(self.evaluate(*inputs)['coverage'], {'freeze_attestation_chronology_invalid': 1})
        inputs[2]['freeze_attestations'].clear()
        self.assertEqual(self.evaluate(*inputs)['coverage'], {'missing_freeze_attestation': 1})

    def test_split_manifest_fails_on_overlaps_duplicates_and_ambiguity(self):
        for field, expected in (('start', 'overlapping'), ('timezone', 'UTC offset'), ('duplicate', 'duplicate')):
            bundle = synthetic_bundle(forecast())
            split = bundle[2]['split']
            if field == 'start':
                split['evaluation']['start'] = '2026-08-30T00:00:00Z'
            elif field == 'timezone':
                split['evaluation']['start'] = '2026-09-01T00:00:00'
            else:
                roster = split['fixtures']
                clone = {'partition': 'training',
                         'event': {**roster[0]['event'], 'starts_at': '2026-08-09T18:00:00Z'}}
                roster.insert(0, clone)
            with self.subTest(field=field), self.assertRaisesRegex(ValueError, expected):
                self.evaluate(*bundle)

    def test_training_cutoff_and_declared_window_are_both_required(self):
        base = forecast()
        cutoff = seal({**base, 'input_cutoff': '2026-09-02T00:00:00Z'})
        self.assertEqual(self.evaluate(*synthetic_bundle(cutoff))['coverage'],
                         {'input_cutoff_enters_evaluation_period': 1})
        receipt = {**base['input_receipts'][0], 'observed_at': '2026-08-15T00:00:00Z'}
        misallocated = seal({**base, 'input_receipts': [receipt]})
        self.assertEqual(self.evaluate(*synthetic_bundle(misallocated))['coverage'],
                         {'input_observation_outside_declared_split': 1})
        receipt['period'] = 'calibration'
        self.assertEqual(self.evaluate(*synthetic_bundle(seal(misallocated)))['coverage'],
                         {'synthetic_test_fixture_only': 1})

    def test_duplicate_fixture_and_alias_namespaces_do_not_create_more_rows(self):
        base = forecast()
        second = forecast(fixture('another-source', 'alias'))
        bundle = synthetic_bundle(base, second)
        bundle[2]['split']['fixtures'].pop()
        self.assertEqual(self.evaluate(*bundle)['coverage'], {'duplicate_forecast_fixture': 2})
        changed = synthetic_bundle(base)
        changed[2]['split']['fixtures'][0]['event'] = {**base['event'], 'starts_at': '2026-09-15T18:01:00Z'}
        self.assertEqual(self.evaluate(*changed)['coverage'], {'outside_exact_evaluation_roster': 1})

    def test_partial_or_mixed_receipts_never_score(self):
        item = forecast()
        first, second = outcome(), outcome(2)
        self.assertEqual(self.evaluate(*synthetic_bundle(item, receipts=[]))['coverage'], {'missing_exact_outcome': 1})
        self.assertEqual(self.evaluate(*synthetic_bundle(item, receipts=[first]))['coverage'],
                         {'missing_reviewed_fixture_link': 1})
        foreign = outcome(2, origin='prospective')
        self.assertEqual(self.evaluate(*synthetic_bundle(item, receipts=[first, foreign]))['coverage'],
                         {'outcome_origin_conflict': 1})
        duplicate_event = outcome(2, event=first['event'])
        self.assertEqual(self.evaluate(*synthetic_bundle(item, receipts=[first, duplicate_event]))['coverage'],
                         {'duplicate_provider_event_reference': 1})
        reversed_order = {'home': item['event']['away'], 'away': item['event']['home']}
        reversed_receipt = outcome(3, event={**fixture('provider-3', 'fixture-3'), **reversed_order})
        result = self.evaluate(*synthetic_bundle(item, receipts=[first, second, reversed_receipt]))
        self.assertEqual(result['coverage'], {'outcome_participant_order_conflict': 1})

    def test_future_and_mismatched_review_are_explicit_exclusions(self):
        for changes, expected in (
            ({'reviewed_at': '2026-09-15T19:00:00Z'}, 'outcome_review_chronology_invalid'),
            ({'reviewed_at': '2026-09-18T00:00:00Z'}, 'outcome_review_chronology_invalid'),
            ({'event': fixture(identifier='event-1', starts='2026-09-15T18:01:00Z')},
             'reviewed_event_identity_conflict'),
        ):
            bundle = synthetic_bundle(forecast())
            bundle[2]['outcome_reviews'][0].update(changes)
            self.assertEqual(self.evaluate(*bundle)['coverage'], {expected: 1})
        before_freeze = synthetic_bundle(forecast())
        before_freeze[2]['as_of'] = '2026-09-10T00:00:00Z'
        self.assertEqual(self.evaluate(*before_freeze)['coverage'], {'future_forecast_freeze': 1})

    def test_utc_offset_alias_is_exact_but_local_time_without_offset_is_rejected(self):
        item = forecast()
        bundle = synthetic_bundle(item)
        bundle[2]['split']['fixtures'][0]['event'] = {**item['event'], 'starts_at': '2026-09-15T19:00:00+01:00'}
        self.assertEqual(self.evaluate(*bundle)['coverage'], {'synthetic_test_fixture_only': 1})

    def test_committed_registry_blocks_unregistered_and_ambiguous_versions(self):
        for name, reason in (('unknown', 'unregistered_model'),
                             ('POISSON_BASELINE_2025_26_V1', 'unresolved_model_version_or_configuration')):
            item = forecast()
            item['origin'] = 'prospective'
            item['model']['name'] = name
            item['record_id'] = contract.forecast_id(item)
            bundle = synthetic_bundle(seal(item), receipts=[outcome(origin='prospective'), outcome(2, origin='prospective')])
            report = self.evaluate(*bundle, trusted=True, admit_test_lineage=False)
            self.assertEqual(report['coverage'], {reason: 1})
            self.assertEqual(report['model_metrics'], [])



class EvaluationCLITests(unittest.TestCase):
    def test_examples_regenerate_and_cli_never_writes_input_files(self):
        import json
        import os
        from pathlib import Path
        import subprocess
        import sys
        import tempfile
        from scripts import football_prospective_evaluation as evaluation
        root = contract.evidence.ROOT
        script = root / 'scripts/football_prospective_evaluation.py'
        examples = root / 'tests/fixtures/football-prospective'
        for label in ('empty', 'synthetic'):
            folder = examples / label
            expected = json.loads((folder / 'expected-report.json').read_bytes())
            with self.subTest(example=label), tempfile.TemporaryDirectory(prefix='football evaluation ') as temporary:
                target = Path(temporary)
                filenames = ('forecasts.json', 'outcomes.json', 'manifest.json')
                for filename in filenames:
                    raw = (folder / filename).read_bytes()
                    # The forecast and outcome parsers accept UTF-8 BOM and CRLF.
                    # Keep manifest bytes exact because its hash is reported.
                    if filename != 'manifest.json':
                        raw = b'\xef\xbb\xbf' + raw.replace(b'\n', b'\r\n')
                    (target / filename).write_bytes(raw)
                before = {path.name: path.read_bytes() for path in target.iterdir()}
                args = ['--forecasts', str(target / filenames[0]), '--outcomes', str(target / filenames[1]),
                        '--manifest', str(target / filenames[2])]
                command = [sys.executable, str(script)]
                self.assertEqual(json.loads(subprocess.check_output([*command, 'validate', *args]))['scoring_run'],
                                 False)
                first = subprocess.check_output([*command, 'evaluate', *args], cwd=target)
                second = subprocess.check_output([*command, 'evaluate', *args], cwd=target,
                                                 env={**os.environ, 'PYTHONHASHSEED': '97'})
                self.assertEqual(first, second)
                self.assertEqual(first, evaluation.evidence.canonical(expected) + b'\n')
                self.assertEqual(expected['eligible_real_forecasts'], 0)
                self.assertEqual({path.name: path.read_bytes() for path in target.iterdir()}, before)
                failed = subprocess.run([*command, 'evaluate', *args, '--trusted-manifest-sha256', '0' * 64],
                                        cwd=target, capture_output=True)
                self.assertNotEqual(failed.returncode, 0)
                self.assertIn(b'trusted manifest SHA-256 mismatch', failed.stderr)
