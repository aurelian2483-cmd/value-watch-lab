#!/usr/bin/env python3
"""Evaluate frozen football forecasts offline with a separately trusted review manifest."""
import argparse
from collections import Counter, defaultdict
import math
from pathlib import Path
import sys

if __name__ == '__main__':
    sys.dont_write_bytecode = True

if __package__:
    from . import football_prospective_contract as contract
    from .football_prospective_outcomes import OutcomeIndex
else:
    import football_prospective_contract as contract
    from football_prospective_outcomes import OutcomeIndex

evidence = contract.evidence
require, fields = contract.require, contract.fields
FORECAST_KIND = 'football-frozen-forecasts'
OUTCOME_KIND = 'football-outcome-receipts'
MANIFEST_KIND = 'football-evaluation-manifest'
LOG_FLOOR = 1e-15
PERIODS = ('training', 'calibration', 'evaluation')
BASELINES = {'uniform': (1 / 3,) * 3, 'fixed_home_weighted': (0.45, 0.30, 0.25)}


def scores(probabilities, outcome):
    contract.probability_vector(probabilities)
    index = contract.OUTCOMES.index(outcome)
    return {'log_loss': -math.log(max(LOG_FLOOR, probabilities[index])),
            'brier': math.fsum((probability - int(i == index)) ** 2
                               for i, probability in enumerate(probabilities))}


def baseline_scores(settled):
    return {label: scores(list(probabilities), settled) for label, probabilities in BASELINES.items()}


def mean_scores(rows):
    return {key: math.fsum(row[key] for row in rows) / len(rows) for key in ('log_loss', 'brier')}


def unique_by(rows, validate, key, label):
    require(isinstance(rows, list), f'{label} must be an array')
    index = {}
    for row in rows:
        validate(row)
        identifier = key(row)
        require(identifier not in index, f'duplicate {label} key')
        index[identifier] = row
    return index


def freeze(row):
    fields(row, ('record_id', 'forecast_sha256', 'observed_at', 'provenance'), 'freeze attestation')
    identifier = row['record_id']
    require(isinstance(identifier, str) and identifier.startswith('forecast-v1:') and
            evidence.valid_hash(identifier.removeprefix('forecast-v1:')) and evidence.valid_hash(row['forecast_sha256']),
            'invalid freeze record ID or exact forecast hash')
    contract.instant(row['observed_at'])
    contract.provenance(row['provenance'])


def review_key(row):
    return contract.event_key(row['event'])


def manifest(raw, trusted_sha256):
    digest = evidence.digest(raw)
    pinned = trusted_sha256 is not None
    if pinned:
        require(evidence.valid_hash(trusted_sha256) and trusted_sha256 == digest,
                'trusted manifest SHA-256 mismatch')
    data = evidence.decode(raw)
    fields(data, ('schema_version', 'kind', 'as_of', 'split', 'freeze_attestations', 'outcome_reviews'),
           'evaluation manifest')
    require(type(data['schema_version']) is int and data['schema_version'] == 1 and data['kind'] == MANIFEST_KIND,
            'unsupported evaluation manifest schema or kind')
    as_of = contract.instant(data['as_of'])
    freezes = unique_by(data['freeze_attestations'], freeze, lambda row: row['record_id'], 'freeze attestation')
    reviews = unique_by(data['outcome_reviews'], contract.review, review_key, 'outcome review')
    return digest, pinned, as_of, split_manifest(data['split'], as_of), freezes, reviews


def split_manifest(data, as_of):
    fields(data, (*PERIODS, 'fixtures'), 'chronological split')
    periods = {}
    previous_end = None
    for name in PERIODS:
        window = data[name]
        fields(window, ('start', 'end'), f'{name} window')
        start, end = map(contract.instant, (window['start'], window['end']))
        require(start < end and (previous_end is None or previous_end <= start),
                'invalid or overlapping chronological split windows')
        require(name == 'evaluation' or end <= as_of, 'training or calibration window extends beyond as_of')
        periods[name], previous_end = (start, end), end
    require(isinstance(data['fixtures'], list), 'split fixtures must be an array')
    ids, observed = {}, set()
    for row in data['fixtures']:
        fields(row, ('partition', 'event'), 'split fixture')
        name, event = row['partition'], row['event']
        require(isinstance(name, str) and name in periods, 'unknown fixture partition')
        contract.event(event)
        key, collision = contract.event_key(event), contract.fixture_collision_key(event)
        require(key not in ids and collision not in observed, 'duplicate or conflicting fixture across split roster')
        require(in_period(contract.instant(event['starts_at']), periods[name]), 'fixture falls outside its declared split')
        ids[key] = row
        observed.add(collision)
    return periods, ids


def in_period(timestamp, period):
    return period[0] <= timestamp < period[1]


def split_rejection(row, split):
    periods, ids = split
    event = row['event']
    fixture = ids.get(contract.event_key(event))
    if fixture is None or fixture['partition'] != 'evaluation' or not contract.same_event(event, fixture['event']):
        return 'outside_exact_evaluation_roster'
    cutoff = contract.instant(row['input_cutoff'])
    if cutoff > periods['evaluation'][0]:
        return 'input_cutoff_enters_evaluation_period'
    for receipt in row['input_receipts']:
        if not in_period(contract.instant(receipt['observed_at']), periods[receipt['period']]):
            return 'input_observation_outside_declared_split'
    return None


def forecast_conflicts(rows):
    by_id, by_fixture = defaultdict(list), defaultdict(list)
    for row in rows:
        event = row['event']
        by_id[contract.event_key(event)].append(row['record_id'])
        by_fixture[contract.fixture_collision_key(event)].append(row['record_id'])
    return {identifier for group in (*by_id.values(), *by_fixture.values()) if len(group) > 1 for identifier in group}


def eligibility(row, as_of, split, pinned, freeze_receipt, review, outcomes, conflicts):
    if row['record_id'] in conflicts:
        return 'duplicate_forecast_fixture', None
    if row['origin'] == 'prospective' and not pinned:
        return 'untrusted_manifest', None
    frozen = contract.instant(row['frozen_at'])
    if frozen > as_of:
        return 'future_forecast_freeze', None
    rejection = split_rejection(row, split)
    if rejection:
        return rejection, None
    if freeze_receipt is None:
        return 'missing_freeze_attestation', None
    if freeze_receipt['forecast_sha256'] != row['content_sha256']:
        return 'frozen_content_hash_mismatch', None
    attested = contract.instant(freeze_receipt['observed_at'])
    if not (frozen <= attested < contract.instant(row['event']['starts_at']) and attested <= as_of):
        return 'freeze_attestation_chronology_invalid', None
    return outcomes.resolve(row, review, as_of)


def evaluate(forecast_doc, outcome_doc, manifest_raw, trusted_sha256=None):
    forecasts = contract.records(forecast_doc, FORECAST_KIND, contract.forecast, enforce_unique=True)
    receipts = contract.records(outcome_doc, OUTCOME_KIND, contract.outcome)
    manifest_hash, pinned, as_of, split, freezes, reviews = manifest(manifest_raw, trusted_sha256)
    outcomes = OutcomeIndex(receipts)
    conflicts = forecast_conflicts(forecasts)
    evaluation_keys = {key for key, item in split[1].items() if item['partition'] == 'evaluation'}
    received_keys = {contract.event_key(row['event']) for row in forecasts}
    missing_keys = evaluation_keys - received_keys
    missing_frozen = freezes.keys() - {row['record_id'] for row in forecasts}
    entries, eligible_records = [], []
    for row in sorted(forecasts, key=lambda item: item['record_id']):
        key = contract.event_key(row['event'])
        reason, settled = eligibility(row, as_of, split, pinned, freezes.get(row['record_id']), reviews.get(key),
                                      outcomes, conflicts)
        entry = {'record_id': row['record_id'], 'event_key': list(key), 'origin': row['origin'], 'reason': reason}
        if settled is not None and row['origin'] == 'synthetic':
            entry['reason'] = 'synthetic_test_fixture_only'
        if settled is not None and row['origin'] == 'prospective':
            eligible_records.append((row, entry, settled))
        entries.append(entry)
    complete = not missing_keys and not missing_frozen and len(eligible_records) == len(forecasts)
    by_model = defaultdict(list)
    for row, entry, settled in eligible_records:
        if not complete:
            entry['reason'] = 'cohort_incomplete'
            continue
        model = evidence.canonical(row['model'])
        entry.update(outcome=settled, candidate_scores=scores(row['probabilities'], settled),
                     baseline_scores=baseline_scores(settled))
        by_model[model].append(entry)
    reports = []
    for model, group in sorted(by_model.items()):
        reports.append({'model': evidence.decode(model), 'n': len(group),
                        'candidate': mean_scores([row['candidate_scores'] for row in group]),
                        'baselines': {baseline: mean_scores([row['baseline_scores'][baseline] for row in group])
                                      for baseline in BASELINES}})
    eligible = sum(report['n'] for report in reports)
    return {'schema_version': 1, **evidence.SAFETY, 'status': 'descriptive_research_only' if eligible else 'insufficient_data',
            'manifest_sha256': manifest_hash, 'trusted_manifest_pin_supplied': pinned,
            'forecast_rows': len(forecasts), 'outcome_receipt_rows': len(receipts),
            'evaluation_roster_fixtures': len(evaluation_keys),
            'evaluation_roster_without_forecast': len(missing_keys),
            'attested_forecasts_missing_from_input': len(missing_frozen),
            'eligible_real_forecasts': eligible, 'eligible_real_adjudicated_outcomes': eligible,
            'outcome_denominator': 'unique matched fixtures, not individual provider receipts',
            'intervals': {'state': 'unavailable', 'reason': 'Independent sampling is not established.'},
            'coverage': dict(sorted(Counter(entry['reason'] for entry in entries).items())),
            'model_metrics': reports, 'records': entries}


def main():
    cli = argparse.ArgumentParser(description=__doc__)
    cli.add_argument('command', choices=['validate', 'evaluate'])
    cli.add_argument('--forecasts', type=Path, required=True, help='local frozen forecast packet')
    cli.add_argument('--outcomes', type=Path, required=True, help='local outcome receipt packet')
    cli.add_argument('--manifest', type=Path, required=True, help='local review and split manifest')
    cli.add_argument('--trusted-manifest-sha256', help='independently trusted manifest SHA-256 for real inclusion')
    args = cli.parse_args()
    try:
        data = evidence.load(args.forecasts), evidence.load(args.outcomes), args.manifest.read_bytes()
        if args.command == 'validate':
            contract.records(data[0], FORECAST_KIND, contract.forecast, enforce_unique=True)
            contract.records(data[1], OUTCOME_KIND, contract.outcome)
            manifest(data[2], args.trusted_manifest_sha256)
            result = {**evidence.SAFETY, 'status': 'input_contracts_valid', 'scoring_run': False}
        else:
            result = evaluate(*data, args.trusted_manifest_sha256)
        sys.stdout.buffer.write(evidence.canonical(result) + b'\n')
    except (ValueError, TypeError, KeyError, OSError) as error:
        cli.error(str(error))


if __name__ == '__main__':
    main()
