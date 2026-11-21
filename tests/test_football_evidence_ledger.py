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
