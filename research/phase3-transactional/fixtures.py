"""Synthetic input generator and subprocess entry point for acceptance tests."""
import argparse
from datetime import datetime, timedelta, timezone
import os
from pathlib import Path
import sys

from ledger import Ledger, protocol
from scheduler import FixtureScheduler

FIXTURE_NOW = datetime(2026, 12, 1, 12, tzinfo=timezone.utc)
CRASH_EXIT = 86


class FixtureClock:
    def __init__(self, now=FIXTURE_NOW):
        self.wall = now
        self.counter = 0

    def __call__(self):
        self.counter += 1
        return self.wall, self.counter

    def advance(self, seconds):
        self.wall = protocol.stamp(self.wall.isoformat()) + timedelta(seconds=seconds)


def race(race_id='fixture-one', *, at=FIXTURE_NOW, start=None, seen=None, revision='conditions-1'):
    generated = at - timedelta(minutes=1)
    start = start or at + timedelta(hours=1)
    end = min(protocol.london_date(generated), protocol.london_date(start))
    row = dict(model='CONTEXT_FORM_RESEARCH_V1', parameters=protocol.ORIGINAL_PARAMETERS,
               race_id=race_id, run_type='FLAT', racecourse='Synthetic course',
               startUTC=start.isoformat(), generated_at_utc=generated.isoformat(),
               runner_observed_at_utc=(seen or at - timedelta(minutes=2)).isoformat(),
               runner_source_sha256='1'*64, context_signature=revision,
               active_runner_count=2, runners=[], challenge_eligible=0, **protocol.GUARDS)
    for position, horse in enumerate(('horse-a', 'horse-b'), 1):
        history = [
            dict(race_id=f'past-{horse}-{age}', date=(end - timedelta(days=age)).isoformat(),
                 run_type='FLAT', field_size=2, position=position, outcome='NUMERIC_FINISH',
                 finish_percentile=2-position, recency_weight=2**(-age/90),
                 similarities={'distance':0, 'going':0, 'course':0, 'class':0})
            for age in (14, 28, 42)
        ]
        row['runners'].append(dict(horse_id=horse, context_features={'history': history}))
    for runner, prediction in zip(row['runners'], protocol.raw_probabilities(row, protocol.BASE)):
        runner['model_probability'] = prediction
    return row | {'record_sha256': protocol.unsigned_digest(row)}


def envelope(*races, at=FIXTURE_NOW, generated=None, seen=None):
    return dict(model='CONTEXT_FORM_RESEARCH_V1', generated_at_utc=(generated or at).isoformat(),
                forecasts=list(races), skipped=[], current_field_checks={
                    row['record_sha256']: dict(status='FRESH_MATCHING_FIELD_AND_CONTEXT',
                                               checked_at_utc=at.isoformat(),
                                               runner_observed_at_utc=(seen or at-timedelta(minutes=2)).isoformat(),
                                               active_runner_ids=['horse-a', 'horse-b'],
                                               context_signature=row['context_signature'])
                    for row in races
                }, **protocol.GUARDS)


def single_fixture():
    return envelope(race())


def batch_fixture():
    return envelope(race(), race('fixture-two'))


def scheduler_for(ledger, feed_for_slot=lambda _slot: batch_fixture(), *, first=FIXTURE_NOW, count=1):
    return FixtureScheduler(ledger, first, period=timedelta(seconds=10), grace=timedelta(seconds=5),
                            count=count, feed_for_slot=feed_for_slot)


def worker_main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('root', type=Path)
    parser.add_argument('mode', choices=('intake', 'schedule'))
    parser.add_argument('--fault')
    parser.add_argument('--offset', type=float, default=0)
    args = parser.parse_args()
    clock = FixtureClock()
    clock.advance(args.offset)

    def inject(point):
        if point == args.fault:
            os._exit(CRASH_EXIT)

    ledger = Ledger(args.root, sys.stdin.read(65), clock=clock, fault=inject)
    if args.mode == 'schedule':
        scheduler_for(ledger).run(ticks=1)
    else:
        ledger.intake(single_fixture())


if __name__ == '__main__':
    worker_main()
