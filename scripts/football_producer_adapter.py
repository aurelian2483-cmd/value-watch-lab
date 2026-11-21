"""Read-only diagnostic projection of current football producer records."""
from copy import deepcopy
import json

if __package__:
    from . import football_prospective_contract as contract
else:
    import football_prospective_contract as contract

evidence = contract.evidence
PROBABILITY_FIELDS = ('prob_home', 'prob_draw', 'prob_away')
RESEARCH_SOURCES = ('premier-league', 'expanded')


def producer_digest(row):
    """The pinned research producer hashes ASCII-escaped sorted compact JSON."""
    unsigned = {key: value for key, value in row.items() if key != 'record_sha256'}
    return evidence.digest(json.dumps(unsigned, sort_keys=True, separators=(',', ':'), allow_nan=False).encode())


def instant_or_none(value):
    try:
        return contract.instant(value)
    except ValueError:
        return None


def adapt_forecast(row, source):
    """Project present fields only, with an explicit barrier to canonical scoring."""
    contract.require(source in RESEARCH_SOURCES and isinstance(row, dict), 'unsupported forecast producer or row')
    reasons = {'research_snapshot_only', 'missing_event_season', 'missing_exact_model_lineage',
               'missing_attested_freeze', 'missing_evaluation_input_cutoff_receipts'}
    event, normalization, consumed = {}, {}, set()
    for field in ('home', 'away'):
        if contract.intake.text(row.get(field)):
            event[field] = row[field]
            consumed.add(field)
    ordered = ('home' in event and 'away' in event and event['home'].casefold() != event['away'].casefold())
    if not ordered:
        reasons.add('missing_or_ambiguous_ordered_teams')
    kickoff = instant_or_none(row.get('kickoff_utc'))
    if kickoff:
        event['starts_at'] = row['kickoff_utc']
        normalization['kickoff_utc'] = 'event.starts_at; original explicit offset retained'
        consumed.add('kickoff_utc')
    else:
        reasons.add('missing_or_invalid_kickoff')
    identifier = row.get('espn_event_id')
    if (source == 'expanded' and isinstance(identifier, str) and identifier.isascii()
            and identifier.isdigit() and not identifier.startswith('0')):
        event.update(namespace='espn', id=identifier)
        normalization['espn_event_id'] = 'event namespace and ID from explicit ESPN field'
        consumed.add('espn_event_id')
    else:
        reasons.add('missing_or_invalid_provider_event_id')
    if source == 'expanded' and contract.intake.text(row.get('league')):
        event['competition'] = row['league']
        normalization['league'] = 'event.competition; original league code retained'
        consumed.add('league')
    else:
        reasons.add('missing_explicit_competition')
    projection = {'event': event}
    if contract.intake.text(row.get('model')):
        projection['model'] = {'name': row['model']}
        normalization['model'] = 'model.name only; version and configuration unresolved'
        consumed.add('model')
    else:
        reasons.add('missing_model_name')
    probabilities = [row.get(field) for field in PROBABILITY_FIELDS]
    try:
        contract.probability_vector(probabilities)
    except ValueError:
        reasons.add('invalid_or_missing_probabilities')
    else:
        projection.update(probabilities=probabilities, outcome_order=list(contract.OUTCOMES))
        consumed.update(PROBABILITY_FIELDS)
        normalization['probabilities'] = 'prob_home, prob_draw, prob_away in fixed order; no renormalization'
    source_generated = instant_or_none(row.get('generated_at_utc'))
    if source_generated is None or kickoff is None:
        chronology = 'missing_or_invalid_source_chronology'
    elif source_generated >= kickoff:
        chronology = 'source_generation_at_or_after_kickoff'
    else:
        chronology = 'source_generation_pre_kickoff_unattested'
    reasons.add(chronology)
    if 'record_sha256' in row and (not evidence.valid_hash(row['record_sha256']) or
                                    producer_digest(row) != row['record_sha256']):
        reasons.add('producer_record_digest_mismatch')
    return {'source': source, 'source_row_sha256': contract.sha(row), 'original': deepcopy(row),
            'known_canonical_fields': projection, 'normalization': normalization,
            'omitted_fields': sorted(set(row) - consumed), 'chronology': chronology,
            'identity': ('provider_key_and_ordered_teams_present_season_missing'
                         if 'id' in event and ordered else 'incomplete_or_ambiguous'),
            'eligibility': 'ineligible', 'reasons': sorted(reasons), 'candidate': None}
