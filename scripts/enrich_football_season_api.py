#!/usr/bin/env python3
"""Add display-only current-season comparisons to an existing research feed."""
import argparse
from collections import defaultdict
from datetime import datetime, timedelta, timezone
import hashlib
import json
import math
import os
from pathlib import Path
import re
import time
import unicodedata
from urllib.error import HTTPError, URLError
from urllib.request import HTTPRedirectHandler, Request, build_opener

CODES = {'PL': 'PL', 'E0': 'PL', 'E1': 'ELC', 'UCL': 'CL',
         'SP1': 'PD', 'D1': 'BL1', 'I1': 'SA', 'F1': 'FL1'}
FIELD = 'football_data_season_comparison'
METHOD = 'FOOTBALL_DATA_VENUE_POISSON_V1'
ALIASES = {'atleticomadrid': 'atleticodemadrid', 'bayernmunich': 'bayernmunchen',
           'fccologne': 'fckoln', 'tottenham': 'tottenhamhotspur'}


class NoRedirect(HTTPRedirectHandler):
    def redirect_request(self, *args, **kwargs):
        return None


def team_key(name):
    name = re.sub(r'^AFC | (?:AFC|FC)$', '', name.strip(), flags=re.I)
    key = re.sub('[^a-z0-9]', '', unicodedata.normalize('NFKD', name.casefold()))
    return ALIASES.get(key, key)


def utc(value):
    parsed = datetime.fromisoformat(value)
    if parsed.utcoffset() != timedelta(0):
        raise ValueError('Expected UTC timestamp')
    return parsed


def compare(matches, fixtures, observed, recent_differences=None):
    aliases = defaultdict(set)
    venues = defaultdict(list)
    recent = defaultdict(list)
    identities = set()
    for match in matches:
        home, away = match['homeTeam'], match['awayTeam']
        start = utc(match['utcDate'])
        if not home.get('id') or not away.get('id'):
            continue  # Unassigned cup bracket slots have no team identity.
        identity = (home['id'], away['id'], start)
        if identity in identities:
            raise ValueError('Ambiguous API match identity')
        identities.add(identity)
        for team in (home, away):
            for name in (team.get('name'), team.get('shortName')):
                if name:
                    aliases[team_key(name)].add(team['id'])
        if match['status'] != 'FINISHED' or start > observed - timedelta(hours=3):
            continue
        score = match['score']
        full = score['fullTime']
        if score['duration'] != 'REGULAR' or not all(type(full[k]) is int and full[k] >= 0 for k in ('home', 'away')):
            continue
        if recent_differences is not None:
            recent[home['id']].append((start, full['home'] - full['away']))
            recent[away['id']].append((start, full['away'] - full['home']))
        venues[home['id'], 'home'].append((full['home'], full['away']))
        venues[away['id'], 'away'].append((full['away'], full['home']))
    for fixture in fixtures:
        start = utc(fixture['kickoff_utc'])
        if start <= observed or fixture.get('verification') != 'SCHEDULE_CROSS_CHECK':
            continue
        home = aliases[team_key(fixture['home'])]
        away = aliases[team_key(fixture['away'])]
        if len(home) != 1 or len(away) != 1:
            continue
        h, a = next(iter(home)), next(iter(away))
        if (h, a, start) not in identities:
            continue
        home_rows, away_rows = venues[h, 'home'], venues[a, 'away']
        if min(len(home_rows), len(away_rows)) < 5:
            continue
        home_rate = (sum(gf for gf, _ in home_rows) / len(home_rows) +
                     sum(ga for _, ga in away_rows) / len(away_rows)) / 2
        away_rate = (sum(gf for gf, _ in away_rows) / len(away_rows) +
                     sum(ga for _, ga in home_rows) / len(home_rows)) / 2
        rates = [[math.exp(-rate) * rate ** i / math.factorial(i) for i in range(24)]
                 for rate in (home_rate, away_rate)]
        totals = [0.0, 0.0, 0.0]
        for i, home_p in enumerate(rates[0]):
            for j, away_p in enumerate(rates[1]):
                totals[0 if i > j else 1 if i == j else 2] += home_p * away_p
        if recent_differences is not None and start >= observed + timedelta(minutes=5):
            def recent_five(team):
                return [diff for _, diff in sorted(recent[team])[-5:]]
            home_recent, away_recent = recent_five(h), recent_five(a)
            if len(home_recent) == len(away_recent) == 5:
                recent_differences[id(fixture)] = (home_recent, away_recent)
        yield fixture, dict(zip(('prob_home', 'prob_draw', 'prob_away'),
                                (p / sum(totals) for p in totals))), len(home_rows), len(away_rows)


def freeze_pair(fixture, comparison, recent):
    # Prespecified prospective pilot. Keep the existing venue comparison as control.
    baseline = [comparison[key] for key in ('prob_home', 'prob_draw', 'prob_away')]
    tilt = 0.10 * max(-3, min(3, (sum(recent[0]) - sum(recent[1])) / 5))
    shifted = [baseline[0] * math.exp(tilt), baseline[1], baseline[2] * math.exp(-tilt)]
    return {
        'home': fixture['home'], 'away': fixture['away'], 'kickoff_utc': fixture['kickoff_utc'],
        'captured_at_utc': comparison['observed_at_utc'], 'baseline_model': METHOD,
        'challenger_model': 'BOTTLENECK_PL_RECENT_GOAL_DIFF_PILOT_V1',
        'baseline': baseline, 'challenger': [p / sum(shifted) for p in shifted],
        'recent_goal_differences': recent, 'source_sha256': comparison['source_sha256'],
        'source': comparison['source'],
        'baseline_venue_samples': [comparison['home_venue_matches'], comparison['away_venue_matches']],
    }


def enrich(feed, token, archive=None):
    if (feed.get('research_only'), feed.get('model_validation'), feed.get('publication_gate')) != (True, 'UNVALIDATED', 'BLOCKED'):
        raise ValueError('Expected blocked research feed')
    groups = defaultdict(list)
    for row in feed['upcoming_fixtures']:
        row.pop(FIELD, None)
        if row.get('league', 'PL') in CODES:
            groups[CODES[row.get('league', 'PL')]].append(row)
    opener = build_opener(NoRedirect())
    for code, fixtures in groups.items():
        now = datetime.now(timezone.utc)
        season = now.year - (now.month < 7)
        url = f'https://api.football-data.org/v4/competitions/{code}/matches?season={season}'
        try:
            with opener.open(Request(url, headers={'X-Auth-Token': token}), timeout=20) as response:
                raw = response.read(2_000_001)
                remaining = response.headers.get('X-RequestsAvailable-Minute')
            if len(raw) > 2_000_000:
                raise ValueError('API payload too large')
            payload = json.loads(raw)
            if payload['competition']['code'] != code:
                raise ValueError('Unexpected competition')
            observed = datetime.now(timezone.utc)
            recent = {} if archive is not None and code == 'PL' else None
            comparisons = list(compare(payload['matches'], fixtures, observed, recent))
        except (HTTPError, URLError, OSError, ValueError, KeyError, TypeError, ArithmeticError) as exc:
            print(f'{code}: comparison unavailable ({getattr(exc, "code", type(exc).__name__)})')
            if getattr(exc, 'code', None) in (401, 403, 429):
                break
            continue
        for fixture, vector, home_n, away_n in comparisons:
            fixture[FIELD] = {
                **vector, 'method': METHOD, 'season': season, 'observed_at_utc': observed.isoformat(),
                'home_venue_matches': home_n, 'away_venue_matches': away_n,
                'small_sample': min(home_n, away_n) < 10,
                'source': url, 'source_sha256': hashlib.sha256(raw).hexdigest(),
                'research_only': True, 'publication_gate': 'BLOCKED',
                'model_validation': 'UNVALIDATED', 'odds': None, 'expected_value': None,
            }
            if recent is not None and id(fixture) in recent:
                pair = freeze_pair(fixture, fixture[FIELD], recent[id(fixture)])
                identity = '|'.join(pair[k] for k in ('home', 'away', 'kickoff_utc'))
                archive.setdefault(identity, pair)
        print(f'{code}: {len(comparisons)} display comparisons')
        if remaining == '0':
            break
        time.sleep(1)


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('feed', type=Path)
    parser.add_argument('--bottleneck-archive', type=Path)
    args = parser.parse_args()
    token = os.getenv('FOOTBALL_DATA_API_KEY', '').strip()
    if token:
        feed = json.loads(args.feed.read_text())
        archive = None
        if args.bottleneck_archive:
            archive = json.loads(args.bottleneck_archive.read_text()) if args.bottleneck_archive.exists() else {}
        enrich(feed, token, archive)
        if archive is not None:
            args.bottleneck_archive.write_text(json.dumps(archive, indent=2, ensure_ascii=False, allow_nan=False) + '\n')
        args.feed.write_text(json.dumps(feed, indent=2, ensure_ascii=False, allow_nan=False) + '\n')
    else:
        print('Current-season API comparison skipped: FOOTBALL_DATA_API_KEY unavailable')
