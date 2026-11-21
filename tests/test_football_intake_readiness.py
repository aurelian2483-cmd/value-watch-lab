import copy
import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest
from unittest.mock import patch

from scripts import football_intake_readiness as gate

canonical, digest = gate.evidence.canonical, gate.evidence.digest
FIXTURE = {'namespace': 'football-data-org', 'id': 'example-1', 'competition': 'PL',
           'season': '2026-27', 'home': 'Example Home', 'away': 'Example Away',
           'starts_at': '2026-11-30T20:00:00Z'}
CUTOFF = '2026-11-29T12:00:00Z'
HASH = 'a' * 64
INPUTS = b'synthetic demonstration input bytes'
TOKEN = b'synthetic demonstration token bytes'


def packet():
    rows = []
    for entry in gate.capture.candidates.registry().values():
        row = {'origin': 'prospective', 'event': dict(FIXTURE), 'model': dict(entry['model']),
               'market': 'FULL_TIME_1X2', 'settlement_scope': 'regulation_time',
               'outcome_order': list(gate.contract.OUTCOMES), 'probabilities': [.6, .2, .2],
               'created_at': CUTOFF, 'frozen_at': CUTOFF, 'input_cutoff': CUTOFF,
               'input_receipts': [{'period': 'training', 'observed_at': CUTOFF,
                                   'provenance': {'source': {'kind': 'permitted_receipt_reference',
                                                             'reference': 'example-input'}, 'sha256': HASH}}],
               'market_observation': {'state': 'unavailable', 'value': None}}
        row['record_id'] = gate.contract.forecast_id(row)
        row['content_sha256'] = gate.contract.sha(row)
        rows.append(row)
    return {'schema_version': 1, 'origin': 'prospective', 'event': dict(FIXTURE), 'input_sha256': digest(INPUTS),
            'forecasts': {'schema_version': 1, 'kind': gate.capture.evaluator.FORECAST_KIND, 'records': rows}}


def manifest(packet_bytes):
    return {'schema_version': 1, 'origin': 'external', 'candidate_registry_sha256': gate.capture.candidates.PIN,
            'source_approval': {'decision_sha256': HASH, 'permissions': [
                {'source_id': 'football-data-org', 'roles': sorted(gate.ROLES), 'lineage': 'lineage-one',
                 'permission_sha256': HASH, 'retain_through': '2027-01-01T00:00:00Z'},
                {'source_id': 'openligadb', 'roles': ['final_outcome'], 'lineage': 'lineage-two',
                 'permission_sha256': HASH, 'retain_through': '2027-01-01T00:00:00Z'}]},
            'schedule': {'event': dict(FIXTURE), 'source_id': 'football-data-org', 'observed_at': CUTOFF,
                         'earliest_kickoff': FIXTURE['starts_at'], 'receipt_sha256': HASH,
                         'identity_review_sha256': HASH},
            'earlier_inputs': {'source_id': 'football-data-org', 'input_sha256': digest(INPUTS),
                               'input_cutoff': CUTOFF, 'last_receipt_observed_at': CUTOFF,
                               'availability_review_sha256': HASH},
            'timestamp': {'method': 'rfc3161_trusted_tsa', 'authority': 'example-tsa',
                          'packet_sha256': digest(packet_bytes), 'token_sha256': digest(TOKEN),
                          'observed_at': '2026-11-30T19:55:00Z', 'verification_receipt_sha256': HASH},
            'outcome_review': {'reviewer': 'example-reviewer', 'review_state': 'independently_reviewed',
                               'settlement_scope': 'regulation_time', 'sources': ['football-data-org', 'openligadb'],
                               'procedure_sha256': HASH, 'review_demonstration_sha256': HASH},
            'retention': {'custodian': 'example-custodian', 'approved_through': '2026-12-20T00:00:00Z',
                          'policy_sha256': HASH, 'approval_sha256': HASH, 'archive_control_check_sha256': HASH},
            'study_registration': {'window_start': '2026-11-28T00:00:00Z', 'window_end': '2026-12-02T00:00:00Z',
                                   'outcome_review_deadline': '2026-12-10T00:00:00Z', 'buffer_seconds': 300,
                                   'protocol_sha256': HASH, 'registration_sha256': HASH, 'approval_sha256': HASH}}


class ReadinessTests(unittest.TestCase):
    def setUp(self):
        self.packet = canonical(packet())
        self.data = manifest(self.packet)

    def report(self, data=None, packet_bytes=None, inputs=INPUTS, token=TOKEN, approved=True):
        raw = canonical(self.data if data is None else data)
        with patch.object(gate, 'APPROVED_EXTERNAL_MANIFESTS', {digest(raw)} if approved else frozenset()):
            return gate.inspect(raw, self.packet if packet_bytes is None else packet_bytes, inputs, token)

    def assert_closed(self, report, status='NOT READY'):
        self.assertEqual(report['status'], status)
        self.assertIs(report['real_intake_enabled'], False)
        self.assertEqual(report['eligible_real_captures'], 0)
        self.assertEqual(report['eligible_real_outcomes'], 0)
        self.assertEqual(report['model_validation'], 'UNVALIDATED')
        self.assertEqual(report['publication_gate'], 'BLOCKED')
        self.assertFalse({'scores', 'rankings'} & report.keys())

    def test_complete_exact_pin_is_review_only_at_buffer_boundary(self):
        report = self.report()
        self.assert_closed(report, 'READY FOR AUTHORIZATION REVIEW')
        self.assertEqual({x['status'] for x in report['gates'].values()}, {'satisfied'})

    def test_each_missing_gate_fails_closed(self):
        for key in gate.GATES:
            with self.subTest(key=key):
                report = self.report({**self.data, key: None})
                self.assert_closed(report)
                self.assertEqual(report['gates'][key]['status'], 'missing')

    def test_structurally_complete_metadata_cannot_self_approve(self):
        for origin, status, approved in [('external', 'unverified', False), ('synthetic', 'synthetic_only', True)]:
            with self.subTest(origin=origin):
                report = self.report({**self.data, 'origin': origin}, approved=approved)
                self.assert_closed(report)
                self.assertTrue(all(report['gates'][key]['status'] == status for key in gate.GATES))

    def test_invalid_evidence(self):
        cases = [
            ('candidate_pins', 'candidate_registry_sha256', None, '0' * 64, 'registry hash'),
            ('timestamp', 'timestamp', 'observed_at', '2026-11-30T19:55:01Z', 'pre-kickoff buffer'),
            ('timestamp', 'timestamp', 'observed_at', FIXTURE['starts_at'], 'pre-kickoff buffer'),
            ('timestamp', 'timestamp', 'method', 'git_commit_date', 'unsupported timestamp'),
            ('schedule', 'schedule', 'earliest_kickoff', '2026-11-30T19:00:00Z', 'earliest kickoff'),
            ('earlier_inputs', 'earlier_inputs', 'last_receipt_observed_at', '2026-11-29T12:00:01Z', 'after cutoff'),
            ('outcome_review', 'outcome_review', 'review_state', 'pending', 'unreviewed'),
            ('retention', 'retention', 'approval_sha256', None, 'SHA-256'),
            ('retention', 'retention', 'approved_through', '2026-12-09T00:00:00Z', 'review window'),
            ('study_registration', 'study_registration', 'window_start', '2026-12-01T00:00:00Z', 'outside'),
        ]
        for gate_name, key, field, value, reason in cases:
            with self.subTest(gate=gate_name, field=field, value=value):
                data = copy.deepcopy(self.data)
                if field is None:
                    data[key] = value
                else:
                    data[key][field] = value
                report = self.report(data)
                self.assert_closed(report)
                self.assertEqual(report['gates'][gate_name]['status'], 'invalid')
                self.assertIn(reason, report['gates'][gate_name]['reason'])

    def test_permissions_and_outcome_independence(self):
        for index, key, value, check, reason in [
            (0, 'source_id', 'undocumented', 'source_approval', 'unsupported source'),
            (0, 'roles', ['earlier_results', 'final_outcome'], 'source_approval', 'roles are incomplete'),
            (1, 'lineage', 'lineage-one', 'outcome_review', 'shared acquisition lineage'),
            (1, 'retain_through', '2026-12-11T00:00:00Z', 'retention', 'provider retention permission'),
        ]:
            with self.subTest(key=key):
                data = copy.deepcopy(self.data)
                data['source_approval']['permissions'][index][key] = value
                report = self.report(data)
                self.assert_closed(report)
                self.assertIn(reason, report['gates'][check]['reason'])

    def test_exact_bytes_and_dependency_checks(self):
        for kwargs, check, reason in [
            ({'packet_bytes': self.packet + b'\n'}, 'timestamp', 'forecast packet missing or hash mismatch'),
            ({'token': TOKEN + b'\n'}, 'timestamp', 'timestamp token missing or hash mismatch'),
            ({'token': None}, 'timestamp', 'timestamp token missing or hash mismatch'),
            ({'inputs': INPUTS + b'\n'}, 'earlier_inputs', 'earlier inputs missing or hash mismatch'),
        ]:
            with self.subTest(check=check):
                report = self.report(**kwargs)
                self.assert_closed(report)
                self.assertIn(reason, report['gates'][check]['reason'])
                self.assertEqual(report['gates']['timestamp']['status'], 'invalid')

    def test_resealed_wrong_origin_event_or_candidate_set(self):
        for mutation, reason in [
            (lambda row: row.update(origin='synthetic'), 'synthetic or unknown packet tier'),
            (lambda row: row['event'].update(id='example-2'), 'packet identity'),
            (lambda row: row['forecasts']['records'].pop(), 'all pinned paths once'),
        ]:
            with self.subTest(reason=reason):
                value = packet()
                mutation(value)
                raw = canonical(value)
                report = self.report(manifest(raw), raw)
                self.assert_closed(report)
                self.assertIn(reason, report['gates']['timestamp']['reason'])

    def test_unknown_override_is_rejected(self):
        with self.assertRaises(ValueError):
            gate.inspect(canonical({**self.data, 'allow_real_intake': True}))

    def test_cli_is_deterministic_and_read_only(self):
        script = Path(gate.__file__).resolve()
        with tempfile.TemporaryDirectory() as tmp:
            outputs = [subprocess.check_output([sys.executable, str(script)], cwd=tmp,
                                               env={**os.environ, 'PYTHONHASHSEED': seed})
                       for seed in ('11', '73')]
            self.assertEqual(outputs[0], outputs[1])
            self.assert_closed(json.loads(outputs[0]))
            self.assertEqual(list(Path(tmp).iterdir()), [])
