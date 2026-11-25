"""Review registry for the private Premier League collector and preview."""
import argparse
from datetime import date, datetime, time, timedelta, timezone
import hashlib
import json
from pathlib import Path
import sys
import re
from urllib.parse import urlsplit

from collect_current_odds import CollectionError

DEFAULT = Path(__file__).with_name('pl-bookmakers.json')
RULES = {'period': 'REGULATION', 'minutes': 90, 'stoppage_time': True,
         'extra_time': False, 'penalties': False, 'line': None,
         'outcomes': ['home', 'draw', 'away']}
PROVIDER_KEYS = {'skybet'}
TEST_KEYS = {'skybet', 'other_book', 'synthetic_book', 'second'}


def day(value):
    if not isinstance(value, str):
        return None
    try:
        parsed = date.fromisoformat(value)
        return parsed if parsed.isoformat() == value else None
    except ValueError:
        return None


def evidence_ok(review, today, test_only):
    if not isinstance(review, dict) or review.get('status') != 'verified':
        return False
    verified, expires = day(review.get('verified_on')), day(review.get('expires_on'))
    ref = review.get('evidence_reference')
    if not (verified and expires and verified <= today <= expires < date.max and
            isinstance(ref, str) and not any(char.isspace() for char in ref)):
        return False
    if test_only:
        return bool(re.fullmatch(r'test-fixture:[a-z0-9_-]+', ref))
    if re.fullmatch(r'review-record:[a-zA-Z0-9_.-]+', ref):
        return True
    try:
        url = urlsplit(ref)
        return bool(url.scheme == 'https' and url.hostname and url.username is None and not url.query)
    except ValueError:
        return False


def approved(config, today, *, allow_test=False):
    if (not isinstance(config, dict) or config.get('schema_version') != 1 or
            config.get('scope') not in ('production', 'synthetic-test-only') or
            not isinstance(config.get('bookmakers'), list) or not config['bookmakers']):
        raise CollectionError('invalid_bookmaker_registry')
    test_only = config['scope'] == 'synthetic-test-only'
    if test_only and not allow_test:
        raise CollectionError('test_registry_forbidden')
    keys = TEST_KEYS if test_only else PROVIDER_KEYS
    result, rejected, seen = {}, [], set()
    for entry in config['bookmakers']:
        if not isinstance(entry, dict) or not isinstance(entry.get('provider_key'), str):
            raise CollectionError('invalid_bookmaker_entry')
        key = entry['provider_key']
        if key not in keys or key in seen:
            raise CollectionError('unknown_or_duplicate_bookmaker')
        seen.add(key)
        if entry.get('enabled') is not True:
            reason = 'bookmaker_disabled'
        elif entry.get('market_key') != 'h2h':
            reason = 'unsupported_provider_market'
        elif not evidence_ok(entry.get('account_access'), today, test_only):
            reason = 'account_access_evidence_unverified_or_expired'
        elif not evidence_ok(entry.get('public_display'), today, test_only):
            reason = 'public_display_evidence_unverified_or_expired'
        elif not evidence_ok(entry.get('settlement'), today, test_only):
            reason = 'settlement_evidence_unverified_or_expired'
        elif json.dumps(entry['settlement'].get('rules'), sort_keys=True) != json.dumps(RULES, sort_keys=True):
            reason = 'settlement_rules_incompatible'
        else:
            rules = entry['settlement']['rules']
            canonical = f"PL:1X2:{rules['minutes']}_MINUTES_PLUS_STOPPAGE:NO_EXTRA_TIME"
            digest = hashlib.sha256(json.dumps(entry, sort_keys=True).encode()).hexdigest()
            last_day = min(day(entry[review]['expires_on']) for review in ('account_access', 'public_display', 'settlement'))
            expiry = datetime.combine(last_day + timedelta(days=1), time(), timezone.utc)
            result[key] = {'market_key': entry['market_key'], 'settlement': canonical, 'review_sha256': digest,
                           'review_expires': int(expiry.timestamp() * 1000)}
            continue
        rejected.append({'bookmaker': key, 'reason': reason})
    if any(row['reason'] != 'bookmaker_disabled' for row in rejected):
        return {}, rejected
    return result, rejected


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--config', type=Path, default=DEFAULT)
    args = parser.parse_args()
    try:
        result, rejected = approved(json.loads(args.config.read_text()), datetime.now(timezone.utc).date())
        print(json.dumps({'approved': result, 'rejected': rejected}))
    except (CollectionError, OSError, ValueError):
        print(json.dumps({'approved': {}, 'rejected': [{'reason': 'invalid_or_unknown_bookmaker_registry'}]}))
        return 1
    return 0


if __name__ == '__main__':
    sys.exit(main())
