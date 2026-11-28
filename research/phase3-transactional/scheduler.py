"""Bounded automatic slot runner for synthetic fixture acceptance."""
from datetime import timedelta
from time import sleep

from ledger import ClockGuard, protocol, sqlite_writer


class FixtureScheduler:
    def __init__(self, ledger, first, *, period, grace, count, feed_for_slot):
        if first.utcoffset() is None or not timedelta(0) < grace <= period or not 1 <= count <= 128:
            raise ValueError('INVALID_FIXTURE_SCHEDULE')
        self.ledger = ledger
        self.grace = grace
        first = protocol.stamp(first.isoformat())
        self.slots = [first + index * period for index in range(count)]
        self.feed_for_slot = feed_for_slot
        pin = protocol.sha({'slots': [point.isoformat() for point in self.slots],
                            'grace_seconds': grace.total_seconds()})
        with sqlite_writer(ledger.path) as db:
            db.execute("INSERT OR IGNORE INTO state VALUES ('schedule_sha', ?)", (pin,))
            previous = db.execute("SELECT value FROM state WHERE name='schedule_sha'").fetchone()['value']
            protocol.require(previous == pin, 'SCHEDULE_CONFIG_CHANGED')

    def tick(self):
        """Serialise invocations without coupling pair commits to the slot lock."""
        with sqlite_writer(self.ledger.root / 'scheduler-lock.sqlite'):
            for slot in self.slots:
                status = self._begin(slot)
                if status != 'STARTED':
                    continue
                self.ledger.fault('after_slot_started')
                try:
                    key = slot.isoformat()
                    feed = self.ledger.pinned_feed(key)
                    if feed is None:
                        feed = self.feed_for_slot(slot)
                    self.ledger.intake(feed, slot=key)
                except protocol.ResearchError as exc:
                    # Unsafe clocks stay fail-closed. A future safe tick can recover
                    # the STARTED slot without using its scheduled time for capture.
                    self._complete(slot, 'REJECTED_FEED', str(exc))
                else:
                    self.ledger.fault('before_slot_complete')
                    self._complete(slot, 'DONE', None)
                self.ledger.fault('after_slot_complete')

    def _begin(self, slot):
        key = slot.isoformat()
        with sqlite_writer(self.ledger.path) as db:
            previous = db.execute('SELECT status FROM slots WHERE slot_utc=?', (key,)).fetchone()
            if previous and previous['status'] != 'STARTED':
                return previous['status']
            clock = ClockGuard(db, self.ledger.sample)
            now = clock.now()
            clock.persist()
            if now < slot:
                return 'FUTURE'
            if now - slot >= self.grace:
                status = 'INTERRUPTED_EXPIRED' if previous else 'MISSED'
                db.execute("""INSERT INTO slots VALUES (?,?,?,NULL,0,?,NULL)
                              ON CONFLICT(slot_utc) DO UPDATE SET status=excluded.status,
                              observed_utc=excluded.observed_utc, reason=excluded.reason""",
                           (key, status, now.isoformat(), 'SLOT_GRACE_ELAPSED'))
            else:
                status = 'STARTED'
                db.execute("""INSERT INTO slots VALUES (?,?,?,?,1,NULL,NULL)
                              ON CONFLICT(slot_utc) DO UPDATE SET attempts=attempts+1,
                              observed_utc=excluded.observed_utc""",
                           (key, status, now.isoformat(), now.isoformat()))
                self.ledger.fault('after_slot_start_write')
            return status

    def _complete(self, slot, status, reason):
        with sqlite_writer(self.ledger.path) as db:
            clock = ClockGuard(db, self.ledger.sample)
            now = clock.now()
            db.execute('UPDATE slots SET status=?, observed_utc=?, reason=? WHERE slot_utc=?',
                       (status, now.isoformat(), reason, slot.isoformat()))
            clock.persist()
            self.ledger.fault('after_slot_status_write')

    def run(self, *, ticks, poll_seconds=0.1, wait=sleep):
        """Automatically poll configured slots. All clocks and feeds are fixture-scoped."""
        if not 1 <= ticks <= 128 or not 0 < poll_seconds <= 60:
            raise ValueError('INVALID_FIXTURE_POLL')
        for index in range(ticks):
            if index:
                wait(poll_seconds)
            self.tick()
