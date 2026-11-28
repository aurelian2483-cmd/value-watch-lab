"""Reproduce Phase 3 infrastructure observations using disposable local fixtures."""
import argparse
from concurrent.futures import ThreadPoolExecutor
from contextlib import contextmanager
from copy import deepcopy
from datetime import datetime, timedelta, timezone
import hashlib
import io
import json
import os
from pathlib import Path
import secrets
import shutil
import subprocess
import sys
from tempfile import TemporaryDirectory, gettempdir
from threading import Barrier
from unittest.mock import patch

PHASE3 = Path(__file__).resolve().parents[1] / 'research' / 'horse-ab-phase3-master-20261115'
sys.path.insert(0, str(PHASE3))
import collect_research as adapter
import phase3_ab as ab


NOW = datetime(2026, 12, 1, 12, tzinfo=timezone.utc)
REF = 'a' * 40
CRASH = 86
TEMP_PREFIX = 'vw-phase3-isolation-'


def record(race='fixture-race-1', start=None, seen=None):
    generated = NOW-timedelta(minutes=1)
    runners = []
    for position, horse in enumerate(('horse-a', 'horse-b'), 1):
        history = [
            dict(race_id=f'past-{horse}-{age}', date=(NOW.date()-timedelta(days=age)).isoformat(),
                 run_type='FLAT', field_size=2, position=position, outcome='NUMERIC_FINISH',
                 finish_percentile=2-position, recency_weight=2**(-age/90),
                 similarities=dict(distance=0, going=0, course=0, **{'class': 0}))
            for age in (14, 28, 42)
        ]
        runners.append(dict(horse_id=horse, context_features={'history': history}))
    row = dict(model='CONTEXT_FORM_RESEARCH_V1', parameters=ab.ORIGINAL_PARAMETERS,
               race_id=race, run_type='FLAT', racecourse='Synthetic course',
               startUTC=(start or NOW+timedelta(hours=1)).isoformat(),
               generated_at_utc=generated.isoformat(),
               runner_observed_at_utc=(seen or NOW-timedelta(minutes=2)).isoformat(),
               runner_source_sha256='1'*64, context_signature='fixture-field',
               active_runner_count=len(runners), runners=runners, challenge_eligible=0, **ab.GUARDS)
    for runner, probability in zip(runners, ab.raw_probabilities(row, ab.BASE)):
        runner['model_probability'] = probability
    return row | {'record_sha256': ab.unsigned_digest(row)}


def feed(*records, at=NOW, current_seen=None):
    return dict(model='CONTEXT_FORM_RESEARCH_V1', generated_at_utc=at.isoformat(), forecasts=list(records),
                current_field_checks={
                    row['record_sha256']: dict(status='FRESH_MATCHING_FIELD_AND_CONTEXT',
                                               checked_at_utc=NOW.isoformat(),
                                               runner_observed_at_utc=(current_seen or NOW-timedelta(minutes=2)).isoformat(),
                                               active_runner_ids=['horse-a', 'horse-b'],
                                               context_signature='fixture-field')
                    for row in records
                }, skipped=[], **ab.GUARDS)


@contextmanager
def disposable():
    with TemporaryDirectory(prefix=TEMP_PREFIX) as directory:
        tree = Path(directory)
        root = tree / 'state'
        (root / 'snapshots').mkdir(parents=True)
        (tree / '.fixture-capability').write_text(secrets.token_hex(32), encoding='ascii')
        spec = ab.load(PHASE3 / 'state' / 'registration.json')['model_bundle_sha256'] + '.json'
        for name in ('PHASE3_PROTOCOL.md', 'state/registration.json', f'state/snapshots/{spec}'):
            shutil.copyfile(PHASE3 / name, tree / name)
        with patch.object(ab, 'ROOT', tree):
            yield root


def failure(action, reason):
    try:
        action()
    except ab.ResearchError as error:
        if str(error) != reason:
            raise
        return reason
    raise AssertionError(f'Expected {reason}')


def acquisition_cases():
    with disposable() as root:
        row = record()
        raw = ab.canon(feed(row))
        data = root.parent/'feed.json'
        receipt = root.parent/'claimed-receipt.json'
        data.write_bytes(raw)
        claimed = dict(repository=adapter.REPOSITORY, path=adapter.FEED_PATH, commit=REF,
                       raw_sha256=hashlib.sha256(raw).hexdigest(), git_blob_sha1=adapter.git_blob_sha1(raw))
        receipt.write_bytes(ab.canon(claimed))
        mismatch = failure(lambda: adapter.acquire('b'*40, data, receipt), 'LOCAL_RECEIPT_IDENTITY_MISMATCH')
        data.write_bytes(raw+b' ')
        tamper = failure(lambda: adapter.acquire(REF, data, receipt), 'LOCAL_RECEIPT_BYTES_MISMATCH')
        data.write_bytes(raw)
        with patch.object(ab, 'utcnow', side_effect=[NOW, NOW-timedelta(seconds=1)]):
            backward = failure(lambda: adapter.collect(root, REF, data, receipt), 'COLLECTION_CLOCK_MOVED_BACKWARDS')
        with patch.object(ab, 'utcnow', side_effect=[NOW, NOW+timedelta(hours=3)]):
            forward = failure(lambda: adapter.collect(root, REF, data, receipt), 'FEED_STALE_OR_FUTURE')
        assert not ab.objects(root, 'forecasts')
        with patch.object(ab, 'utcnow', return_value=NOW):
            captured = adapter.collect(root, REF, data, receipt)
        assert captured['new_paired_forecasts'] == 1
        proof = ab.load(root/'snapshots'/(captured['acquisition_receipt_sha256']+'.json'))
        assert proof['transport'] == 'LOCAL_BYTES_MATCH_SUPPLIED_RECEIPT'
        assert proof['independent_timestamp_attested'] is False
        assert ab.objects(root, 'forecasts')[0][1]['independent_timestamp_attested'] is False
        return dict(commit_mismatch=mismatch, content_tampering=tamper, backward_clock=backward,
                    forward_jump=forward, self_authored_local_fixture_pairs=captured['new_paired_forecasts'],
                    independent_attestation=False)


def boundaries():
    epsilon = timedelta(microseconds=1)
    with disposable() as root:
        def attempt(envelope, at=NOW):
            result = ab.inspect_feed(envelope, root, at)
            return result['capture_failures'][0]['reason'] if result['capture_failures'] else result['new_paired_forecasts']
        fresh_edge = record(seen=NOW-timedelta(minutes=30))
        current_edge = attempt(feed(fresh_edge, current_seen=NOW-timedelta(minutes=30)))
        assert current_edge == 1
        current_expired = attempt(feed(record('exp-current'), current_seen=NOW-timedelta(minutes=30)-epsilon))
        original_expired = attempt(feed(record('exp-original', seen=NOW-timedelta(minutes=30)-epsilon)))
        cutoff = attempt(feed(record('at-cutoff', start=NOW+timedelta(minutes=5))))
        exact_envelope_edge = attempt(feed(record('envelope-edge'), at=NOW-timedelta(hours=2)))
        assert exact_envelope_edge == 1
        expired = failure(lambda: attempt(feed(record(), at=NOW-timedelta(hours=2)-epsilon)), 'FEED_STALE_OR_FUTURE')
        duplicated = failure(lambda: attempt(feed(record(), record())), 'DUPLICATE_FEED_RACE')
        assert current_expired == 'CURRENT_FIELD_CHECK_STALE_OR_FUTURE'
        assert original_expired == 'SOURCE_STALE_AT_AB_CAPTURE'
        assert cutoff == 'CAPTURE_NOT_PRE_EVENT'
        return dict(current_and_original_exact_30_minute_pairs=current_edge, current_one_microsecond_older=current_expired,
                    original_one_microsecond_older=original_expired, cutoff_exactly_five_minutes=cutoff,
                    exact_two_hour_envelope_pairs=exact_envelope_edge, expired_envelope=expired, duplicate_feed=duplicated)


def shared_clock():
    with disposable() as root:
        cutoff = NOW+timedelta(seconds=1)
        rows = [record(f'near-cutoff-{index}', start=cutoff+timedelta(minutes=5)) for index in (1, 2)]
        elapsed = []
        capture = ab.capture

        def slow_capture(row, ledger, passed_time):
            wall = NOW if not elapsed else NOW+timedelta(seconds=2)
            elapsed.append(wall)
            return capture(row, ledger, passed_time)

        with patch.object(ab, 'capture', side_effect=slow_capture):
            summary = ab.inspect_feed(feed(*rows), root, NOW)
        assert elapsed[1] > cutoff and summary['new_paired_forecasts'] == 2
        assert {row['captured_at_utc'] for _, row in ab.objects(root, 'forecasts')} == {NOW.isoformat()}
        return dict(pairs=2, simulated_second_write_after_cutoff=True, shared_capture_timestamp=True)


def duplicates():
    with disposable() as root:
        row = record()
        first, new = ab.capture(row, root, NOW)
        retry, repeated = ab.capture(row, root, NOW+timedelta(seconds=1))
        assert new and not repeated and first == retry
        revised = deepcopy(row)
        revised['context_signature'] = 'changed-fixture-signature'
        revised['record_sha256'] = ab.unsigned_digest(revised)
        second, changed = ab.capture(revised, root, NOW+timedelta(seconds=2))
        assert changed and first != second
        rescheduled = failure(lambda: ab.capture(record(start=NOW+timedelta(hours=2)), root, NOW),
                              'SCHEDULE_CHANGED_REQUIRES_REVIEW')
    with disposable() as root:
        synchronized = Barrier(2, timeout=5)
        read = ab.objects

        def same_empty_view(ledger, kind):
            objects = read(ledger, kind)
            if kind == 'forecasts':
                synchronized.wait()
            return objects

        with patch.object(ab, 'objects', side_effect=same_empty_view), ThreadPoolExecutor(2) as pool:
            tasks = [pool.submit(ab.capture, row, root, NOW+timedelta(seconds=index)) for index in (0, 1)]
            outcomes = [task.result(timeout=10) for task in tasks]
        rows = ab.objects(root, 'forecasts')
        assert len(rows) == 2 and all(created for _, created in outcomes)
        assert len({item['source_object_sha256'] for _, item in rows}) == 1
        return dict(sequential_retry_idempotent=True, distinct_revision_preserved=True,
                    rescheduled=rescheduled, concurrent_same_input_forecast_objects=len(rows))


def child(root, stage, token):
    tree = root.parent
    if (root.name != 'state' or root.resolve() != root or tree.parent != Path(gettempdir()).resolve()
            or not tree.name.startswith(TEMP_PREFIX) or not root.is_dir()):
        raise ValueError('DISPOSABLE_FIXTURE_REQUIRED')
    capability = tree / '.fixture-capability'
    if (not capability.is_file() or capability.is_symlink()
            or not secrets.compare_digest(capability.read_text(encoding='ascii'), token)):
        raise ValueError('DISPOSABLE_FIXTURE_REQUIRED')
    original_store = ab.store_object
    publish_name = 'rename' if os.name == 'nt' else 'link'
    publish = getattr(os, publish_name)

    def stop_after_store(directory, kind, payload):
        digest = original_store(directory, kind, payload)
        if kind == stage:
            os._exit(CRASH)
        return digest

    def stop_before_publish(source, destination, *args, **kwargs):
        if Path(destination).parent.name == 'forecasts':
            os._exit(CRASH)
        return publish(source, destination, *args, **kwargs)

    with patch.object(ab, 'ROOT', tree), patch.object(ab, 'store_object', side_effect=stop_after_store):
        if stage == 'before_publish':
            with patch.object(os, publish_name, side_effect=stop_before_publish):
                ab.capture(record(), root, NOW)
        else:
            ab.capture(record(), root, NOW)
    raise AssertionError('Fault was not reached')


def interruption():
    result = {}
    for stage in ('inputs', 'before_publish', 'forecasts'):
        with disposable() as root:
            process = subprocess.run(
                [sys.executable, str(Path(__file__).resolve()), '--child', str(root.resolve()), stage],
                input=(root.parent/'.fixture-capability').read_bytes(), capture_output=True, timeout=15)
            if process.returncode != CRASH:
                raise AssertionError(process.stderr.decode(errors='replace'))
            committed = len(ab.objects(root, 'forecasts'))
            partial = len(list((root/'forecasts').glob('.partial-*')))
            inputs = len(ab.objects(root, 'inputs'))
            assert inputs == 1 and committed == int(stage == 'forecasts')
            assert partial == int(stage == 'before_publish')
            _, created = ab.capture(record(), root, NOW+timedelta(seconds=1))
            assert created == (stage != 'forecasts') and len(ab.objects(root, 'forecasts')) == 1
            events = sorted(row['event'] for _, row in ab.objects(root, 'events'))
            assert events == (['UNCHANGED_INPUT'] if stage == 'forecasts' else ['PAIRED_FORECAST_FROZEN'])
            result[stage] = dict(child_exit=process.returncode, inputs_at_interruption=inputs,
                                 published_forecasts_at_interruption=committed, temporary_files=partial,
                                 retry_created_forecast=created, events_after_retry=events)
    return result


def acquisition_io():
    response = io.BytesIO(b'x' * 5)
    oversized = failure(lambda: adapter.bounded_read(response, 4), 'INPUT_TOO_LARGE')
    redirect = adapter.NoRedirect().redirect_request(None, None, 302, '', {}, 'https://example.invalid/')
    assert redirect is None
    return dict(oversized_input=oversized, redirect_followed=False)


def child_isolation():
    with disposable() as root:
        try:
            child(root.resolve(), 'forecasts', '')
        except ValueError as error:
            assert str(error) == 'DISPOSABLE_FIXTURE_REQUIRED'
            assert not ab.objects(root, 'forecasts')
            return {'fault_child_without_fixture_capability': 'DISPOSABLE_FIXTURE_REQUIRED'}
    raise AssertionError('The fault child accepted a missing fixture capability')


def run():
    return dict(scope='DISPOSABLE_SYNTHETIC_LEDGER_AUDIT', **ab.GUARDS,
                acquisition=acquisition_cases(), transport_controls=acquisition_io(), freshness=boundaries(),
                shared_batch_clock=shared_clock(), duplicate_control=duplicates(), interruption=interruption(),
                isolation=child_isolation())


def main():
    if len(sys.argv) == 4 and sys.argv[1] == '--child':
        child(Path(sys.argv[2]), sys.argv[3], sys.stdin.read(65))
        return
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('output', type=Path)
    args = parser.parse_args()
    report = run()
    with args.output.open('x', encoding='utf-8') as handle:
        json.dump(report, handle, sort_keys=True, indent=2)
        handle.write('\n')


if __name__ == '__main__':
    main()
