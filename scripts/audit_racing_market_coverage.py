#!/usr/bin/env python3
"""Audit checked-in horse market captures offline. Emit coverage, never prices."""
import argparse
from collections import Counter, defaultdict
from datetime import timedelta, timezone
import json
from math import isfinite
from pathlib import Path
import re
from urllib.parse import urlsplit
from zoneinfo import ZoneInfo

from archive_horse_markets import ARCHIVE, ROOT, digest, stamp

SHA = re.compile(r'[0-9a-f]{64}')
ID = re.compile(r'[0-9]+(?:\.[0-9]+)*')
FRESHNESS = timedelta(minutes=30)
UK = ZoneInfo('Europe/London')
SAFE = {'research_only': True, 'model_validation': 'UNVALIDATED', 'publication_gate': 'BLOCKED'}


def parse_capture(row, path, as_of):
    if (row.get('research_only') is not True or row.get('model_validation') != SAFE['model_validation']
        or row.get('publication_gate') != SAFE['publication_gate'] or row.get('kind') != 'HORSE_SOURCE_MARKET_CAPTURE'
        or type(row.get('schema_version')) is not int or row['schema_version'] != 1
        or row.get('executable_verified') is not False or type(row.get('challenge_eligible')) is not int
        or row['challenge_eligible'] != 0 or row.get('origin') not in (None, 'source_observed')):
        return 'unsupported_evidence_tier', None
    body = {key: value for key, value in row.items() if key != 'record_sha256'}
    if path.stem != row.get('record_sha256') or path.stem != digest(body):
        return 'hash_mismatch', None
    ids = (row.get('race_id'), row.get('bookmaker_race_id'), row.get('bookmaker_market_id'))
    if not all(isinstance(value, str) and ID.fullmatch(value) for value in ids):
        return 'invalid_identity', None
    race_id = ids[0]
    start, observed = stamp(row['startUTC']), stamp(row['observed_at_utc'])
    if path.parent.name != race_id or path.parent.parent.name != start.date().isoformat():
        return 'archive_path_mismatch', None
    if not observed < start or observed > as_of:
        return 'invalid_chronology', None
    url = urlsplit(row['source'])
    source_path = re.fullmatch(r'/racing/racecards/(\d{4}-\d{2}-\d{2})/[^/]+/racecard/(\d+)(?:/[^/]+)?/?', url.path)
    if (row.get('publisher') != 'Sporting Life' or row.get('bookmaker') != 'Sky Bet' or url.scheme != 'https'
        or url.netloc != 'www.sportinglife.com' or url.query or url.fragment or source_path is None
        or source_path.groups() != (start.astimezone(UK).date().isoformat(), race_id)
        or not SHA.fullmatch(str(row.get('source_sha256', '')))):
        return 'unsupported_receipt', None
    field, quotes = row['active_runner_ids'], row['quotes']
    if (not isinstance(field, list) or not all(isinstance(value, str) and ID.fullmatch(value) for value in field)
        or len(field) < 2 or len(set(field)) != len(field) or not isinstance(quotes, list)
        or len(quotes) != len(field)):
        return 'incomplete_field', None
    prices = {}
    for quote in quotes:
        runner, decimal = quote['horse_id'], quote['decimal']
        if (runner not in field or runner in prices or type(decimal) not in (int, float)
            or not isfinite(decimal) or decimal <= 1):
            return 'invalid_quote', None
        prices[runner] = decimal
    course = row['racecourse']
    if not isinstance(course, str) or not course.strip():
        return 'invalid_identity', None
    identity = (start, course, *ids[1:], tuple(sorted(field)))
    return None, (race_id, observed, identity, tuple(sorted(prices.items())), row['source_sha256'])


def audit(paths, as_of, *, include_pairs=False):
    statuses = Counter()
    by_race = defaultdict(lambda: defaultdict(set))
    owners = defaultdict(set)
    fingerprints = set()
    for path in paths:
        statuses['input_files'] += 1
        try:
            row = json.loads(path.read_text(encoding='utf-8'))
            reason, observation = parse_capture(row, path, as_of)
        except (OSError, TypeError, ValueError, KeyError, AttributeError, OverflowError):
            reason, observation = 'unreadable_or_invalid_record', None
        if reason:
            statuses[reason] += 1
            continue
        if row['record_sha256'] in fingerprints:
            statuses['duplicate_files'] += 1
            continue
        fingerprints.add(row['record_sha256'])
        race, time, identity, prices, receipt = observation
        owners[identity[2:4]].add(race)
        by_race[race][time].add((identity, prices, receipt, row['record_sha256']))
        statuses['validated_capture_files'] += 1

    comparable_races = []
    fresh, historical, stale_upcoming = set(), set(), set()
    for race, observations in sorted(by_race.items()):
        if any(len(values) > 1 for values in observations.values()):
            statuses['races_with_observation_conflict'] += 1
            continue
        pairs = []
        previous = None
        for observed, values in sorted(observations.items()):
            identity, _, _, record_hash = next(iter(values))
            if len(owners[identity[2:4]]) != 1:
                statuses['observations_with_market_id_collision'] += 1
                previous = None
                continue
            if observed >= as_of - FRESHNESS and identity[0] > as_of:
                fresh.add(race)
            elif identity[0] > as_of:
                stale_upcoming.add(race)
            else:
                historical.add(race)
            if previous is not None and previous[0] == identity:
                pairs.append([previous[1], record_hash])
            previous = identity, record_hash
        if pairs:
            comparable_races.append({'race_id':race, 'consecutive_comparable_pairs':len(pairs),
                                     'record_sha256_pairs':pairs})
    return {**SAFE, 'as_of_utc':as_of.astimezone(timezone.utc).isoformat(),
            'archive_counts':dict(sorted(statuses.items())),
            'historical_source_observed_races':len(historical),
            'fresh_source_observed_races':len(fresh),
            'stale_upcoming_source_observed_races':len(stale_upcoming - fresh),
            'races_with_comparable_pairs':len(comparable_races),
            'consecutive_comparable_pairs':sum(item['consecutive_comparable_pairs'] for item in comparable_races),
            'comparable_races':comparable_races if include_pairs else [
                {key:value for key,value in item.items() if key != 'record_sha256_pairs'} for item in comparable_races], 'executable_prices_verified':0,
            'eligible_real_forecasts_added':0, 'eligible_real_outcomes_added':0}


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--as-of', required=True, type=stamp, help='Explicit zoned audit time')
    parser.add_argument('--include-pairs', action='store_true', help='Include original capture hash references')
    args = parser.parse_args()
    if not ARCHIVE.is_dir():
        parser.error(f'Missing repository archive {ARCHIVE.relative_to(ROOT)}')
    report = audit(sorted(ARCHIVE.glob('*/*/*.json')), args.as_of, include_pairs=args.include_pairs)
    if not report['archive_counts'].get('input_files'):
        parser.error('Repository market archive is empty')
    print(json.dumps(report, indent=2))
