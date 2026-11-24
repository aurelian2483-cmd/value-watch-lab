"""Collect limited Sky Bet h2h observations for local Value Watch UI verification."""
import argparse
from collections import Counter
import hashlib
import json
import math
import os
import re
import sys
from datetime import datetime, timezone
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import HTTPRedirectHandler, build_opener, Request

ROOT = 'https://api.the-odds-api.com/v4/sports'
SPORTS = (
    'soccer_epl', 'soccer_efl_champ', 'soccer_uefa_champs_league',
    'soccer_uefa_europa_league', 'soccer_spain_la_liga', 'soccer_italy_serie_a',
    'soccer_germany_bundesliga', 'soccer_france_ligue_one', 'americanfootball_nfl',
    'tennis_atp_finals', 'tennis_wta_finals',
)
PARAMS = {'bookmakers': 'skybet', 'markets': 'h2h', 'oddsFormat': 'decimal', 'dateFormat': 'iso'}
MAX_USED = 400
RESERVE = 20
MAX_AGE = 30 * 60
MAX_BODY = 2 * 1024 * 1024
MAX_EVENTS = 100


class CollectionError(Exception):
    """Only sanitized messages may cross the production entry point."""


class NoRedirect(HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None


def request_json(path, params, key):
    query = urlencode({'apiKey': key, **params})
    try:
        request = Request(f'{ROOT}{path}?{query}', headers={'Accept': 'application/json'})
        with build_opener(NoRedirect()).open(request, timeout=15) as response:
            body = response.read(MAX_BODY + 1)
            if len(body) > MAX_BODY:
                raise CollectionError('Provider response exceeded the size limit.')
            return json.loads(body), response.headers, hashlib.sha256(body).hexdigest()
    except HTTPError as exc:
        raise CollectionError(f'Provider HTTP status {exc.code}.') from None
    except (URLError, TimeoutError, OSError, ValueError):
        raise CollectionError('Provider connection or JSON response failed.') from None


def instant(value):
    if not isinstance(value, str) or not re.fullmatch(r'\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{1,6})?Z', value):
        return None
    try:
        return datetime.fromisoformat(value[:-1] + '+00:00')
    except ValueError:
        return None


def quota(headers):
    try:
        counters = tuple(int(headers[name]) for name in
                         ('x-requests-used', 'x-requests-remaining', 'x-requests-last'))
        if min(counters) < 0:
            raise ValueError
        return counters
    except (KeyError, TypeError, ValueError):
        raise CollectionError('Quota headers are missing or invalid. No further requests will be made.') from None


def clean_event(event, sport, checked, digest):
    if not isinstance(event, dict) or event.get('sport_key') != sport:
        return None
    identity, home, away = (event.get(key) for key in ('id', 'home_team', 'away_team'))
    start = instant(event.get('commence_time'))
    if (not isinstance(identity, str) or not re.fullmatch(r'[a-z0-9]{16,64}', identity)
            or not all(isinstance(team, str) and 0 < len(team.strip()) <= 120 for team in (home, away))
            or home.strip().casefold() == away.strip().casefold() or start is None or start <= checked):
        return None
    bookmakers = event.get('bookmakers')
    if not isinstance(bookmakers, list):
        return None
    sky = [item for item in bookmakers if isinstance(item, dict) and item.get('key') == 'skybet']
    if len(sky) != 1 or not isinstance(sky[0].get('markets'), list):
        return None
    markets = [item for item in sky[0]['markets'] if isinstance(item, dict) and item.get('key') == 'h2h']
    if len(markets) != 1:
        return None
    # Main odds endpoint documents bookmaker last_update. Prefer market time when supplied.
    observed = markets[0].get('last_update', sky[0].get('last_update'))
    seen = instant(observed)
    if not seen or seen > checked or (checked - seen).total_seconds() > MAX_AGE:
        return None
    names = {'home': home, 'away': away}
    if sport.startswith('soccer_'):
        names['draw'] = 'Draw'
    outcomes = markets[0].get('outcomes')
    if not isinstance(outcomes, list) or len(outcomes) != len(names):
        return None
    prices = {}
    for side, name in names.items():
        matched = [o for o in outcomes if isinstance(o, dict) and o.get('name') == name]
        if len(matched) != 1 or 'point' in matched[0]:
            return None
        price = matched[0].get('price')
        if type(price) not in (int, float) or not 1 < price <= 10000 or not math.isfinite(price):
            return None
        prices[side] = price
    return dict(sport_key=sport, event_id=identity, start_utc=event['commence_time'],
                home=home, away=away, market='h2h', bookmaker='skybet',
                observed_at_utc=observed, checked_at_utc=checked.isoformat().replace('+00:00', 'Z'),
                source_url=f'{ROOT}/{sport}/odds?{urlencode(PARAMS)}',
                receipt_sha256=digest, prices=prices)


def collect(key, request=request_json, clock=lambda: datetime.now(timezone.utc),
            sports=SPORTS, max_requests=len(SPORTS)):
    if (not sports or any(sport not in SPORTS for sport in sports)
            or len(set(sports)) != len(sports) or not 1 <= max_requests <= len(SPORTS)):
        raise CollectionError('Invalid permitted sports or request budget. No requests were made.')
    catalogue, headers, _ = request('', {}, key)
    used, remaining, cost = quota(headers)
    if cost != 0 or not isinstance(catalogue, list):
        raise CollectionError('Unexpected catalogue response or cost.')
    active = {row.get('key') for row in catalogue if isinstance(row, dict) and row.get('active') is True
              and isinstance(row.get('key'), str)}
    rows, stats = [], []
    event_counts = Counter()
    for sport in sports:
        if len(stats) >= max_requests or used >= MAX_USED or remaining <= RESERVE:
            break
        if sport not in active:
            continue
        payload, headers, digest = request(f'/{sport}/odds', PARAMS, key)
        previous, previous_remaining = used, remaining
        used, remaining, cost = quota(headers)
        if cost > 1 or used - previous != cost or previous_remaining - remaining != cost:
            raise CollectionError('Unexpected provider cost or quota movement. Collection stopped.')
        if not isinstance(payload, list) or len(payload) > MAX_EVENTS:
            raise CollectionError('Unexpected odds response shape or event count.')
        event_counts.update(event['id'] for event in payload
                            if isinstance(event, dict) and isinstance(event.get('id'), str))
        checked = clock()
        accepted = [row for event in payload if (row := clean_event(event, sport, checked, digest))]
        rows.extend(accepted)
        stats.append(dict(sport=sport, events=len(payload), accepted=len(accepted), credits=cost))
    report = {'requests': stats, 'credits_used_account': used, 'credits_remaining_account': remaining}
    snapshot = {'schema_version': 1, 'provider': 'THE_ODDS_API', 'research_only': True,
                'model_validation': 'UNVALIDATED', 'publication_gate': 'BLOCKED',
                'generated_at_utc': clock().isoformat().replace('+00:00', 'Z'),
                'records': [row for row in rows if event_counts[row['event_id']] == 1]}
    return snapshot, report


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output', default='work/current-odds.json')
    parser.add_argument('--sports', nargs='+', choices=SPORTS, default=list(SPORTS),
                        help='Allowed sport keys to check, in priority order')
    parser.add_argument('--max-requests', type=int, default=len(SPORTS),
                        help='Maximum paid odds endpoints, excluding free sport discovery')
    args = parser.parse_args()
    key = os.environ.get('THE_ODDS_API_KEY', '')
    if not key:
        print('THE_ODDS_API_KEY is unavailable. No provider requests were made.', file=sys.stderr)
        return 2
    try:
        snapshot, report = collect(key, sports=args.sports, max_requests=args.max_requests)
        output = Path(args.output)
        output.parent.mkdir(parents=True, exist_ok=True)
        temporary = output.with_suffix('.tmp')
        serialized = json.dumps(snapshot, indent=2) + '\n'
        if key in serialized:
            raise CollectionError('A response matched sensitive input. Snapshot discarded.')
        temporary.write_text(serialized, encoding='utf-8')
        temporary.replace(output)
        print(json.dumps({**report, 'saved_observations': len(snapshot['records'])}))
        return 0
    except CollectionError as exc:
        print(str(exc), file=sys.stderr)
    except Exception:
        # Unexpected exceptions must never log the authenticated endpoint or raw response.
        print('Collection failed. No provider details were logged.', file=sys.stderr)
    return 1


if __name__ == '__main__':
    raise SystemExit(main())
