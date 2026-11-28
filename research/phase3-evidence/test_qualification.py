"""Fault and integrity acceptance for isolated Phase 3 evidence."""
from concurrent.futures import ThreadPoolExecutor
from contextlib import closing
from dataclasses import replace
from datetime import datetime, timedelta, timezone
import http.client
import os
from pathlib import Path
import subprocess
import sys
from tempfile import TemporaryDirectory
from threading import Event
import unittest
from unittest.mock import patch

from qualification import Qualification, Ledger, protocol, sqlite_writer
from ledger import workspace
from fixtures import FixtureClock, envelope, race
from crypto_fixtures import FixtureAuthority, FixtureIdentity
from durability import backup, restore, inspect, open_read, review_backup
from sources import Source, SCOPE
from stamps import EvidenceError, Trust, post_freetsa, request, sha, utc, verify

CRASH = 86


class TimestampTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        fixture_dir = Path(cls.enterClassContext(TemporaryDirectory()))
        cls.authority = FixtureAuthority(fixture_dir/'tsa')
        cls.other = FixtureAuthority(fixture_dir/'other')
        cls.data = b'{"forecast":"canonical fixture"}'
        cls.query = request(cls.data, cls.authority.trust)
        cls.reply = cls.authority.reply(cls.query)

    def accept(self, data=None, query=None, reply=None, trust=None, cutoff=None):
        return verify(data or self.data, query or self.query, reply or self.reply,
                      cutoff or datetime.now(timezone.utc)+timedelta(minutes=5),
                      trust or self.authority.trust)

    def test_exact_hash_signature_and_upper_bound(self):
        result = self.accept()
        self.assertEqual(result['forecast_sha256'], sha(self.data))
        self.assertEqual(result['response_sha256'], sha(self.reply))
        self.assertEqual(result['request_sha256'], sha(self.query))
        self.assertEqual(utc(result['latest_possible_utc'])-utc(result['signed_gen_utc']), timedelta(seconds=1))

    def test_modified_bytes_wrong_hash_and_wrong_nonce(self):
        other = self.data+b' '
        for params in (dict(data=other), dict(query=request(other,self.authority.trust)),
                       dict(query=request(self.data,self.authority.trust))):
            with self.subTest(keys=tuple(params)), self.assertRaisesRegex(EvidenceError, 'CRYPTO_VERIFICATION_FAILED'):
                self.accept(**params)

    def test_modified_signature_untrusted_root_and_der_trailing_bytes(self):
        bad = self.reply[:-1] + bytes([self.reply[-1] ^ 1])
        for params in (dict(reply=bad),dict(trust=self.other.trust)):
            with self.subTest(keys=tuple(params)), self.assertRaisesRegex(EvidenceError, 'CRYPTO_VERIFICATION_FAILED'):
                self.accept(**params)
        with self.assertRaisesRegex(EvidenceError, 'INVALID_TIMESTAMP_DER'):
            self.accept(reply=self.reply+b'\x00')

    def test_signed_accuracy_counts_at_boundary_and_policy_must_match(self):
        result = self.accept()
        cutoff = utc(result['latest_possible_utc'])
        with self.assertRaisesRegex(EvidenceError, 'TIMESTAMP_TOO_LATE'):
            self.accept(cutoff=cutoff)
        self.accept(cutoff=cutoff+timedelta(microseconds=1))
        with self.assertRaisesRegex(EvidenceError, 'TSA_ACCURACY_OUT_OF_POLICY'):
            self.accept(trust=replace(self.authority.trust,max_error_us=999_999))
        with self.assertRaisesRegex(EvidenceError, 'TSA_POLICY_MISMATCH'):
            self.accept(trust=replace(self.authority.trust,policy_oid='1.2.3.4'))

    def test_unavailable_service_and_unapproved_anchor(self):
        with patch.object(http.client.HTTPSConnection,'request',side_effect=TimeoutError), self.assertRaisesRegex(
                EvidenceError,'TIMESTAMP_SERVICE_UNAVAILABLE'):
            post_freetsa(self.query)
        with self.assertRaisesRegex(EvidenceError,'UNAPPROVED_TSA_ANCHOR'):
            Trust(self.authority.trust.ca_pem,'0'*64,self.authority.trust.policy_oid,2_000_000)


class EndToEnd(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        directory = Path(cls.enterClassContext(TemporaryDirectory()))
        cls.authority = FixtureAuthority(directory/'tsa')
        cls.identities = tuple(FixtureIdentity(directory,name) for name in ('input','official','corroborator'))
        expires = (datetime.now(timezone.utc)+timedelta(days=10)).isoformat()
        cls.sources = tuple(Source('fixture-'+role, 'owner-'+role, 'lineage-'+role, 'test-permission-'+role,
                                   role, identity.public, expires)
                            for role,identity in zip(('input','official','corroborator'),cls.identities))

    def setUp(self):
        self.root, self.capability = self.enterContext(workspace())
        self.now = datetime.now(timezone.utc)
        self.clock = FixtureClock(self.now)
        self.ledger = Ledger(self.root,self.capability,clock=self.clock)
        self.q = self.qualification()
        self.start = self.now+timedelta(hours=1)
        self.input = self.signed_feed(race(at=self.now,start=self.start))
        self.observed = self.start+timedelta(minutes=3)

    def qualification(self, ledger=None, token=None, **kwargs):
        return Qualification(ledger or self.ledger, token or self.capability,
                             self.authority.trust, *self.sources, **kwargs)

    def signed_feed(self, row, *, published=None):
        document = dict(kind='feed',scope=SCOPE,source=self.sources[0].name,
                        published_at_utc=(published or self.now).isoformat(),feed=envelope(row,at=self.now))
        raw = protocol.canon(document)
        return raw, self.identities[0].sign(raw)

    def acquire(self):
        return self.q.acquire(*self.input,self.now.isoformat())[0]['forecast_sha256']

    def results(self, *, winner='horse-a', field=('horse-a','horse-b'), revision=1, previous=(None,None),
                published=None, source_winners=None):
        result = []
        for index in (1,2):
            document = dict(kind='result',scope=SCOPE,source=self.sources[index].name,status='final',
                            race_id='fixture-one',racecourse='Synthetic course',start_utc=self.start.isoformat(),
                            published_at_utc=(published or self.start+timedelta(minutes=1)).isoformat(),
                            field=list(field),winner=source_winners[index-1] if source_winners else winner,
                            revision=revision,supersedes_sha256=previous[index-1])
            raw = protocol.canon(document)
            result.append((raw,self.identities[index].sign(raw)))
        return result

    def inspect(self):
        with closing(open_read(self.ledger.path)) as db:
            return inspect(db)

    def test_full_chain_restart_duplicate_amendment_and_same_evaluation(self):
        digest = self.acquire()
        self.assertEqual(self.q.acquire(*self.input,self.now.isoformat())[0]['kind'],'DUPLICATE')
        before = self.ledger.snapshot()['forecasts'][0]
        self.assertEqual(self.q.attest(digest,self.authority.reply),'RECORDED')
        first = self.results()
        self.assertEqual(self.q.reconcile(digest,*first,self.observed.isoformat()),'RECORDED')
        self.assertEqual(self.q.reconcile(digest,*first,self.observed.isoformat()),'DUPLICATE')
        baseline = self.q.evaluate(digest)
        self.assertEqual(baseline['scores']['A'],protocol.metrics(before['A'],0))
        self.assertFalse(baseline['external_timestamp_qualified'])
        corrected = self.results(winner='horse-b',revision=2,previous=tuple(sha(item[0]) for item in first),
                                 published=self.start+timedelta(minutes=2))
        self.q.reconcile(digest,*corrected,self.observed.isoformat())
        reopen = self.qualification(Ledger(self.root,self.capability,clock=self.clock))
        evaluation = reopen.evaluate(digest)
        self.assertEqual(evaluation,self.q.evaluate(digest))
        self.assertEqual(evaluation['scores']['B'],protocol.metrics(before['B'],1))
        self.assertEqual(self.ledger.snapshot()['forecasts'],[before])
        self.assertEqual(self.inspect()['outcome_revisions'],2)

    def test_unsigned_stale_and_future_inputs_are_rejected(self):
        raw, signature = self.input
        with self.assertRaisesRegex(EvidenceError,'CRYPTO_VERIFICATION_FAILED'):
            self.q.acquire(raw+b' ',signature,self.now.isoformat())
        older = self.signed_feed(race(at=self.now),published=self.now-timedelta(minutes=6))
        with self.assertRaisesRegex(EvidenceError,'SOURCE_TIMESTAMP_STALE_OR_FUTURE'):
            self.q.acquire(*older,self.now.isoformat())
        with self.assertRaisesRegex(EvidenceError,'SOURCE_OBSERVATION_IN_FUTURE'):
            self.q.acquire(*self.input,(self.now+timedelta(seconds=1)).isoformat())
        self.clock.advance(31*60)
        rejected = self.q.acquire(*self.input,self.now.isoformat())[0]
        self.assertIn(rejected['reason'], {'SOURCE_STALE_AT_AB_CAPTURE','CURRENT_FIELD_CHECK_STALE_OR_FUTURE'})
        self.assertEqual(self.inspect()['forecasts'],0)

    def test_late_source_authorisation_does_not_promote_existing_freeze(self):
        row = race(at=self.now,start=self.start)
        digest = self.ledger.intake(envelope(row,at=self.now))[0]['forecast_sha256']
        with self.assertRaisesRegex(EvidenceError,'LATE_SOURCE_AUTHORIZATION'):
            self.q.acquire(*self.input,self.now.isoformat())
        with self.assertRaisesRegex(EvidenceError,'FORECAST_WITHOUT_AUTHORISED_ACQUISITION'):
            self.q.prepare(digest)

    def test_retention_and_independence_declared_in_fixture_policy(self):
        official, input_source, verifier = self.sources[1],self.sources[0],self.sources[2]
        with self.assertRaisesRegex(EvidenceError,'SOURCE_INDEPENDENCE_NOT_ESTABLISHED'):
            Qualification(self.ledger,self.capability,self.authority.trust,input_source,official,
                          replace(verifier,lineage=official.lineage))
        from sources import signed_receipt
        with self.assertRaisesRegex(EvidenceError,'SOURCE_RETENTION_NOT_AUTHORISED'):
            signed_receipt(replace(input_source,retain_until=self.now.isoformat()),*self.input,
                           self.now.isoformat(),protocol,'feed')

    def test_unwitnessed_partial_disputed_and_unlinked_results_are_ineligible(self):
        digest = self.acquire()
        with self.assertRaisesRegex(EvidenceError,'VERIFIED_PROOF_REQUIRED'):
            self.q.reconcile(digest,*self.results(),self.observed.isoformat())
        self.q.attest(digest,self.authority.reply)
        for results, error in (
            (self.results(field=('horse-a',)), 'RESULT_FIELD_INCOMPLETE_OR_CHANGED'),
            (self.results(field=('horse-a','horse-a')), 'RESULT_FIELD_INCOMPLETE_OR_CHANGED'),
            (self.results(source_winners=('horse-a','horse-b')), 'RESULT_SOURCES_DISAGREE'),
            (self.results(published=self.start-timedelta(seconds=1)), 'RESULT_BEFORE_EVENT'),
            (self.results(revision=2), 'RESULT_AMENDMENT_LINK_MISMATCH'),
        ):
            with self.subTest(error=error), self.assertRaisesRegex(EvidenceError,error):
                self.q.reconcile(digest,*results,self.observed.isoformat())
        self.assertEqual(self.inspect()['outcome_revisions'],0)

    def test_service_outage_retains_nonce_and_distinct_signed_replies_do_not_replace_it(self):
        digest = self.acquire()
        def unavailable(_query):
            raise EvidenceError('TIMESTAMP_SERVICE_UNAVAILABLE')
        with self.assertRaisesRegex(EvidenceError,'TIMESTAMP_SERVICE_UNAVAILABLE'):
            self.q.attest(digest,unavailable)
        original = self.q.prepare(digest)
        live = self.qualification(Ledger(self.root,self.capability,clock=self.clock))
        self.assertEqual(original,live.prepare(digest))
        reply = self.authority.reply(original)
        self.assertEqual(live.attach(digest,reply),'RECORDED')
        self.assertEqual(live.attach(digest,reply),'DUPLICATE')
        with self.assertRaisesRegex(EvidenceError,'CONFLICTING_TIMESTAMP_RECEIPT'):
            live.attach(digest,self.authority.reply(original))

    def test_receipt_cannot_replay_against_second_forecast(self):
        first = self.acquire()
        second = self.q.acquire(*self.signed_feed(race('fixture-two',at=self.now,start=self.start)),
                                self.now.isoformat())[0]['forecast_sha256']
        first_reply = self.authority.reply(self.q.prepare(first))
        self.q.prepare(second)
        with self.assertRaisesRegex(EvidenceError,'CRYPTO_VERIFICATION_FAILED'):
            self.q.attach(second,first_reply)
        self.assertEqual(self.inspect()['witness_receipts'],0)

    def test_earlier_witnessed_revision_cannot_substitute_for_latest_forecast(self):
        digest = self.acquire()
        self.q.attest(digest,self.authority.reply)
        row = race(at=self.now,start=self.start,revision='new-fixture-conditions')
        self.clock.advance(1)
        newer = self.q.acquire(*self.signed_feed(row),self.now.isoformat())[0]['forecast_sha256']
        self.assertNotEqual(newer,digest)
        with self.assertRaisesRegex(EvidenceError,'LATEST_FORECAST_REQUIRED'):
            self.q.reconcile(digest,*self.results(),self.observed.isoformat())

    def test_concurrent_identical_receipts_are_idempotent(self):
        digest = self.acquire()
        response = self.authority.reply(self.q.prepare(digest))
        with ThreadPoolExecutor(3) as workers:
            results = list(workers.map(lambda _:self.q.attach(digest,response),range(3)))
        self.assertCountEqual(results,['RECORDED','DUPLICATE','DUPLICATE'])
        self.assertEqual(self.inspect()['witness_receipts'],1)

    def test_interrupted_request_or_receipt_transaction_retries_once(self):
        digest = self.acquire()
        def interrupt(stage):
            def inject(point):
                if point == stage:
                    raise OSError('simulated storage interruption')
            return inject
        for stage in ('before_request_commit','after_request_commit'):
            with self.assertRaises(OSError):
                self.qualification(fault=interrupt(stage)).prepare(digest)
        response = self.authority.reply(self.q.prepare(digest))
        for stage, count in (('before_receipt_commit',0), ('after_receipt_commit',1)):
            with self.assertRaises(OSError):
                self.qualification(fault=interrupt(stage)).attach(digest,response)
            self.assertEqual(self.inspect()['witness_receipts'],count)
        self.assertEqual(self.qualification().attach(digest,response),'DUPLICATE')

    def test_receipt_process_crash_before_and_after_commit(self):
        digest = self.acquire()
        response = self.authority.reply(self.q.prepare(digest))
        (self.root/'child-response.tsr').write_bytes(response)
        trust = self.authority.trust
        (self.root/'child-policy.json').write_bytes(protocol.canon(dict(
            ca=trust.ca_pem.hex(), ca_sha256=trust.ca_sha256, policy_oid=trust.policy_oid,
            max_error_us=trust.max_error_us,
            sources=[source.identity() | {'public_key':source.public_key.hex()} for source in self.sources])))
        for stage,count in (('before_receipt_commit',0),('after_receipt_commit',1)):
            child = subprocess.run([sys.executable,str(Path(__file__).resolve()),'--receipt-crash',
                                    str(self.root),stage,digest],input=self.capability,text=True,
                                   capture_output=True,timeout=20)
            self.assertEqual(child.returncode,CRASH,child.stderr)
            self.assertEqual(self.inspect()['witness_receipts'],count)
        recovered = self.qualification(Ledger(self.root,self.capability,clock=self.clock))
        self.assertEqual(recovered.attach(digest,response),'DUPLICATE')

    def test_restarted_ledger_rejects_changed_trust_policy(self):
        with self.assertRaisesRegex(EvidenceError,'QUALIFICATION_POLICY_CHANGED'):
            Qualification(self.ledger,self.capability,replace(self.authority.trust,max_error_us=1_500_000),
                          *self.sources)

    def test_corrupt_projection_that_passed_old_snapshot_is_now_rejected(self):
        digest = self.acquire()
        with sqlite_writer(self.ledger.path) as db:
            db.execute("UPDATE forecasts SET captured_utc='incorrect projection'")
        self.assertEqual(len(self.ledger.snapshot()['forecasts']),1)
        with self.assertRaisesRegex(EvidenceError,'LEDGER_FORECAST_MISMATCH'):
            self.q.prepare(digest)
        with self.assertRaisesRegex(EvidenceError,'LEDGER_FORECAST_MISMATCH'):
            self.inspect()

    def test_modified_raw_body_with_same_semantic_hash_is_rejected(self):
        digest = self.acquire()
        with sqlite_writer(self.ledger.path) as db:
            raw = db.execute('SELECT body FROM forecasts').fetchone()['body']
            db.execute('UPDATE forecasts SET body=?',(raw+b' ',))
        self.assertEqual(len(self.ledger.snapshot()['forecasts']),1)
        with self.assertRaisesRegex(EvidenceError,'LEDGER_FORECAST_MISMATCH'):
            self.q.prepare(digest)
        with self.assertRaisesRegex(EvidenceError,'LEDGER_EXACT_BYTES_CORRUPT'):
            self.inspect()

    def test_backup_restore_replays_signature_chain_without_mutating_original(self):
        digest = self.acquire()
        self.q.attest(digest,self.authority.reply)
        self.q.reconcile(digest,*self.results(),self.observed.isoformat())
        expected = self.q.evaluate(digest)
        manifest = backup(self.ledger,self.capability)
        with workspace() as (target,token):
            restore(self.root,self.capability,target,token,manifest)
            restored = Ledger(target,token,clock=self.clock)
            self.assertEqual(self.qualification(restored,token).evaluate(digest),expected)
            with self.assertRaisesRegex(EvidenceError,'RESTORE_TARGET_EXISTS'):
                restore(self.root,self.capability,target,token,manifest)
        self.assertEqual(self.inspect(),manifest['counts'])

    def test_interrupted_backup_and_restore_rejects_partial_target_and_corruption(self):
        self.acquire()
        for stage in ('during_backup_copy','after_backup_copy','before_backup_publish'):
            child = subprocess.run([sys.executable,str(Path(__file__).resolve()),'--backup-crash',
                                    str(self.root),stage],input=self.capability,text=True,
                                   capture_output=True,timeout=20)
            self.assertEqual(child.returncode,CRASH,child.stderr)
            self.assertFalse((self.root/'backup.sqlite').exists())
        with patch('durability.os.fsync',side_effect=OSError(28,'synthetic disk full')), self.assertRaises(OSError):
            backup(self.ledger,self.capability)
        self.assertFalse((self.root/'backup.sqlite').exists())
        manifest = backup(self.ledger,self.capability)
        with workspace() as (target,token):
            def interrupt(_stage):
                raise OSError('interrupted restore')
            with self.assertRaises(OSError):
                restore(self.root,self.capability,target,token,manifest,fault=interrupt)
            self.assertFalse((target/'intake.sqlite').exists())
            file = self.root/'backup.sqlite'
            with file.open('r+b') as handle:
                handle.truncate(file.stat().st_size//2)
            with self.assertRaisesRegex(EvidenceError,'BACKUP_HASH_MISMATCH'):
                restore(self.root,self.capability,target,token,manifest)

    def test_sqlite_byte_corruption_is_detected(self):
        self.acquire()
        self.ledger.path.write_bytes(b'not a database')
        with self.assertRaisesRegex(EvidenceError,'SQLITE_INTEGRITY_FAILED'):
            self.inspect()

    def test_backup_published_before_directory_sync_failure_is_recoverable(self):
        self.acquire()
        with patch('durability.sync_directory',side_effect=OSError(28,'synthetic directory sync failure')), self.assertRaises(OSError):
            backup(self.ledger,self.capability)
        self.assertTrue((self.root/'backup.sqlite').is_file())
        self.assertEqual(review_backup(self.root,self.capability)['counts']['forecasts'],1)
        with self.assertRaisesRegex(EvidenceError,'BACKUP_TARGET_EXISTS'):
            backup(self.ledger,self.capability)

    def test_backup_during_writer_keeps_committed_evidence_consistent(self):
        digest = self.acquire()
        response = self.authority.reply(self.q.prepare(digest))
        at_boundary, release = Event(), Event()
        def pause(point):
            if point == 'before_receipt_commit':
                at_boundary.set()
                if not release.wait(5):
                    raise AssertionError('writer was never released')
        writer = self.qualification(fault=pause)
        with ThreadPoolExecutor(2) as workers:
            write = workers.submit(writer.attach,digest,response)
            try:
                self.assertTrue(at_boundary.wait(5))
                copy = workers.submit(backup,self.ledger,self.capability)
            finally:
                release.set()
            self.assertEqual(write.result(15),'RECORDED')
            manifest = copy.result(15)
        self.assertEqual(manifest['counts']['witness_receipts'],1)


if __name__ == '__main__':
    if sys.argv[1:2] in (['--backup-crash'],['--receipt-crash']):
        def die(point):
            if point == sys.argv[3]:
                os._exit(CRASH)
        token = sys.stdin.read(65)
        ledger = Ledger(Path(sys.argv[2]),token)
        if sys.argv[1] == '--backup-crash':
            backup(ledger,token,fault=die)
        else:
            policy = protocol.load(ledger.root/'child-policy.json')
            trust = Trust(bytes.fromhex(policy['ca']),policy['ca_sha256'],policy['policy_oid'],policy['max_error_us'])
            sources = []
            for item in policy['sources']:
                require_root = item.pop('public_key_sha256')
                item['public_key'] = bytes.fromhex(item['public_key'])
                assert sha(item['public_key']) == require_root
                sources.append(Source(**item))
            qualification = Qualification(ledger,token,trust,*sources,fault=die)
            qualification.attach(sys.argv[4],(ledger.root/'child-response.tsr').read_bytes())
        sys.exit(1)
    unittest.main()
