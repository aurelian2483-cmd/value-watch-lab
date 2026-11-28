"""End-to-end fixture ledger. Frozen forecasts retain their original bytes."""
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[1]/'phase3-transactional'))
from ledger import Ledger, check_envelope, protocol, sqlite_writer, no_fault, fixture_root
from sources import fields_match, signed_receipt
from stamps import CUTOFF, request, require, sha, utc, verify

SCHEMA = (
    """CREATE TABLE IF NOT EXISTS qualification_pin (key TEXT PRIMARY KEY, body BLOB NOT NULL)""",
    """CREATE TABLE IF NOT EXISTS acquisitions (
        feed_sha TEXT PRIMARY KEY, source_name TEXT NOT NULL, source_sha TEXT NOT NULL UNIQUE,
        source_raw BLOB NOT NULL, signature BLOB NOT NULL, observed_utc TEXT NOT NULL
    )""",
    """CREATE TABLE IF NOT EXISTS witness_requests (
        forecast_sha TEXT PRIMARY KEY REFERENCES forecasts(sha), request_sha TEXT NOT NULL UNIQUE,
        request_der BLOB NOT NULL
    )""",
    """CREATE TABLE IF NOT EXISTS witness_receipts (
        forecast_sha TEXT PRIMARY KEY REFERENCES witness_requests(forecast_sha),
        response_sha TEXT NOT NULL UNIQUE, response_der BLOB NOT NULL, verified BLOB NOT NULL
    )""",
    """CREATE TABLE IF NOT EXISTS outcome_revisions (
        forecast_sha TEXT NOT NULL REFERENCES witness_receipts(forecast_sha),
        revision INTEGER NOT NULL, official_sha TEXT NOT NULL UNIQUE,
        corroborator_sha TEXT NOT NULL UNIQUE, winner TEXT NOT NULL, observed_utc TEXT NOT NULL,
        official_raw BLOB NOT NULL, official_sig BLOB NOT NULL,
        corroborator_raw BLOB NOT NULL, corroborator_sig BLOB NOT NULL,
        PRIMARY KEY (forecast_sha, revision)
    )""",
)


class Qualification:
    def __init__(self, ledger, capability, trust, input_source, official, corroborator, *, fault=no_fault):
        require(isinstance(ledger, Ledger), 'DISPOSABLE_LEDGER_REQUIRED')
        fixture_root(ledger.root, capability)
        require((input_source.role, official.role, corroborator.role) == ('input','official','corroborator'),
                'UNAPPROVED_SOURCE_ROLES')
        approved = (input_source, official, corroborator)
        for field in ('name', 'owner', 'lineage', 'public_key'):
            require(len({getattr(source, field) for source in approved}) == len(approved),
                    'SOURCE_INDEPENDENCE_NOT_ESTABLISHED')
        self.ledger, self.trust, self.sources, self.fault = ledger, trust, approved, fault
        self.pin = protocol.canon(dict(scope='DISPOSABLE_SYNTHETIC_ONLY',
                                      authority_sha256=trust.ca_sha256, policy_oid=trust.policy_oid,
                                      max_error_us=trust.max_error_us, sources=[source.identity() for source in approved]))
        with sqlite_writer(ledger.path) as db:
            for statement in SCHEMA:
                db.execute(statement)
            db.execute("INSERT OR IGNORE INTO qualification_pin VALUES ('policy', ?)", (self.pin,))
            self._verify_pin(db)

    def _verify_pin(self, db):
        policy = db.execute("SELECT body FROM qualification_pin WHERE key='policy'").fetchone()
        require(policy is not None and policy['body'] == self.pin, 'QUALIFICATION_POLICY_CHANGED')

    def acquire(self, raw, signature, observed):
        source = self.sources[0]
        document = signed_receipt(source, raw, signature, observed, protocol, 'feed')
        feed = document.get('feed')
        require(isinstance(feed, dict), 'SOURCE_FEED_MISSING')
        check_envelope(feed)
        require(utc(feed.get('generated_at_utc')) <= utc(document['published_at_utc']), 'FEED_PUBLISHED_BEFORE_GENERATION')
        # Measured acquisition cannot assert a future observation. The locked
        # collector separately samples freshness at acceptance per record.
        require(utc(observed) <= self.ledger.sample()[0], 'SOURCE_OBSERVATION_IN_FUTURE')
        feed_sha = protocol.sha(feed)
        with sqlite_writer(self.ledger.path) as db:
            self._verify_pin(db)
            previous = db.execute('SELECT source_sha FROM acquisitions WHERE feed_sha=?', (feed_sha,)).fetchone()
            if previous:
                require(previous['source_sha'] == sha(raw), 'CONFLICTING_SIGNED_ACQUISITION')
            else:
                used = db.execute("SELECT 1 FROM audit WHERE feed_sha=? AND kind='FROZEN'", (feed_sha,)).fetchone()
                require(used is None, 'LATE_SOURCE_AUTHORIZATION')
                db.execute('INSERT INTO acquisitions VALUES (?,?,?,?,?,?)',
                           (feed_sha, source.name, sha(raw), raw, signature, utc(observed).isoformat()))
        self.fault('after_acquisition_commit')
        return self.ledger.intake(feed)

    def _forecast(self, db, digest):
        self._verify_pin(db)
        row = db.execute("""SELECT f.body, f.race_id, f.captured_utc, f.source_sha, a.feed_sha,
                                   a.source_sha AS audit_source, a.race_id AS audit_race,
                                   a.observed_utc, r.start_utc, q.source_sha AS acquired_sha,
                                   q.source_raw, q.source_name, q.signature, q.observed_utc AS acquired_utc
                            FROM forecasts f JOIN audit a ON a.frozen_sha=f.sha AND a.kind='FROZEN'
                            JOIN races r ON r.race_id=f.race_id
                            JOIN acquisitions q ON q.feed_sha=a.feed_sha WHERE f.sha=?""",
                         (digest,)).fetchone()
        require(row is not None, 'FORECAST_WITHOUT_AUTHORISED_ACQUISITION')
        body = row['body']
        forecast = protocol.strict_json(body)
        require(protocol.canon(forecast) == body and sha(body) == digest
                and row['race_id'] == row['audit_race'] == forecast['race_id']
                and row['captured_utc'] == row['observed_utc'] == forecast['captured_at_utc']
                and row['source_sha'] == row['audit_source'] == forecast['source_object_sha256']
                and row['start_utc'] == forecast['startUTC']
                and utc(row['acquired_utc']) <= utc(forecast['captured_at_utc'])
                and forecast['independent_timestamp_attested'] is False
                and all(forecast.get(key) is value if isinstance(value, bool) else forecast.get(key) == value
                        for key, value in protocol.GUARDS.items()), 'LEDGER_FORECAST_MISMATCH')
        source_row = db.execute("SELECT body FROM sources WHERE sha=?", (row['source_sha'],)).fetchone()
        feed_row = db.execute("SELECT body FROM feeds WHERE sha=?", (row['feed_sha'],)).fetchone()
        require(source_row is not None and feed_row is not None, 'LEDGER_SOURCE_MISMATCH')
        source, feed = source_row['body'], feed_row['body']
        require(sha(source) == row['source_sha'] and sha(feed) == row['feed_sha']
                and sha(row['source_raw']) == row['acquired_sha']
                and row['source_name'] == self.sources[0].name, 'LEDGER_SOURCE_MISMATCH')
        signed = signed_receipt(self.sources[0], row['source_raw'], row['signature'], row['acquired_utc'], protocol, 'feed')
        require(protocol.canon(signed['feed']) == feed
                and any(protocol.canon(record) == source for record in signed['feed']['forecasts']),
                'LEDGER_SOURCE_MISMATCH')
        return body, forecast

    def prepare(self, digest):
        with sqlite_writer(self.ledger.path) as db:
            body, _ = self._forecast(db, digest)
            row = db.execute('SELECT request_sha, request_der FROM witness_requests WHERE forecast_sha=?',
                             (digest,)).fetchone()
            if row:
                require(sha(row['request_der']) == row['request_sha'], 'TIMESTAMP_REQUEST_PIN_MISMATCH')
                return row['request_der']
            query = request(body, self.trust)
            db.execute('INSERT INTO witness_requests VALUES (?,?,?)', (digest, sha(query), query))
            self.fault('before_request_commit')
        self.fault('after_request_commit')
        return query

    def attest(self, digest, transport):
        query = self.prepare(digest)
        return self.attach(digest, transport(query))

    def _witness(self, db, digest, body, forecast, response):
        row = db.execute('SELECT request_sha, request_der FROM witness_requests WHERE forecast_sha=?',
                         (digest,)).fetchone()
        require(row is not None and sha(row['request_der']) == row['request_sha'], 'TIMESTAMP_REQUEST_PIN_MISMATCH')
        receipt = verify(body, row['request_der'], response, utc(forecast['startUTC'])-CUTOFF, self.trust)
        require(utc(receipt['latest_possible_utc']) >= utc(forecast['captured_at_utc']),
                'TIMESTAMP_PRECEDES_CAPTURE')
        return receipt

    def attach(self, digest, response):
        with sqlite_writer(self.ledger.path) as db:
            body, forecast = self._forecast(db, digest)
            receipt = self._witness(db, digest, body, forecast, response)
            previous = db.execute('SELECT * FROM witness_receipts WHERE forecast_sha=?', (digest,)).fetchone()
            if previous:
                require(previous['response_der'] == response and previous['response_sha'] == sha(response)
                        and previous['verified'] == protocol.canon(receipt), 'CONFLICTING_TIMESTAMP_RECEIPT')
                return 'DUPLICATE'
            db.execute('INSERT INTO witness_receipts VALUES (?,?,?,?)',
                       (digest, sha(response), response, protocol.canon(receipt)))
            self.fault('before_receipt_commit')
        self.fault('after_receipt_commit')
        return 'RECORDED'

    def _verified_frozen(self, db, digest):
        body, forecast = self._forecast(db, digest)
        witness = db.execute('SELECT * FROM witness_receipts WHERE forecast_sha=?', (digest,)).fetchone()
        require(witness is not None, 'VERIFIED_PROOF_REQUIRED')
        receipt = self._witness(db, digest, body, forecast, witness['response_der'])
        require(witness['verified'] == protocol.canon(receipt)
                and witness['response_sha'] == sha(witness['response_der']), 'TIMESTAMP_EVIDENCE_CORRUPT')
        return forecast

    @staticmethod
    def _require_latest(db, forecast, digest):
        rows = db.execute("SELECT sha, body, captured_utc FROM forecasts WHERE race_id=?",
                          (forecast['race_id'],)).fetchall()
        latest = None
        for row in rows:
            revision = protocol.strict_json(row['body'])
            require(sha(row['body']) == row['sha'] and revision['captured_at_utc'] == row['captured_utc']
                    and revision['startUTC'] == forecast['startUTC'], 'LEDGER_FORECAST_MISMATCH')
            key = utc(revision['captured_at_utc']), row['sha']
            latest = max(latest, key) if latest else key
        require(latest is not None and latest[1] == digest, 'LATEST_FORECAST_REQUIRED')

    def _outcomes(self, forecast, observed, official, corroborator):
        raw_a, sig_a = official
        raw_b, sig_b = corroborator
        a = signed_receipt(self.sources[1], raw_a, sig_a, observed, protocol, 'result')
        b = signed_receipt(self.sources[2], raw_b, sig_b, observed, protocol, 'result')
        first, second = fields_match(a, forecast), fields_match(b, forecast)
        require(first == second and a['revision'] == b['revision'], 'RESULT_SOURCES_DISAGREE')
        return a, b, first

    def reconcile(self, digest, official, corroborator, observed):
        raw_a, sig_a = official
        raw_b, sig_b = corroborator
        with sqlite_writer(self.ledger.path) as db:
            forecast = self._verified_frozen(db, digest)
            self._require_latest(db, forecast, digest)
            a, b, winner = self._outcomes(forecast, observed, official, corroborator)
            old = db.execute("""SELECT * FROM outcome_revisions WHERE forecast_sha=?
                                ORDER BY revision DESC LIMIT 1""", (digest,)).fetchone()
            if old and (a['revision'], sha(raw_a), sha(raw_b)) == (
                    old['revision'], old['official_sha'], old['corroborator_sha']):
                return 'DUPLICATE'
            self._amendment(a, b, old)
            db.execute('INSERT INTO outcome_revisions VALUES (?,?,?,?,?,?,?,?,?,?)',
                       (digest, a['revision'], sha(raw_a), sha(raw_b), winner, utc(observed).isoformat(),
                        raw_a, sig_a, raw_b, sig_b))
        return 'RECORDED'

    @staticmethod
    def _amendment(a, b, old):
        previous = (old['revision'], old['official_sha'], old['corroborator_sha']) if old else (0, None, None)
        require((a['revision']-1, a.get('supersedes_sha256'), b.get('supersedes_sha256')) == previous,
                'RESULT_AMENDMENT_LINK_MISMATCH')
        if old:
            for current, original in ((a, old['official_raw']), (b, old['corroborator_raw'])):
                require(utc(current['published_at_utc']) > utc(protocol.strict_json(original)['published_at_utc']),
                        'RESULT_AMENDMENT_NOT_LATER')

    def evaluate(self, digest):
        with sqlite_writer(self.ledger.path) as db:
            forecast = self._verified_frozen(db, digest)
            self._require_latest(db, forecast, digest)
            rows = db.execute("""SELECT * FROM outcome_revisions WHERE forecast_sha=?
                                ORDER BY revision""", (digest,)).fetchall()
            require(bool(rows), 'RECONCILED_RESULT_REQUIRED')
            previous = None
            for row in rows:
                raw_a, raw_b = row['official_raw'], row['corroborator_raw']
                a, b, winner = self._outcomes(forecast, row['observed_utc'],
                                              (raw_a,row['official_sig']), (raw_b,row['corroborator_sig']))
                self._amendment(a, b, previous)
                require((a['revision'], sha(raw_a), sha(raw_b), winner) ==
                        (row['revision'], row['official_sha'], row['corroborator_sha'], row['winner']),
                        'RESULT_LEDGER_PROJECTION_MISMATCH')
                previous = row
            rank = forecast['horse_ids'].index(winner)
            scores = {method:protocol.metrics(forecast[method],rank) for method in ('A','B')}
            return dict(scope='DISPOSABLE_SYNTHETIC_EVALUATION', revision=rows[-1]['revision'],
                        forecast_sha256=digest, scores=scores, external_timestamp_qualified=False, **protocol.GUARDS)
