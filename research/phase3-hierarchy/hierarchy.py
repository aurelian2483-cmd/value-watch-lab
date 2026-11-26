"""Offline, synthetic RFC 3161 hierarchy and archived status verification."""
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
import os
from pathlib import Path
import re
import subprocess
import sys
from tempfile import TemporaryDirectory

sys.path.insert(0, str(Path(__file__).resolve().parents[1]/'phase3-evidence'))
from stamps import (EvidenceError, MAX_RECEIPT, Trust, check_der, generation_time, handle,
                    max_error_us, openssl, require, sha)

PEM_CERT = re.compile(rb'-----BEGIN CERTIFICATE-----\r?\n[A-Za-z0-9+/=\r\n]+'
                      rb'-----END CERTIFICATE-----\r?\n?')
DIGEST = re.compile(r'[0-9a-f]{64}')


@dataclass(frozen=True)
class Profile:
    """A caller selects an independently pinned, versioned signer and root."""
    version: str
    trust: Trust
    signer_der_sha256: str

    def __post_init__(self):
        require(bool(re.fullmatch(r'[a-z0-9-]{1,64}', self.version))
                and bool(DIGEST.fullmatch(self.signer_der_sha256)), 'INVALID_TSA_PROFILE')


@dataclass(frozen=True)
class Status:
    certificate_der_sha256: str
    kind: str
    raw: bytes
    observed_utc: datetime


def _aware(value):
    require(isinstance(value, datetime) and value.utcoffset() is not None, 'TIMESTAMP_NOT_AWARE')
    return value.astimezone(timezone.utc)


def _certificate(path, pem):
    require(isinstance(pem, bytes) and 0 < len(pem) <= MAX_RECEIPT and PEM_CERT.fullmatch(pem),
            'INVALID_SINGLE_CERTIFICATE')
    path.write_bytes(pem)
    return sha(openssl('x509', '-in', path, '-outform', 'DER'))


def _integer(label, text):
    value = handle(text, label)
    require(re.fullmatch(r'0x[0-9A-Fa-f]+', value) and int(value, 16) > 0, 'TSA_NONCE_REQUIRED')
    return int(value, 16)


def _claims(query, response, profile):
    request = openssl('ts', '-query', '-in', query, '-text').decode('ascii', errors='replace')
    receipt = openssl('ts', '-reply', '-in', response, '-text').decode('ascii', errors='replace')
    require(handle(receipt, 'Status') == 'Granted.', 'TIMESTAMP_NOT_GRANTED')
    require(handle(receipt, 'Policy OID') == profile.trust.policy_oid, 'TSA_POLICY_MISMATCH')
    require(handle(receipt, 'Hash Algorithm').lower() == 'sha256'
            and handle(request, 'Hash Algorithm').lower() == 'sha256', 'TSA_DIGEST_NOT_SHA256')
    require(_integer('Nonce', request) == _integer('Nonce', receipt), 'TSA_NONCE_MISMATCH')
    return generation_time(receipt), max_error_us(receipt, profile.trust.max_error_us)


def _verify_token(work, exact, query, response, cutoff, profile, intermediates):
    require(isinstance(exact, bytes) and 0 < len(exact) <= MAX_RECEIPT
            and exact.startswith(b'Value Watch synthetic '), 'SYNTHETIC_INPUT_REQUIRED')
    require(isinstance(intermediates, tuple) and len(intermediates) <= 6, 'CHAIN_SIZE_LIMIT')
    check_der(query)
    check_der(response)
    cutoff = _aware(cutoff)
    raw, req, resp, root, cms, signer = (work/name for name in
                                         ('payload', 'request.tsq', 'response.tsr', 'root.pem',
                                          'token.der', 'signer.pem'))
    for path, value in ((raw, exact), (req, query), (resp, response)):
        path.write_bytes(value)
    root_id = _certificate(root, profile.trust.ca_pem)
    intermediate_paths = [work/f'ca-{i}.pem' for i in range(len(intermediates))]
    intermediate_ids = [_certificate(path, pem) for path, pem in zip(intermediate_paths, intermediates)]
    require(len(set([root_id, *intermediate_ids])) == 1+len(intermediate_ids), 'DUPLICATE_CA_CERTIFICATE')

    generation, error_us = _claims(req, resp, profile)
    epoch = int(generation.timestamp())
    openssl('verify', '-check_ss_sig', '-trusted', root, '-attime', epoch, root)
    ca_path = work/'empty-ca'
    ca_path.mkdir()
    command = ('ts', '-verify', '-in', resp, '-CAfile', root, '-CApath', ca_path,
               '-CAstore', root.as_uri(), '-attime', epoch)
    if intermediates:
        bundle = work/'untrusted.pem'
        bundle.write_bytes(b'\n'.join(intermediates))
        command += ('-untrusted', bundle)
    openssl(*command, '-queryfile', req)
    openssl(*command, '-data', raw)

    cms.write_bytes(openssl('ts', '-reply', '-in', resp, '-token_out'))
    openssl('cms', '-verify', '-inform', 'DER', '-in', cms, '-noverify', '-binary',
            '-signer', signer, '-out', work/'tst-info.der')
    signer_id = _certificate(signer, signer.read_bytes())
    require(signer_id == profile.signer_der_sha256, 'UNAPPROVED_TSA_SIGNER')

    certificates = [signer, *intermediate_paths, root]
    ids = [signer_id, *intermediate_ids, root_id]
    require(len(set(ids)) == len(ids), 'DUPLICATE_CHAIN_CERTIFICATE')
    # Validate the explicitly supplied path in leaf-first order. A CMS-embedded
    # alternative path does not satisfy the pinned path used for revocation.
    path_check = ('verify', '-trusted', root, '-purpose', 'timestampsign', '-attime', epoch)
    if intermediates:
        path_check += ('-untrusted', bundle)
    openssl(*path_check, signer)
    for certificate, issuer in zip(certificates, certificates[1:]):
        openssl('verify', '-partial_chain', '-trusted', issuer, '-attime', epoch, certificate)
    upper = generation+timedelta(microseconds=error_us)
    require(upper < cutoff, 'TIMESTAMP_TOO_LATE')
    witness = dict(profile=profile.version, policy_oid=profile.trust.policy_oid, signed_time=generation.isoformat(),
                   accuracy_us=error_us, latest_possible_utc=upper.isoformat(), cutoff_utc=cutoff.isoformat(),
                   root_der_sha256=root_id, chain_der_sha256=ids, request_sha256=sha(query),
                   response_sha256=sha(response), payload_sha256=sha(exact), external_attestation_qualified=False)
    return witness, generation, certificates, ids


def verify_token(exact, query, response, cutoff, profile, intermediates=()):
    """Prove signature and timing for synthetic bytes, before revocation review."""
    with TemporaryDirectory(prefix='vw-tiered-tsa-') as directory:
        witness, *_ = _verify_token(Path(directory), exact, query, response, cutoff, profile, intermediates)
    return witness


def _stamp(value):
    return generation_time('Time stamp: '+value.strip())


def _ocsp_verified(*arguments):
    # Some OpenSSL versions print the certificate status even when signature
    # verification fails. A successful exit and explicit signature verdict are required.
    try:
        result = subprocess.run(['openssl','ocsp',*map(str,arguments)], capture_output=True,
                                timeout=10, env={**os.environ,'LC_ALL':'C'}, check=False)
    except (OSError, subprocess.TimeoutExpired) as exc:
        raise EvidenceError('CRYPTO_TOOL_UNAVAILABLE') from exc
    require(result.returncode == 0 and b'Response verify OK' in result.stderr.splitlines(),
            'OCSP_SIGNATURE_OR_RESPONDER_INVALID')
    return result.stdout.decode('utf-8')


def _check_status(work, item, generation, certificate, issuer, root, issuers, index):
    checked = _aware(item.observed_utc)
    require(isinstance(item.raw, bytes) and 0 < len(item.raw) <= MAX_RECEIPT, 'STATUS_SIZE_LIMIT')
    path = work/f'revocation-{index}'
    path.write_bytes(item.raw)
    epoch = int(checked.timestamp())
    if item.kind in ('CRL_PEM','CRL_DER'):
        if item.kind == 'CRL_DER':
            converted = work/f'converted-crl-{index}'
            converted.write_bytes(openssl('crl', '-inform', 'DER', '-in', path, '-outform', 'PEM'))
            path = converted
        info = openssl('crl', '-in', path, '-noout', '-lastupdate', '-nextupdate').decode('ascii')
        start, end = (_stamp(handle(info.replace('=', ': '), label)) for label in ('lastUpdate', 'nextUpdate'))
        require(generation <= start <= checked < end, 'REVOCATION_OUTSIDE_OBSERVATION_WINDOW')
        openssl('verify', '-partial_chain', '-trusted', issuer, '-crl_check', '-CRLfile', path,
                '-attime', epoch, certificate)
    elif item.kind == 'OCSP_DER':
        check_der(item.raw)
        out = _ocsp_verified('-respin', path, '-issuer', issuer, '-cert', certificate,
                             '-CAfile', root, '-no-CApath', '-no-CAstore', '-verify_other', issuers,
                             '-no_nonce', '-no_explicit', '-attime', epoch)
        lines = out.splitlines()
        require(lines and lines[0].endswith(': good'), 'OCSP_CERTIFICATE_NOT_GOOD')
        start, end = (_stamp(handle('\n'.join(line.strip() for line in lines), label))
                      for label in ('This Update', 'Next Update'))
        detail = openssl('ocsp', '-respin', path, '-text', '-noverify').decode('ascii')
        fields = '\n'.join(line.strip() for line in detail.splitlines())
        produced = _stamp(handle(fields, 'Produced At'))
        require(generation <= start <= produced <= checked < end, 'REVOCATION_OUTSIDE_OBSERVATION_WINDOW')
    else:
        require(False, 'UNKNOWN_REVOCATION_KIND')
    return dict(certificate_der_sha256=item.certificate_der_sha256, kind=item.kind, raw_sha256=sha(item.raw),
                this_update=start.isoformat(), next_update=end.isoformat(), observed_utc=checked.isoformat())


def verify_archive(exact, query, response, cutoff, profile, intermediates, statuses):
    """Require post-generation signed status for every non-root certificate."""
    with TemporaryDirectory(prefix='vw-tiered-archive-') as directory:
        work = Path(directory)
        witness, generation, path, ids = _verify_token(work, exact, query, response, cutoff, profile, intermediates)
        require(isinstance(statuses, tuple) and len(statuses) == len(ids)-1, 'INCOMPLETE_CHAIN_STATUS')
        by_id = {item.certificate_der_sha256:item for item in statuses}
        require(set(by_id) == set(ids[:-1]), 'INCOMPLETE_CHAIN_STATUS')
        issuers = work/'issuer-certs.pem'
        issuers.write_bytes(b'\n'.join(cert.read_bytes() for cert in path[1:]))
        status = [_check_status(work, by_id[identity], generation, cert, issuer, path[-1], issuers, index)
                  for index, (identity, cert, issuer) in enumerate(zip(ids, path, path[1:]))]
    return witness | dict(status='SYNTHETIC_ARCHIVE_VERIFIED', chain_status=status)
