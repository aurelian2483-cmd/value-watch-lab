import json
import unittest
from datetime import datetime, timezone
from scripts.collect_current_odds import collect, clean_event, CollectionError, SPORTS

NOW = datetime(2026, 11, 21, 18, tzinfo=timezone.utc)
SPORT = 'soccer_epl'


def event(sport=SPORT, observed='2026-11-21T17:59:00Z'):
    names = ['Home', 'Away'] + (['Draw'] if sport.startswith('soccer_') else [])
    return {'id': 'a' * 24, 'sport_key': sport, 'home_team': 'Home', 'away_team': 'Away',
            'commence_time': '2026-11-22T14:00:00Z',
            'bookmakers': [{'key': 'skybet', 'last_update': observed, 'markets': [
                {'key': 'h2h', 'outcomes': [{'name': n, 'price': 2.5} for n in names]}]}]}


class CollectorTests(unittest.TestCase):
    def test_scope_and_quota(self):
        requests = []

        def mock(path, params, key):
            requests.append((path, params))
            count = len(requests) - 1
            headers = {'x-requests-used': 399 + count, 'x-requests-remaining': 101 - count,
                       'x-requests-last': int(bool(count))}
            return ([event()] if count else [{'key': s, 'active': True} for s in SPORTS]), headers, 'a' * 64

        snapshot, report = collect('secret-value', mock, lambda: NOW)
        self.assertEqual(len(requests), 2)
        self.assertEqual(requests[1][1]['bookmakers'], 'skybet')
        self.assertEqual(report['requests'][0]['credits'], 1)
        self.assertEqual(report['credits_used_account'], 400)
        self.assertEqual(snapshot['records'][0]['prices']['draw'], 2.5)
        self.assertNotIn('secret-value', json.dumps(snapshot))
        self.assertNotIn('apiKey', json.dumps(snapshot))

    def test_expiry_provider_and_outcome_sets(self):
        self.assertIsNone(clean_event(event(observed='2026-11-21T17:29:59Z'), SPORT, NOW, 'a'*64))
        self.assertIsNone(clean_event(event(), 'americanfootball_nfl', NOW, 'a'*64))
        row = event('americanfootball_nfl')
        self.assertEqual(set(clean_event(row, 'americanfootball_nfl', NOW, 'a'*64)['prices']), {'home', 'away'})
        row['bookmakers'][0]['markets'][0]['outcomes'][0]['price'] = True
        self.assertIsNone(clean_event(row, 'americanfootball_nfl', NOW, 'a'*64))

    def test_fail_closed_on_missing_quota(self):
        with self.assertRaises(CollectionError):
            collect('secret', lambda *_: ([], {}, ''), lambda: NOW)

    def test_low_remaining_stops_before_odds(self):
        out, report = collect('secret', lambda path, *_: (
            [{'key': SPORT, 'active': True}], {'x-requests-used': 300, 'x-requests-remaining': 20,
                                             'x-requests-last': 0}, '') if not path else self.fail(path), lambda: NOW)
        self.assertEqual(out['records'], [])
        self.assertEqual(report['requests'], [])

    def test_unexpected_cost_or_account_movement_stops(self):
        def mock(path, *_):
            if not path:
                return [{'key': SPORT, 'active': True}], {
                    'x-requests-used': 100, 'x-requests-remaining': 400, 'x-requests-last': 0}, ''
            return [event()], {
                'x-requests-used': 102, 'x-requests-remaining': 398, 'x-requests-last': 2}, 'a'*64
        with self.assertRaises(CollectionError):
            collect('secret', mock, lambda: NOW)

    def test_invalid_duplicate_still_prevents_a_quote(self):
        def mock(path, *_):
            odds = bool(path)
            return ([event(), event(observed='2026-11-20T17:59:00Z')] if odds else [{'key': SPORT, 'active': True}]), {
                'x-requests-used': 100 + odds, 'x-requests-remaining': 400 - odds, 'x-requests-last': int(odds)}, 'a'*64
        snapshot, _ = collect('secret', mock, lambda: NOW)
        self.assertEqual(snapshot['records'], [])

    def test_one_request_scope_preserves_quota(self):
        requests = []
        def mock(path, params, key):
            requests.append(path)
            used = 1 if path else 0
            payload = [event()] if path else [{'key': s, 'active': True} for s in SPORTS]
            headers = {'x-requests-used': used, 'x-requests-remaining': 500 - used,
                       'x-requests-last': used}
            return payload, headers, 'a' * 64
        snapshot, report = collect('existing-key', mock, lambda: NOW,
                                   sports=('soccer_epl', 'soccer_efl_champ'), max_requests=1)
        self.assertEqual(requests, ['', '/soccer_epl/odds'])
        self.assertEqual(len(snapshot['records']), 1)
        self.assertEqual(len(report['requests']), 1)

    def test_invalid_scope_does_not_make_provider_calls(self):
        def must_not_call(*args):
            self.fail('No provider call is permitted for an invalid scope')
        for kwargs in ({'sports': ('not-allowlisted',)}, {'sports': ('soccer_epl', 'soccer_epl')},
                       {'sports': ()}, {'max_requests': 0}, {'max_requests': 99}):
            with self.subTest(kwargs=kwargs), self.assertRaises(CollectionError):
                collect('existing-key', must_not_call, lambda: NOW, **kwargs)

