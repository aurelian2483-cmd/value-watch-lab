import datetime as dt
import subprocess
import sys
import unittest
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'scripts'))
from horse_refresh_session import requested_cycles, run_session


class ActiveHorseSessionTests(unittest.TestCase):
    def test_only_explicit_dispatch_or_repair_marker_enables_multiple_cycles(self):
        self.assertEqual(requested_cycles('push', {'head_commit': {'message': 'repair [active-racing-refresh]'}}), 6)
        self.assertEqual(requested_cycles('push', {'head_commit': {'message': 'ordinary change'}}), 1)
        self.assertEqual(requested_cycles('workflow_run', {'inputs': {'active_cycles': '6'}}), 1)
        self.assertEqual(requested_cycles('workflow_dispatch', {'inputs': {'active_cycles': '3'}}), 3)
        for n in ['7', '0', 'bad', None]:
            with self.assertRaises(ValueError):requested_cycles('workflow_dispatch', {'inputs': {'active_cycles': n}})

    def session(self, start_hour=14, cycles=6, fail=False):
        elapsed=[0];calls=[];waits=[]
        start=dt.datetime(2026, 11, 6, start_hour, tzinfo=dt.timezone.utc)
        def clock():return start+dt.timedelta(seconds=elapsed[0])
        def sleep(seconds):waits.append(seconds);elapsed[0]+=seconds
        def runner(cmd, **options):
            calls.append((elapsed[0], options['env']['HORSE_SESSION_CYCLE'], cmd[:4]))
            if fail:raise subprocess.CalledProcessError(1, cmd)
            elapsed[0]+=30
        count=run_session(cycles, clock=clock, monotonic=lambda:elapsed[0], sleep=sleep, runner=runner)
        return count,calls,waits

    def test_six_cycles_are_twenty_minutes_apart_and_uniquely_archived(self):
        count,calls,waits=self.session()
        self.assertEqual(count,6)
        self.assertEqual([c[0] for c in calls],[0,1200,2400,3600,4800,6000])
        self.assertEqual([c[1] for c in calls],[f'cycle-{n:02d}' for n in range(1,7)])
        self.assertTrue(all(c[2]==['timeout', '--signal=TERM', '--kill-after=30s', '600s'] for c in calls))
        self.assertEqual(len(waits),5)

    def test_normal_run_has_no_wait_and_night_does_not_collect(self):
        self.assertEqual(self.session(cycles=1)[2],[])
        self.assertEqual(self.session(start_hour=23)[0],0)
        self.assertEqual(self.session(start_hour=5)[0],0)
        self.assertEqual(self.session(start_hour=21)[0],3)

    def test_source_or_cycle_failure_stops_instead_of_retrying_around_block(self):
        with self.assertRaises(subprocess.CalledProcessError):self.session(fail=True)
