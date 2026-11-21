#!/usr/bin/env python3
"""Read-only evidence readiness check. This tool cannot open real paper intake."""
import argparse
from datetime import timedelta
from pathlib import Path
import sys

if __name__ == '__main__':
    sys.dont_write_bytecode = True

if __package__:
    from . import football_shadow_capture as capture
else:
    import football_shadow_capture as capture

contract, evidence = capture.contract, capture.evidence
fields, require, instant = contract.fields, contract.require, contract.instant
DIRECTORY = capture.candidates.replay.ROOT / 'research/football-real-intake-readiness'
GATES = ('source_approval', 'schedule', 'earlier_inputs', 'timestamp', 'outcome_review', 'retention', 'study_registration')
SUPPORTED_SOURCES = frozenset({'football-data-org', 'openligadb', 'premier-league'})
ROLES = frozenset({'schedule', 'earlier_results', 'final_outcome'})
# Deliberately empty. Entries can only follow an independent review of exact
# manifest bytes and their underlying evidence. No CLI or environment override.
APPROVED_EXTERNAL_MANIFESTS = frozenset()


def hex_proofs(row, *keys):
    require(all(evidence.valid_hash(row[key]) for key in keys), 'missing or invalid external evidence SHA-256')


def exact_bytes(raw, expected, label):
    require(isinstance(raw, bytes) and raw and evidence.digest(raw) == expected, f'{label} missing or hash mismatch')


def require_source(source, role, approvals):
    require(contract.intake.token(source) and source in approvals and role in approvals[source]['roles'],
            f'approved {role} permission missing for source')


def source_approval(row):
    fields(row, ('permissions', 'decision_sha256'), 'source approval')
    hex_proofs(row, 'decision_sha256')
    permissions = row['permissions']
    require(isinstance(permissions, list) and permissions, 'source permissions unavailable')
    index = {}
    for source in permissions:
        fields(source, ('source_id', 'roles', 'lineage', 'permission_sha256', 'retain_through'), 'source permission')
        ident, roles = source['source_id'], source['roles']
        require(contract.intake.token(ident) and ident in SUPPORTED_SOURCES, 'unsupported source option')
        require(ident not in index and contract.intake.token(source['lineage']), 'duplicate source or missing lineage')
        require(isinstance(roles, list) and roles and all(isinstance(role, str) and role in ROLES for role in roles)
                and len(set(roles)) == len(roles), 'invalid permission role')
        hex_proofs(source, 'permission_sha256')
        instant(source['retain_through'])
        index[ident] = source
    require(ROLES <= {role for item in permissions for role in item['roles']}, 'required source roles are incomplete')
    return index


def schedule(row, approvals):
    fields(row, ('event', 'source_id', 'observed_at', 'earliest_kickoff', 'receipt_sha256', 'identity_review_sha256'),
           'schedule')
    require_source(row['source_id'], 'schedule', approvals)
    contract.event(row['event'])
    capture.premier_season(row['event'])
    require(row['event']['namespace'] == row['source_id'], 'fixture identity is not in approved source namespace')
    hex_proofs(row, 'receipt_sha256', 'identity_review_sha256')
    starts = instant(row['event']['starts_at'])
    require(instant(row['observed_at']) < starts and instant(row['earliest_kickoff']) == starts,
            'schedule chronology or earliest kickoff requires review')


def earlier_inputs(row, approvals, raw):
    fields(row, ('source_id', 'input_sha256', 'input_cutoff', 'last_receipt_observed_at',
                 'availability_review_sha256'), 'earlier inputs')
    require_source(row['source_id'], 'earlier_results', approvals)
    hex_proofs(row, 'input_sha256', 'availability_review_sha256')
    exact_bytes(raw, row['input_sha256'], 'earlier inputs')
    require(instant(row['last_receipt_observed_at']) <= instant(row['input_cutoff']),
            'earlier input receipt is after cutoff')


def study(row, schedule_row):
    fields(row, ('window_start', 'window_end', 'outcome_review_deadline', 'buffer_seconds',
                 'protocol_sha256', 'registration_sha256', 'approval_sha256'), 'study registration')
    hex_proofs(row, 'protocol_sha256', 'registration_sha256', 'approval_sha256')
    require(type(row['buffer_seconds']) is int and 0 < row['buffer_seconds'] <= 3600, 'invalid approved capture buffer')
    start, end, deadline = map(instant, (row['window_start'], row['window_end'], row['outcome_review_deadline']))
    require(start < end <= deadline, 'invalid study or review window')
    require(schedule_row is not None and start <= instant(schedule_row['earliest_kickoff']) < end,
            'fixture is outside the approved registration window')


def timestamp(row, data, packet_raw, token_raw, registry):
    fields(row, ('method', 'authority', 'packet_sha256', 'token_sha256', 'observed_at',
                 'verification_receipt_sha256'), 'timestamp')
    require(row['method'] == 'rfc3161_trusted_tsa' and contract.intake.token(row['authority']),
            'unsupported timestamp method or unrecorded authority')
    hex_proofs(row, 'packet_sha256', 'token_sha256', 'verification_receipt_sha256')
    exact_bytes(packet_raw, row['packet_sha256'], 'forecast packet')
    exact_bytes(token_raw, row['token_sha256'], 'timestamp token')
    schedule_row, inputs, window = (data[key] for key in ('schedule', 'earlier_inputs', 'study_registration'))
    require(all(item is not None for item in (schedule_row, inputs, window)),
            'timestamp requires fixture, verified inputs and approved study cutoff')
    kickoff, observed = instant(schedule_row['earliest_kickoff']), instant(row['observed_at'])
    require(instant(schedule_row['observed_at']) <= observed and
            instant(inputs['input_cutoff']) <= observed < kickoff and
            observed <= kickoff - timedelta(seconds=window['buffer_seconds']),
            'timestamp must follow schedule observation and input cutoff, within the pre-kickoff buffer')
    packet = evidence.decode(packet_raw)
    fields(packet, ('schema_version', 'origin', 'event', 'input_sha256', 'forecasts'), 'readiness packet')
    require(type(packet['schema_version']) is int and packet['schema_version'] == 1 and
            packet['origin'] == 'prospective', 'synthetic or unknown packet tier')
    contract.event(packet['event'])
    require(contract.same_event(packet['event'], schedule_row['event']) and
            packet['input_sha256'] == inputs['input_sha256'], 'packet identity or input pin mismatch')
    forecasts = contract.records(packet['forecasts'], capture.evaluator.FORECAST_KIND,
                                 contract.forecast, enforce_unique=True)
    names = [item['model']['name'] for item in forecasts]
    require(len(names) == len(registry) and set(names) == registry.keys(), 'packet must carry all pinned paths once')
    for item in forecasts:
        require(item['origin'] == 'prospective' and item['model'] == registry[item['model']['name']]['model'] and
                contract.same_event(item['event'], packet['event']) and
                instant(item['input_cutoff']) == instant(inputs['input_cutoff']) and
                instant(item['frozen_at']) <= observed and
                item['market_observation']['state'] == 'unavailable', 'packet model, evidence tier or freeze mismatch')
        require(all(instant(receipt['observed_at']) <= instant(inputs['last_receipt_observed_at'])
                    for receipt in item['input_receipts']), 'packet receipt is later than reviewed input receipts')


def outcome_review(row, approvals):
    fields(row, ('reviewer', 'review_state', 'settlement_scope', 'sources',
                 'procedure_sha256', 'review_demonstration_sha256'), 'outcome review')
    require(contract.intake.token(row['reviewer']) and row['review_state'] == 'independently_reviewed'
            and row['settlement_scope'] == contract.REGULATION, 'unreviewed outcome procedure or unsupported settlement')
    hex_proofs(row, 'procedure_sha256', 'review_demonstration_sha256')
    sources = row['sources']
    require(isinstance(sources, list) and len(sources) == 2, 'two independently acquired sources required')
    for ident in sources:
        require_source(ident, 'final_outcome', approvals)
    require(len({approvals[ident]['lineage'] for ident in sources}) == 2,
            'shared acquisition lineage cannot establish independent outcomes')


def retention(row, window, approvals):
    fields(row, ('custodian', 'approved_through', 'policy_sha256', 'approval_sha256',
                 'archive_control_check_sha256'), 'retention')
    require(contract.intake.token(row['custodian']), 'retention custodian missing')
    hex_proofs(row, 'policy_sha256', 'approval_sha256', 'archive_control_check_sha256')
    expiry = instant(row['approved_through'])
    require(window is not None and expiry > instant(window['outcome_review_deadline']),
            'retention does not cover the approved review window')
    require(approvals and all(instant(item['retain_through']) >= expiry for item in approvals.values()),
            'provider retention permission does not cover archive policy')


def inspect(raw, packet=None, inputs=None, token=None):
    data = evidence.decode(raw)
    fields(data, ('schema_version', 'origin', 'candidate_registry_sha256', *GATES), 'readiness manifest')
    require(type(data['schema_version']) is int and data['schema_version'] == 1 and
            data['origin'] in ('external', 'synthetic'), 'unsupported readiness schema or origin')
    registry = capture.candidates.registry()
    digest = evidence.digest(raw)
    trusted = data['origin'] == 'external' and digest in APPROVED_EXTERNAL_MANIFESTS
    candidate_pin = data['candidate_registry_sha256'] == capture.candidates.PIN
    checks = {'candidate_pins': {
        'status': 'satisfied' if candidate_pin else 'invalid',
        'reason': 'matches pinned candidate identities' if candidate_pin else 'candidate registry hash differs'}}
    approvals = {}

    def check(gate, validate):
        value = data[gate]
        if value is None:
            return {'status': 'missing', 'reason': f'{gate} evidence not supplied'}
        try:
            validate(value)
        except (ValueError, TypeError, KeyError) as error:
            return {'status': 'invalid', 'reason': str(error)}
        if data['origin'] == 'synthetic':
            return {'status': 'synthetic_only', 'reason': 'synthetic evidence cannot satisfy a real gate'}
        if not trusted:
            return {'status': 'unverified', 'reason': 'exact manifest is not independently approved and pinned'}
        return {'status': 'satisfied', 'reason': 'exact independently reviewed evidence pin'}

    checks['source_approval'] = check('source_approval', lambda row: approvals.update(source_approval(row)))
    validators = {
        'schedule': lambda row: schedule(row, approvals),
        'earlier_inputs': lambda row: earlier_inputs(row, approvals, inputs),
        'outcome_review': lambda row: outcome_review(row, approvals),
        'retention': lambda row: retention(row, data['study_registration'], approvals),
        'study_registration': lambda row: study(row, data['schedule']),
    }
    for name, validator in validators.items():
        checks[name] = check(name, validator)
    def check_timestamp(row):
        require(all(checks[name]['status'] not in ('missing', 'invalid')
                    for name in ('schedule', 'earlier_inputs', 'study_registration')),
                'timestamp requires valid schedule, earlier inputs and study registration')
        timestamp(row, data, packet, token, registry)

    checks['timestamp'] = check('timestamp', check_timestamp)
    ready = trusted and all(item['status'] == 'satisfied' for item in checks.values())
    return {'schema_version': 1, 'manifest_sha256': digest, 'status': 'READY FOR AUTHORIZATION REVIEW' if ready else 'NOT READY',
            'gates': checks, 'real_intake_enabled': False, 'eligible_real_captures': 0, 'eligible_real_outcomes': 0,
            'paper_only': True, **evidence.SAFETY}


def main():
    cli = argparse.ArgumentParser(description=__doc__)
    cli.add_argument('--manifest', type=Path, default=DIRECTORY / 'manifest.json')
    for name in ('packet', 'inputs', 'token'):
        cli.add_argument(f'--{name}', type=Path, help='optional local evidence file')
    args = cli.parse_args()
    try:
        raw = args.manifest.read_bytes()
        optional = [path.read_bytes() if path is not None else None for path in (args.packet, args.inputs, args.token)]
        sys.stdout.buffer.write(evidence.canonical(inspect(raw, *optional)) + b'\n')
    except (OSError, ValueError, TypeError, KeyError) as error:
        cli.error(str(error))


if __name__ == '__main__':
    main()
