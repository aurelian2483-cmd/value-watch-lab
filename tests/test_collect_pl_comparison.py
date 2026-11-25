from datetime import datetime, timezone
import json
import sys
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'scripts'))
from collect_pl_comparison import collect
from collect_current_odds import CollectionError
from pl_bookmakers import DEFAULT

NOW = datetime(2026, 11, 26, 12, tzinfo=timezone.utc)


class PremierLeagueCollectorTests(unittest.TestCase):
    def config(self):
        config = json.loads((ROOT / 'tests/fixtures/pl-bookmakers.synthetic.json').read_text())
        config['bookmakers'] = [entry for entry in config['bookmakers']
                                if entry['provider_key'] in ('skybet', 'second')]
        return config

    def test_only_reviewed_books_and_one_odds_request(self):
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

        poll = collect('synthetic-secret', self.config(), request=reply, clock=lambda: NOW, allow_test=True)
        self.assertEqual(len(calls), 2)
        self.assertEqual(calls[1][1]['bookmakers'], 'skybet,second')
        self.assertEqual({r['bookmaker'] for r in poll['records']}, {'skybet', 'second'})
        self.assertTrue(all(r['settlement'] == 'PL:1X2:90_MINUTES_PLUS_STOPPAGE:NO_EXTRA_TIME'
                            and len(r['review_sha256']) == 64 for r in poll['records']))
        self.assertNotIn('synthetic-secret', repr(poll))

    def test_invalid_reviews_fail_closed_even_with_another_verified_book(self):
        cases = [
            ('account_access', 'evidence_reference', None, 'account_access_evidence_unverified_or_expired'),
            ('account_access', 'status', 'unverified', 'account_access_evidence_unverified_or_expired'),
            ('public_display', 'status', 'unverified', 'public_display_evidence_unverified_or_expired'),
            ('public_display', 'evidence_reference', None, 'public_display_evidence_unverified_or_expired'),
            ('settlement', 'rules', None, 'settlement_rules_incompatible'),
            ('settlement', 'expires_on', '2026-11-25', 'settlement_evidence_unverified_or_expired'),
        ]
        for section, field, value, reason in cases:
            with self.subTest(section=section, field=field):
                config = self.config()
                config['bookmakers'][0][section][field] = value
                result = collect('synthetic-secret', config, request=lambda *_: self.fail('unexpected request'),
                                 clock=lambda: NOW, allow_test=True)
                self.assertEqual(result['status'], 'failed')
                self.assertEqual(result['rejected'][0]['reason'], reason)

    def test_arbitrary_keys_and_default_disabled_make_no_request(self):
        def unexpected(*_):
            self.fail('unexpected request')
        config = self.config()
        config['bookmakers'][0]['provider_key'] = 'invented_book'
        with self.assertRaisesRegex(CollectionError, 'unknown_or_duplicate'):
            collect('synthetic-secret', config, request=unexpected, clock=lambda: NOW, allow_test=True)
        with self.assertRaisesRegex(CollectionError, 'test_registry_forbidden'):
            collect('synthetic-secret', self.config(), request=unexpected, clock=lambda: NOW)
        result = collect('synthetic-secret', json.loads(DEFAULT.read_text()), request=unexpected, clock=lambda: NOW)
        self.assertEqual(result['rejected'], [
            {'bookmaker': entry['provider_key'], 'reason': 'bookmaker_disabled'}
            for entry in json.loads(DEFAULT.read_text())['bookmakers']])
        self.assertEqual({entry['provider_key'] for entry in json.loads(DEFAULT.read_text())['bookmakers']},
                         {'skybet', 'williamhill', 'paddypower', 'betfred_uk', 'sport888', 'betvictor'})

    def test_reserve_stops_before_odds_request(self):
        calls = []

        def reply(path, params, key):
            calls.append(path)
            return [{'key': 'soccer_epl', 'active': True}], self.quota(380, 20, 0), ''

        with self.assertRaises(CollectionError):
            collect('synthetic-secret', self.config(), request=reply, clock=lambda: NOW, allow_test=True)
        self.assertEqual(calls, [''])

    @staticmethod
    def quota(used, remaining, cost):
        return dict(zip(('x-requests-used', 'x-requests-remaining', 'x-requests-last'),
                        map(str, (used, remaining, cost))))
