"""Consistent local SQLite backup and integrity probes for disposable ledgers."""
from contextlib import closing
import os
from pathlib import Path
import sqlite3
from tempfile import NamedTemporaryFile
from time import monotonic

from qualification import fixture_root, no_fault, protocol
from stamps import EvidenceError, require, sha

MAX_BACKUP = 64 * 1024 * 1024


def open_read(path):
    require(path.is_file() and not path.is_symlink(), 'BACKUP_SOURCE_UNAVAILABLE')
    db = sqlite3.connect(path.as_uri() + '?mode=ro', uri=True, timeout=3, isolation_level=None)
    db.row_factory = sqlite3.Row
    return db


def inspect(db):
    try:
        db.execute('BEGIN')
        require(db.execute('PRAGMA integrity_check').fetchone()[0] == 'ok'
                and db.execute('PRAGMA foreign_key_check').fetchone() is None, 'SQLITE_INTEGRITY_FAILED')
        for table in ('feeds','sources','forecasts'):
            for row in db.execute(f'SELECT sha, body FROM {table}'):
                require(sha(row['body']) == row['sha'], 'LEDGER_EXACT_BYTES_CORRUPT')
        for item in db.execute("""SELECT f.body, f.race_id, f.captured_utc, f.source_sha,
                                         a.race_id AS audit_race, a.source_sha AS audit_source,
                                         a.observed_utc, s.start_utc
                                  FROM forecasts f
                                  LEFT JOIN audit a ON a.frozen_sha=f.sha
                                  LEFT JOIN races s ON s.race_id=f.race_id"""):
            raw = protocol.strict_json(item['body'])
            require(raw['race_id'] == item['race_id'] == item['audit_race']
                    and raw['captured_at_utc'] == item['captured_utc'] == item['observed_utc']
                    and raw['source_object_sha256'] == item['source_sha'] == item['audit_source']
                    and raw['startUTC'] == item['start_utc'], 'LEDGER_FORECAST_MISMATCH')
        return {table: db.execute(f'SELECT count(*) FROM {table}').fetchone()[0]
                for table in ('forecasts','audit','slots','witness_receipts','outcome_revisions')}
    except (sqlite3.DatabaseError, KeyError, protocol.ResearchError) as exc:
        raise EvidenceError('SQLITE_INTEGRITY_FAILED') from exc
    finally:
        if db.in_transaction:
            db.rollback()


def file_identity(path):
    require(path.is_file() and not path.is_symlink(), 'BACKUP_SOURCE_UNAVAILABLE')
    with path.open('rb') as handle:
        raw = handle.read(MAX_BACKUP+1)
    require(0 < len(raw) <= MAX_BACKUP, 'BACKUP_SIZE_LIMIT')
    return sha(raw), len(raw)


def sync_directory(directory):
    descriptor = os.open(directory, os.O_RDONLY | os.O_DIRECTORY)
    try:
        os.fsync(descriptor)
    finally:
        os.close(descriptor)


def publish(staging, target):
    with staging.open('rb') as handle:
        os.fsync(handle.fileno())
    # Same-directory link atomically refuses to replace an existing target.
    os.link(staging, target)
    sync_directory(target.parent)


def review_backup(root, capability):
    """Recover a manifest if a completed backup link outlived its caller."""
    directory = fixture_root(root, capability)
    target = directory/'backup.sqlite'
    with closing(open_read(target)) as db:
        counts = inspect(db)
    digest, size = file_identity(target)
    with target.open('rb') as handle:
        os.fsync(handle.fileno())
    sync_directory(directory)
    return dict(sha256=digest, bytes=size, counts=counts)


def backup(ledger, capability, *, fault=no_fault):
    root = fixture_root(ledger.root, capability)
    target = root/'backup.sqlite'
    require(not target.exists() and not target.is_symlink(), 'BACKUP_TARGET_EXISTS')
    with NamedTemporaryFile(dir=root, prefix='.backup-', delete=False) as handle:
        staging = Path(handle.name)
    try:
        deadline = monotonic() + 10
        def progress(status, _remaining, _total):
            require(monotonic() < deadline, 'BACKUP_DEADLINE')
            fault('after_backup_copy' if status == sqlite3.SQLITE_DONE else 'during_backup_copy')
        with closing(open_read(ledger.path)) as source, closing(sqlite3.connect(staging)) as dest:
            source.backup(dest, pages=1, progress=progress, sleep=.05)
        with closing(open_read(staging)) as db:
            counts = inspect(db)
        digest, size = file_identity(staging)
        fault('before_backup_publish')
        publish(staging, target)
        return dict(sha256=digest, bytes=size, counts=counts)
    finally:
        staging.unlink(missing_ok=True)


def restore(source_root, source_capability, target_root, target_capability, manifest, *, fault=no_fault):
    source = fixture_root(source_root, source_capability)/'backup.sqlite'
    root = fixture_root(target_root, target_capability)
    target = root/'intake.sqlite'
    require(not target.exists() and not target.is_symlink(), 'RESTORE_TARGET_EXISTS')
    expected = manifest['sha256'], manifest['bytes']
    require(file_identity(source) == expected, 'BACKUP_HASH_MISMATCH')
    with NamedTemporaryFile(dir=root, prefix='.restore-', delete=False) as handle:
        staging = Path(handle.name)
    try:
        with source.open('rb') as incoming:
            raw = incoming.read(MAX_BACKUP+1)
            require((sha(raw), len(raw)) == expected, 'BACKUP_HASH_MISMATCH')
            staging.write_bytes(raw)
        with closing(open_read(staging)) as db:
            require(inspect(db) == manifest['counts'], 'BACKUP_COUNTS_MISMATCH')
        fault('before_restore_publish')
        publish(staging, target)
    finally:
        staging.unlink(missing_ok=True)
