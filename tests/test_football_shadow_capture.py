import copy
from datetime import date, timedelta
from pathlib import Path
from tempfile import TemporaryDirectory
from types import SimpleNamespace
import unittest

from scripts import football_shadow_capture as capture
from scripts import football_shadow_journal as journal

evidence, contract = capture.evidence, capture.contract
EVENT = {'namespace': 'synthetic', 'id': 'target', 'competition': 'PL', 'season': '2026-27',
         'home': 'Synthetic Home', 'away': 'Synthetic Away', 'starts_at': '2026-11-30T20:00:00Z'}
SCHEDULE = '2026-11-28T09:00:00Z'
OBS = '2026-11-29T12:00:00Z'
CREATED = '2026-11-29T12:01:00Z'
FROZEN = '2026-11-29T12:02:00Z'
ATTESTED = '2026-11-29T12:03:00Z'
RECORDED = '2026-11-29T12:04:00Z'
AFTER = '2026-12-01T09:00:00Z'
CUTOFF = capture.instant(OBS)


def text(value):
    return evidence.canonical(value).decode()


def digest(value):
    return evidence.digest(value.encode())


def provenance(label):
    return {'source': {'kind': 'permitted_receipt_reference', 'reference': f'synthetic-{label}'},
            'sha256': digest(label)}


def seal(row):
    row.pop('content_sha256', None)
    row['content_sha256'] = contract.sha(row)
    return row


def operation(kind, at, body):
    return {'schema_version': 1, 'kind': kind, 'recorded_at': at, 'body': body}


def scheduled(event=None):
    return operation('schedule', SCHEDULE, {'event': event or dict(EVENT), 'origin': 'synthetic',
                                           'observed_at': SCHEDULE, 'provenance': provenance('schedule')})


def inputs():
    target = dict(EVENT)
    rows = []
    start = date(2026, 8, 1)
    for index in range(30):
        day = (start + timedelta(days=index)).isoformat()
        rows.append({'event': {**target, 'id': f'home-game-{index}', 'away': f'Away Club {index}',
                               'starts_at': day + 'T13:00:00Z'},
                     'observed_at': day + 'T21:00:00Z', 'score': [2,1], 'provenance': provenance(f'home-{index}')})
        if index < 3:
            rows.append({'event': {**target, 'id': f'away-game-{index}', 'home': f'Home Club {index}',
                                   'starts_at': day + 'T13:00:00Z'},
                         'observed_at': day + 'T21:00:00Z', 'score': [2,1], 'provenance': provenance(f'away-{index}')})
    return {'schema_version': 1, 'origin': 'synthetic', 'event': target, 'results': rows}


def fixture_runtime():
    rule = evidence.load(capture.candidates.replay.DIRECTORY / 'protocol.json')
    cfg = {'pseudo_matches': 5, 'grid_max': 11, 'form_last': 5, 'form_alpha': .025, 'lambda_range': [.15,4]}
    expanded = SimpleNamespace(norm=str.casefold, stats=lambda rows: ({},2,1),
                               model_forecast=lambda *args: {
                                   'training_basis': {'mode':'CURRENT_SEASON_SMALL_SAMPLE'},
                                   'prob_home':.6,'prob_draw':.2,'prob_away':.2})
    return rule, cfg, expanded


def capture_packet(registry, runtime):
    input_bytes = text(inputs())
    rows, receipts = capture.history(input_bytes, EVENT, CUTOFF)
    values = capture.candidates.probabilities(rows, EVENT, runtime)
    forecasts = []
    for name, vector in values.items():
        row = {'origin':'synthetic', 'event': dict(EVENT), 'model': dict(registry[name]['model']),
               'market':'FULL_TIME_1X2', 'settlement_scope':'regulation_time', 'outcome_order':list(contract.OUTCOMES),
               'probabilities':vector, 'created_at':CREATED, 'frozen_at':FROZEN, 'input_cutoff':OBS,
               'input_receipts':copy.deepcopy(receipts), 'market_observation':{'state':'unavailable','value':None}}
        row['record_id'] = contract.forecast_id(row)
        forecasts.append(seal(row))
    return {'schema_version':1, 'origin':'synthetic', 'event':dict(EVENT), 'input_utf8':input_bytes,
            'input_sha256':digest(input_bytes), 'observed_at':OBS, 'input_cutoff':OBS,
            'forecasts':{'schema_version':1, 'kind':capture.evaluator.FORECAST_KIND, 'records':forecasts}}


def sealed_capture(packet, recorded=RECORDED):
    raw = text(packet)
    return operation('capture', recorded, {'packet_utf8':raw, 'freeze':{
        'status':'synthetic_test_attestation', 'observed_at':ATTESTED, 'packet_sha256':digest(raw),
        'provenance':provenance('freeze')}})


def outcome_set(score=(2,1), disagree=False, previous=None, review=True):
    body = {'event':dict(EVENT), 'supersedes_sha256':previous}
    receipts = [seal({'receipt_id':f'receipt-{i}', 'origin':'synthetic',
        'event':{**EVENT,'namespace':f'synthetic-provider-{i}','id':f'fixture-{i}'},
        'provider':f'synthetic-provider-{i}', 'acquisition_lineage':f'synthetic-lineage-{i}',
        'status':'final', 'settlement_scope':'regulation_time',
        'score':{'state':'known','value':list(score) if not (disagree and i==2) else [1,1]},
        'observed_at':'2026-11-30T22:00:00Z', 'retrieved_at':'2026-12-01T07:00:00Z',
        'provenance':provenance(f'outcome-{i}')}) for i in (1,2)]
    body['receipts'] = {'schema_version':1, 'kind':capture.evaluator.OUTCOME_KIND, 'records':receipts}
    body['review'] = ({'event':dict(EVENT), 'outcome_sha256':[row['content_sha256'] for row in receipts],
                       'reviewed_at':'2026-12-01T08:00:00Z', 'provenance':provenance('review'),
                       'decision':'exact_fixture_and_independent_sources_reviewed'} if review else None)
    return operation('outcomes', AFTER, body)


class ShadowCaptureTests(unittest.TestCase):
    def setUp(self):
        self.registry = capture.candidates.registry()
        self.runtime = fixture_runtime()

    def state(self, captured=False):
        state = capture.Lifecycle(self.registry, self.runtime)
        state.apply(scheduled(), '1' * 64)
        if captured:
            state.apply(sealed_capture(capture_packet(self.registry, self.runtime)), '2' * 64)
        return state

    def phase(self, state, at):
        report = capture.report(state, capture.instant(at), '0' * 64)
        self.assertEqual(report['eligible_real_captures'], 0)
        self.assertEqual(report['eligible_real_outcomes'], 0)
        self.assertNotIn('scores', report)
        return report['synthetic_events'][0]

    def test_full_synthetic_lifecycle_and_append_only_correction(self):
        self.assertEqual(self.phase(self.state(), SCHEDULE)['state'], 'scheduled')
        self.assertEqual(self.phase(self.state(), AFTER)['reason'], 'missing_or_late_capture')
        state = self.state(captured=True)
        self.assertEqual(self.phase(state, RECORDED)['state'], 'captured')
        self.assertEqual(self.phase(state, AFTER)['state'], 'pending_outcome_review')
        state.apply(outcome_set(review=False), '3' * 64)
        self.assertEqual(self.phase(state, AFTER)['reason'], 'missing_reviewed_fixture_link')
        state.apply(outcome_set(previous='3' * 64), '4' * 64)
        self.assertEqual(self.phase(state, AFTER)['state'], 'adjudicated')
        correction = operation('exclude', AFTER, {'event':dict(EVENT), 'supersedes_sha256':'4' * 64,
                                                 'reason':'synthetic correction'})
        state.apply(correction, '5' * 64)
        self.assertEqual(self.phase(state, AFTER)['state'], 'excluded')
        self.assertIsNotNone(state.events[('synthetic', 'target')]['capture'])

    def test_late_ambiguous_or_tampered_capture(self):
        packet = capture_packet(self.registry, self.runtime)
        late = sealed_capture(packet, EVENT['starts_at'])
        ambiguous = sealed_capture(packet, '2026-11-29T12:04:00')
        tampered = sealed_capture(packet)
        tampered['body']['packet_utf8'] += ' '
        for candidate, reason in ((late, 'late'), (ambiguous, 'UTC offset'), (tampered, 'digest mismatch')):
            with self.subTest(reason=reason), self.assertRaisesRegex(ValueError, reason):
                self.state().apply(candidate, '2' * 64)

    def test_config_and_probability_changes_are_rejected_even_when_resealed(self):
        for mode, reason in (('configuration','candidate identity'), ('probability','fixed calculation')):
            packet = capture_packet(self.registry, self.runtime)
            row = packet['forecasts']['records'][0]
            if mode == 'configuration':
                row['model']['configuration_sha256'] = 'a' * 64
                row['record_id'] = contract.forecast_id(row)
            else:
                row['probabilities'] = [.2,.3,.5]
            seal(row)
            with self.subTest(mode=mode), self.assertRaisesRegex(ValueError, reason):
                self.state().apply(sealed_capture(packet), '2' * 64)

    def test_missing_input_models_and_reviewed_proof(self):
        for key, reason in (('input_utf8','schema'), ('forecasts','schema')):
            packet = capture_packet(self.registry, self.runtime)
            del packet[key]
            with self.assertRaisesRegex(ValueError, reason):
                self.state().apply(sealed_capture(packet), '2' * 64)
        packet = capture_packet(self.registry, self.runtime)
        packet['forecasts']['records'].pop()
        with self.assertRaisesRegex(ValueError, 'each frozen candidate'):
            self.state().apply(sealed_capture(packet), '2' * 64)
        request = sealed_capture(capture_packet(self.registry, self.runtime))
        request['body']['freeze']['status'] = 'self_claimed'
        with self.assertRaisesRegex(ValueError, 'freeze authority unavailable'):
            self.state().apply(request, '2' * 64)

    def test_duplicate_or_changed_fixture_cannot_be_recaptured(self):
        packet = capture_packet(self.registry, self.runtime)
        with self.assertRaisesRegex(ValueError, 'duplicate capture'):
            self.state(captured=True).apply(sealed_capture(packet), '3' * 64)
        with self.assertRaisesRegex(ValueError, 'duplicate or changed schedule'):
            self.state().apply(scheduled({**EVENT,'id':'alias','starts_at':'2026-12-02T20:00:00Z'}), '2' * 64)
        packet['event']['starts_at'] = '2026-12-01T20:00:00Z'
        with self.assertRaisesRegex(ValueError, 'changed fixture identity'):
            self.state().apply(sealed_capture(packet), '2' * 64)

    def test_conflict_cannot_be_dropped_by_supersession(self):
        state = self.state(captured=True)
        state.apply(outcome_set(disagree=True), '3' * 64)
        self.assertEqual(self.phase(state, AFTER)['reason'], 'conflicting_regulation_scores')
        with self.assertRaisesRegex(ValueError, 'erase prior outcome'):
            state.apply(outcome_set(previous='3' * 64), '4' * 64)

    def test_journal_preserves_exact_bytes_and_detects_head_or_file_changes(self):
        with TemporaryDirectory(prefix='paper lifecycle ') as folder:
            path = Path(folder) / 'capture'
            raw = (text(scheduled()) + '\n').encode()
            state = capture.Lifecycle(self.registry, self.runtime)
            head = journal.append(path, state, raw)
            entry = path / '00000001.json'
            first = entry.read_bytes()
            self.assertEqual(evidence.decode(first)['operation_utf8'].encode(), raw)
            with self.assertRaisesRegex(ValueError, 'duplicate'):
                journal.append(path, capture.Lifecycle(self.registry, self.runtime), raw)
            self.assertEqual(entry.read_bytes(), first)
            with self.assertRaisesRegex(ValueError, 'head pin'):
                journal.load(path, capture.Lifecycle(self.registry, self.runtime), '0' * 64)
            entry.write_bytes(first + b' ')
            with self.assertRaisesRegex(ValueError, 'exact bytes changed'):
                journal.load(path, capture.Lifecycle(self.registry, self.runtime), head)
        with self.assertRaisesRegex(ValueError, 'outside the project'):
            journal.journal_path(journal.ROOT / 'prediction-ledger.json')

    def test_registry_content_and_real_gate_fail_closed(self):
        with TemporaryDirectory(prefix='changed candidate registry ') as folder:
            path = Path(folder)
            content = (capture.candidates.DIRECTORY / 'candidates.json').read_bytes()
            (path / 'candidates.json').write_bytes(content + b' ')
            with self.assertRaisesRegex(ValueError, 'registry SHA-256 mismatch'):
                capture.candidates.registry(path)
        op = scheduled()
        op['body']['origin'] = 'prospective'
        with self.assertRaisesRegex(ValueError, 'NOT READY'):
            capture.Lifecycle(self.registry, self.runtime).apply(op, '0' * 64)

    def test_same_day_history_and_changed_input_bytes_are_rejected(self):
        entry = inputs()
        row = entry['results'][-1]
        row['event']['starts_at'] = EVENT['starts_at']
        row['observed_at'] = AFTER
        with self.assertRaisesRegex(ValueError, 'earlier UTC date'):
            capture.history(text(entry), EVENT, CUTOFF)
        packet = capture_packet(self.registry, self.runtime)
        packet['input_utf8'] += '\n'
        with self.assertRaisesRegex(ValueError, 'complete input hash mismatch'):
            self.state().apply(sealed_capture(packet), '2' * 64)

    def test_nonfinal_and_unrelated_outcome_packets(self):
        state = self.state(captured=True)
        after = outcome_set(review=False)
        records = after['body']['receipts']['records']
        for item in records:
            item['status'] = 'postponed'
            seal(item)
        state.apply(after, '3' * 64)
        self.assertEqual(self.phase(state, AFTER)['reason'], 'outcome_postponed')
        after = outcome_set(review=False)
        target = after['body']['receipts']['records'][0]
        target['event']['away'] = 'Unrelated Away'
        seal(target)
        with self.assertRaisesRegex(ValueError, 'unrelated'):
            self.state(captured=True).apply(after, '3' * 64)

    def test_locked_journal_does_not_write(self):
        with TemporaryDirectory(prefix='locked paper journal ') as folder:
            path = Path(folder)
            (path / '.writer').mkdir()
            with self.assertRaises(FileExistsError):
                journal.append(path, capture.Lifecycle(self.registry, self.runtime), text(scheduled()).encode())
            self.assertEqual(sorted(p.name for p in path.iterdir()), ['.writer'])

    def test_resealed_subpicounit_forecast_edit_is_not_a_fixed_output(self):
        packet = capture_packet(self.registry, self.runtime)
        row = packet['forecasts']['records'][0]
        row['probabilities'][0] -= 1e-13
        row['probabilities'][1] += 1e-13
        seal(row)
        with self.assertRaisesRegex(ValueError, 'fixed calculation'):
            self.state().apply(sealed_capture(packet), '2' * 64)
