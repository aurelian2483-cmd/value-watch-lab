"""Offline QA backup and isolated restore. Never replace an active controller database."""
import hashlib
import os
import sqlite3
from pathlib import Path
from controller import HEX, need

MAX_BACKUP_BYTES=16*1024*1024

def digest(path):
    path=Path(path)
    need(path.is_file() and not path.is_symlink(),"Regular file required")
    need(0<path.stat().st_size<=MAX_BACKUP_BYTES,"Backup size out of bounds")
    return hashlib.sha256(path.read_bytes()).hexdigest()

def open_ro(path):
    return sqlite3.connect(Path(path).resolve().as_uri()+"?mode=ro",uri=True,timeout=10)

def validate(db):
    need(db.execute("PRAGMA integrity_check").fetchall()==[("ok",)],"Database integrity failed")
    need(not db.execute("PRAGMA foreign_key_check").fetchall(),"Foreign key check failed")
    tables={r[0] for r in db.execute("SELECT name FROM sqlite_master WHERE type='table'")}
    need(tables=={"jobs","events","clock","service_policy","revoked_roles"},"Unexpected schema")
    need(db.execute("SELECT COUNT(*) FROM service_policy WHERE id=1").fetchone()[0]==1,"Missing policy")
    need(db.execute("SELECT COUNT(*) FROM clock WHERE id=1").fetchone()[0]==1,"Missing clock")
    need(db.execute("SELECT COUNT(*) FROM jobs").fetchone()[0]<=300,"Queue capacity exceeded")

def new_file(path):
    path=Path(path)
    fd=os.open(path,os.O_WRONLY|os.O_CREAT|os.O_EXCL,0o600)
    os.close(fd)
    return path

def backup(source,destination):
    """SQLite consistent copy into a new file; caller retains returned hash separately."""
    source=Path(source)
    need(source.is_file() and not source.is_symlink(),"Regular source required")
    target=new_file(destination)
    try:
        src=open_ro(source)
        try:
            dst=sqlite3.connect(target)
            try:
                src.backup(dst)
                validate(dst)
            finally:
                dst.close()
        finally:
            src.close()
        return digest(target)
    except BaseException:
        target.unlink(missing_ok=True)
        raise

def restore_isolated(source,destination,expected_sha):
    """Verify exact input bytes and write a separate candidate, not a live restore."""
    need(isinstance(expected_sha,str) and HEX.fullmatch(expected_sha),"Invalid anchor")
    source=Path(source)
    need(source.is_file() and not source.is_symlink(),"Regular backup required")
    need(0<source.stat().st_size<=MAX_BACKUP_BYTES,"Backup size out of bounds")
    raw=source.read_bytes()
    need(len(raw)<=MAX_BACKUP_BYTES and hashlib.sha256(raw).hexdigest()==expected_sha,"Backup digest mismatch")
    target=new_file(destination)
    try:
        with target.open("wb") as f:
            f.write(raw)
            f.flush()
            os.fsync(f.fileno())
        db=open_ro(target)
        try:
            validate(db)
        finally:
            db.close()
        return digest(target)
    except BaseException:
        target.unlink(missing_ok=True)
        raise
