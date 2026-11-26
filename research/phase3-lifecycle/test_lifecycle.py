"""Acceptance for disposable custody policy, expiry and archival verification."""
from concurrent.futures import ThreadPoolExecutor
from dataclasses import replace
from datetime import datetime, timedelta, timezone
from pathlib import Path
from tempfile import TemporaryDirectory
import sqlite3
import unittest

from vault import Policy, Vault, protocol, sqlite_writer
from ledger import REGISTERED, workspace
from fixtures import FixtureClock
from crypto_fixtures import FixtureAuthority
from archival import verify_archive
from stamps import EvidenceError, openssl, request, sha, utc, verify

NOW = datetime(2026,12,1,12,tzinfo=timezone.utc)
CUSTODIAN = 'fixture-custodian'
RECIPIENT = 'fixture-external-review'


class CustodyTests(unittest.TestCase):
    def setUp(self):
        self.root,self.token = self.enterContext(workspace())
        self.clock = FixtureClock(NOW)
        self.policies = (
            Policy('fixture-source','source-permission',('RESULT','ACQUISITION'),60,
                   (NOW+timedelta(days=1)).isoformat(),(RECIPIENT,)),
            Policy('fixture-tsa','tsa-permission',('REVOCATION','TIMESTAMP','FORECAST'),300,
                   (NOW+timedelta(days=1)).isoformat(),(RECIPIENT,'fixture-reviewer-b')),
            Policy('fixture-restricted','restricted-permission',('RESULT',),90,
                   (NOW+timedelta(seconds=15)).isoformat(),()),
        )
        self.vault = self.open()

    def open(self):
        return Vault(self.root,self.token,self.policies,CUSTODIAN,clock=self.clock)

    def keep(self, provider='fixture-source', kind='RESULT', body=b'fixture evidence', permission='source-permission'):
        return self.vault.keep(provider,kind,body,actor=CUSTODIAN,permission=permission)

    def export(self, items, recipient=RECIPIENT, approval='shift-approval-1'):
        return self.vault.export(items,recipient,actor=CUSTODIAN,approval=approval)

    def test_protected_root_and_revised_policy_rejected(self):
        with self.assertRaisesRegex(ValueError,'DISPOSABLE_FIXTURE_REQUIRED'):
            Vault(REGISTERED/'state',self.token,self.policies,CUSTODIAN,clock=self.clock)
        with self.assertRaisesRegex(EvidenceError,'EVIDENCE_POLICY_CHANGED'):
            altered = (replace(self.policies[0],max_age_seconds=90),*self.policies[1:])
            Vault(self.root,self.token,altered,CUSTODIAN,clock=self.clock)

    def test_retention_acquisition_permissions_and_kind(self):
        with self.assertRaisesRegex(EvidenceError,'EVIDENCE_ACQUISITION_NOT_AUTHORISED'):
            self.keep(permission='incorrect')
        with self.assertRaisesRegex(EvidenceError,'EVIDENCE_KIND_NOT_PERMITTED'):
            self.keep(kind='TIMESTAMP')
        digest = self.keep()
        self.clock.advance(2)
        self.assertEqual(self.keep(),digest)
        self.assertEqual(self.vault.verify_integrity()['events'],1)
        with sqlite_writer(self.vault.path) as db:
            self.assertEqual(db.execute('SELECT expires FROM items').fetchone()[0],
                             (NOW+timedelta(seconds=60)).isoformat())

    def test_provider_caps_and_exact_expiry_dispose_copies_atomically(self):
        short = self.keep()
        long = self.keep('fixture-tsa','REVOCATION',b'fixture CRL','tsa-permission')
        limited = self.keep('fixture-restricted','RESULT',b'private fixture result','restricted-permission')
        bundle = self.export([short,long])
        self.assertEqual(self.vault.monitor(warning_seconds=15)['approaching_items'],[limited])
        self.clock.advance(15)
        self.assertEqual(self.vault.monitor()['expired_items'],[limited])
        with self.assertRaisesRegex(EvidenceError,'DISPOSAL_NOT_AUTHORISED'):
            self.vault.dispose(actor='anonymous',approval='disposal-1')
        self.clock.advance(45)
        self.assertEqual(self.vault.monitor()['expired_bundles'],[bundle])
        with self.assertRaisesRegex(EvidenceError,'TRANSFER_UNAVAILABLE_OR_EXPIRED'):
            self.vault.read_transfer(bundle,RECIPIENT)
        disposed = self.vault.dispose(actor=CUSTODIAN,approval='disposal-1')
        self.assertCountEqual(disposed['items'],[short,limited])
        self.assertEqual(disposed['bundles'],[bundle])
        self.assertEqual(self.vault.monitor()['expired_items'],[])
        with sqlite_writer(self.vault.path) as db:
            self.assertEqual(db.execute('SELECT count(*) FROM items WHERE body IS NOT NULL').fetchone()[0],1)
            self.assertEqual(db.execute('SELECT count(*) FROM bundles WHERE body IS NOT NULL').fetchone()[0],0)
        self.assertEqual(self.vault.dispose(actor=CUSTODIAN,approval='disposal-1'),dict(items=[],bundles=[]))
        with self.assertRaisesRegex(EvidenceError,'EVIDENCE_DISPOSED_OR_CORRUPT'):
            self.keep()

    def test_disposal_failure_rolls_back_bodies_then_retries(self):
        item = self.keep()
        bundle = self.export([item])
        self.clock.advance(60)
        with sqlite_writer(self.vault.path) as db:
            db.execute("CREATE TRIGGER reject_audit BEFORE INSERT ON history "
                       "BEGIN SELECT RAISE(ABORT, 'fixture audit failure'); END")
        with self.assertRaisesRegex(sqlite3.IntegrityError, 'fixture audit failure'):
            self.vault.dispose(actor=CUSTODIAN, approval='disposal-1')
        self.assertEqual(self.open().monitor()['expired_items'], [item])
        self.assertEqual(self.open().monitor()['expired_bundles'], [bundle])
        self.assertEqual(self.open().verify_integrity()['events'], 2)
        with sqlite_writer(self.vault.path) as db:
            db.execute('DROP TRIGGER reject_audit')
        self.assertEqual(self.open().dispose(actor=CUSTODIAN, approval='disposal-1'),
                         dict(items=[item], bundles=[bundle]))
        self.assertEqual(self.open().verify_integrity()['events'], 3)

    def test_denied_read_advances_high_water_and_restart_rejects_rollback(self):
        bundle = self.export([self.keep()])
        self.clock.advance(60)
        with self.assertRaisesRegex(EvidenceError,'TRANSFER_UNAVAILABLE_OR_EXPIRED'):
            self.vault.read_transfer(bundle,RECIPIENT)
        self.clock.advance(-1)
        with self.assertRaisesRegex(protocol.ResearchError,'CAPTURE_CLOCK_MOVED_BACKWARDS'):
            self.open().read_transfer(bundle,RECIPIENT)

    def test_mixed_providers_require_permission_from_every_provider(self):
        allowed = self.keep()
        private = self.keep('fixture-restricted','RESULT',b'private fixture','restricted-permission')
        with self.assertRaisesRegex(EvidenceError,'RECIPIENT_NOT_PERMITTED'):
            self.export([allowed,private])
        with self.assertRaisesRegex(EvidenceError,'TRANSFER_NOT_AUTHORISED'):
            self.vault.export([allowed],RECIPIENT,actor=CUSTODIAN,approval='')
        with self.assertRaisesRegex(EvidenceError,'RECIPIENT_NOT_PERMITTED'):
            self.export([allowed],'fixture-reviewer-b')
        bundle = self.export([allowed])
        with self.assertRaisesRegex(EvidenceError,'TRANSFER_UNAVAILABLE_OR_EXPIRED'):
            self.vault.read_transfer(bundle,'fixture-reviewer-b')

    def test_concurrent_duplicate_transfer_approval_is_idempotent(self):
        record = self.keep()
        with ThreadPoolExecutor(3) as workers:
            hashes = list(workers.map(lambda _:self.export([record]),range(3)))
        self.assertEqual(len(set(hashes)),1)
        self.assertEqual(self.vault.verify_integrity()['events'],2)
        another = self.keep(body=b'different result')
        with self.assertRaisesRegex(EvidenceError,'TRANSFER_APPROVAL_ALREADY_USED'):
            self.export([another])

    def test_restore_hash_policy_recipient_and_original_deadline(self):
        digest = self.export([self.keep()])
        body = self.vault.read_transfer(digest,RECIPIENT)
        self.clock.advance(5)
        with workspace() as (root,token):
            other = Vault(root,token,self.policies,CUSTODIAN,clock=self.clock)
            with self.assertRaisesRegex(EvidenceError,'ARCHIVE_HASH_MISMATCH'):
                other.restore(body+b' ',digest,RECIPIENT,actor=CUSTODIAN)
            with self.assertRaisesRegex(EvidenceError,'RESTORE_NOT_AUTHORISED'):
                other.restore(body,digest,'fixture-reviewer-b',actor=CUSTODIAN)
            self.assertEqual(other.restore(body,digest,RECIPIENT,actor=CUSTODIAN),1)
            self.assertEqual(other.restore(body,digest,RECIPIENT,actor=CUSTODIAN),0)
            result = other.verify_integrity()
            self.assertEqual(other.verify_integrity(expected_audit_head=result['audit_head_sha256']),result)
            self.clock.advance(55)
            self.assertEqual(len(other.monitor()['expired_items']),1)
            with self.assertRaisesRegex(EvidenceError,'ARCHIVE_EXPIRED_OR_FUTURE'):
                other.restore(body,digest,RECIPIENT,actor=CUSTODIAN)

    def test_restore_rejects_existing_identity_with_later_original_expiry(self):
        item = self.keep()
        digest = self.export([item])
        body = self.vault.read_transfer(digest, RECIPIENT)
        self.clock.advance(10)
        with workspace() as (root, token):
            other = Vault(root, token, self.policies, CUSTODIAN, clock=self.clock)
            ident = other.keep('fixture-source', 'RESULT', b'fixture evidence', actor=CUSTODIAN,
                               permission='source-permission')
            self.assertEqual(ident, item)
            with self.assertRaisesRegex(EvidenceError, 'ARCHIVE_RETENTION_ORIGIN_CONFLICT'):
                other.restore(body, digest, RECIPIENT, actor=CUSTODIAN)
            self.assertEqual(other.verify_integrity()['events'], 1)

    def test_restore_invalid_member_rolls_back_earlier_insert(self):
        first,second = self.keep(),self.keep(body=b'second result')
        digest = self.export([first,second])
        changed = protocol.strict_json(self.vault.read_transfer(digest,RECIPIENT))
        changed['items'][1]['body_hex'] = b'changed'.hex()
        forged = protocol.canon(changed)
        with workspace() as (root,token):
            other = Vault(root,token,self.policies,CUSTODIAN,clock=self.clock)
            with self.assertRaisesRegex(EvidenceError,'ARCHIVE_MEMBER_INVALID'):
                other.restore(forged,sha(forged),RECIPIENT,actor=CUSTODIAN)
            with sqlite_writer(other.path) as db:
                self.assertEqual(db.execute('SELECT count(*) FROM items').fetchone()[0],0)

    def test_projection_and_unpinned_audit_truncation_detected(self):
        bundle = self.export([self.keep()])
        head = self.vault.verify_integrity()['audit_head_sha256']
        with sqlite_writer(self.vault.path) as db:
            db.execute("UPDATE bundles SET recipient='fixture-reviewer-b'")
        with self.assertRaisesRegex(EvidenceError,'ARCHIVE_PROJECTION_MISMATCH'):
            self.vault.read_transfer(bundle,'fixture-reviewer-b')
        with sqlite_writer(self.vault.path) as db:
            db.execute('DELETE FROM history WHERE idx=2')
        with self.assertRaisesRegex(EvidenceError,'EVIDENCE_AUDIT_PIN_MISMATCH'):
            self.vault.verify_integrity(expected_audit_head=head)

    def test_corrupt_retention_projection_cannot_extend_disclosure(self):
        item = self.keep()
        with sqlite_writer(self.vault.path) as db:
            db.execute('UPDATE items SET expires=?',
                       ((NOW+timedelta(hours=1)).isoformat(),))
        with self.assertRaisesRegex(EvidenceError,'EVIDENCE_INTEGRITY_FAILED'):
            self.export([item])
        with self.assertRaisesRegex(EvidenceError,'EVIDENCE_INTEGRITY_FAILED'):
            self.vault.monitor()
        with self.assertRaisesRegex(EvidenceError,'EVIDENCE_INTEGRITY_FAILED'):
            self.keep()


class ArchiveTests(unittest.TestCase):
    def setUp(self):
        root = Path(self.enterContext(TemporaryDirectory()))
        self.authority = FixtureAuthority(root/'issuer')
        self.path = self.authority.root
        self.now = datetime.now(timezone.utc)
        self.data = protocol.canon(dict(race_id='fixture-archive',startUTC=(self.now+timedelta(hours=1)).isoformat()))
        self.query = request(self.data,self.authority.trust)
        self.response = self.authority.reply(self.query)
        result = verify(self.data,self.query,self.response,self.now+timedelta(minutes=5),self.authority.trust)
        self.signed = utc(result['signed_gen_utc'])
        self.observed = self.signed+timedelta(seconds=5)

    def crl(self, *, revoked=False, expired=False):
        config = self.path/'revocation.cnf'
        db = self.path/'index.txt'
        db.write_text('',encoding='ascii')
        config.write_text(f'[ca]\ndefault_ca=issuer\n[issuer]\ndatabase={db}\n'
                          f'certificate={self.path/"root.pem"}\nprivate_key={self.path/"root.key"}\n'
                          'default_md=sha256\ndefault_crl_days=1\n',encoding='ascii')
        if revoked:
            openssl('ca','-config',config,'-revoke',self.path/'tsa.pem','-crl_reason','keyCompromise')
        start = self.signed.strftime('%Y%m%d%H%M%SZ')
        end = ((self.signed+timedelta(seconds=2)) if expired else
               (self.signed+timedelta(hours=1))).strftime('%Y%m%d%H%M%SZ')
        return openssl('ca','-config',config,'-gencrl','-crl_lastupdate',start,'-crl_nextupdate',end)

    def examine(self, crl):
        return verify_archive(self.data,self.query,self.response,crl,self.observed,self.authority.trust)

    def test_archival_verification_after_provider_authorised_restore(self):
        crl = self.crl()
        expected = self.examine(crl)
        self.assertEqual(expected['crl_sha256'],sha(crl))
        self.assertFalse(expected['external_attestation_qualified'])
        with workspace() as (source,token), workspace() as (target,restored_token):
            clock = FixtureClock(self.observed)
            policies = (Policy('fixture-tsa','tsa-permission',('FORECAST','TIMESTAMP','REVOCATION'),30,
                               (self.observed+timedelta(hours=1)).isoformat(),(RECIPIENT,)),)
            vault = Vault(source,token,policies,CUSTODIAN,clock=clock)
            bodies = {'FORECAST':self.data,'REVOCATION':crl,
                      'TIMESTAMP':protocol.canon(dict(query=self.query.hex(),response=self.response.hex()))}
            items = [vault.keep('fixture-tsa',k,v,actor=CUSTODIAN,permission='tsa-permission')
                     for k,v in bodies.items()]
            pin = vault.export(items,RECIPIENT,actor=CUSTODIAN,approval='archive-review')
            bundle = vault.read_transfer(pin,RECIPIENT)
            restored = Vault(target,restored_token,policies,CUSTODIAN,clock=clock)
            self.assertEqual(restored.restore(bundle,pin,RECIPIENT,actor=CUSTODIAN),3)
            restored.verify_integrity()
            again = restored.export(items,RECIPIENT,actor=CUSTODIAN,approval='restored-review')
            pack = protocol.strict_json(restored.read_transfer(again,RECIPIENT))
            copied = {item['kind']:bytes.fromhex(item['body_hex']) for item in pack['items']}
            self.assertEqual(copied,bodies)
            witness = protocol.strict_json(copied['TIMESTAMP'])
            actual = verify_archive(copied['FORECAST'],bytes.fromhex(witness['query']),
                                    bytes.fromhex(witness['response']),copied['REVOCATION'],
                                    self.observed,self.authority.trust)
            self.assertEqual(actual,expected)

    def test_revoked_signer_and_outdated_crl_fail_closed(self):
        with self.assertRaisesRegex(EvidenceError,'CRL_OUTSIDE_OBSERVATION_WINDOW'):
            self.examine(self.crl(expired=True))
        with self.assertRaisesRegex(EvidenceError,'CRYPTO_VERIFICATION_FAILED'):
            self.examine(self.crl(revoked=True))

    def test_truncated_crl_and_modified_exact_forecast_fail(self):
        crl = self.crl()
        with self.assertRaisesRegex(EvidenceError,'CRYPTO_VERIFICATION_FAILED'):
            self.examine(crl[:len(crl)//2])
        changed = protocol.canon(protocol.strict_json(self.data) | {'other':'different'})
        with self.assertRaisesRegex(EvidenceError,'CRYPTO_VERIFICATION_FAILED'):
            verify_archive(changed,self.query,self.response,crl,self.observed,self.authority.trust)


if __name__ == '__main__':
    unittest.main()
