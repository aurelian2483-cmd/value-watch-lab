import json
import unittest

from scripts import audit_football_provenance as evidence
from test_football_result_reconciliation import ResultAuditFixture


class FootballProvenanceTests(ResultAuditFixture):
    def pair(self):
        report = self.report()
        single = report['single_source_rows'][0]
        reference = report['reference_rows'][0]
        return single, reference, {
            'classification': evidence.pilot.LINKED,
            'ordered_participants_match': True,
            'score_agrees': True,
        }

    def test_exact_fixture_id_does_not_establish_independence(self):
        single, reference, pair = self.pair()
        self.assertEqual(evidence.adjudicate(single, reference, pair, {}, None)[0],
                         'linked_identity_insufficient')
        single['fixture_id'] = reference['fixture_id']
        for lineage in ('shared_claimed_upstream', 'independence_unestablished'):
            self.assertEqual(evidence.adjudicate(single, reference, pair, {}, lineage)[0],
                             'source_independence_unknown')
        single['fixture_id'] = ['example', 'different']
        self.assertEqual(evidence.adjudicate(single, reference, pair, {}, None)[0],
                         'ambiguous_identity')

    def test_adjudication_rejects_reverse_score_and_reference_anchor_conflict(self):
        single, reference, pair = self.pair()
        for fields, expected in (
            ({'ordered_participants_match': False}, 'ambiguous_identity'),
            ({'score_agrees': False}, 'score_or_source_conflict'),
            ({'classification': 'duplicate_or_repeated'}, 'duplicate'),
        ):
            self.assertEqual(evidence.adjudicate(single, reference, {**pair, **fields}, {}, None)[0], expected)
        self.assertEqual(evidence.adjudicate(single, reference, pair, {'provider_fixture_id': 'espn:42'}, None)[0],
                         'score_or_source_conflict')

    def test_alias_collision_is_not_an_automatic_duplicate(self):
        alternate = {**self.source, 'home': 'Manchester City'}
        report = self.report([self.source, alternate])
        with self.assertRaisesRegex(ValueError, 'alias collision'):
            evidence.assert_alias_integrity(report['single_source_rows'])
        alternate['kickoff_utc'] = '2026-11-09T12:00:00Z'
        report = self.report([self.source, alternate])
        with self.assertRaisesRegex(ValueError, 'date-only sentinel'):
            evidence.assert_alias_integrity(report['single_source_rows'])

    def test_pin_validation_fails_on_missing_empty_malformed_and_changed(self):
        path = self.root / evidence.reconciliation.INPUTS['single'][0]
        pins = {'single': 'a' * 64}
        for text, message in ((None, 'missing'), ('{', 'invalid'), ('{"results":[]}', 'SHA-256 changed')):
            if text is not None:
                path.write_text(text, encoding='utf-8')
            with self.assertRaisesRegex(ValueError, message):
                evidence.snapshot_inputs(self.root, pins, {'single': 1})
        pins['single'] = evidence.reconciliation.digest(path.read_bytes())
        with self.assertRaisesRegex(ValueError, 'expected 1 rows, found 0'):
            evidence.snapshot_inputs(self.root, pins, {'single': 1})
        path.write_text('{"results":[1]}', encoding='utf-8')
        pins['single'] = evidence.reconciliation.digest(path.read_bytes())
        with self.assertRaisesRegex(ValueError, 'malformed row'):
            evidence.snapshot_inputs(self.root, pins, {'single': 1})

    def test_csv_manifest_hash_missing_bytes_replay_and_totals(self):
        raw = b'date,home,away,ft_home,ft_away,ft_result,source\n2026-11-08,Man City,Fulham,2,1,H,fixturedl\n'
        sha = evidence.reconciliation.digest(raw)
        receipt = {'competition': 'Premier League', 'rows': 1, 'csv_sha256': sha,
                   'source_url': self.source['source_url']}
        timestamp = '2026-11-09T01:00:00Z'
        source = {'audit': [receipt], 'generated_at_utc': timestamp}
        rows = evidence.parse_results(raw.decode(), receipt['competition'], receipt['source_url'],
                                      evidence.reconciliation.instant(timestamp))
        trace = {'csv_sources': [{**receipt, 'row_provider_labels': {'fixturedl': 1},
                                  'matches': [{'raw_sha256': sha, 'collector_text_sha256': sha}]}]}
        evidence.validate_csv_manifest(source, rows, trace, lambda _: raw)
        for payload, message in ((None, 'blob missing'), (raw + b'x', 'collector CSV SHA-256 mismatch'),
                                 (b'\xef\xbb\xbf' + raw, 'raw SHA-256 mismatch')):
            with self.assertRaisesRegex(ValueError, message):
                evidence.validate_csv_manifest(source, rows, trace, lambda _, data=payload: data)
        with self.assertRaisesRegex(ValueError, 'replay differs'):
            evidence.validate_csv_manifest(source, [{**rows[0], 'score_home': 3}], trace, lambda _: raw)
        with self.assertRaisesRegex(ValueError, 'totals do not reconcile'):
            evidence.validate_csv_manifest(source, [], trace, lambda _: raw)

    def test_checked_in_snapshot_inventory_and_pins(self):
        target = evidence.ROOT / evidence.OUTPUT
        manifest = json.loads((target / 'manifest.json').read_bytes())
        documents, records = evidence.snapshot_inputs(evidence.ROOT, manifest['input_sha256'], evidence.EXPECTED)
        evidence.validate_csv_manifest(documents['single'], records['single'], manifest['source_trace'])
        report = evidence.reconciliation.audit(evidence.ROOT)
        self.assertEqual(report['candidate_rows'], 51)
        self.assertEqual(report['candidate_pair_counts']['duplicate_or_repeated'], 4)
        self.assertEqual(report['expanded_rows_meeting_two_source_contract'], 66)
        self.assertEqual(sum(report['classification_counts'].values()), 734)
