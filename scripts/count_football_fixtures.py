"""Recount settled fixtures without treating provider spelling variants as new teams."""
import json
import sys
from pathlib import Path

ALIASES = {
    'newcastle': 'newcastle united', 'hull': 'hull city',
    'brighton': 'brighton & hove albion', 'ipswich': 'ipswich town',
    'bournemouth': 'afc bournemouth', 'man united': 'manchester united',
}

def team(name):
    name = name.strip().casefold()
    return ALIASES.get(name, name)

def recount(history):
    fixtures = {(row.get('competition'), row['kickoff_utc'], team(row['home']), team(row['away']))
                for row in history['entries']}
    history['unique_fixture_count'] = len(fixtures)

if __name__ == '__main__':
    path = Path(sys.argv[1])
    history = json.loads(path.read_text())
    recount(history)
    path.write_text(json.dumps(history, indent=2) + '\n')
