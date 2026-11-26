"""Recipient-bound encryption for authorised disposable vault handoffs."""
from dataclasses import dataclass
import os
from pathlib import Path
import re
import subprocess
import sys
from tempfile import TemporaryDirectory

sys.path.insert(0, str(Path(__file__).resolve().parents[1]/'phase3-lifecycle'))
from vault import MAX_BUNDLE, EvidenceError, protocol, require, sha, sqlite_writer

MAX_SEALED = MAX_BUNDLE + 16 * 1024
AUTH_ENVELOPED_OID = bytes.fromhex('060b2a864886f70d0109100117')
SHA256 = re.compile(r'[a-f0-9]{64}')


@dataclass(frozen=True)
class RecipientPolicy:
    """Trusted fixture configuration, supplied outside individual requests."""
    pins: tuple

    def __post_init__(self):
        require(bool(self.pins) and len(dict(self.pins)) == len(self.pins)
                and all(isinstance(name, str) and name and SHA256.fullmatch(pin)
                        for name, pin in self.pins), 'RECIPIENT_KEY_POLICY_INVALID')


def _pinned_recipient(vault, policy, recipient, actor):
    require(actor == vault.custodian, 'CUSTODY_ACTOR_NOT_APPROVED')
    expected = dict(policy.pins).get(recipient)
    require(expected is not None, 'RECIPIENT_KEY_NOT_APPROVED')
    fingerprint = protocol.sha(sorted(policy.pins))
    state_key = 'encrypted_recipient_policy_sha256'
    with sqlite_writer(vault.path) as db:
        db.execute('INSERT OR IGNORE INTO state VALUES (?,?)', (state_key,fingerprint))
        found = db.execute('SELECT value FROM state WHERE name=?', (state_key,)).fetchone()
        require(found['value'] == fingerprint, 'RECIPIENT_KEY_POLICY_CHANGED')
    return expected


@dataclass(frozen=True)
class Transfer:
    ciphertext: bytes
    ciphertext_sha256: str
    bundle_sha256: str
    recipient_certificate_sha256: str


def _openssl(*command, payload=b''):
    try:
        result = subprocess.run(['openssl', *map(str,command)], input=payload, capture_output=True,
                                check=False, timeout=15, env={**os.environ,'LC_ALL':'C'})
    except (OSError, subprocess.TimeoutExpired) as error:
        raise EvidenceError('ENCRYPTION_TOOL_UNAVAILABLE') from error
    require(result.returncode == 0, 'ENCRYPTION_OPERATION_FAILED')
    return result.stdout


def _certificate(directory, certificate, expected):
    require(isinstance(certificate,bytes) and 0 < len(certificate) <= 16384
            and certificate.count(b'-----BEGIN CERTIFICATE-----') == 1
            and SHA256.fullmatch(expected), 'RECIPIENT_CERTIFICATE_INVALID')
    path = Path(directory)/'recipient.pem'
    path.write_bytes(certificate)
    require(sha(_openssl('x509','-in',path,'-outform','DER')) == expected,
            'RECIPIENT_CERTIFICATE_PIN_MISMATCH')
    return path


def _authenticated_container(encrypted):
    require(isinstance(encrypted,bytes) and 2 <= len(encrypted) <= MAX_SEALED
            and encrypted[0] == 0x30, 'INVALID_ENCRYPTED_CONTAINER')
    first = encrypted[1]
    size = first-128 if first >= 128 else 0
    require(first < 128 or 1 <= size <= 4, 'INVALID_ENCRYPTED_CONTAINER')
    length = int.from_bytes(encrypted[2:2+size],'big') if size else first
    require(length == len(encrypted)-2-size and encrypted[2+size:].startswith(AUTH_ENVELOPED_OID),
            'AUTHENTICATED_ENCRYPTION_REQUIRED')


def seal(vault, items, recipient, *, actor, approval, certificate, key_policy):
    """Apply vault transfer policy, then encrypt the approved exact bytes."""
    certificate_pin = _pinned_recipient(vault,key_policy,recipient,actor)
    with TemporaryDirectory(prefix='vw-private-handoff-') as directory:
        cert = _certificate(directory,certificate,certificate_pin)
        bundle_sha = vault.export(items,recipient,actor=actor,approval=approval)
        raw = vault.read_transfer(bundle_sha,recipient)
        encrypted = _openssl('cms','-encrypt','-binary','-aes-256-gcm','-outform','DER',
                             '-recip',cert,'-keyopt','rsa_padding_mode:oaep',
                             '-keyopt','rsa_oaep_md:sha256','-keyopt','rsa_mgf1_md:sha256',payload=raw)
    _authenticated_container(encrypted)
    return Transfer(encrypted,sha(encrypted),bundle_sha,certificate_pin)


def restore(vault, encrypted, recipient, *, actor, ciphertext_pin, bundle_pin, certificate,
            key_policy, private_key):
    """Restore only when separately pinned ciphertext and custody manifest agree."""
    _authenticated_container(encrypted)
    require(sha(encrypted) == ciphertext_pin, 'CIPHERTEXT_PIN_MISMATCH')
    certificate_pin = _pinned_recipient(vault,key_policy,recipient,actor)
    key = Path(private_key)
    require(not key.is_symlink() and key.is_file()
            and (os.name == 'nt' or key.stat().st_mode & 0o077 == 0), 'PRIVATE_KEY_LOCATION_UNSAFE')
    with TemporaryDirectory(prefix='vw-private-handoff-') as directory:
        cert = _certificate(directory,certificate,certificate_pin)
        raw = _openssl('cms','-decrypt','-binary','-inform','DER','-recip',cert,'-inkey',key,
                       '-passin','pass:',payload=encrypted)
    require(sha(raw) == bundle_pin, 'ARCHIVE_HASH_MISMATCH')
    return vault.restore(raw,bundle_pin,recipient,actor=actor)
