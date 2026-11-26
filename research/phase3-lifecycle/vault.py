"""Policy-bound disposable custody for Phase 3 evidence and transfer bundles."""
from contextlib import contextmanager
from dataclasses import dataclass
from datetime import timedelta
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[1]/'phase3-evidence'))
from qualification import fixture_root, protocol, sqlite_writer
from ledger import ClockGuard, system_clock
from stamps import EvidenceError, require, sha, utc

MAX_BODY = 512 * 1024
MAX_BUNDLE = 8 * 1024 * 1024
KINDS = frozenset({'FORECAST', 'TIMESTAMP', 'REVOCATION', 'RESULT', 'ACQUISITION'})


@dataclass(frozen=True)
class Policy:
    provider: str
    permission: str
    kinds: tuple
    max_age_seconds: int
    valid_until: str
    recipients: tuple

    def __post_init__(self):
        require(self.provider.startswith('fixture-') and self.permission
                and self.kinds and set(self.kinds) <= KINDS and len(set(self.kinds)) == len(self.kinds)
                and type(self.max_age_seconds) is int and 0 < self.max_age_seconds <= 366*24*3600
                and all(isinstance(value, str) and value for value in self.recipients)
                and len(set(self.recipients)) == len(self.recipients), 'INVALID_FIXTURE_POLICY')
        utc(self.valid_until)

    def body(self):
        return dict(provider=self.provider, permission=self.permission, kinds=sorted(self.kinds),
                    max_age_seconds=self.max_age_seconds, valid_until=utc(self.valid_until).isoformat(),
                    recipients=sorted(self.recipients))


SCHEMA = (
    'CREATE TABLE IF NOT EXISTS state (name TEXT PRIMARY KEY, value TEXT NOT NULL)',
    '''CREATE TABLE IF NOT EXISTS items (
        id TEXT PRIMARY KEY, provider TEXT NOT NULL, kind TEXT NOT NULL, sha TEXT NOT NULL,
        received TEXT NOT NULL, expires TEXT NOT NULL, body BLOB, disposed TEXT,
        CHECK((body IS NULL) = (disposed IS NOT NULL))
    )''',
    '''CREATE TABLE IF NOT EXISTS bundles (
        sha TEXT PRIMARY KEY, recipient TEXT NOT NULL, approval TEXT NOT NULL UNIQUE,
        expires TEXT NOT NULL, body BLOB, disposed TEXT,
        CHECK((body IS NULL) = (disposed IS NOT NULL))
    )''',
    '''CREATE TABLE IF NOT EXISTS bundle_items (
        bundle TEXT NOT NULL REFERENCES bundles(sha), item TEXT NOT NULL REFERENCES items(id),
        PRIMARY KEY (bundle,item)
    )''',
    'CREATE TABLE IF NOT EXISTS history (idx INTEGER PRIMARY KEY, sha TEXT NOT NULL UNIQUE, body BLOB NOT NULL)',
)


class Vault:
    def __init__(self, root, capability, policies, custodian, *, clock=system_clock):
        self.root = fixture_root(root, capability)
        self.path = self.root/'evidence-vault.sqlite'
        self.clock = clock
        self.custodian = custodian
        self.policies = {policy.provider:policy for policy in policies}
        require(self.policies and len(self.policies) == len(policies) and custodian,
                'EVIDENCE_POLICY_REQUIRED')
        self.policy = protocol.sha(dict(scope='DISPOSABLE_ONLY', custodian=custodian,
                                        providers=[self.policies[key].body() for key in sorted(self.policies)]))
        with sqlite_writer(self.path) as db:
            for schema in SCHEMA:
                db.execute(schema)
            db.execute("INSERT OR IGNORE INTO state VALUES ('policy_pin', ?)", (self.policy,))
            self._pin(db)

    def _pin(self, db):
        stored = db.execute("SELECT value FROM state WHERE name='policy_pin'").fetchone()
        require(stored is not None and stored['value'] == self.policy, 'EVIDENCE_POLICY_CHANGED')

    @contextmanager
    def _operation(self):
        error = None
        with sqlite_writer(self.path) as db:
            db.execute('PRAGMA secure_delete=ON')
            self._pin(db)
            guard = ClockGuard(db, self.clock)
            now = guard.now()
            guard.persist()
            db.execute('SAVEPOINT policy')
            try:
                yield db, now
            except EvidenceError as exc:
                db.execute('ROLLBACK TO policy')
                error = exc
            db.execute('RELEASE policy')
        if error:
            raise error

    def _event(self, db, now, action, **metadata):
        last = db.execute('SELECT idx,sha FROM history ORDER BY idx DESC LIMIT 1').fetchone()
        index, parent = (last['idx']+1, last['sha']) if last else (1, None)
        body = protocol.canon(dict(action=action, at=now.isoformat(), prior=parent, index=index,
                                   policy=self.policy, **metadata))
        db.execute('INSERT INTO history VALUES (?,?,?)', (index, sha(body), body))

    def _expiry(self, provider, kind, received):
        spec = self.policies.get(provider)
        require(spec is not None and kind in spec.kinds, 'EVIDENCE_KIND_NOT_PERMITTED')
        return min(received+timedelta(seconds=spec.max_age_seconds), utc(spec.valid_until))

    @staticmethod
    def _identity(provider, kind, raw):
        require(isinstance(raw, bytes) and 0 < len(raw) <= MAX_BODY, 'EVIDENCE_SIZE_LIMIT')
        return protocol.sha([provider,kind,sha(raw)])

    def _add(self, db, now, provider, kind, raw, received):
        digest = self._identity(provider, kind, raw)
        expires = self._expiry(provider, kind, received)
        require(received <= now < expires, 'EVIDENCE_RETENTION_EXPIRED_OR_FUTURE')
        old = db.execute('SELECT * FROM items WHERE id=?', (digest,)).fetchone()
        if old:
            self._check_item(old)
            require(old['body'] == raw, 'EVIDENCE_DISPOSED_OR_CORRUPT')
            require(utc(old['received']) <= received, 'ARCHIVE_RETENTION_ORIGIN_CONFLICT')
            require(now < utc(old['expires']), 'EVIDENCE_RETENTION_EXPIRED_OR_FUTURE')
            return digest, False
        db.execute('INSERT INTO items VALUES (?,?,?,?,?,?,?,NULL)',
                   (digest,provider,kind,sha(raw),received.isoformat(),expires.isoformat(),raw))
        return digest, True

    def keep(self, provider, kind, raw, *, actor, permission):
        with self._operation() as (db, now):
            spec = self.policies.get(provider)
            require(actor == self.custodian and spec is not None and permission == spec.permission,
                    'EVIDENCE_ACQUISITION_NOT_AUTHORISED')
            digest, created = self._add(db, now, provider, kind, raw, now)
            if created:
                self._event(db, now, 'RETAINED', item=digest, permission=permission)
            return digest

    def monitor(self, *, warning_seconds=0):
        require(type(warning_seconds) is int and 0 <= warning_seconds <= 366*24*3600,
                'INVALID_EXPIRY_WARNING_WINDOW')
        with self._operation() as (db, now):
            deadline = now + timedelta(seconds=warning_seconds)
            report = dict(as_of=now.isoformat())
            for table, key in (('items', 'id'), ('bundles', 'sha')):
                expired, approaching = [], []
                for row in db.execute(f'SELECT * FROM {table} ORDER BY {key}'):
                    if table == 'items':
                        self._check_item(row)
                    else:
                        self._check_bundle(db, row)
                    if row['body'] is not None:
                        expiry = utc(row['expires'])
                        if expiry <= now:
                            expired.append(row[key])
                        elif expiry <= deadline:
                            approaching.append(row[key])
                report[f'expired_{table}'] = expired
                report[f'approaching_{table}'] = approaching
            return report

    def _live_items(self, db, ids, now):
        require(0 < len(ids) <= 20 and len(set(ids)) == len(ids), 'INVALID_EVIDENCE_SELECTION')
        rows = []
        for digest in sorted(ids):
            row = db.execute('SELECT * FROM items WHERE id=?', (digest,)).fetchone()
            if row is not None:
                self._check_item(row)
            require(row is not None and row['body'] is not None and now < utc(row['expires']),
                    'EVIDENCE_UNAVAILABLE_OR_EXPIRED')
            rows.append(row)
        return rows

    def _check_item(self, row):
        require(protocol.sha([row['provider'],row['kind'],row['sha']]) == row['id']
                and self._expiry(row['provider'],row['kind'],utc(row['received'])) == utc(row['expires'])
                and (row['body'] is None or sha(row['body']) == row['sha']), 'EVIDENCE_INTEGRITY_FAILED')

    def _check_bundle(self, db, row):
        body = row['body']
        if body is None:
            return
        require(sha(body) == row['sha'], 'ARCHIVE_HASH_MISMATCH')
        doc = protocol.strict_json(body)
        members = db.execute('SELECT item FROM bundle_items WHERE bundle=? ORDER BY item', (row['sha'],))
        require((doc['recipient'],doc['approval'],doc['expires'],doc['policy']) ==
                (row['recipient'],row['approval'],row['expires'],self.policy)
                and [x['id'] for x in doc['items']] == [member['item'] for member in members],
                'ARCHIVE_PROJECTION_MISMATCH')

    def export(self, ids, recipient, *, actor, approval):
        with self._operation() as (db, now):
            require(actor == self.custodian and approval and recipient, 'TRANSFER_NOT_AUTHORISED')
            rows = self._live_items(db, ids, now)
            require(all(recipient in self.policies[row['provider']].recipients for row in rows),
                    'RECIPIENT_NOT_PERMITTED')
            old = db.execute('SELECT * FROM bundles WHERE approval=?', (approval,)).fetchone()
            if old:
                self._check_bundle(db, old)
                members = {row[0] for row in db.execute('SELECT item FROM bundle_items WHERE bundle=?',
                                                       (old['sha'],))}
                require(old['body'] is not None and now < utc(old['expires'])
                        and old['recipient'] == recipient and members == set(ids), 'TRANSFER_APPROVAL_ALREADY_USED')
                require(sha(old['body']) == old['sha'], 'ARCHIVE_HASH_MISMATCH')
                return old['sha']
            expiry = min(utc(row['expires']) for row in rows).isoformat()
            members = [dict(id=row['id'],provider=row['provider'],kind=row['kind'],sha256=row['sha'],
                            received=row['received'],expires=row['expires'],body_hex=row['body'].hex()) for row in rows]
            body = protocol.canon(dict(schema=1, policy=self.policy, recipient=recipient, approval=approval,
                                       expires=expiry, exported=now.isoformat(), items=members))
            require(len(body) <= MAX_BUNDLE, 'ARCHIVE_SIZE_LIMIT')
            digest = sha(body)
            db.execute('INSERT INTO bundles VALUES (?,?,?,?,?,NULL)', (digest,recipient,approval,expiry,body))
            db.executemany('INSERT INTO bundle_items VALUES (?,?)', [(digest,row['id']) for row in rows])
            self._event(db, now, 'TRANSFER_AUTHORISED', archive=digest, recipient=recipient, approval=approval)
            return digest

    def read_transfer(self, digest, recipient):
        with self._operation() as (db, now):
            row = db.execute('SELECT * FROM bundles WHERE sha=?', (digest,)).fetchone()
            if row is not None:
                self._check_bundle(db, row)
            require(row is not None and row['recipient'] == recipient and row['body'] is not None
                    and now < utc(row['expires']), 'TRANSFER_UNAVAILABLE_OR_EXPIRED')
            require(sha(row['body']) == digest, 'ARCHIVE_HASH_MISMATCH')
            return row['body']

    def restore(self, body, pinned_sha, recipient, *, actor):
        require(isinstance(body, bytes) and 0 < len(body) <= MAX_BUNDLE, 'ARCHIVE_SIZE_LIMIT')
        require(sha(body) == pinned_sha, 'ARCHIVE_HASH_MISMATCH')
        try:
            doc = protocol.strict_json(body)
            require(isinstance(doc, dict) and protocol.canon(doc) == body, 'INVALID_ARCHIVE_FORMAT')
        except protocol.ResearchError as exc:
            raise EvidenceError('INVALID_ARCHIVE_FORMAT') from exc
        with self._operation() as (db, now):
            require(actor == self.custodian and doc.get('schema') == 1 and doc.get('policy') == self.policy
                    and doc.get('recipient') == recipient and doc.get('approval'), 'RESTORE_NOT_AUTHORISED')
            exported = utc(doc.get('exported'))
            require(exported <= now < utc(doc.get('expires')), 'ARCHIVE_EXPIRED_OR_FUTURE')
            items = doc.get('items')
            require(isinstance(items,list) and 0 < len(items) <= 20, 'INVALID_EVIDENCE_SELECTION')
            identities = set()
            expiries = []
            added = []
            try:
                for row in items:
                    spec = self.policies.get(row['provider'])
                    require(spec is not None and recipient in spec.recipients, 'RECIPIENT_NOT_PERMITTED')
                    raw = bytes.fromhex(row['body_hex'])
                    received = utc(row['received'])
                    expiry = self._expiry(row['provider'],row['kind'],received)
                    require(received <= exported < expiry and expiry == utc(row['expires'])
                            and sha(raw) == row['sha256'] and row['id'] not in identities,
                            'ARCHIVE_MEMBER_INVALID')
                    digest, created = self._add(db,now,row['provider'],row['kind'],raw,received)
                    require(digest == row['id'], 'ARCHIVE_MEMBER_INVALID')
                    identities.add(digest)
                    expiries.append(expiry)
                    if created:
                        added.append(digest)
            except EvidenceError:
                raise
            except (TypeError,ValueError,KeyError) as exc:
                raise EvidenceError('ARCHIVE_MEMBER_INVALID') from exc
            require(min(expiries) == utc(doc['expires']), 'ARCHIVE_MEMBER_INVALID')
            if added:
                self._event(db, now, 'ARCHIVE_RESTORED', archive=pinned_sha, items=added)
            return len(added)

    def dispose(self, *, actor, approval):
        with self._operation() as (db, now):
            require(actor == self.custodian and approval, 'DISPOSAL_NOT_AUTHORISED')
            removed = {}
            for table, key in (('items','id'),('bundles','sha')):
                due = []
                for row in db.execute(f'SELECT * FROM {table} ORDER BY {key}'):
                    if table == 'items':
                        self._check_item(row)
                    else:
                        self._check_bundle(db,row)
                    if row['body'] is not None and now >= utc(row['expires']):
                        due.append(row[key])
                db.executemany(f'UPDATE {table} SET body=NULL,disposed=? WHERE {key}=?',
                               [(now.isoformat(),identity) for identity in due])
                removed[table] = due
            if any(removed.values()):
                self._event(db, now, 'DISPOSED', approval=approval, **removed)
            return removed

    def verify_integrity(self, *, expected_audit_head=None):
        with self._operation() as (db, _now):
            require(db.execute('PRAGMA integrity_check').fetchone()[0] == 'ok'
                    and db.execute('PRAGMA foreign_key_check').fetchone() is None, 'EVIDENCE_DATABASE_CORRUPT')
            prior = None
            events = 0
            for row in db.execute('SELECT * FROM history ORDER BY idx'):
                entry = protocol.strict_json(row['body'])
                events += 1
                require(sha(row['body']) == row['sha'] and entry['prior'] == prior
                        and row['idx'] == entry['index'] == events
                        and entry['policy'] == self.policy, 'EVIDENCE_AUDIT_CHAIN_MISMATCH')
                prior = row['sha']
            require(expected_audit_head is None or prior == expected_audit_head,
                    'EVIDENCE_AUDIT_PIN_MISMATCH')
            for row in db.execute('SELECT * FROM items'):
                self._check_item(row)
            for row in db.execute('SELECT * FROM bundles'):
                self._check_bundle(db,row)
            return dict(events=events, audit_head_sha256=prior, policy_sha256=self.policy)
