"""Revalidate exact disposable RFC 3161 evidence with a retained issuer CRL."""
from datetime import datetime, timezone
from pathlib import Path
from tempfile import TemporaryDirectory

from vault import protocol
from stamps import CUTOFF, MAX_RECEIPT, openssl, require, sha, utc, verify


def _crl_time(value):
    # OpenSSL uses C-locale English for CRL display; openssl() pins LC_ALL=C.
    months = ('Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec')
    month, day, hms, year, zone = value.decode('ascii').split()
    require(month in months and zone == 'GMT', 'CRL_TIMESTAMP_INVALID')
    return utc(f'{year}-{months.index(month)+1:02}-{int(day):02}T{hms}Z')


def verify_archive(forecast_bytes, query, response, crl, observed, trust):
    """Conservative direct-issuer profile. Later compromise evidence still matters."""
    data = protocol.strict_json(forecast_bytes)
    require(isinstance(data,dict) and str(data.get('race_id','')).startswith('fixture-')
            and protocol.canon(data) == forecast_bytes, 'DISPOSABLE_FORECAST_REQUIRED')
    witness = verify(forecast_bytes,query,response,utc(data['startUTC'])-CUTOFF,trust)
    require(isinstance(observed,datetime) and observed.utcoffset() is not None, 'TIMESTAMP_NOT_AWARE')
    checked = observed.astimezone(timezone.utc)
    require(0 < len(crl) <= MAX_RECEIPT, 'CRL_SIZE_LIMIT')
    with TemporaryDirectory(prefix='vw-archive-verification-') as directory:
        root = Path(directory)
        tsr, anchor, chain, leaf, revocation = (root/name for name in
            ('timestamp.tsr','anchor.pem','token.der','signer.pem','issuer.crl'))
        tsr.write_bytes(response)
        anchor.write_bytes(trust.ca_pem)
        revocation.write_bytes(crl)
        chain.write_bytes(openssl('ts','-reply','-in',tsr,'-token_out'))
        # Extract the signer from the same signature-verified CMS token. The
        # RFC 3161 verification above checks its purpose and pinned chain.
        openssl('cms','-verify','-inform','DER','-in',chain,'-noverify','-binary','-signer',leaf,
                '-out',root/'signed-tstinfo.der')
        require(leaf.read_bytes().count(b'-----BEGIN CERTIFICATE-----') == 1, 'AMBIGUOUS_TSA_SIGNER')
        times = openssl('crl','-in',revocation,'-noout','-lastupdate','-nextupdate').splitlines()
        require(len(times) == 2 and times[0].startswith(b'lastUpdate=')
                and times[1].startswith(b'nextUpdate='), 'CRL_TIMESTAMP_INVALID')
        start, end = (_crl_time(line.split(b'=',1)[1]) for line in times)
        require(utc(witness['signed_gen_utc']) <= start <= checked < end, 'CRL_OUTSIDE_OBSERVATION_WINDOW')
        # Require a retained, signed CRL covering the leaf. -trusted restricts
        # trust to the approved anchor. Any revocation remains disqualifying.
        openssl('verify','-trusted',anchor,'-purpose','timestampsign','-crl_check',
                '-CRLfile',revocation,'-attime',int(checked.timestamp()),leaf)
        signer = sha(openssl('x509','-in',leaf,'-outform','DER'))
    return witness | dict(status='FIXTURE_ARCHIVAL_VERIFICATION_PASSED', signer_sha256=signer,
                          crl_sha256=sha(crl), crl_this_update=start.isoformat(),
                          crl_next_update=end.isoformat(), checked_utc=checked.isoformat(),
                          external_attestation_qualified=False)
