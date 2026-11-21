import copy
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest

from scripts import football_evidence_intake as intake


def known(value):
    return {'state': 'known', 'value': value}


def unknown(state='unknown'):
    return {'state': state, 'value': None}


def complete():
    ref = {'kind': 'permitted_receipt_reference', 'reference': 'synthetic-archive-1'}
    return {
        'receipt_id': 'synthetic-1',
        'provider': known('Synthetic provider'),
        'acquisition': known({'collector': 'Synthetic collector', 'basis': 'fixture_level_receipt',
                              'upstream_providers': known(['Synthetic upstream']), 'evidence': known(ref)}),
        'event': known({'namespace': 'test-fixtures', 'id': '123'}),
        'fixture': known({'competition': 'Test league', 'home': 'München Test', 'away': 'Away Test',
                          'scheduled': known({'precision': 'utc_timestamp', 'value': '2026-10-03T12:00:00Z'})}),
        'settlement_scope': known('regulation_time'), 'score': known([1, 0]),
        'retrieved_at_utc': known('2026-10-03T15:00:00.123456Z'),
        'source': known({'kind': 'https_url', 'reference': 'https://example.invalid/result/123'}),
        'content_sha256': known('a' * 64),
        'licence_retention': known({'policy_reference': ref, 'retention': 'metadata_only'}),
    }


def document(*receipts):
    return {'schema_version': 1, 'receipts': list(receipts)}


class FootballIntakeTests(unittest.TestCase):
    def test_evidence_signals_do_not_establish_independence(self):
        full = complete()
        blank = {'receipt_id': 'synthetic-partial',
                 **{key: unknown() for key in full if key != 'receipt_id'}}
        date_only = copy.deepcopy(full['fixture'])
        date_only['value']['scheduled'] = known({'precision': 'date_only', 'value': '2026-10-03'})
        aggregate = copy.deepcopy(full['acquisition'])
        aggregate['value'].update(basis='aggregate_documentation', evidence=unknown('unavailable'))
        for name, value in (('event', full['event']), ('score', full['score']), ('provider', full['provider']),
                            ('fixture', date_only), ('acquisition', aggregate)):
            with self.subTest(signal=name):
                partial = {**blank, name: value}
                result = intake.validate(document(partial))
                self.assertEqual(result['field_availability'], {'known': 1, 'unknown': 9, 'unavailable': 0})
                self.assertEqual(result['verified_coverage_gained'], 0)
                self.assertEqual(result['automatic_classification_changes'], 0)
        # Matching IDs and scores across separately labelled receipts can
        # still describe one shared upstream acquisition.
        shared = {**full, 'receipt_id': 'synthetic-2', 'provider': known('Different synthetic label')}
        for submitted in (document(), document(blank), document(full, shared)):
            result = intake.validate(submitted)
            self.assertEqual(result['verified_coverage_gained'], 0)
            self.assertEqual(result['automatic_classification_changes'], 0)

    def test_rejects_missing_extra_conflicting_and_malformed_fields(self):
        invalid_cases = {
            'provider': {'state': 'unknown', 'value': 'implied provider'},
            'event': known({'namespace': 'CONFLATED', 'id': '123'}),
            'score': known([True, 0]),
            'retrieved_at_utc': known('2026-10-03'),
            'content_sha256': known('abc'),
            'source': known({'kind': 'https_url', 'reference': 'https://user@example.invalid/result'}),
            'settlement_scope': known('unspecified'),
            'licence_retention': known({'policy_reference': {'kind': 'permitted_receipt_reference',
                'reference': '../license.txt'}, 'retention': 'permitted'}),
            'acquisition': known({'collector': 'test', 'basis': 'fixture_level_receipt',
                                  'upstream_providers': unknown(), 'evidence': unknown()}),
        }
        for field, value in invalid_cases.items():
            with self.subTest(field=field), self.assertRaisesRegex(ValueError, f'receipt 1: .*{field}'):
                intake.validate(document({**complete(), field: value}))
        with self.assertRaisesRegex(ValueError, 'invalid schema fields'):
            receipt = complete()
            del receipt['source']
            intake.validate(document(receipt))
        with self.assertRaisesRegex(ValueError, 'invalid schema fields'):
            intake.validate(document({**complete(), 'verified': True}))
        with self.assertRaisesRegex(ValueError, 'duplicate receipt ID'):
            intake.validate(document(complete(), complete()))

    def test_date_precision_and_explicit_unavailable(self):
        receipt = complete()
        receipt['fixture']['value']['scheduled'] = known({'precision': 'date_only', 'value': '2026-02-30'})
        with self.assertRaisesRegex(ValueError, 'fixture.scheduled'):
            intake.validate(document(receipt))
        receipt['fixture']['value']['scheduled'] = unknown('unavailable')
        receipt['content_sha256'] = unknown('unavailable')
        self.assertEqual(intake.validate(document(receipt))['field_availability']['unavailable'], 1)

    def test_cli_handles_bom_and_paths_without_modifying_any_input(self):
        root = intake.ledger.ROOT
        ledger_path = root / intake.ledger.DIRECTORY / 'ledger.v1.json'
        before = ledger_path.read_bytes()
        with tempfile.TemporaryDirectory(prefix='football intake ') as temporary:
            path = Path(temporary) / 'receipt file.json'
            raw = b'\xef\xbb\xbf' + json.dumps(document(complete()), indent=2, ensure_ascii=False).encode()
            path.write_bytes(raw.replace(b'\n', b'\r\n'))
            args = [sys.executable, str(root / 'scripts/football_evidence_intake.py'), str(path)]
            out = subprocess.check_output(args, cwd=temporary)
            self.assertEqual(out, subprocess.check_output(args, cwd=temporary))
            self.assertEqual(json.loads(out)['verified_coverage_gained'], 0)
            self.assertEqual(list(Path(temporary).iterdir()), [path])
            self.assertEqual(path.read_bytes(), raw.replace(b'\n', b'\r\n'))
        self.assertEqual(ledger_path.read_bytes(), before)
