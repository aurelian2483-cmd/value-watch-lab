"""Lossless legacy verifier field bridge for diagnostics only."""
from copy import deepcopy
from urllib.parse import urlsplit

if __package__:
    from . import football_prospective_contract as contract
else:
    import football_prospective_contract as contract

FORECAST = {
    'id': 'legacy_prediction_id', 'isProspective': 'legacy_prospective_claim', 'sportCode': 'sport',
    'marketCode': 'market', 'providerMatchId': 'legacy_match_id', 'selectionCode': 'legacy_selection',
    'eventStartUTC': 'starts_at', 'recordedAtUTC': 'legacy_recorded_at',
}
RESULT = {
    'predictionId': 'legacy_prediction_id', 'verified': 'legacy_verified_claim', 'result': 'selection_settlement',
    'marketCode': 'market', 'fullTimeScore': 'legacy_full_time_score', 'source': 'source_url',
    'observedAtUTC': 'legacy_observed_at',
}
MAPS = {'forecast': FORECAST, 'result': RESULT}
require, fields = contract.require, contract.fields


def positive_id(value):
    return type(value) is int and value > 0


def bridge(row, kind):
    require(isinstance(kind, str) and kind in MAPS, 'unsupported legacy record type')
    mapping = MAPS[kind]
    fields(row, mapping, f'legacy {kind}')
    require(row['marketCode'] == contract.MARKET, 'unsupported legacy market')
    if kind == 'forecast':
        require(contract.intake.text(row['id']) and row['sportCode'] == 'FOOTBALL' and
                row['isProspective'] is True and positive_id(row['providerMatchId']) and
                row['selectionCode'] in ('HOME', 'DRAW', 'AWAY'), 'unsupported legacy selection or identity')
        require(contract.instant(row['recordedAtUTC']) < contract.instant(row['eventStartUTC']),
                'legacy recorded time is at or after kickoff')
        reasons = ['legacy_no_ordered_canonical_event', 'legacy_no_frozen_probability_vector',
                   'legacy_no_independent_freeze_or_model_configuration']
    else:
        require(contract.intake.text(row['predictionId']) and row['verified'] is True and
                row['result'] in ('WIN', 'LOSS'), 'unsupported legacy settlement')
        fields(row['fullTimeScore'], ('home', 'away'), 'legacy score')
        require(all(type(goal) is int and goal >= 0 for goal in row['fullTimeScore'].values()), 'invalid legacy score')
        contract.instant(row['observedAtUTC'])
        url = row['source']
        require(contract.evidence.https_reference(url), 'invalid legacy result source')
        parsed = urlsplit(url)
        match_id = parsed.path.removeprefix('/v4/matches/')
        require(parsed.netloc == 'api.football-data.org' and not parsed.query and match_id.isascii() and
                match_id.isdigit() and not match_id.startswith('0') and
                parsed.path == f'/v4/matches/{match_id}', 'unsupported legacy source or match identity')
        reasons = ['legacy_selection_settlement_only', 'legacy_no_exact_fixture_crosswalk',
                   'legacy_no_receipt_digest_or_independent_review']
    return {'kind': kind, 'fields': {new: deepcopy(row[old]) for old, new in mapping.items()},
            'source_row_sha256': contract.sha(row), 'eligibility': 'ineligible', 'reasons': reasons}


def restore(record):
    mapping = MAPS.get(record['kind'])
    require(mapping is not None, 'unsupported legacy record type')
    fields(record['fields'], mapping.values(), 'legacy bridge fields')
    original = {old: deepcopy(record['fields'][new]) for old, new in mapping.items()}
    require(bridge(original, record['kind']) == record, 'legacy bridge record or hash changed')
    return original


def bridge_batch(rows, kind):
    mapped = []
    ids, match_ids = set(), set()
    for row in rows:
        item = bridge(row, kind)
        value = item['fields']
        identity, match_id = value['legacy_prediction_id'], value.get('legacy_match_id')
        require(identity not in ids and (match_id is None or match_id not in match_ids),
                'duplicate legacy prediction or fixture identity')
        ids.add(identity)
        if match_id is not None:
            match_ids.add(match_id)
        mapped.append(item)
    return mapped
