from datetime import datetime, timezone
import sys
from pathlib import Path
import unittest

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'scripts'))
from collect_pl_comparison import collect, MARKET
from collect_current_odds import CollectionError


class PremierLeagueCollectorTests(unittest.TestCase):
    def test_only_reviewed_books_and_one_odds_request(self):
        now = datetime(2026, 11, 26, 12, tzinfo=timezone.utc)
        outcomes = [{'name': name, 'price': price}
                    for name, price in zip(('Home', 'Draw', 'Away'), (2, 3, 4))]
        event = dict(id='abcdefghijklmnop', sport_key='soccer_epl', home_team='Home',
                     away_team='Away', commence_time='2026-11-26T13:00:00Z',
                     bookmakers=[dict(key=book, last_update='2026-11-26T11:59:00Z',
                                     markets=[dict(key='h2h', outcomes=outcomes)])
                                 for book in ('skybet', 'second', 'unreviewed')])
        calls = []

        def reply(path, params, key):
            calls.append((path, params))
            if not path:
                return [{'key': 'soccer_epl', 'active': True}], self.quota(166, 334, 0), ''
            return [event], self.quota(167, 333, 1), 'a' * 64

        poll = collect('synthetic-secret', ['skybet', 'second'], request=reply, clock=lambda: now)
        self.assertEqual(len(calls), 2)
        self.assertEqual(calls[1][1]['bookmakers'], 'skybet,second')
        self.assertEqual({r['bookmaker'] for r in poll['records']}, {'skybet', 'second'})
        self.assertTrue(all(r['settlement'] == MARKET for r in poll['records']))
        self.assertNotIn('synthetic-secret', repr(poll))

    def test_exchange_allowlist_stops_before_requests(self):
        with self.assertRaises(CollectionError):
            collect('synthetic-secret', ['betfair_ex_uk'], request=lambda *_: self.fail('unexpected request'))

    def test_reserve_stops_before_odds_request(self):
        calls = []

        def reply(path, params, key):
            calls.append(path)
            return [{'key': 'soccer_epl', 'active': True}], self.quota(380, 20, 0), ''

        with self.assertRaises(CollectionError):
            collect('synthetic-secret', ['skybet'], request=reply)
        self.assertEqual(calls, [''])

    @staticmethod
    def quota(used, remaining, cost):
        return dict(zip(('x-requests-used', 'x-requests-remaining', 'x-requests-last'),
                        map(str, (used, remaining, cost))))
