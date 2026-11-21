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
