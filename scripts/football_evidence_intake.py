#!/usr/bin/env python3
"""Validate future football evidence receipts offline for manual review."""
import argparse
from collections import Counter
from datetime import datetime
import json
from pathlib import Path
import re
import sys

if __package__:
    from . import football_evidence_ledger as ledger
else:
    import football_evidence_ledger as ledger

STATES = ('known', 'unknown', 'unavailable')
BASES = ('provider_label', 'aggregate_documentation', 'fixture_level_receipt')
SCOPE = ('regulation_time', 'including_extra_time', 'including_penalties')
RETENTION = ('permitted', 'metadata_only', 'prohibited')
RECEIPT_FIELDS = ('receipt_id', 'provider', 'acquisition', 'event', 'fixture',
                  'settlement_scope', 'score', 'retrieved_at_utc', 'source',
                  'content_sha256', 'licence_retention')
TOKEN = re.compile(r'[a-z0-9][a-z0-9._-]{0,127}')
UTC = re.compile(r'[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}(?:\.[0-9]{1,6})?Z')
fields, require = ledger.fields, ledger.require


def text(value):
    return (ledger.text(value) and len(value) <= 2048 and value.isprintable())


def stated(obj, label, validator):
    fields(obj, ('state', 'value'), label)
    state, value = obj['state'], obj['value']
    require(state in STATES, f'{label}: invalid availability state')
    if state == 'known':
        require(validator(value), f'{label}: invalid known value')
    else:
        require(value is None, f'{label}: unknown or unavailable value must be null')
    return state


def token(value):
    return isinstance(value, str) and TOKEN.fullmatch(value) is not None


def utc(value):
    if not isinstance(value, str) or UTC.fullmatch(value) is None:
        return False
    try:
        datetime.fromisoformat(value[:-1] + '+00:00')
    except ValueError:
        return False
    return True


def acquisition(value):
    fields(value, ('collector', 'basis', 'upstream_providers', 'evidence'), 'acquisition value')
    upstream = value['upstream_providers']
    stated(upstream, 'acquisition.upstream_providers', lambda providers: (
        isinstance(providers, list) and bool(providers) and all(map(text, providers)) and
        len({provider.casefold() for provider in providers}) == len(providers)))
    evidence_state = stated(value['evidence'], 'acquisition.evidence', source)
    return (text(value['collector']) and value['basis'] in BASES and
            (value['basis'] != 'fixture_level_receipt' or evidence_state == 'known'))


def event(value):
    fields(value, ('namespace', 'id'), 'event value')
    return token(value['namespace']) and text(value['id'])


def fixture(value):
    fields(value, ('competition', 'home', 'away', 'scheduled'), 'fixture value')
    stated(value['scheduled'], 'fixture.scheduled', scheduled)
    return (all(text(value[key]) for key in ('competition', 'home', 'away')) and
            value['home'].casefold() != value['away'].casefold())


def scheduled(value):
    fields(value, ('precision', 'value'), 'scheduled value')
    if value['precision'] == 'date_only':
        return ledger.audit.reconciliation.calendar_date(value['value']) is not None
    return value['precision'] == 'utc_timestamp' and utc(value['value'])


def source(value):
    fields(value, ('kind', 'reference'), 'source value')
    reference = value['reference']
    if value['kind'] == 'permitted_receipt_reference':
        return token(reference)  # Opaque handle, never opened as a path.
    return value['kind'] == 'https_url' and text(reference) and ledger.https_reference(reference)


def licence(value):
    fields(value, ('policy_reference', 'retention'), 'licence_retention value')
    return source(value['policy_reference']) and value['retention'] in RETENTION


def validate(document):
    fields(document, ('schema_version', 'receipts'), 'intake')
    require(type(document['schema_version']) is int and document['schema_version'] == 1,
            'unsupported intake schema version')
    receipts = document['receipts']
    require(isinstance(receipts, list), 'receipts must be an array')
    validators = {
        'provider': text, 'acquisition': acquisition, 'event': event, 'fixture': fixture,
        'settlement_scope': lambda value: value in SCOPE,
        'score': lambda value: isinstance(value, list) and len(value) == 2 and
                               all(type(goals) is int and goals >= 0 for goals in value),
        'retrieved_at_utc': utc, 'source': source, 'content_sha256': ledger.valid_hash,
        'licence_retention': licence,
    }
    seen, availability = set(), Counter()
    for index, receipt in enumerate(receipts, 1):
        try:
            fields(receipt, RECEIPT_FIELDS, 'receipt')
            identifier = receipt['receipt_id']
            require(token(identifier) and identifier not in seen, 'invalid or duplicate receipt ID')
            seen.add(identifier)
            for name, validator in validators.items():
                availability[stated(receipt[name], name, validator)] += 1
        except (ValueError, TypeError) as error:
            raise ValueError(f'receipt {index}: {error}') from error
    return {'schema_version': 1, 'receipt_count': len(receipts),
            'field_availability': {state: availability[state] for state in STATES},
            'disposition': 'intake_only_manual_review', 'automatic_classification_changes': 0,
            **ledger.SAFETY}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('receipt_file', type=Path, help='local JSON intake file (read only)')
    args = parser.parse_args()
    try:
        report = validate(ledger.load(args.receipt_file))
        sys.stdout.buffer.write(ledger.canonical(report) + b'\n')
    except (OSError, ValueError, TypeError) as error:
        parser.error(str(error))


if __name__ == '__main__':
    main()
