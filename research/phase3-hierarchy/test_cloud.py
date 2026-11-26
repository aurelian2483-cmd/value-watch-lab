"""Wall-clock execution of the existing scheduler in a disposable runner."""
from datetime import datetime, timedelta, timezone
from pathlib import Path
import sys
import unittest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]/'phase3-transactional'))
from fixtures import envelope, race
from ledger import Ledger, sqlite_writer, workspace
from scheduler import FixtureScheduler


class CloudTimerTest(unittest.TestCase):
    def test_automatic_wall_clock_slot_with_missed_and_duplicate_invocations(self):
        with workspace() as (root, capability):
            ledger = Ledger(root, capability)
            origin = datetime.now(timezone.utc)
            missed = origin-timedelta(seconds=10)
            scheduled = origin+timedelta(seconds=1)

            def feed(slot):
                self.assertGreaterEqual(datetime.now(timezone.utc),slot)
                return envelope(race('fixture-cloud-timer',at=slot),at=slot)

            scheduler = FixtureScheduler(ledger, missed, period=timedelta(seconds=11),
                                         grace=timedelta(seconds=8), count=2, feed_for_slot=feed)
            scheduler.run(ticks=3,poll_seconds=0.72)
            scheduler.run(ticks=1)
            with sqlite_writer(ledger.path) as connection:
                results = connection.execute('SELECT * FROM slots ORDER BY slot_utc').fetchall()
                self.assertEqual([row['status'] for row in results],['MISSED','DONE'])
                self.assertEqual([row['attempts'] for row in results],[0,1])
                self.assertGreaterEqual(datetime.fromisoformat(results[1]['observed_utc']),scheduled)
            self.assertEqual(len(ledger.snapshot()['forecasts']),1)


if __name__ == '__main__':
    unittest.main()
