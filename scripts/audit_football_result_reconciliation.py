#!/usr/bin/env python3
"""Phase 8 audit logic from PR #118, reused by the offline verified-results pilot."""
from collections import Counter, defaultdict
from datetime import date, datetime, timezone
import hashlib
import json
from pathlib import Path
import re
from urllib.parse import urlsplit

ROOT = Path(__file__).resolve().parents[1]
COMPETITIONS = {
    'Premier League': 'PL', 'Championship': 'E1', 'La Liga': 'SP1',
    'Bundesliga': 'D1', 'Serie A': 'I1', 'Ligue 1': 'F1',
    'Champions League': 'UCL', 'Europa League': 'UEL',
}
CENTRE = set(COMPETITIONS.values()) - {'UEL'}
# Scoped aliases inspected against the archived rows. No similarity matching.
ALIASES = {
    'D1': {'FC Schalke 04': 'Schalke 04'},
    'SP1': {'Elche CF': 'Elche', 'Getafe CF': 'Getafe', 'Valencia CF': 'Valencia',
            'Villarreal CF': 'Villarreal'},
    'PL': {'Leeds': 'Leeds United', 'Man City': 'Manchester City',
           'Man Utd': 'Manchester United', 'Man United': 'Manchester United',
           'Newcastle': 'Newcastle United', "Nott'm Forest": 'Nottingham Forest',
           'Spurs': 'Tottenham Hotspur'},
    'I1': {'Milan': 'AC Milan'},
}
INPUTS = {
    'single': ('historical-reliability-data.json', ('results',), 'SINGLE_SOURCE_UNVERIFIED'),
    'expanded': ('football-expanded-data.json', ('performance', 'entries'), 'TWO_SOURCE_EXPANDED_FINAL'),
    'legacy': ('research-history.json', ('entries',), 'LEGACY_SCORED_ARCHIVE'),
    'retrospective': ('research/football-baseline-v1/608-reconstructed-forecasts.json', ('rows',),
                      'RETROSPECTIVE_RECONSTRUCTION'),
    'ledger': ('prediction-ledger.json', ('records',), 'PROSPECTIVE_FORECAST_LEDGER'),
    'outcomes': ('results-feed.json', ('records',), 'PROSPECTIVE_OUTCOME_FEED'),
}
STATES = ('exact_fixture_and_score', 'likely_overlap_identity_review', 'ambiguous_identity', 'score_conflict',
          'unmatched', 'duplicate_or_repeated', 'outside_centre_coverage')


def digest(raw):
    return hashlib.sha256(raw).hexdigest()


def valid_hash(value):
    return isinstance(value, str) and re.fullmatch(r'[a-f0-9]{64}', value) is not None


def instant(value):
    try:
        parsed = datetime.fromisoformat(value.replace('Z', '+00:00'))
        if parsed.tzinfo is not None:
            return parsed.astimezone(timezone.utc)
    except (ValueError, TypeError, AttributeError):
        pass
    return None


def calendar_date(value):
    try:
        parsed = date.fromisoformat(value)
        return value if parsed.isoformat() == value else None
    except (ValueError, TypeError):
        return None


def read_snapshot(root, kind):
    path, keys, tier = INPUTS[kind]
    info = {'file': path, 'evidence_tier': tier, 'rows': None}
    try:
        raw = (root / path).read_bytes()
        info['file_sha256'] = digest(raw)
        document = json.loads(raw)
        if not isinstance(document, dict):
            raise ValueError('snapshot must be an object')
        rows = document
        for key in keys:
            rows = rows[key]
        if not isinstance(rows, list):
            raise ValueError('rows must be an array')
    except FileNotFoundError:
        return {**info, 'state': 'missing'}, {}, []
    except (OSError, KeyError, TypeError, ValueError):
        return {**info, 'state': 'invalid'}, {}, []
    return {**info, 'state': 'loaded', 'rows': len(rows)}, document, rows


def fixture_id(row):
    # Only an explicit namespace + ID is eligible for exact identity. A model
    # record hash, display date or inferred fixture key is not a provider ID.
    namespace, identifier = row.get('fixture_id_namespace'), row.get('provider_fixture_id')
    return [namespace, identifier] if all(isinstance(v, str) and v.strip() for v in (namespace, identifier)) else None


def record(kind, position, row, document):
    row = row if isinstance(row, dict) else {}
    _, _, tier = INPUTS[kind]
    original_competition = row.get('competition') if kind == 'single' else row.get('league', 'PL' if kind in ('legacy','retrospective') else None)
    competition = (COMPETITIONS.get(original_competition, original_competition)
                   if isinstance(original_competition, str) else None)
    original_names = [row.get('home'), row.get('away')]
    names = [ALIASES.get(competition, {}).get(name, name) if isinstance(name, str) else None for name in original_names]
    precision = row.get('time_precision') if kind == 'single' else 'DATE_ONLY' if kind == 'retrospective' else 'UTC_KICKOFF'
    raw_time = row.get('date') if kind == 'retrospective' else row.get('kickoff_utc')
    parsed = instant(raw_time) if precision == 'UTC_KICKOFF' else None
    if precision == 'DATE_ONLY_END_OF_DAY':
        day = calendar_date(raw_time[:10]) if isinstance(raw_time, str) else None
    elif precision == 'DATE_ONLY':
        day = calendar_date(raw_time)
    else:
        day = parsed.date().isoformat() if parsed else None
    score = row.get('ft') if kind == 'retrospective' else [row.get('score_home'), row.get('score_away')]
    if not isinstance(score,list) or len(score) != 2 or any(type(value) is not int or value < 0 for value in score):
        score = None
    audits = document.get('audit', [])
    source_url = row.get('source_url')
    source_hashes = {item.get('csv_sha256') for item in audits if isinstance(item,dict)
                     and item.get('competition') == original_competition and item.get('source_url') == source_url
                     and valid_hash(item.get('csv_sha256'))} if kind == 'single' and isinstance(audits,list) else set()
    receipts = row.get('source_receipts')
    receipts = [{key: receipt.get(key) for key in ('url','sha256','observed_at_utc','received_at_utc') if key in receipt}
                for receipt in receipts if isinstance(receipt,dict)] if isinstance(receipts,list) else []
    season = document.get('coverage_season') if kind == 'single' else row.get('season') if kind == 'retrospective' else None
    season_inferred = False
    if season is None and day:
        year = int(day[:4]) - (day[5:7] < '07')
        season, season_inferred = f'{year}/{(year + 1) % 100:02}', True
    meta = document.get('meta')
    return {
        'snapshot_generated_at_utc': document.get('generated_at_utc'),
        'research_gate_intact': (document.get('research_only') is True and
                                document.get('model_validation') == 'UNVALIDATED' and
                                document.get('publication_gate') == 'BLOCKED' and
                                row.get('publication_gate') == 'BLOCKED'),
        'key': f'{kind}:{position}', 'tier': tier, 'file': INPUTS[kind][0],
        'source_record_id': row.get('id'), 'source_record_sha256': row.get('record_sha256'),
        'source_url': source_url, 'source_csv_sha256': next(iter(source_hashes)) if len(source_hashes) == 1 else None,
        'upstream_provider': row.get('upstream_provider'), 'date': day, 'source_date_field': raw_time,
        'date_precision': precision, 'kickoff_utc': parsed.isoformat() if parsed else None,
        'season': season, 'season_inferred': season_inferred,
        'source_competition': original_competition, 'competition': competition,
        'source_participants': original_names, 'participants': names, 'score': score,
        'fixture_id': fixture_id(row), 'receipts': receipts, 'source_verification': row.get('verification'),
        'retrospective_source_commit': meta.get('historical_source_commit') if kind == 'retrospective' and isinstance(meta,dict) else None,
        'timestamp_independently_attested': row.get('timestamp_independently_attested'),
    }


def identity(row):
    names = row['participants']
    if not row['date'] or not all(isinstance(name,str) and name.strip() for name in names) or names[0] == names[1]:
        return None
    return (row['competition'],row['date'],*names)


def two_source_contract(row):
    if row['tier'] != 'TWO_SOURCE_EXPANDED_FINAL' or row['source_verification'] != 'TWO_SOURCE_REGULATION_TIME_FINAL' or not row['research_gate_intact']:
        return False
    kickoff = instant(row['kickoff_utc'])
    published = instant(row['snapshot_generated_at_utc'])
    hosts = set()
    for receipt in row['receipts']:
        url = receipt.get('url')
        observed = instant(receipt.get('observed_at_utc'))
        if not isinstance(url,str) or not kickoff or not published or not observed or not kickoff < observed <= published or not valid_hash(receipt.get('sha256')):
            continue
        try:
            parsed = urlsplit(url)
            if parsed.scheme == 'https' and parsed.hostname and not parsed.username and not parsed.password:
                hosts.add(parsed.hostname)
        except ValueError:
            continue
    return len(hosts) >= 2


def audit(root):
    info, snapshots, records = {}, {}, {}
    for kind in INPUTS:
        info[kind], snapshots[kind], records[kind] = read_snapshot(root,kind)
    single = [record('single',i,row,snapshots['single']) for i,row in enumerate(records['single'],1)]
    refs = [record(kind,i,row,snapshots[kind]) for kind in ('expanded','legacy','retrospective')
            for i,row in enumerate(records[kind],1)]
    # Repetitions of a result are represented once per exact source-stream fixture.
    reference_groups = defaultdict(list)
    for row in refs:
        key = identity(row)
        if key and row['score'] is not None:
            reference_groups[(row['tier'], key,row['kickoff_utc'])].append(row)
        else:
            row['record_status'] = 'ambiguous_identity'
    by_day = defaultdict(list)
    for (_,key,_), group in reference_groups.items():
        representative = group[0]
        conflict = any(row['score'] != representative['score'] for row in group)
        conflicting_ids = len({tuple(row['fixture_id']) for row in group if row['fixture_id']}) > 1
        for i,row in enumerate(group):
            row['record_status'] = ('score_conflict' if conflict else 'ambiguous_identity' if conflicting_ids
                                    else 'duplicate_or_repeated' if i else 'included')
        by_day[key].append((representative, group))

    single_groups = defaultdict(list)
    for row in single:
        if key := identity(row):
            single_groups[key].append(row)
    totals = Counter({state:0 for state in STATES})
    candidate_total = 0
    likely_tiers = Counter()
    unavailable = [kind for kind in ('expanded','legacy','retrospective') if info[kind]['state'] != 'loaded']
    for row in single:
        key = identity(row)
        groups = by_day.get(key, [])
        candidates = [candidate for candidate, _ in groups]
        reversed_order = not candidates and bool(key) and bool(by_day.get((*key[:2],key[3],key[2])))
        if reversed_order:
            groups = by_day[(*key[:2],key[3],key[2])]
        row['candidates'] = [
            {'key': item['key'], 'score_agrees': item['score'] == row['score'],
             'ordered_participants_match': not reversed_order, 'reference_disposition': item['record_status']}
            for _, group in groups for item in group
        ]
        same = single_groups.get(key, [])
        if key is None or row['competition'] not in COMPETITIONS.values() or row['date_precision'] != 'DATE_ONLY_END_OF_DAY' or row['score'] is None:
            state, reason = 'ambiguous_identity', 'Unsupported competition, date precision, score or ordered participant fields.'
        elif any(item['score'] != row['score'] for item in same):
            state, reason = 'score_conflict', 'Single-source rows disagree on the score for the same mapped date and ordered teams.'
        elif len({tuple(item['fixture_id']) for item in same if item['fixture_id']}) > 1:
            state, reason = 'ambiguous_identity', 'Single-source rows share the date and teams but have different provider fixture IDs.'
        elif same[0] is not row:
            state, reason = 'duplicate_or_repeated', 'Repeated single-source fixture and score. Counted under the first row key.'
        elif row['competition'] not in CENTRE:
            state, reason = 'outside_centre_coverage', 'Competition has no result tier in the current Centre.'
        elif reversed_order:
            state, reason = 'ambiguous_identity', 'A candidate reverses home and away. No ordered match can be confirmed.'
        elif any(item['record_status'] == 'score_conflict' for _,group in groups for item in group):
            state, reason = 'score_conflict', 'Reference revisions disagree on the score.'
            candidate_total += 1
        elif len(candidates) > 1 or any(item['record_status'] == 'ambiguous_identity' for _,group in groups for item in group):
            state, reason = 'ambiguous_identity', 'Multiple reference fixtures or provider identities share this date and ordered participants.'
            candidate_total += 1
        elif not candidates:
            state, reason = 'unmatched', 'No loaded reference fixture shares the mapped competition, calendar date and ordered teams.'
            if unavailable:
                reason += ' Reference snapshots unavailable: ' + ', '.join(unavailable) + '.'
        else:
            candidate_total += 1
            candidate = candidates[0]
            source_id, reference_id = row['fixture_id'], candidate['fixture_id']
            if source_id and reference_id and source_id[0] == reference_id[0] and source_id != reference_id:
                state, reason = 'ambiguous_identity', 'Ordered results carry different fixture IDs in the same provider namespace.'
            elif candidate['score'] != row['score']:
                state, reason = 'score_conflict', 'Ordered candidate fixture has a different regulation-time score.'
            elif row['fixture_id'] and row['fixture_id'] == candidate['fixture_id'] and two_source_contract(candidate):
                state, reason = 'exact_fixture_and_score', 'Shared namespaced fixture ID, ordered score and two-source final receipts.'
            else:
                likely_tiers[candidate['tier']] += 1
                state, reason = 'likely_overlap_identity_review', 'Date, mapped ordered teams and score agree. Shared fixture ID or qualifying reference receipts are missing.'
        for pair in row['candidates']:
            disposition = pair['reference_disposition']
            if disposition == 'duplicate_or_repeated' and pair['ordered_participants_match']:
                pair.update(classification=disposition, reason='Repeated reference observation of the same canonical fixture and score.')
            else:
                pair.update(classification=state, reason=reason)
        row.update(classification=state, reason=reason)
        totals[state] += 1

    return {
        'schema_version':1, 'research_only':True, 'model_validation':'UNVALIDATED', 'publication_gate':'BLOCKED',
        'inputs':info, 'competition_mapping':COMPETITIONS, 'team_aliases':ALIASES,
        'classified_rows':len(single), 'candidate_rows':candidate_total, 'classification_counts':dict(totals),
        'likely_by_reference_tier':dict(likely_tiers),
        'candidate_pair_counts':dict(Counter(pair['classification'] for row in single for pair in row['candidates'])),
        'reference_counts':dict(Counter(row['record_status'] for row in refs)),
        'reference_counts_by_tier':{tier:dict(Counter(row['record_status'] for row in refs if row['tier'] == tier))
                                    for tier in dict.fromkeys(row['tier'] for row in refs)},
        'single_rows_with_stable_fixture_id':sum(row['fixture_id'] is not None for row in single),
        'single_rows_with_multiple_receipts':sum(len(row['receipts']) > 1 for row in single),
        'expanded_rows_meeting_two_source_contract':sum(two_source_contract(row) for row in refs),
        'football_prospective_forecasts':sum(isinstance(row,dict) and row.get('sport') == 'football' for row in records['ledger']),
        'single_source_rows':single, 'reference_rows':refs,
    }


def markdown(report):
    lines = ['# Football result reconciliation', '', 'Research only. Models **UNVALIDATED**. Publication **BLOCKED**.',
             '', 'Regenerate with `python scripts/audit_football_result_reconciliation.py --write`.',
             '', '| Input snapshot | Tier | Input rows | State |', '| --- | --- | ---: | --- |']
    for item in report['inputs'].values():
        lines.append(f"| `{item['file']}` | {item['evidence_tier']} | {item['rows'] if item['rows'] is not None else '—'} | {item['state']} |")
    lines += ['', f"Ordered date/name candidates: **{report['candidate_rows']}** distinct single-source rows.", '',
              '| Single-source classification | Rows |', '| --- | ---: |']
    lines += [f'| {state} | {count} |' for state,count in report['classification_counts'].items()]
    lines += ['', f"Total classified rows: **{report['classified_rows']}**.", '',
              'Likely overlaps by reference evidence tier: ' +
              (', '.join(f'{tier}: {count}' for tier,count in sorted(report['likely_by_reference_tier'].items())) or 'none') + '.',
              '', 'Candidate pairs by disposition (including reference repeats): ' +
              (', '.join(f'{state}: {count}' for state,count in sorted(report['candidate_pair_counts'].items())) or 'none') + '.',
              '', 'Reference rows by disposition: ' +
              (', '.join(f'{state}: {count}' for state,count in sorted(report['reference_counts'].items())) or 'none') + '.',
              '', 'Reference dispositions by tier: ' +
              ('; '.join(f"{tier} ({', '.join(f'{state}: {count}' for state,count in sorted(counts.items()))})"
                        for tier,counts in report['reference_counts_by_tier'].items()) or 'none') + '.',
              '', f"Single-source rows with a stable fixture ID: {report['single_rows_with_stable_fixture_id']}.",
              f"Single-source rows with multiple receipts: {report['single_rows_with_multiple_receipts']}.",
              f"Expanded rows meeting the two-source metadata contract: {report['expanded_rows_meeting_two_source_contract']}.",
              f"Football rows in the prospective forecast ledger: {report['football_prospective_forecasts']}.",
              '', 'The JSON records input hashes, ordered participants, aliases, date precision, source receipts and every decision.',
              'DATE_ONLY_END_OF_DAY preserves the source date only. Reference season labels inferred from dates use a July boundary.',
              'A CSV hash establishes file provenance. It does not identify a fixture or establish independent verification.',
              'Retrospective records remain separate. Legacy score receipts and reconstructed histories do not establish pre-event predictions.',
              'A trusted provider fixture ID or reviewed crosswalk, exact competition and participants, regulation-time settlement,',
              'and separately sourced result receipts would be needed before promoting any row to a verified-results view.',
              'This audit changes no evidence tier or input snapshot.', '']
    return '\n'.join(lines)
