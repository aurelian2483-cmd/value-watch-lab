"""Synthetic-only tests for encrypted custody and recovery."""
from dataclasses import replace
from datetime import datetime, timedelta, timezone
from pathlib import Path
from tempfile import TemporaryDirectory
import unittest
from unittest.mock import patch

from transfer import RecipientPolicy, _openssl, restore, seal
from fixtures import FixtureClock
from ledger import workspace
from vault import Policy, Vault, EvidenceError, sha


class TransferTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        root = Path(cls.enterClassContext(TemporaryDirectory()))
        cls.keys = []
        for index in range(2):
            key, cert = root/f'key{index}.pem', root/f'cert{index}.pem'
            _openssl('req','-x509','-new','-newkey','rsa:2048','-nodes','-days','2',
                     '-subj',f'/CN=Disposable archive recipient {index}','-keyout',key,'-out',cert)
            key.chmod(0o600)
            cls.keys.append((key,cert.read_bytes(),sha(_openssl('x509','-in',cert,'-outform','DER'))))

    def setUp(self):
        now = datetime(2026,12,1,12,tzinfo=timezone.utc)
        self.clock = FixtureClock(now)
        self.policy = Policy('fixture-private-archive','synthetic-test',('TIMESTAMP',),60,
                             (now+timedelta(days=1)).isoformat(),('reviewer-fixture',))
        self.target, self.origin = (self.vault(),self.vault())
        self.key_policy = RecipientPolicy((('reviewer-fixture',self.keys[0][2]),))
        self.data = b'Value Watch synthetic custody fixture'
        self.item = self.origin.keep(self.policy.provider,'TIMESTAMP',self.data,
                                     actor='fixture-owner',permission=self.policy.permission)

    def vault(self):
        root, capability = self.enterContext(workspace())
        return Vault(root,capability,(self.policy,),'fixture-owner',clock=self.clock)

    def seal(self, recipient='reviewer-fixture', **overrides):
        _,cert,_ = self.keys[0]
        args = dict(actor='fixture-owner',approval='review-copy',certificate=cert,key_policy=self.key_policy)
        return seal(self.origin,[self.item],recipient,**(args|overrides))

    def restore(self, package, **overrides):
        key,cert,_ = self.keys[0]
        args = dict(actor='fixture-owner',ciphertext_pin=package.ciphertext_sha256,bundle_pin=package.bundle_sha256,
                    certificate=cert,key_policy=self.key_policy,private_key=key)
        return restore(self.target,package.ciphertext,'reviewer-fixture',**(args|overrides))

    def test_encrypted_backup_round_trips_and_retry_is_idempotent(self):
        package = self.seal()
        self.assertNotIn(self.data,package.ciphertext)
        self.assertNotEqual(package.ciphertext,self.seal().ciphertext)
        self.assertEqual(self.restore(package),1)
        self.assertEqual(self.restore(package),0)
        self.assertEqual(self.target.verify_integrity()['events'],1)

    def test_unapproved_recipient_and_pin_are_rejected(self):
        _,cert,pin = self.keys[1]
        with self.assertRaisesRegex(EvidenceError,'RECIPIENT_CERTIFICATE_PIN_MISMATCH'):
            self.seal(certificate=cert)
        with self.assertRaisesRegex(EvidenceError,'RECIPIENT_KEY_POLICY_CHANGED'):
            self.seal(certificate=cert,key_policy=RecipientPolicy((('reviewer-fixture',pin),)))
        with self.assertRaises(EvidenceError):
            self.seal('unapproved-fixture')

    def test_ciphertext_and_authenticated_tampering_fail(self):
        package = self.seal()
        changed = package.ciphertext[:-1]+bytes([package.ciphertext[-1]^1])
        with self.assertRaisesRegex(EvidenceError,'CIPHERTEXT_PIN_MISMATCH'):
            self.restore(replace(package,ciphertext=changed))
        with self.assertRaisesRegex(EvidenceError,'ENCRYPTION_OPERATION_FAILED'):
            self.restore(replace(package,ciphertext=changed,ciphertext_sha256=sha(changed)))
        self.assertEqual(self.target.verify_integrity()['events'],0)

    def test_interrupted_encryption_retains_one_approval_and_allows_retry(self):
        def interrupted(*args, **kwargs):
            if args[:2]==('cms','-encrypt'):
                raise EvidenceError('FIXTURE_INTERRUPTED')
            return _openssl(*args,**kwargs)

        with patch('transfer._openssl',side_effect=interrupted):
            with self.assertRaisesRegex(EvidenceError,'FIXTURE_INTERRUPTED'):
                self.seal()
        events = self.origin.verify_integrity()['events']
        self.assertEqual(self.restore(self.seal()),1)
        self.assertEqual(self.origin.verify_integrity()['events'],events)

    def test_wrong_key_and_rotated_recipient_fail(self):
        package = self.seal()
        key,cert,_ = self.keys[1]
        with self.assertRaisesRegex(EvidenceError,'ENCRYPTION_OPERATION_FAILED'):
            self.restore(package,private_key=key)
        with self.assertRaisesRegex(EvidenceError,'RECIPIENT_CERTIFICATE_PIN_MISMATCH'):
            self.restore(package,private_key=key,certificate=cert)

    def test_expiry_continues_to_apply_to_encrypted_copy(self):
        package = self.seal()
        self.clock.advance(60)
        with self.assertRaisesRegex(EvidenceError,'ARCHIVE_EXPIRED_OR_FUTURE'):
            self.restore(package)
        self.assertEqual(self.target.verify_integrity()['events'],0)

    def test_failed_hash_check_leaves_vault_empty_and_retry_recovers(self):
        package = self.seal()
        with self.assertRaisesRegex(EvidenceError,'ARCHIVE_HASH_MISMATCH'):
            self.restore(package,bundle_pin='f'*64)
        self.assertEqual(self.target.verify_integrity()['events'],0)
        self.assertEqual(self.restore(package),1)


if __name__ == '__main__':
    unittest.main()
