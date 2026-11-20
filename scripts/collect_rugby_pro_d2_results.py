#!/usr/bin/env python3
"""Capture official Pro D2 final scores for descriptive pre-match form."""
import argparse
from concurrent.futures import ThreadPoolExecutor
from datetime import date, datetime, timezone
import hashlib
from html.parser import HTMLParser
import json
from pathlib import Path
import re
from urllib.request import urlopen

ORIGIN = 'https://prod2.lnr.fr'
MONTHS = ('janvier', 'février', 'mars', 'avril', 'mai', 'juin',
          'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre')
CLASSES = {'calendar-results__fixture-date', 'club-line__name', 'match-line__score'}


class RoundParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.records = []
        self.started = None

    def handle_starttag(self, tag, attrs):
        attributes = dict(attrs)
        classes = CLASSES.intersection((attributes.get('class') or '').split())
        if classes and tag in ('a', 'div'):
            self.started = (tag, classes.pop(), attributes.get('href', ''), [])

    def handle_data(self, data):
        if self.started:
            self.started[3].append(data)

    def handle_endtag(self, tag):
        if self.started and tag == self.started[0]:
            _, kind, href, chunks = self.started
            self.records.append((kind, href, ' '.join(''.join(chunks).split())))
            self.started = None


def final_scores(raw, season, round_number, today):
    parser = RoundParser()
    parser.feed(raw.decode('utf-8'))
    rows = []
    game_date = None
    home = score = None
    round_path = f'/feuille-de-match/{season}/j{round_number}/'
    for kind, href, label in parser.records:
        if kind == 'calendar-results__fixture-date':
            day, month = re.search(r'(\d{1,2}) ([a-zéûô]+)$', label).groups()
            month = MONTHS.index(month) + 1
            game_date = date(int(season[:4]) + (month < 7), month, int(day))
            home = score = None
        elif kind == 'match-line__score':
            score = None
            match = re.fullmatch(r'(\d+)\s*-\s*(\d+)', label)
            if home and game_date and game_date < today and match and href.startswith(ORIGIN + round_path):
                score = (*map(int, match.groups()), href)
        elif href.startswith(ORIGIN + '/club/'):
            club = href.rsplit('/', 1)[-1]
            if score and home and club != home:
                rows.append({'home': home, 'away': club, 'date': game_date.isoformat(),
                             'home_points': score[0], 'away_points': score[1], 'source': score[2]})
                home = score = None
            else:
                home, score = club, None
    return rows


def collect(season, rounds, now):
    def capture(number):
        url = f'{ORIGIN}/calendrier-et-resultats/{season}/j{number}'
        with urlopen(url, timeout=20) as response:
            if response.geturl() != url:
                raise ValueError(f'Unexpected redirect for Pro D2 round {number}')
            raw = response.read(1_000_001)
        if len(raw) > 1_000_000:
            raise ValueError(f'Oversized round {number} page')
        rows = final_scores(raw, season, number, now.date())
        return {'round': number, 'url': url, 'sha256': hashlib.sha256(raw).hexdigest(),
                'finals': len(rows)}, rows

    with ThreadPoolExecutor(max_workers=3) as pool:
        batches = list(pool.map(capture, rounds))
    results = sorted((row for _, rows in batches for row in rows), key=lambda row: (row['date'], row['source']))
    if not results or len({row['source'] for row in results}) != len(results):
        raise ValueError('Missing or duplicate Pro D2 final scores')
    return {'schema_version': 1, 'research_only': True, 'competition_code': 'RU:5172',
            'model_validation': 'UNVALIDATED', 'publication_gate': 'BLOCKED',
            'season': season, 'generated_at_utc': now.isoformat(), 'observed_at_utc': now.isoformat(), 'source_receipts': [row for row, _ in batches],
            'results': results}


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('season')
    parser.add_argument('last_round', type=int, choices=range(1,31))
    args = parser.parse_args()
    if not re.fullmatch(r'\d{4}-\d{4}', args.season) or int(args.season[5:]) != int(args.season[:4]) + 1:
        parser.error('Expected a season such as 2026-2027')
    output = collect(args.season, range(1, args.last_round + 1), datetime.now(timezone.utc))
    target = Path(__file__).resolve().parents[1] / 'rugby' / 'pro-d2-results.json'
    target.write_text(json.dumps(output, indent=2, ensure_ascii=False) + '\n', encoding='utf-8')
    print(f"Pro D2 final scores collected: {len(output['results'])}")
