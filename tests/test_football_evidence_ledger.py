import copy
from pathlib import Path
import tempfile
import unittest

from scripts import football_evidence_ledger as evidence


class EvidenceLedgerTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.directory = evidence.ROOT / evidence.DIRECTORY
        cls.ledger = evidence.load(cls.directory / 'ledger.v1.json')

    def test_pinned_shape_totals_and_stable_keys(self):
        ledger = copy.deepcopy(self.ledger)
        evidence.validate(ledger, pinned=True)
        ledger['rows'].reverse()
        self.assertEqual(evidence.summaries(ledger['rows']), self.ledger['counts'])
        for row in ledger['rows']:
            self.assertEqual(evidence.row_key({**row, 'score': [0, 0], 'competition': 'ALIAS'}), row['key'])

    def test_unknown_status_missing_provenance_and_date(self):
        for key, value in (('disposition', 'exact_independent_corroboration'), ('source_csv_sha256', None),
                           ('tier', 'TWO_SOURCE_EXPANDED_FINAL'), ('date', '2026-11-08T23:59:59Z'),
                           ('score', [True, 0]), ('reason', 'APPROVED')):
            with self.subTest(key=key):
                ledger = copy.deepcopy(self.ledger)
                ledger['rows'][0][key] = value
                with self.assertRaises(ValueError):
                    evidence.validate(ledger)

    def test_duplicate_rows_candidates_and_mismatched_totals(self):
        ledger = copy.deepcopy(self.ledger)
        ledger['rows'][0] = ledger['rows'][1]
        with self.assertRaisesRegex(ValueError, 'duplicate source row'):
            evidence.validate(ledger)
        ledger = copy.deepcopy(self.ledger)
        row = next(row for row in ledger['rows'] if row['candidates'])
        row['candidates'].append(row['candidates'][0])
        with self.assertRaisesRegex(ValueError, 'candidate collision'):
            evidence.validate(ledger)
        ledger = copy.deepcopy(self.ledger)
        ledger['counts']['repeated_pairings'] += 1
        with self.assertRaisesRegex(ValueError, 'inconsistent disposition counts'):
            evidence.validate(ledger)

    def test_windows_paths_utf8_bom_crlf_and_duplicate_json_members(self):
        with tempfile.TemporaryDirectory(prefix='football evidence ') as temporary:
            path = Path(temporary) / 'copied ledger.json'
            raw = evidence.serialize(self.ledger)
            self.assertIn('München'.encode(), raw)
            self.assertNotIn(b'\r', raw)
            path.write_bytes(b'\xef\xbb\xbf' + raw.replace(b'\n', b'\r\n'))
            self.assertEqual(evidence.load(path), self.ledger)
            path.write_bytes(b'{"schema_version":1,"schema_version":1}')
            with self.assertRaisesRegex(ValueError, 'duplicate JSON object key'):
                evidence.load(path)

    def test_drift_identifies_row_and_pin_changes_without_promotions(self):
        before = self.ledger
        after = copy.deepcopy(before)
        available = [row for row in after['rows'] if row['disposition'] == 'unmatched']
        removed, changed, reclassified = available[:3]
        after['rows'].remove(removed)
        added = copy.deepcopy(removed)
        added['date'] = '2026-06-01'
        added['key'] = evidence.row_key(added)
        after['rows'].append(added)
        changed['score'] = [20, 0]
        changed['participants'][0] = 'Reviewable Team Alias'
        state = 'score_or_source_conflict'
        reclassified.update(disposition=state, reason=evidence.POLICY[state][0],
                            evidence_needed=evidence.POLICY[state][1])
        # The new rules concern source drift, and the changed bytes affect the
        # score. Both contexts are reported for review, without asserting causality.
        after['rules_sha256'] = 'a' * 64
        after['inputs']['single']['sha256'] = 'b' * 64
        after['counts'] = evidence.summaries(after['rows'])
        result = evidence.compare(before, after)
        self.assertEqual(result['totals'], {'added': 1, 'removed': 1, 'changed': 1, 'reclassified': 1})
        self.assertEqual(result['verified_coverage_gained'], 0)
        self.assertEqual(result['changed'][0]['fields']['participants'][1][0], 'Reviewable Team Alias')
        self.assertEqual(result['reclassified'][0]['changed_input_hashes']['single'][1], 'b' * 64)
        self.assertEqual(result['reclassified'][0]['changed_rule_context']['rules_sha256'][1], 'a' * 64)

    def test_drift_ignores_row_and_candidate_reordering(self):
        after = copy.deepcopy(self.ledger)
        after['rows'].reverse()
        for row in after['rows']:
            row['candidates'].reverse()
        self.assertFalse(any(evidence.compare(self.ledger, after)['totals'].values()))

    def test_candidate_reference_collision_across_rows(self):
        duplicate = copy.deepcopy(self.ledger)
        first, second = [row for row in duplicate['rows'] if row['disposition'] == 'linked_identity_insufficient'][:2]
        second['candidates'] = first['candidates']
        with self.assertRaisesRegex(ValueError, 'attached to multiple source rows'):
            evidence.validate(duplicate)

    def test_tampered_bytes_fail_exact_regeneration(self):
        from unittest.mock import patch
        with tempfile.TemporaryDirectory(prefix='evidence checkout ') as directory:
            root = Path(directory)
            target = root / evidence.DIRECTORY
            target.mkdir(parents=True)
            ledger_path = target / 'ledger.v1.json'
            ledger_path.write_bytes(evidence.serialize(self.ledger))
            (target / 'ledger-summary.md').write_bytes(evidence.summary(self.ledger))
            with patch.object(evidence, 'build', return_value=self.ledger):
                evidence.check(root)
                edited = copy.deepcopy(self.ledger)
                edited['rows'][0]['score'][0] += 1
                ledger_path.write_bytes(evidence.serialize(edited))
                evidence.validate(evidence.load(ledger_path))
                with self.assertRaisesRegex(ValueError, 'differs from regenerated bytes'):
                    evidence.check(root)

    def test_build_rejects_even_semantically_equivalent_rewritten_pins(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            target = root / evidence.DIRECTORY
            target.mkdir(parents=True)
            manifest = target / 'manifest.json'
            with self.assertRaises(FileNotFoundError):
                evidence.build(root)
            raw = (self.directory / 'manifest.json').read_bytes()
            manifest.write_bytes(raw + b'\n')
            with self.assertRaisesRegex(ValueError, 'manifest differs'):
                evidence.build(root)
            manifest.write_bytes(raw)
            (target / 'report.sha256').write_bytes(b'0' * 64 + b'\n')
            with self.assertRaisesRegex(ValueError, 'expected report hash changed'):
                evidence.build(root)
