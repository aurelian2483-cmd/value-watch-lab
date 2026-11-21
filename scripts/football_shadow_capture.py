"""Synthetic-only paper capture schema and event lifecycle."""
from collections import Counter

if __package__:
    from . import football_shadow_candidates as candidates
    from . import football_prospective_evaluation as evaluator
else:
    import football_shadow_candidates as candidates
    import football_prospective_evaluation as evaluator

contract, evidence = evaluator.contract, evaluator.evidence
fields, require, instant = contract.fields, contract.require, contract.instant
LABEL = 'SYNTHETIC TEST OUTPUT — NOT MODEL EVIDENCE'


def decode_text(text, label):
    require(isinstance(text, str), f'{label} must contain exact UTF-8 source text')
    return evidence.decode(text.encode('utf-8'))


def premier_season(event):
    day = instant(event['starts_at']).date()
    start = day.year if day.month >= 7 else day.year - 1
    require(event['competition'] == 'PL' and event['season'] == f'{start}-{(start + 1) % 100:02}',
            'declared Premier League season disagrees with kickoff')
    return day


def history(text, target, cutoff):
    document = decode_text(text, 'complete input')
    fields(document, ('schema_version', 'origin', 'event', 'results'), 'complete input')
    require(type(document['schema_version']) is int and document['schema_version'] == 1 and
            document['origin'] == 'synthetic', 'unknown input tier or version')
    contract.event(document['event'])
    require(contract.same_event(document['event'], target), 'input fixture differs from schedule')
    require(isinstance(document['results'], list), 'missing complete input results')
    out, receipts, payloads, ids = [], [], set(), set()
    ordered_pairs, team_dates = set(), set()
    cutoff_date = instant(target['starts_at']).date()
    for item in document['results']:
        fields(item, ('event', 'observed_at', 'score', 'provenance'), 'input result')
        event = item['event']
        contract.event(event)
        day = premier_season(event).isoformat()
        observed, starts = instant(item['observed_at']), instant(event['starts_at'])
        require(event['competition'] == target['competition'] and event['season'] == target['season']
                and starts.date() < cutoff_date and starts < observed <= cutoff,
                'input season, earlier UTC date or availability differs')
        key = contract.event_key(event)
        require(key not in ids and key != contract.event_key(target), 'duplicate or target event in input')
        ids.add(key)
        contract.provenance(item['provenance'])
        sha = item['provenance']['sha256']
        require(sha not in payloads, 'duplicate input receipt payload')
        payloads.add(sha)
        pair = tuple(event[k].casefold() for k in ('home', 'away'))
        require(pair not in ordered_pairs, 'duplicate ordered input fixture')
        ordered_pairs.add(pair)
        for team in pair:
            require((day, team) not in team_dates, 'ambiguous same-date input appearance')
            team_dates.add((day, team))
        score = item['score']
        require(isinstance(score, list) and len(score) == 2 and
                all(type(goals) is int and 0 <= goals <= 30 for goals in score), 'invalid input score')
        out.append({'id': f"{event['season']}|{day}|{event['home']}|{event['away']}", 'date': day,
                    'season': event['season'], 'home': event['home'], 'away': event['away'], 'ft': item['score']})
        receipts.append({'period': 'training', 'observed_at': item['observed_at'], 'provenance': item['provenance']})
    return sorted(out, key=lambda row: (row['date'], row['home'], row['away'])), receipts


def capture(body, schedule, recorded, registry, runtime):
    fields(body, ('packet_utf8', 'freeze'), 'capture')
    packet = decode_text(body['packet_utf8'], 'packet')
    fields(packet, ('schema_version', 'origin', 'event', 'input_utf8', 'input_sha256',
                    'observed_at', 'input_cutoff', 'forecasts'), 'capture packet')
    require(type(packet['schema_version']) is int and packet['schema_version'] == 1 and
            packet['origin'] == 'synthetic', 'real capture is NOT READY')
    contract.event(packet['event'])
    event = schedule['event']
    require(contract.same_event(event, packet['event']), 'capture changed ordered event identity or kickoff')
    start = instant(event['starts_at'])
    proof = body['freeze']
    fields(proof, ('status', 'observed_at', 'packet_sha256', 'provenance'), 'packet freeze proof')
    require(proof['status'] == 'synthetic_test_attestation', 'independent freeze authority unavailable')
    contract.provenance(proof['provenance'])
    require(proof['packet_sha256'] == evidence.digest(body['packet_utf8'].encode('utf-8')),
            'exact packet freeze digest mismatch')
    cutoff, observed, attested = map(instant, (packet['input_cutoff'], packet['observed_at'], proof['observed_at']))
    require(instant(schedule['observed_at']) <= observed and cutoff <= observed <= attested <= recorded < start,
            'capture observation, freeze or recording is late or out of order')
    require(isinstance(packet['input_utf8'], str) and
            packet['input_sha256'] == evidence.digest(packet['input_utf8'].encode('utf-8')), 'complete input hash mismatch')
    rows, receipts = history(packet['input_utf8'], event, cutoff)
    expected = candidates.probabilities(rows, event, runtime)
    forecasts = contract.records(packet['forecasts'], evaluator.FORECAST_KIND, contract.forecast, enforce_unique=True)
    seen = set()
    for forecast in forecasts:
        name = forecast['model']['name']
        require(name in registry and name not in seen and forecast['model'] == registry[name]['model'],
                'unknown, duplicate or changed candidate identity or configuration')
        seen.add(name)
        require(contract.same_event(forecast['event'], event) and forecast['origin'] == packet['origin']
                and instant(forecast['input_cutoff']) == cutoff, 'forecast fixture, tier or cutoff mismatch')
        require(observed <= instant(forecast['created_at']) <= instant(forecast['frozen_at']) <= attested,
                'forecast chronology conflicts with pre-event packet proof')
        require(forecast['input_receipts'] == receipts and forecast['market_observation']['state'] == 'unavailable',
                'forecast inputs differ from sealed history or include market evidence')
        require(all(abs(given - predicted) <= 1e-12
                    for given, predicted in zip(forecast['probabilities'], expected[name])),
                'submitted probabilities differ from the fixed calculation')
    require(seen == registry.keys(), 'capture must contain each frozen candidate once')
    return packet


def attach(body, item, recorded):
    fields(body, ('event', 'receipts', 'review', 'supersedes_sha256'), 'outcome attachment')
    contract.event(body['event'])
    require(contract.same_event(item['schedule']['event'], body['event']), 'outcome attachment changed event identity')
    require(item['capture'] is not None and recorded > instant(body['event']['starts_at']),
            'outcome attachment requires a captured fixture after kickoff')
    receipts = contract.records(body['receipts'], evaluator.OUTCOME_KIND, contract.outcome)
    require(all(row['origin'] == 'synthetic' and instant(row['retrieved_at']) <= recorded for row in receipts),
            'outcome receipt is nonsynthetic or not yet retrieved')
    fixture = contract.fixture_collision_key(body['event'])
    require(all(contract.fixture_collision_key(row['event']) == fixture for row in receipts),
            'outcome receipt is unrelated to scheduled fixture')
    review = body['review']
    if review is not None:
        contract.review(review)
        require(contract.same_event(review['event'], body['event']), 'review changed event identity')
        require(instant(review['reviewed_at']) <= recorded, 'outcome review not yet observed')
    previous = item['outcomes']
    if previous is None:
        require(body['supersedes_sha256'] is None, 'no outcome attachment to supersede')
    else:
        require(body['supersedes_sha256'] == previous['sha256'], 'outcome supersession must link the active record')
        earlier = Counter(row['content_sha256'] for row in previous['receipts'])
        current = Counter(row['content_sha256'] for row in receipts)
        require(all(current[key] >= n for key, n in earlier.items()), 'supersession would erase prior outcome evidence')
        require(current != earlier or (previous['review'] is None and review is not None),
                'outcome supersession adds no evidence')


class Lifecycle:
    def __init__(self, registry, runtime):
        self.registry, self.runtime = registry, runtime
        self.events = {}
        self.collision_keys = set()
        self.ordered_pairs = set()
        self.last_time = None

    def apply(self, operation, sha):
        fields(operation, ('schema_version', 'kind', 'recorded_at', 'body'), 'journal operation')
        require(type(operation['schema_version']) is int and operation['schema_version'] == 1, 'unsupported journal version')
        kind, body = operation['kind'], operation['body']
        recorded = instant(operation['recorded_at'])
        require(self.last_time is None or recorded >= self.last_time, 'journal time moved backwards')
        if kind == 'schedule':
            fields(body, ('event', 'origin', 'observed_at', 'provenance'), 'schedule')
            require(body['origin'] == 'synthetic', 'real capture is NOT READY')
            contract.event(body['event'])
            contract.provenance(body['provenance'])
            premier_season(body['event'])
            require(instant(body['observed_at']) <= recorded < instant(body['event']['starts_at']),
                    'late or future schedule evidence')
            key = contract.event_key(body['event'])
            collision = contract.fixture_collision_key(body['event'])
            pair = tuple(body['event'][k].casefold() for k in ('season', 'home', 'away'))
            require(key not in self.events and collision not in self.collision_keys and pair not in self.ordered_pairs,
                    'duplicate or changed schedule identity')
            self.ordered_pairs.add(pair)
            self.events[key] = {'schedule': body, 'capture': None, 'outcomes': None, 'excluded': None, 'head': sha}
            self.collision_keys.add(collision)
        else:
            if kind == 'capture':
                fields(body, ('packet_utf8', 'freeze'), 'capture')
                event = decode_text(body['packet_utf8'], 'packet')['event']
            else:
                event = body['event']
            contract.event(event)
            key = contract.event_key(event)
            require(key in self.events, 'no scheduled event for operation')
            item = self.events[key]
            require(item['excluded'] is None and contract.same_event(item['schedule']['event'], event),
                    'excluded event or changed fixture identity')
            if kind == 'capture':
                require(item['capture'] is None, 'duplicate capture or immutable forecast revision')
                item['capture'] = capture(body, item['schedule'], recorded, self.registry, self.runtime)
            elif kind == 'outcomes':
                attach(body, item, recorded)
                item['outcomes'] = {'sha256': sha, 'receipts': body['receipts']['records'], 'review': body['review']}
            elif kind == 'exclude':
                fields(body, ('event', 'supersedes_sha256', 'reason'), 'exclusion correction')
                require(body['supersedes_sha256'] == item['head'] and contract.intake.text(body['reason']),
                        'correction requires reason and exact active record link')
                item['excluded'] = body['reason']
            else:
                raise ValueError('unknown lifecycle operation')
            item['head'] = sha
        self.last_time = recorded


def report(state, as_of, head):
    require(state.last_time is None or as_of >= state.last_time, 'report precedes latest journal record')
    all_receipts = [row for item in state.events.values() if item['outcomes'] for row in item['outcomes']['receipts']]
    resolver = evaluator.OutcomeIndex(all_receipts)
    events, counts, captures = [], Counter(), Counter()
    for key, item in sorted(state.events.items()):
        event = item['schedule']['event']
        capture_item = item['capture']
        outcome = item['outcomes']
        if capture_item:
            captures.update(row['model']['name'] for row in capture_item['forecasts']['records'])
        reason = None
        if item['excluded'] is not None:
            phase, reason = 'excluded', item['excluded']
        elif capture_item is None:
            phase = 'scheduled' if as_of < instant(event['starts_at']) else 'kickoff_passed'
            if phase == 'kickoff_passed':
                reason = 'missing_or_late_capture'
        elif as_of < instant(event['starts_at']):
            phase = 'captured'
        elif outcome is None:
            phase = 'pending_outcome_review'
        else:
            first = capture_item['forecasts']['records'][0]
            reason, settled = resolver.resolve(first, outcome['review'], as_of)
            if any(row['provenance']['sha256'] in resolver.payload_hashes for row in first['input_receipts']):
                reason, settled = 'evaluation_outcome_payload_reused_as_prematch_input', None
            phase = 'adjudicated' if settled is not None else 'unresolved'
        counts[phase] += 1
        events.append({'event_key': list(key), 'state': phase, 'reason': reason})
    return {'schema_version': 1, 'label': LABEL, 'paper_only': True, **evidence.SAFETY,
            'status': 'insufficient_data', 'journal_head_sha256': head,
            'candidate_readiness': {k: v['status'] for k, v in state.registry.items()},
            'eligible_real_captures': 0, 'eligible_real_outcomes': 0,
            'eligible_real_by_path': dict.fromkeys(state.registry, 0),
            'synthetic_captures_by_path': {key: captures[key] for key in state.registry},
            'synthetic_lifecycle_counts': dict(counts), 'synthetic_events': events}
