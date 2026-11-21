"""Version 1 contracts for offline football prospective evaluation."""
import math
import re
from datetime import datetime, timedelta, timezone

if __package__:
    from . import football_evidence_intake as intake
    from . import football_evidence_ledger as evidence
else:
    import football_evidence_intake as intake
    import football_evidence_ledger as evidence

require, fields = evidence.require, evidence.fields
OUTCOMES = ['home', 'draw', 'away']
MARKET = 'FULL_TIME_1X2'
REGULATION = 'regulation_time'
MAX_QUOTE_AGE = timedelta(minutes=30)
PROBABILITY_TOLERANCE = 1e-9
TIME = re.compile(r'[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}'
                  r'(?:\.[0-9]{1,6})?(?:Z|[+-][0-9]{2}:[0-9]{2})')


def instant(value):
    require(isinstance(value, str) and TIME.fullmatch(value) and not value.endswith('-00:00'),
            'timestamp must include a known UTC offset')
    if value[-1] != 'Z':
        require(int(value[-5:-3]) < 24 and int(value[-2:]) < 60, 'invalid timestamp offset')
    try:
        return datetime.fromisoformat(value.replace('Z', '+00:00')).astimezone(timezone.utc)
    except (ValueError, OverflowError) as error:
        raise ValueError('invalid timestamp or UTC offset') from error


def event(row):
    fields(row, ('namespace', 'id', 'competition', 'season', 'home', 'away', 'starts_at'), 'event')
    require(intake.token(row['namespace']) and all(intake.text(row[k]) for k in
            ('id', 'competition', 'season', 'home', 'away')), 'event identity is incomplete')
    require(row['home'].casefold() != row['away'].casefold(), 'event participants are ambiguous')
    instant(row['starts_at'])


def event_key(row):
    return row['namespace'], row['id']


def fixture_signature(row):
    return (row['competition'], row['season'], row['home'], row['away'], instant(row['starts_at']))


def same_event(first, second):
    return event_key(first) == event_key(second) and fixture_signature(first) == fixture_signature(second)


def sha(value):
    return evidence.digest(evidence.canonical(value))


def validate_hash(record):
    require(evidence.valid_hash(record['content_sha256']) and
            record['content_sha256'] == sha({k: v for k, v in record.items() if k != 'content_sha256'}),
            'record content SHA-256 mismatch')


def forecast_id(row):
    model = row['model']
    return 'forecast-v1:' + sha([*event_key(row['event']), model['name'], model['version_sha256'],
                                 model['configuration_sha256']])


def probability_vector(values):
    require(isinstance(values, list) and len(values) == len(OUTCOMES) and
            all(type(value) in (int, float) and 0 <= value <= 1 for value in values),
            'probabilities must be three finite numbers in [0,1]')
    require(abs(math.fsum(values) - 1.0) <= PROBABILITY_TOLERANCE, 'probabilities must sum to one')


def state(row, name, validator):
    fields(row, ('state', 'value'), name)
    require(row['state'] in intake.STATES, f'{name}: invalid availability state')
    if row['state'] == 'known':
        validator(row['value'])
    else:
        require(row['value'] is None, f'{name}: unavailable or unknown value must be null')


def provenance(row):
    fields(row, ('source', 'sha256'), 'provenance')
    require(intake.source(row['source']) and evidence.valid_hash(row['sha256']), 'invalid provenance reference or SHA-256')


def scope(row):
    require(row['market'] == MARKET and row['settlement_scope'] == REGULATION,
            'forecast or quote market must be regulation-time 1X2')


def quote(row, forecast):
    fields(row, ('event', 'market', 'market_id', 'settlement_scope', 'bookmaker', 'observed_at',
                 'completeness', 'quotes', 'provenance'), 'market quote')
    event(row['event'])
    scope(row)
    require(same_event(row['event'], forecast['event']), 'quote event or participant order differs')
    require(intake.text(row['bookmaker']) and intake.text(row['market_id']), 'quote source or market ID missing')
    age = instant(forecast['frozen_at']) - instant(row['observed_at'])
    require(timedelta(0) <= age <= MAX_QUOTE_AGE, 'market quote is stale or observed after forecast freeze')
    prices = row['quotes']
    require(isinstance(prices, dict) and 0 < len(prices) <= 3 and prices.keys() <= set(OUTCOMES) and
            all(type(price) in (int, float) and 1 < price <= 1_000_000 for price in prices.values()),
            'invalid decimal market prices or outcomes')
    require(row['completeness'] == ('complete' if len(prices) == 3 else 'partial'),
            'market completeness disagrees with quote outcomes')
    provenance(row['provenance'])


def forecast(row):
    fields(row, ('record_id', 'content_sha256', 'origin', 'event', 'model', 'market', 'settlement_scope',
                 'outcome_order', 'probabilities', 'created_at', 'frozen_at', 'input_cutoff',
                 'input_receipts', 'market_observation'), 'forecast')
    require(row['origin'] in ('prospective', 'synthetic'), 'unsupported forecast origin')
    event(row['event'])
    scope(row)
    model = row['model']
    fields(model, ('name', 'version_sha256', 'configuration_sha256'), 'model')
    require(intake.text(model['name']) and all(evidence.valid_hash(model[k]) for k in
            ('version_sha256', 'configuration_sha256')), 'immutable model version or configuration hash missing')
    require(row['outcome_order'] == OUTCOMES, 'forecast outcome order must be home, draw, away')
    probability_vector(row['probabilities'])
    cutoff, created, frozen, start = map(instant, (row['input_cutoff'], row['created_at'],
                                                   row['frozen_at'], row['event']['starts_at']))
    require(cutoff <= created <= frozen < start, 'forecast chronology must be cutoff <= creation <= freeze < kickoff')
    inputs = row['input_receipts']
    require(isinstance(inputs, list) and inputs, 'input provenance missing')
    seen = set()
    for receipt in inputs:
        fields(receipt, ('observed_at', 'period', 'provenance'), 'forecast input receipt')
        require(receipt['period'] in ('training', 'calibration'), 'invalid declared input period')
        provenance(receipt['provenance'])
        key = receipt['provenance']['sha256']
        require(key not in seen, 'duplicate forecast input digest')
        seen.add(key)
        require(instant(receipt['observed_at']) <= cutoff, 'forecast input observed after cutoff')
    state(row['market_observation'], 'market observation', lambda value: quote(value, row))
    require(row['record_id'] == forecast_id(row), 'forecast immutable ID mismatch')
    validate_hash(row)


def records(document, kind, validator, *, enforce_unique=False):
    fields(document, ('schema_version', 'kind', 'records'), kind)
    require(type(document['schema_version']) is int and document['schema_version'] == 1 and document['kind'] == kind,
            f'{kind}: unsupported schema version or kind')
    require(isinstance(document['records'], list), f'{kind}: records must be an array')
    seen = set()
    for index, row in enumerate(document['records'], 1):
        try:
            validator(row)
            if enforce_unique:
                identifier = row['record_id']
                require(identifier not in seen, 'duplicate forecast immutable ID')
                seen.add(identifier)
        except (ValueError, TypeError, KeyError) as error:
            raise ValueError(f'{kind} record {index}: {error}') from error
    return document['records']


def outcome(row):
    fields(row, ('receipt_id', 'content_sha256', 'origin', 'event', 'provider', 'acquisition_lineage',
                 'status', 'settlement_scope', 'score', 'observed_at', 'retrieved_at', 'provenance'), 'outcome')
    require(intake.token(row['receipt_id']) and row['origin'] in ('prospective', 'synthetic'),
            'invalid outcome receipt ID or origin')
    event(row['event'])
    require(intake.token(row['provider']) and intake.token(row['acquisition_lineage']),
            'outcome provider or acquisition lineage missing')
    require(row['status'] in ('final', 'abandoned', 'postponed', 'void'), 'unsupported outcome status')
    require(row['settlement_scope'] in (REGULATION, 'including_extra_time', 'including_penalties', 'unavailable'),
            'unsupported outcome settlement scope')
    observed, retrieved = map(instant, (row['observed_at'], row['retrieved_at']))
    require(observed <= retrieved, 'outcome observed after retrieval')

    def score(value):
        require(isinstance(value, list) and len(value) == 2 and
                all(type(goals) is int and goals >= 0 for goals in value), 'invalid ordered outcome score')

    state(row['score'], 'outcome score', score)
    if row['status'] == 'final':
        require(observed > instant(row['event']['starts_at']) and row['score']['state'] == 'known' and
                row['settlement_scope'] != 'unavailable', 'invalid final time, score or settlement scope')
    provenance(row['provenance'])
    validate_hash(row)


def review(row):
    fields(row, ('event', 'outcome_sha256', 'reviewed_at', 'decision', 'provenance'), 'reviewed outcome link')
    event(row['event'])
    require(row['decision'] == 'exact_fixture_and_independent_sources_reviewed',
            'missing explicit reviewed fixture and acquisition decision')
    hashes = row['outcome_sha256']
    require(isinstance(hashes, list) and len(hashes) >= 2 and all(map(evidence.valid_hash, hashes)) and
            len(set(hashes)) == len(hashes), 'review requires distinct exact outcome hashes')
    instant(row['reviewed_at'])
    provenance(row['provenance'])
