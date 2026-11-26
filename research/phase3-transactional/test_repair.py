"""Acceptance regressions for the disposable transactional Phase 3 intake."""
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timedelta, timezone
from pathlib import Path
import sqlite3
import subprocess
import sys
from threading import Barrier, Event
import unittest
from zoneinfo import ZoneInfo

from fixtures import (CRASH_EXIT, FIXTURE_NOW, FixtureClock, batch_fixture, envelope,
                      race, scheduler_for, single_fixture)
from ledger import Ledger, REGISTERED, protocol, sqlite_writer, system_clock, workspace


HERE = Path(__file__).resolve().parent
FIXTURE_COMMAND = [sys.executable, str(HERE / 'fixtures.py')]
INTAKE_BOUNDARIES = ('after_feed', 'after_feed_commit', 'after_source', 'after_race', 'after_forecast',
                     'after_audit', 'before_commit', 'after_commit')
SCHEDULE_BOUNDARIES = ('after_slot_start_write', 'after_slot_started', 'after_feed_commit', 'after_commit',
                       'before_slot_complete', 'after_slot_status_write', 'after_slot_complete')


class RepairTests(unittest.TestCase):
    def setUp(self):
        self.root, self.capability = self.enterContext(workspace())
        self.clock = FixtureClock()
        self.ledger = self.open()

    def open(self, **options):
        return Ledger(self.root, self.capability, clock=self.clock, **options)

    def worker(self, mode, stage=None, *, offset=0):
        args = [self.root.as_posix(), mode, '--offset', str(offset)]
        if stage:
            args += ['--fault', stage]
        process = subprocess.run(FIXTURE_COMMAND+args, input=self.capability, text=True,
                                 capture_output=True, timeout=20)
        self.assertEqual(process.returncode, CRASH_EXIT if stage else 0, process.stderr)

    def assert_consistent(self, frozen, **counts):
        state = self.open().snapshot()
        self.assertEqual(len(state['forecasts']), frozen)
        written = [row for row in state['audit'] if row['kind'] == 'FROZEN']
        self.assertEqual({row['forecast_sha'] for row in written}, {row['sha256'] for row in state['forecasts']})
        self.assertEqual(len(written), frozen)
        for kind, total in counts.items():
            self.assertEqual(sum(row['kind'] == kind for row in state['audit']), total)
        return state

    def test_registered_location_and_invalid_capability_are_rejected(self):
        for location, token in ((REGISTERED/'state', self.capability), (self.root, 'wrong')):
            with self.assertRaisesRegex(ValueError, 'DISPOSABLE_FIXTURE_REQUIRED'):
                Ledger(location, token)
        with self.assertRaisesRegex(protocol.ResearchError, 'SYNTHETIC_RACES_REQUIRED'):
            self.ledger.intake(envelope(race('live-example')))

    def test_sql_forecast_audit_constraint_and_source_uniqueness(self):
        self.ledger.intake(single_fixture())
        with self.assertRaises(sqlite3.IntegrityError), sqlite_writer(self.ledger.path) as db:
            db.execute("DELETE FROM audit WHERE kind='FROZEN'")
        with self.assertRaises(sqlite3.IntegrityError), sqlite_writer(self.ledger.path) as db:
            db.execute("""INSERT INTO forecasts SELECT ?,source_sha,race_id,captured_utc,body
                          FROM forecasts""", ('duplicate',))
        self.assert_consistent(1)

    def test_duplicate_retry_and_revision_match_frozen_model(self):
        row = race()
        first = self.ledger.intake(envelope(row))[0]
        self.clock.advance(1)
        again = self.open().intake(envelope(row))[0]
        self.assertEqual(again['kind'], 'DUPLICATE')
        self.assertEqual(first['forecast_sha256'], again['forecast_sha256'])
        changed = self.ledger.intake(envelope(race(revision='conditions-2')))[0]
        self.assertEqual(changed['kind'], 'FROZEN')
        self.assertNotEqual(changed['forecast_sha256'], first['forecast_sha256'])
        late_retry = self.open().intake(envelope(row))[0]
        self.assertEqual(late_retry['forecast_sha256'], first['forecast_sha256'])
        state = self.assert_consistent(2, DUPLICATE=2)
        original = state['forecasts'][0]
        self.assertEqual(original['captured_at_utc'], FIXTURE_NOW.isoformat())
        self.assertEqual(original['A'], protocol.raw_probabilities(row, protocol.BASE))
        self.assertEqual(original['B'], protocol.raw_probabilities(row, protocol.CHALLENGER))
        self.assertFalse(original['independent_timestamp_attested'])
        self.assertEqual(original['publication_gate'], 'BLOCKED')

    def test_six_simultaneous_writers_submit_one_input(self):
        readers = 6
        ready = Barrier(readers, timeout=10)

        def work(_index):
            ledger = Ledger(self.root, self.capability, clock=FixtureClock())
            ready.wait()
            return ledger.intake(single_fixture())[0]['kind']

        with ThreadPoolExecutor(readers) as workers:
            kinds = list(workers.map(work, range(readers)))
        self.assertEqual(kinds.count('FROZEN'), 1)
        self.assert_consistent(1, DUPLICATE=readers-1)

    def test_independent_writer_processes_share_one_input_identity(self):
        with ThreadPoolExecutor(4) as workers:
            list(workers.map(lambda _index: self.worker('intake'), range(4)))
        self.assert_consistent(1, DUPLICATE=3)

    def test_conflicting_race_starts_across_writers(self):
        ready = Barrier(2, timeout=10)

        def work(start):
            ledger = Ledger(self.root, self.capability, clock=FixtureClock())
            ready.wait()
            return ledger.intake(envelope(race(start=start)))[0]

        with ThreadPoolExecutor(2) as workers:
            results = list(workers.map(work, (FIXTURE_NOW+timedelta(hours=1), FIXTURE_NOW+timedelta(hours=2))))
        self.assertEqual({result['kind'] for result in results}, {'FROZEN','REJECTED'})
        self.assertIn('SCHEDULE_CHANGED_REQUIRES_REVIEW', {result['reason'] for result in results})
        self.assert_consistent(1, REJECTED=1)

    def test_conflicting_rows_inside_one_feed_are_rejected_before_writes(self):
        with self.assertRaisesRegex(protocol.ResearchError, 'DUPLICATE_FEED_RACE'):
            self.ledger.intake(envelope(race(), race(revision='conditions-2')))
        self.assert_consistent(0, REJECTED=0)

    def test_delayed_batch_refetches_clock_and_rejects_second_pair(self):
        first = race()
        second = race('fixture-two', start=FIXTURE_NOW+timedelta(minutes=5, seconds=2))

        def delay(point):
            if point == 'after_commit':
                self.clock.advance(3)

        results = self.open(fault=delay).intake(envelope(first, second))
        self.assertEqual([(item['kind'], item['reason']) for item in results],
                         [('FROZEN', None), ('REJECTED', 'CAPTURE_NOT_PRE_EVENT')])
        self.assert_consistent(1, REJECTED=1)

    def test_valid_delayed_pairs_keep_separate_collection_times(self):
        def delay(point):
            if point == 'after_commit':
                self.clock.advance(3)

        self.open(fault=delay).intake(batch_fixture())
        pairs = self.assert_consistent(2)['forecasts']
        self.assertEqual([item['captured_at_utc'] for item in pairs],
                         [FIXTURE_NOW.isoformat(), (FIXTURE_NOW+timedelta(seconds=3)).isoformat()])

    def test_expiry_between_forecast_and_commit_rolls_back_pair_and_frozen_event(self):
        row = race(start=FIXTURE_NOW+timedelta(minutes=5, seconds=2))

        def delay(point):
            if point == 'before_commit':
                self.clock.advance(2)

        outcome = self.open(fault=delay).intake(envelope(row))[0]
        self.assertEqual(outcome['reason'], 'CAPTURE_NOT_PRE_EVENT')
        self.assert_consistent(0, REJECTED=1)
        with sqlite_writer(self.ledger.path) as db:
            self.assertEqual(db.execute('SELECT count(*) FROM races').fetchone()[0], 0)

    def test_waiting_for_a_database_reader_does_not_backdate_acceptance(self):
        row = race(start=FIXTURE_NOW+timedelta(minutes=5, seconds=2))
        entered = Event()

        def write():
            entered.set()
            return self.ledger.intake(envelope(row))[0]

        reader = sqlite3.connect(self.ledger.path, isolation_level=None)
        with ThreadPoolExecutor(1) as worker:
            try:
                reader.execute('BEGIN')
                reader.execute('SELECT count(*) FROM state').fetchone()
                result = worker.submit(write)
                self.assertTrue(entered.wait(timeout=5))
                self.assertFalse(result.done())
                self.clock.advance(2)
            finally:
                reader.close()
            self.assertEqual(result.result(timeout=10)['reason'], 'CAPTURE_NOT_PRE_EVENT')
        self.assert_consistent(0, REJECTED=1)

    def test_clock_reversal_between_validation_and_freeze(self):
        def jump(point):
            if point == 'before_acceptance_clock':
                self.clock.advance(-1)

        outcome = self.open(fault=jump).intake(single_fixture())[0]
        self.assertEqual(outcome['reason'], 'CAPTURE_CLOCK_MOVED_BACKWARDS')
        self.assertIsNone(self.assert_consistent(0)['audit'][0]['observed_utc'])

    def test_clock_reversal_after_restart_and_stale_high_water(self):
        self.clock.advance(3*3600)
        with self.assertRaisesRegex(protocol.ResearchError, 'FEED_STALE_OR_FUTURE'):
            self.ledger.intake(single_fixture())
        self.clock.advance(-3*3600)
        with self.assertRaisesRegex(protocol.ResearchError, 'CAPTURE_CLOCK_MOVED_BACKWARDS'):
            self.open().intake(single_fixture())
        self.assert_consistent(0)

    def test_monotonic_clock_reversal_and_forward_receipt_expiry(self):
        def reverse(point):
            if point == 'after_audit':
                self.clock.counter = -100

        result = self.open(fault=reverse).intake(single_fixture())[0]
        self.assertEqual(result['reason'], 'CAPTURE_CLOCK_MOVED_BACKWARDS')

        def advance(point):
            if point == 'after_audit':
                self.clock.advance(29*60)

        result = self.open(fault=advance).intake(single_fixture())[0]
        self.assertEqual(result['reason'], 'SOURCE_STALE_AT_AB_CAPTURE')
        self.assert_consistent(0, REJECTED=2)

    def test_receipt_ages_and_cutoff_with_microsecond_boundaries(self):
        long = timedelta(minutes=30)
        early = FIXTURE_NOW-long
        older = early-timedelta(microseconds=1)
        first = self.ledger.intake(envelope(race(seen=early), seen=early))[0]
        self.assertEqual(first['kind'], 'FROZEN')
        original = self.ledger.intake(envelope(race('fixture-two', seen=older)))[0]
        current = self.ledger.intake(envelope(race('fixture-three'), seen=older))[0]
        cutoff = self.ledger.intake(envelope(race('fixture-four', start=FIXTURE_NOW+timedelta(minutes=5))))[0]
        self.assertEqual([original['reason'], current['reason'], cutoff['reason']],
                         ['SOURCE_STALE_AT_AB_CAPTURE', 'CURRENT_FIELD_CHECK_STALE_OR_FUTURE',
                          'CAPTURE_NOT_PRE_EVENT'])
        self.assert_consistent(1, REJECTED=3)

    def test_london_clock_changes_require_aware_instants(self):
        zone = ZoneInfo('Europe/London')
        autumn = (datetime(2027,10,31,1,59,59,tzinfo=zone,fold=0),
                  datetime(2027,10,31,1,0,0,tzinfo=zone,fold=1))
        for number, value in enumerate(autumn):
            instant = protocol.stamp(value.isoformat())
            self.clock.wall = value
            feed = envelope(race(f'fixture-autumn-{number}', at=instant), at=instant)
            self.assertEqual(self.ledger.intake(feed)[0]['kind'], 'FROZEN')
        accepted = self.assert_consistent(2)['forecasts']
        self.assertEqual([item['captured_at_utc'] for item in accepted],
                         ['2027-10-31T00:59:59+00:00', '2027-10-31T01:00:00+00:00'])
        stamp = datetime(2027,11,1,12)
        self.clock.wall = stamp
        with self.assertRaisesRegex(protocol.ResearchError, 'CAPTURE_CLOCK_INVALID'):
            self.ledger.intake(single_fixture())

    def test_london_spring_gap_and_summer_midnight(self):
        instants = ['2027-03-28T00:59:59Z','2027-03-28T01:00:00Z',
                    '2027-07-01T22:59:59Z','2027-07-01T23:00:00Z']
        for number, stamp in enumerate(instants):
            self.clock.wall = protocol.stamp(stamp)
            row = race(f'fixture-clock-{number}', at=self.clock.wall)
            self.assertEqual(self.ledger.intake(envelope(row, at=self.clock.wall))[0]['kind'], 'FROZEN')
        self.assert_consistent(4)

    def test_hard_process_exit_at_each_intake_persistence_boundary(self):
        for stage in INTAKE_BOUNDARIES:
            with self.subTest(stage=stage):
                self.root, self.capability = self.enterContext(workspace())
                self.ledger = self.open()
                self.worker('intake', stage)
                committed = int(stage == 'after_commit')
                previous = self.assert_consistent(committed)
                self.worker('intake', offset=1)
                reopened = self.assert_consistent(1, DUPLICATE=committed)
                if committed:
                    self.assertEqual(previous['forecasts'], reopened['forecasts'])

    def test_automatic_poll_runs_future_slots_once(self):
        invoked = []
        first = FIXTURE_NOW+timedelta(seconds=5)

        def source(slot):
            invoked.append(slot)
            return envelope(race(f'fixture-auto-{len(invoked)}', at=slot), at=slot)

        auto = scheduler_for(self.ledger, source, first=first, count=2)
        auto.run(ticks=3, wait=lambda _seconds: self.clock.advance(5 if not invoked else 10))
        self.assertEqual(invoked, [first, first+timedelta(seconds=10)])
        state = self.assert_consistent(2)
        self.assertEqual([slot['status'] for slot in state['slots']], ['DONE','DONE'])
        self.assertEqual([row['slot_utc'] for row in state['audit']], [item.isoformat() for item in invoked])

    def test_automatic_poll_with_the_system_utc_clock(self):
        now, monotonic = system_clock()
        self.assertEqual(now.tzinfo, timezone.utc)
        self.assertGreaterEqual(system_clock()[1], monotonic)
        # A hosted regression runner may have a simulated epoch. The synthetic
        # schedule itself still runs against a real UTC and monotonic clock.
        ledger = Ledger(self.root, self.capability, clock=system_clock)
        def source(_slot):
            received = system_clock()[0]
            return envelope(race(at=received), at=received)

        scheduler = scheduler_for(ledger, source, first=now)
        scheduler.run(ticks=2, poll_seconds=.01)
        state = ledger.snapshot()
        self.assertEqual(state['slots'][0]['status'], 'DONE')
        self.assertEqual(state['slots'][0]['attempts'], 1)
        self.assertEqual(len(state['forecasts']), 1)
        captured = protocol.stamp(state['forecasts'][0]['captured_at_utc'])
        self.assertLessEqual(now, captured)
        self.assertLessEqual(captured, system_clock()[0])

    def test_missed_slots_are_recorded_without_backfill(self):
        first = FIXTURE_NOW-timedelta(seconds=20)
        invoked = []
        schedule = scheduler_for(self.ledger, lambda slot: invoked.append(slot) or single_fixture(),
                                 first=first, count=3)
        schedule.run(ticks=1)
        self.assertEqual(invoked, [FIXTURE_NOW])
        self.assertEqual([slot['status'] for slot in self.assert_consistent(1)['slots']],
                         ['MISSED','MISSED','DONE'])

    def test_stale_scheduled_feed_has_explicit_evidence(self):
        older = FIXTURE_NOW-timedelta(hours=3)
        schedule = scheduler_for(self.ledger, lambda slot: envelope(race(), generated=older))
        schedule.run(ticks=1)
        state = self.assert_consistent(0)
        self.assertEqual(state['slots'][0]['status'], 'REJECTED_FEED')
        self.assertEqual(state['slots'][0]['reason'], 'FEED_STALE_OR_FUTURE')

    def test_stale_field_in_fresh_scheduled_feed_has_explicit_evidence(self):
        older = FIXTURE_NOW-timedelta(minutes=31)
        schedule = scheduler_for(self.ledger, lambda slot: envelope(race(), seen=older))
        schedule.run(ticks=1)
        state = self.assert_consistent(0, REJECTED=1)
        self.assertEqual(state['slots'][0]['status'], 'DONE')
        self.assertEqual(state['audit'][0]['reason'], 'CURRENT_FIELD_CHECK_STALE_OR_FUTURE')

    def test_concurrent_scheduler_processes_dispatch_one_slot(self):
        def work(_index):
            self.worker('schedule')

        with ThreadPoolExecutor(4) as workers:
            list(workers.map(work, range(4)))
        state = self.assert_consistent(2, DUPLICATE=0)
        self.assertEqual(len(state['slots']), 1)
        self.assertEqual(state['slots'][0]['attempts'], 1)

    def test_interrupted_scheduler_restores_progress_after_process_restart(self):
        for stage in SCHEDULE_BOUNDARIES:
            with self.subTest(stage=stage):
                self.root, self.capability = self.enterContext(workspace())
                self.ledger = self.open()
                self.worker('schedule', stage)
                before = self.open().snapshot()
                existing = len(before['forecasts'])
                self.assertEqual(existing, {'after_slot_start_write':0, 'after_slot_started':0,
                                           'after_feed_commit':0, 'after_commit':1, 'before_slot_complete':2,
                                           'after_slot_status_write':2, 'after_slot_complete':2}[stage])
                self.worker('schedule', offset=1)
                already_done = stage == 'after_slot_complete'
                state = self.assert_consistent(2, DUPLICATE=0 if already_done else existing)
                self.assertEqual(state['forecasts'][:existing], before['forecasts'])
                first_attempt = stage == 'after_slot_start_write'
                self.assertEqual(state['slots'][0]['attempts'], 1 if already_done or first_attempt else 2)
                self.assertEqual(state['slots'][0]['status'], 'DONE')

    def test_scheduler_recovers_pinned_bytes_without_reacquisition(self):
        self.worker('schedule', 'after_commit')
        key = FIXTURE_NOW.isoformat()
        before = self.assert_consistent(1)['slots'][0]
        self.assertEqual(before['feed_sha'], protocol.sha(batch_fixture()))
        with self.assertRaisesRegex(protocol.ResearchError, 'SCHEDULE_FEED_CHANGED_REQUIRES_REVIEW'):
            self.ledger.intake(envelope(race(revision='wrong-feed')), slot=key)
        self.clock.advance(1)

        def changed_provider(_slot):
            self.fail('Restart must read its pinned acquisition')

        scheduler_for(self.open(), changed_provider).run(ticks=1)
        after = self.assert_consistent(2, DUPLICATE=1)
        self.assertEqual(after['slots'][0]['feed_sha'], before['feed_sha'])
        self.assertEqual({entry['feed_sha'] for entry in after['audit']}, {before['feed_sha']})

    def test_missed_restart_never_backdates_or_drops_a_completed_pair(self):
        self.worker('schedule', 'after_commit')
        original = self.assert_consistent(1)['forecasts']
        self.worker('schedule', offset=5)
        state = self.assert_consistent(1, DUPLICATE=0)
        self.assertEqual(state['slots'][0]['status'], 'INTERRUPTED_EXPIRED')
        self.assertEqual(state['forecasts'], original)
        self.assertEqual(state['slots'][0]['attempts'], 1)


if __name__ == '__main__':
    unittest.main()
