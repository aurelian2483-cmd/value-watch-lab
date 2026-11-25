"""Collect one private Premier League poll using the existing authorised feed."""
import argparse
from collections import Counter
from datetime import datetime, timezone
import json
import os
from pathlib import Path
import re
import sys
import tempfile

from collect_current_odds import CollectionError, MAX_EVENTS, MAX_USED, PARAMS, RESERVE, clean_event, quota, request_json

MARKET = 'PL:1X2:90_MINUTES_PLUS_STOPPAGE:NO_EXTRA_TIME'
EXCHANGE = re.compile(r'betfair(?!_sportsbook$)|exchange|betdaq|matchbook|smarkets|betopenly|prophetx|polymarket')


def collect(key, books, request=request_json, clock=lambda: datetime.now(timezone.utc)):
    if (not key or not 1 <= len(books) <= 10 or len(set(books)) != len(books)
            or any(not re.fullmatch(r'[a-z0-9_]{2,40}', b) or EXCHANGE.search(b) for b in books)):
        raise CollectionError('An existing key and reviewed bookmaker allowlist are required.')
    catalogue, headers, _ = request('', {}, key)
    used, remaining, cost = quota(headers)
    if (cost or used >= MAX_USED or remaining <= RESERVE or not isinstance(catalogue, list)
            or not any(isinstance(row, dict) and row.get('key') == 'soccer_epl'
                       and row.get('active') is True for row in catalogue)):
        raise CollectionError('Premier League access or a safe quota headroom was not established.')
    payload, headers, digest = request('/soccer_epl/odds', {**PARAMS, 'bookmakers': ','.join(books)}, key)
    new_used, new_remaining, cost = quota(headers)
    if (cost > 1 or new_used - used != cost or remaining - new_remaining != cost
            or not isinstance(payload, list) or len(payload) > MAX_EVENTS):
        raise CollectionError('Unexpected provider response or quota movement.')
    checked = clock()
    counts = Counter(row.get('id') for row in payload if isinstance(row, dict) and isinstance(row.get('id'), str))
    records = [dict(record, settlement=MARKET) for row in payload if isinstance(row, dict)
               and isinstance(row.get('id'), str) and counts[row['id']] == 1 for book in books
               if (record := clean_event(row, 'soccer_epl', checked, digest, book))]
    return {'status': 'ok' if records else 'empty', 'checked': checked.isoformat(),
            'events': len(payload), 'records': records}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--books', nargs='+', required=True, help='Account-approved regulation-only non-exchange keys')
    parser.add_argument('--output', type=Path, default=Path('work/pl-market/poll.json'))
    args = parser.parse_args()
    key = os.environ.get('THE_ODDS_API_KEY', '')
    try:
        poll = collect(key, args.books)
    except Exception:
        poll = {'status': 'failed', 'checked': datetime.now(timezone.utc).isoformat(), 'records': []}
    args.output.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.NamedTemporaryFile(mode='w', dir=args.output.parent, delete=False) as tmp:
        json.dump(poll, tmp)
    os.replace(tmp.name, args.output)
    print(f"Premier League poll: {poll['status']}; {len(poll['records'])} complete observations.")
    return int(poll['status'] == 'failed')


if __name__ == '__main__':
    sys.exit(main())
