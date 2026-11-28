"""Transactional Phase 3 intake for disposable, synthetic research only."""
from contextlib import contextmanager
from datetime import datetime, timedelta, timezone
from pathlib import Path
from secrets import compare_digest, token_hex
import sqlite3
import sys
from tempfile import TemporaryDirectory, gettempdir
from time import monotonic_ns

REGISTERED = Path(__file__).resolve().parents[1] / 'horse-ab-phase3-master-20261115'
sys.path.insert(0, str(REGISTERED))
import phase3_ab as protocol

PREFIX = 'vw-phase3-transaction-'
RECEIPT_AGE = timedelta(minutes=30)
FEED_AGE = timedelta(hours=2)
CUTOFF = timedelta(minutes=5)
SCHEMA = (
    'CREATE TABLE IF NOT EXISTS state (name TEXT PRIMARY KEY, value TEXT NOT NULL)',
    'CREATE TABLE IF NOT EXISTS feeds (sha TEXT PRIMARY KEY, body BLOB NOT NULL)',
    'CREATE TABLE IF NOT EXISTS sources (sha TEXT PRIMARY KEY, body BLOB NOT NULL)',
    'CREATE TABLE IF NOT EXISTS races (race_id TEXT PRIMARY KEY, start_utc TEXT NOT NULL)',
    """CREATE TABLE IF NOT EXISTS slots (
        slot_utc TEXT PRIMARY KEY, status TEXT NOT NULL CHECK(status IN
        ('STARTED','DONE','MISSED','INTERRUPTED_EXPIRED','REJECTED_FEED')),
        observed_utc TEXT NOT NULL, started_utc TEXT, attempts INTEGER NOT NULL,
        reason TEXT, feed_sha TEXT REFERENCES feeds(sha)
    )""",
    """CREATE TABLE IF NOT EXISTS forecasts (
        sha TEXT PRIMARY KEY,
        source_sha TEXT NOT NULL UNIQUE REFERENCES sources(sha),
        race_id TEXT NOT NULL REFERENCES races(race_id),
        captured_utc TEXT NOT NULL,
        body BLOB NOT NULL,
        FOREIGN KEY(sha) REFERENCES audit(frozen_sha) DEFERRABLE INITIALLY DEFERRED
    )""",
    """CREATE TABLE IF NOT EXISTS audit (
        id INTEGER PRIMARY KEY,
        kind TEXT NOT NULL CHECK(kind IN ('FROZEN','DUPLICATE','REJECTED')),
        race_id TEXT NOT NULL,
        observed_utc TEXT,
        feed_sha TEXT NOT NULL REFERENCES feeds(sha),
        source_sha TEXT NOT NULL REFERENCES sources(sha),
        forecast_sha TEXT REFERENCES forecasts(sha),
        frozen_sha TEXT UNIQUE,
        slot_utc TEXT REFERENCES slots(slot_utc),
        reason TEXT,
        CHECK((kind='FROZEN' AND frozen_sha IS NOT NULL AND frozen_sha IS forecast_sha)
           OR (kind<>'FROZEN' AND frozen_sha IS NULL)),
        CHECK((kind='REJECTED' AND forecast_sha IS NULL AND reason IS NOT NULL)
           OR (kind<>'REJECTED' AND forecast_sha IS NOT NULL AND reason IS NULL))
    )""",
)


@contextmanager
def workspace():
    """Own the database directory across worker restarts, then remove it."""
    with TemporaryDirectory(prefix=PREFIX) as directory:
        root = Path(directory).resolve()
        capability = token_hex(32)
        (root / '.fixture-capability').write_text(capability, encoding='ascii')
        yield root, capability


def fixture_root(root, capability):
    root = Path(root)
    if (root.resolve() != root or root.parent != Path(gettempdir()).resolve()
            or not root.name.startswith(PREFIX) or not root.is_dir()):
        raise ValueError('DISPOSABLE_FIXTURE_REQUIRED')
    marker = root / '.fixture-capability'
    if (not marker.is_file() or marker.is_symlink()
            or not compare_digest(marker.read_text(encoding='ascii'), capability)):
        raise ValueError('DISPOSABLE_FIXTURE_REQUIRED')
    return root


def system_clock():
    return datetime.now(timezone.utc), monotonic_ns()


def no_fault(_stage):
    return None


@contextmanager
def sqlite_writer(path):
    if any(Path(str(path) + suffix).is_symlink() for suffix in ('', '-journal', '-wal', '-shm')):
        raise ValueError('SYMLINK_DATABASE')
    db = sqlite3.connect(path, timeout=15, isolation_level=None)
    try:
        db.row_factory = sqlite3.Row
        db.execute('PRAGMA foreign_keys=ON')
        db.execute('PRAGMA synchronous=EXTRA')
        if db.execute('PRAGMA journal_mode').fetchone()[0] != 'delete':
            raise ValueError('UNEXPECTED_JOURNAL_MODE')
        # Acquire the reader/writer exclusion before sampling the clock. A
        # rollback-journal COMMIT then has no reader lock left to wait for.
        db.execute('BEGIN EXCLUSIVE')
        yield db
        db.commit()
    finally:
        # Closing an open transaction rolls it back after any exception.
        db.close()


class ClockGuard:
    def __init__(self, db, sample):
        self.sample = sample
        self.db = db
        row = db.execute("SELECT value FROM state WHERE name='clock_utc'").fetchone()
        self.latest = protocol.stamp(row['value']) if row else None
        self.counter = None
        self.safe = True

    def now(self):
        wall, counter = self.sample()
        if not isinstance(wall, datetime) or wall.utcoffset() is None or type(counter) is not int:
            self.safe = False
            raise protocol.ResearchError('CAPTURE_CLOCK_INVALID')
        wall = wall.astimezone(timezone.utc)
        if ((self.latest is not None and wall < self.latest)
                or (self.counter is not None and counter < self.counter)):
            self.safe = False
            raise protocol.ResearchError('CAPTURE_CLOCK_MOVED_BACKWARDS')
        self.latest, self.counter = wall, counter
        return wall

    def persist(self):
        if self.latest is not None:
            self.db.execute("INSERT OR REPLACE INTO state VALUES ('clock_utc', ?)", (self.latest.isoformat(),))


def temporal(record, check, generated, now):
    protocol.require(timedelta(0) <= now - generated <= FEED_AGE, 'FEED_STALE_OR_FUTURE')
    protocol.require(now < protocol.stamp(record['startUTC']) - CUTOFF, 'CAPTURE_NOT_PRE_EVENT')
    original = protocol.stamp(record['runner_observed_at_utc'])
    source_generated = protocol.stamp(record['generated_at_utc'])
    protocol.require(original <= now and source_generated <= now, 'SOURCE_CLOCK_IN_FUTURE')
    protocol.require(now - original <= RECEIPT_AGE and now - source_generated <= FEED_AGE,
                     'SOURCE_STALE_AT_AB_CAPTURE')
    checked = protocol.stamp(check.get('checked_at_utc'))
    observed = protocol.stamp(check.get('runner_observed_at_utc'))
    protocol.require(observed <= checked <= now and now - observed <= RECEIPT_AGE,
                     'CURRENT_FIELD_CHECK_STALE_OR_FUTURE')


def check_envelope(feed):
    protocol.require(isinstance(feed, dict) and feed.get('model') == 'CONTEXT_FORM_RESEARCH_V1', 'WRONG_FEED_MODEL')
    protocol.require(all(feed.get(key) == value for key, value in protocol.GUARDS.items())
                     and feed['research_only'] is True and feed['betting_eligible'] is False, 'FEED_GATES_UNSAFE')
    generated = protocol.stamp(feed.get('generated_at_utc'))
    records = feed.get('forecasts')
    protocol.require(isinstance(records, list) and all(isinstance(r, dict) for r in records),
                     'FORECAST_LIST_MISSING')
    ids = [protocol.ident(r.get('race_id')) for r in records]
    protocol.require(all(rid.startswith('fixture-') for rid in ids), 'SYNTHETIC_RACES_REQUIRED')
    protocol.require(len(ids) == len(set(ids)), 'DUPLICATE_FEED_RACE')
    checks, skipped = feed.get('current_field_checks'), feed.get('skipped', [])
    protocol.require(isinstance(checks, dict), 'FIELD_CHECKS_MISSING')
    protocol.require(isinstance(skipped, list)
                     and all(isinstance(row, dict) and isinstance(row.get('reason'), str) for row in skipped),
                     'SKIP_RECORD_INVALID')
    return generated, records, checks


def check_field(record, checks):
    key = record.get('record_sha256')
    check = checks.get(key) if isinstance(key, str) else None
    protocol.require(isinstance(check, dict) and check.get('status') == 'FRESH_MATCHING_FIELD_AND_CONTEXT',
                     'CURRENT_FIELD_NOT_CONFIRMED')
    ids = check.get('active_runner_ids')
    expected = [runner['horse_id'] for runner in record['runners']]
    protocol.require(isinstance(ids, list) and all(isinstance(item, str) for item in ids)
                     and sorted(ids) == expected and check.get('context_signature') == record.get('context_signature'),
                     'CURRENT_FIELD_OR_CONDITIONS_CHANGED')
    return check


class Ledger:
    def __init__(self, root, capability, *, clock=system_clock, fault=no_fault):
        self.root = fixture_root(root, capability)
        self.path = self.root / 'intake.sqlite'
        self.sample, self.fault = clock, fault
        self.registration = protocol.registration(REGISTERED / 'state')
        self.registration_time = protocol.stamp(self.registration['registered_at_utc'])
        identity = protocol.sha(self.registration)
        with sqlite_writer(self.path) as db:
            for statement in SCHEMA:
                db.execute(statement)
            db.execute("INSERT OR IGNORE INTO state VALUES ('registration_sha', ?)", (identity,))
            pin = db.execute("SELECT value FROM state WHERE name='registration_sha'").fetchone()['value']
            protocol.require(pin == identity, 'REGISTRATION_PIN_CHANGED')

    def intake(self, feed, *, slot=None):
        generated, records, checks = check_envelope(feed)
        body = protocol.canon(feed)
        digest = protocol.sha(feed)
        with sqlite_writer(self.path) as db:
            clock = ClockGuard(db, self.sample)
            now = clock.now()
            fresh = timedelta(0) <= now - generated <= FEED_AGE
            if fresh:
                if slot is not None:
                    active = db.execute('SELECT status, feed_sha FROM slots WHERE slot_utc=?', (slot,)).fetchone()
                    protocol.require(active is not None and active['status'] == 'STARTED', 'SCHEDULE_SLOT_NOT_ACTIVE')
                    protocol.require(active['feed_sha'] in (None, digest), 'SCHEDULE_FEED_CHANGED_REQUIRES_REVIEW')
                db.execute('INSERT OR IGNORE INTO feeds VALUES (?, ?)', (digest, body))
                if slot is not None:
                    db.execute('UPDATE slots SET feed_sha=? WHERE slot_utc=?', (digest, slot))
                self.fault('after_feed')
            clock.persist()
        protocol.require(fresh, 'FEED_STALE_OR_FUTURE')
        self.fault('after_feed_commit')
        return [self._accept(row, checks, generated, digest, slot) for row in records]

    def pinned_feed(self, slot):
        with sqlite_writer(self.path) as db:
            row = db.execute("""SELECT feeds.sha, feeds.body FROM feeds JOIN slots
                               ON feeds.sha=slots.feed_sha WHERE slots.slot_utc=?""", (slot,)).fetchone()
            if row is None:
                return None
            feed = protocol.strict_json(row['body'])
            protocol.require(protocol.sha(feed) == row['sha'], 'STORED_OBJECT_CORRUPT')
            return feed

    def _accept(self, row, checks, generated, feed_sha, slot):
        source = protocol.sha(row)
        with sqlite_writer(self.path) as db:
            clock = ClockGuard(db, self.sample)
            db.execute('INSERT OR IGNORE INTO sources VALUES (?, ?)', (source, protocol.canon(row)))
            self.fault('after_source')
            db.execute('SAVEPOINT decision')
            try:
                initial = clock.now()
                protocol.validate_context(row, initial, True, self.registration['excluded_prior_race_ids'],
                                          self.registration_time)
                check = check_field(row, checks)
                temporal(row, check, generated, initial)
                kind, digest = self._freeze(db, clock, row, check, generated, source, feed_sha, slot)
            except protocol.ResearchError as exc:
                db.execute('ROLLBACK TO decision')
                kind, digest = 'REJECTED', None
                seen = clock.latest if clock.safe else None
                self._audit(db, kind, row, seen, feed_sha, source, digest, slot, str(exc))
                reason = str(exc)
            else:
                reason = None
            db.execute('RELEASE decision')
            clock.persist()
        self.fault('after_commit')
        return dict(race_id=row['race_id'], kind=kind, forecast_sha256=digest, reason=reason)

    def _freeze(self, db, clock, row, check, generated, source, feed_sha, slot):
        start = protocol.stamp(row['startUTC']).isoformat()
        race = db.execute('SELECT start_utc FROM races WHERE race_id=?', (row['race_id'],)).fetchone()
        protocol.require(race is None or race['start_utc'] == start, 'SCHEDULE_CHANGED_REQUIRES_REVIEW')
        existing = db.execute('SELECT sha FROM forecasts WHERE source_sha=?', (source,)).fetchone()
        if existing:
            digest = existing['sha']
            kind = 'DUPLICATE'
            accepted = clock.now()
        else:
            baseline = protocol.raw_probabilities(row, protocol.BASE)
            challenger = protocol.raw_probabilities(row, protocol.CHALLENGER)
            self.fault('before_acceptance_clock')
            accepted = clock.now()
            temporal(row, check, generated, accepted)
            pair = dict(schema=1, race_id=row['race_id'], racecourse=row['racecourse'], race_type=row['run_type'],
                        startUTC=start, captured_at_utc=accepted.isoformat(),
                        source_generated_at_utc=row['generated_at_utc'], source_object_sha256=source,
                        source_forecast_sha256=row['record_sha256'],
                        model_bundle_sha256=self.registration['model_bundle_sha256'],
                        protocol_sha256=self.registration['protocol_sha256'],
                        horse_ids=[runner['horse_id'] for runner in row['runners']], A=baseline, B=challenger,
                        independent_timestamp_attested=False, counterfactual=False, **protocol.GUARDS)
            digest = protocol.sha(pair)
            kind = 'FROZEN'
            db.execute('INSERT OR IGNORE INTO races VALUES (?, ?)', (row['race_id'], start))
            self.fault('after_race')
            db.execute('INSERT INTO forecasts VALUES (?, ?, ?, ?, ?)',
                       (digest, source, row['race_id'], accepted.isoformat(), protocol.canon(pair)))
            self.fault('after_forecast')
        self._audit(db, kind, row, accepted, feed_sha, source, digest, slot)
        self.fault('after_audit')
        self.fault('before_commit')
        temporal(row, check, generated, clock.now())
        return kind, digest

    @staticmethod
    def _audit(db, kind, row, observed, feed_sha, source, digest, slot, reason=None):
        db.execute("""INSERT INTO audit
                   (kind,race_id,observed_utc,feed_sha,source_sha,forecast_sha,frozen_sha,slot_utc,reason)
                   VALUES (?,?,?,?,?,?,?,?,?)""",
                   (kind, row['race_id'], observed.isoformat() if observed else None,
                    feed_sha, source, digest, digest if kind == 'FROZEN' else None, slot, reason))

    def snapshot(self):
        with sqlite_writer(self.path) as db:
            if (db.execute('PRAGMA integrity_check').fetchone()[0] != 'ok'
                    or db.execute('PRAGMA foreign_key_check').fetchone() is not None):
                raise ValueError('INCONSISTENT_LEDGER')
            pairs = db.execute('SELECT * FROM forecasts ORDER BY rowid').fetchall()
            audit = db.execute('SELECT * FROM audit ORDER BY id').fetchall()
            slots = db.execute('SELECT * FROM slots ORDER BY slot_utc').fetchall()
            for table in ('sources', 'feeds', 'forecasts'):
                for row in db.execute(f'SELECT sha, body FROM {table}'):
                    protocol.require(protocol.sha(protocol.strict_json(row['body'])) == row['sha'],
                                     'STORED_OBJECT_CORRUPT')
            return dict(forecasts=[protocol.strict_json(row['body']) | {'sha256': row['sha']} for row in pairs],
                        audit=[dict(row) for row in audit], slots=[dict(row) for row in slots])
