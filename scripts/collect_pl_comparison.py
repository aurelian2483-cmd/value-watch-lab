"""Collect one private Premier League poll using the existing authorised feed."""
import argparse
from collections import Counter
from datetime import datetime, timezone
import json
import os
from pathlib import Path
import sys
import tempfile

from collect_current_odds import CollectionError, MAX_EVENTS, MAX_USED, PARAMS, RESERVE, clean_event, quota, request_json

from pl_bookmakers import DEFAULT, approved


def collect(key, config, request=request_json, clock=lambda: datetime.now(timezone.utc), *, allow_test=False):
    reviews, rejected = approved(config, clock().date(), allow_test=allow_test and request is not request_json)
    if not reviews:
        return {'status': 'failed', 'checked': clock().isoformat(), 'records': [], 'rejected': rejected}
    if not key:
        raise CollectionError('missing_provider_credential')
    books = list(reviews)
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
    records = [dict(record, **reviews[book]) for row in payload if isinstance(row, dict)
               and isinstance(row.get('id'), str) and counts[row['id']] == 1 for book in books
               if (record := clean_event(row, 'soccer_epl', checked, digest, book))]
    return {'status': 'ok' if records else 'empty', 'checked': checked.isoformat(),
            'events': len(payload), 'records': records, 'rejected': rejected}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--config', type=Path, default=DEFAULT, help='Reviewed bookmaker registry JSON')
    parser.add_argument('--output', type=Path, default=Path('work/pl-market/poll.json'))
    args = parser.parse_args()
    key = os.environ.get('THE_ODDS_API_KEY', '')
    try:
        poll = collect(key, json.loads(args.config.read_text()))
    except CollectionError as error:
        poll = {'status': 'failed', 'checked': datetime.now(timezone.utc).isoformat(), 'records': [],
                'rejected': [{'reason': str(error)}]}
    except Exception:
        poll = {'status': 'failed', 'checked': datetime.now(timezone.utc).isoformat(), 'records': [],
                'rejected': [{'reason': 'configuration_or_source_read_failed'}]}
    args.output.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.NamedTemporaryFile(mode='w', dir=args.output.parent, delete=False) as tmp:
        json.dump(poll, tmp)
    os.replace(tmp.name, args.output)
    print(f"Premier League poll: {poll['status']}; {len(poll['records'])} complete observations.")
    return int(poll['status'] == 'failed')


if __name__ == '__main__':
    sys.exit(main())
