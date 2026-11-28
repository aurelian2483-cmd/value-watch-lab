"""Signed, authorised synthetic source receipts and complete field reconciliation."""
from dataclasses import dataclass
from datetime import timedelta
from pathlib import Path
from tempfile import TemporaryDirectory

from stamps import EvidenceError, openssl, require, sha, utc

SCOPE = 'SYNTHETIC_PHASE3_QUALIFICATION'
FEED_DELAY = timedelta(minutes=5)
RESULT_DELAY = timedelta(hours=24)
MAX_SOURCE = 256 * 1024


@dataclass(frozen=True)
class Source:
    name: str
    owner: str
    lineage: str
    permission: str
    role: str
    public_key: bytes
    retain_until: str

    def __post_init__(self):
        require(self.name.startswith('fixture-') and all((self.owner, self.lineage, self.permission))
                and self.role in {'input','official','corroborator'}
                and 0 < len(self.public_key) <= 8192, 'UNAPPROVED_FIXTURE_SOURCE')
        utc(self.retain_until)

    def identity(self):
        return dict(name=self.name, owner=self.owner, lineage=self.lineage, permission=self.permission,
                    role=self.role, public_key_sha256=sha(self.public_key), retain_until=self.retain_until)


def signed_receipt(source, raw, signature, observed, protocol, kind):
    require(isinstance(raw, bytes) and 0 < len(raw) <= MAX_SOURCE and len(signature) == 64,
            'INVALID_SOURCE_RECEIPT_SIZE')
    with TemporaryDirectory(prefix='vw-source-verification-') as directory:
        key, data, sig = (Path(directory)/name for name in ('source.pem','source.json','source.sig'))
        key.write_bytes(source.public_key)
        data.write_bytes(raw)
        sig.write_bytes(signature)
        openssl('pkeyutl','-verify','-rawin','-pubin','-inkey',key,'-in',data,'-sigfile',sig)
    try:
        document = protocol.strict_json(raw)
        require(protocol.canon(document) == raw, 'NONCANONICAL_SOURCE_RECEIPT')
    except protocol.ResearchError as exc:
        raise EvidenceError('INVALID_SOURCE_JSON') from exc
    require(isinstance(document, dict) and document.get('kind') == kind and document.get('scope') == SCOPE
            and document.get('source') == source.name, 'SOURCE_IDENTITY_OR_SCOPE_MISMATCH')
    published, now = utc(document.get('published_at_utc')), utc(observed)
    limit = FEED_DELAY if kind == 'feed' else RESULT_DELAY
    require(timedelta(0) <= now-published <= limit, 'SOURCE_TIMESTAMP_STALE_OR_FUTURE')
    require(now < utc(source.retain_until), 'SOURCE_RETENTION_NOT_AUTHORISED')
    return document


def fields_match(document, forecast):
    fields = document.get('field')
    require(document.get('status') == 'final' and document.get('race_id') == forecast['race_id']
            and document.get('racecourse') == forecast['racecourse']
            and utc(document.get('start_utc')) == utc(forecast['startUTC']), 'RESULT_EVENT_MISMATCH')
    require(isinstance(fields, list) and all(isinstance(item, str) for item in fields)
            and len(set(fields)) == len(fields) and sorted(fields) == sorted(forecast['horse_ids']),
            'RESULT_FIELD_INCOMPLETE_OR_CHANGED')
    winner = document.get('winner')
    require(winner in fields, 'RESULT_WINNER_OUTSIDE_FIELD')
    require(type(document.get('revision')) is int and document['revision'] >= 1, 'RESULT_INVALID_REVISION')
    require(utc(document.get('published_at_utc')) > utc(forecast['startUTC']), 'RESULT_BEFORE_EVENT')
    return winner
