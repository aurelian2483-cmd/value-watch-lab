"""RFC 3161 proof verification for isolated evidence qualification."""
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
import hashlib
import http.client
import os
from pathlib import Path
import re
import subprocess
from tempfile import TemporaryDirectory
from urllib.parse import urlsplit

MAX_RECEIPT = 64 * 1024
CUTOFF = timedelta(minutes=5)


class EvidenceError(ValueError):
    pass


def require(ok, reason):
    if not ok:
        raise EvidenceError(reason)


def sha(raw):
    return hashlib.sha256(raw).hexdigest()


def openssl(*arguments):
    try:
        outcome = subprocess.run(['openssl', *map(str, arguments)], capture_output=True,
                                 timeout=10, env={**os.environ, 'LC_ALL': 'C'})
    except (OSError, subprocess.TimeoutExpired) as exc:
        raise EvidenceError('CRYPTO_TOOL_UNAVAILABLE') from exc
    if outcome.returncode:
        raise EvidenceError('CRYPTO_VERIFICATION_FAILED')
    return outcome.stdout


def utc(value):
    try:
        timestamp = datetime.fromisoformat(value.replace('Z', '+00:00'))
        require(timestamp.utcoffset() is not None, 'TIMESTAMP_NOT_AWARE')
        return timestamp.astimezone(timezone.utc)
    except (AttributeError, TypeError, ValueError) as exc:
        raise EvidenceError('TIMESTAMP_NOT_AWARE') from exc


@dataclass(frozen=True)
class Trust:
    ca_pem: bytes
    ca_sha256: str
    policy_oid: str
    max_error_us: int

    def __post_init__(self):
        require(0 < len(self.ca_pem) <= MAX_RECEIPT and sha(self.ca_pem) == self.ca_sha256,
                'UNAPPROVED_TSA_ANCHOR')
        require(re.fullmatch(r'[0-2](?:\.[0-9]+){2,}', self.policy_oid) is not None,
                'INVALID_TSA_POLICY')
        require(type(self.max_error_us) is int and 0 < self.max_error_us <= 60_000_000,
                'INVALID_TSA_ACCURACY_POLICY')


def handle(fields, label):
    values = re.findall(r'^' + re.escape(label) + r':\s*(.+)$', fields, re.M)
    require(len(values) == 1, 'INVALID_TSA_RESPONSE_FIELDS')
    return values[0].strip()


def generation_time(text):
    source = handle(text, 'Time stamp')
    match = re.fullmatch(r'([A-Z][a-z]{2})\s+(\d{1,2}) (\d\d:\d\d:\d\d)(?:\.(\d{1,6}))? (\d{4}) GMT', source)
    require(match is not None, 'INVALID_TSA_GENERATION_TIME')
    month, day, hms, fraction, year = match.groups()
    months = ('Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec')
    require(month in months, 'INVALID_TSA_GENERATION_TIME')
    return utc(f'{year}-{months.index(month)+1:02}-{int(day):02}T{hms}.{(fraction or "").ljust(6, "0")}Z')


def max_error_us(text, permitted):
    raw = handle(text, 'Accuracy')
    match = re.fullmatch(r'(0x[0-9A-Fa-f]+|unspecified) seconds, '
                         r'(0x[0-9A-Fa-f]+|unspecified) millis, '
                         r'(0x[0-9A-Fa-f]+|unspecified) micros', raw)
    require(match is not None and any(item != 'unspecified' for item in match.groups()),
            'TSA_ACCURACY_UNSPECIFIED')
    seconds, millis, micros = [int(value, 16) if value != 'unspecified' else 0 for value in match.groups()]
    upper = seconds*1_000_000 + millis*1_000 + micros
    require(millis <= 999 and micros <= 999 and 0 < upper <= permitted, 'TSA_ACCURACY_OUT_OF_POLICY')
    return upper


def request(exact_bytes, trust):
    with TemporaryDirectory(prefix='vw-tsq-') as directory:
        raw = Path(directory)/'forecast.json'
        raw.write_bytes(exact_bytes)
        return openssl('ts', '-query', '-data', raw, '-sha256', '-tspolicy', trust.policy_oid, '-cert')


def check_der(raw):
    require(2 <= len(raw) <= MAX_RECEIPT and raw[0] == 0x30, 'INVALID_TIMESTAMP_DER')
    size = raw[1]
    if size < 128:
        require(size == len(raw)-2, 'INVALID_TIMESTAMP_DER')
    else:
        octets = size - 128
        require(1 <= octets <= 3 and len(raw) > 2+octets and raw[2] != 0, 'INVALID_TIMESTAMP_DER')
        length = int.from_bytes(raw[2:2+octets], 'big')
        require(length >= 128 and length == len(raw)-2-octets, 'INVALID_TIMESTAMP_DER')


def verify(exact_bytes, query, response, cutoff, trust):
    """Return a conservative upper bound only after signature and binding checks."""
    check_der(query)
    check_der(response)
    require(isinstance(cutoff, datetime) and cutoff.utcoffset() is not None, 'TIMESTAMP_NOT_AWARE')
    with TemporaryDirectory(prefix='vw-tsr-') as directory:
        root = Path(directory)
        empty_ca = root/'empty-ca-path'
        empty_ca.mkdir()
        raw, req, resp, ca = (root/name for name in ('forecast.json','request.tsq','response.tsr','anchor.pem'))
        for path, value in ((raw, exact_bytes),(req, query),(resp, response),(ca, trust.ca_pem)):
            path.write_bytes(value)
        text = openssl('ts', '-reply', '-in', resp, '-text').decode('ascii', errors='replace')
        require(handle(text, 'Status') == 'Granted.', 'TIMESTAMP_NOT_GRANTED')
        require(handle(text, 'Policy OID') == trust.policy_oid, 'TSA_POLICY_MISMATCH')
        require(handle(text, 'Hash Algorithm').lower() == 'sha256', 'TSA_DIGEST_NOT_SHA256')
        nonce = handle(text, 'Nonce')
        require(re.fullmatch(r'0x[0-9A-Fa-f]+', nonce) is not None and int(nonce,16) > 0, 'TSA_NONCE_MISSING')
        gen = generation_time(text)
        error = max_error_us(text, trust.max_error_us)
        command = ('ts', '-verify', '-in', resp, '-CAfile', ca, '-CApath', empty_ca, '-CAstore', ca.as_uri(),
                   '-attime', int(gen.timestamp()))
        # First require request policy, message imprint and nonce. Then bind a
        # separately supplied, exact byte stream as the SHA-256 preimage.
        openssl(*command, '-queryfile', req)
        openssl(*command, '-data', raw)
    upper = gen + timedelta(microseconds=error)
    require(upper < cutoff, 'TIMESTAMP_TOO_LATE')
    return dict(forecast_sha256=sha(exact_bytes), response_sha256=sha(response),
                request_sha256=sha(query), authority_sha256=trust.ca_sha256,
                policy_oid=trust.policy_oid, signed_gen_utc=gen.isoformat(),
                error_us=error, latest_possible_utc=upper.isoformat(), cutoff_utc=cutoff.isoformat())


def post_freetsa(query):
    """Optional research transport for a permitted synthetic digest, with no default caller."""
    endpoint = urlsplit('https://freetsa.org/tsr')
    require(0 < len(query) <= MAX_RECEIPT, 'TIMESTAMP_SIZE_LIMIT')
    client = http.client.HTTPSConnection(endpoint.hostname, timeout=5)
    try:
        client.request('POST', endpoint.path, body=query, headers={'Content-Type':'application/timestamp-query'})
        response = client.getresponse()
        require(response.status == 200
                and response.getheader('Content-Type', '').split(';')[0].strip() == 'application/timestamp-reply',
                'TIMESTAMP_SERVICE_UNAVAILABLE')
        data = response.read(MAX_RECEIPT+1)
        require(0 < len(data) <= MAX_RECEIPT, 'TIMESTAMP_SIZE_LIMIT')
        return data
    except (OSError, http.client.HTTPException) as exc:
        raise EvidenceError('TIMESTAMP_SERVICE_UNAVAILABLE') from exc
    finally:
        client.close()
