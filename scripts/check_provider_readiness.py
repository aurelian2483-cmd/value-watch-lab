#!/usr/bin/env python3
"""Offline provider readiness check. Environment values are never returned."""
import json
import os
from pathlib import Path
import re

REGISTRY = Path(__file__).resolve().parents[1] / 'research/provider-readiness.json'
SPORTS = {'football', 'racing', 'nfl', 'tennis', 'rugby', 'darts', 'basketball', 'cricket', 'golf'}
VARIABLE = re.compile(r'[A-Z][A-Z0-9_]{1,79}', re.ASCII)
GATES = {
    'access_authorized': 'NEEDS ACCESS APPROVAL',
    'rights_approved': 'NEEDS RIGHTS REVIEW',
    'independent_source_reviewed': 'NEEDS INDEPENDENT SOURCE',
}


def readiness(registry, environment):
    if (type(registry.get('schema_version')) is not int or registry['schema_version'] != 1
            or registry.get('research_only') is not True
            or registry.get('model_validation') != 'UNVALIDATED'
            or registry.get('publication_gate') != 'BLOCKED'):
        raise ValueError('Invalid provider registry safeguards')
    providers = {}
    for provider in registry['providers']:
        identifier = provider['id']
        variables = provider['required_variables']
        if (identifier in providers or not variables or not isinstance(variables, list)
                or any(not isinstance(name, str) or not VARIABLE.fullmatch(name) for name in variables)
                or len(set(variables)) != len(variables)):
            raise ValueError('Invalid provider registry credential names')
        providers[identifier] = variables
    sports = registry['sports']
    if len(sports) != len(SPORTS) or {row['id'] for row in sports} != SPORTS:
        raise ValueError('Incomplete or duplicate sport coverage')
    variables = {name for names in providers.values() for name in names}
    presence = {name: bool(environment.get(name, '').strip()) for name in sorted(variables)}
    rows = []
    for row in sports:
        if (not row['providers'] or len(set(row['providers'])) != len(row['providers'])
                or any(type(row.get(gate)) is not bool for gate in GATES)):
            raise ValueError('Invalid sport readiness gates')
        names = {name for provider in row['providers'] for name in providers[provider]}
        missing = sorted(name for name in names if not presence[name])
        blockers = [label for gate, label in GATES.items() if row[gate] is False]
        if missing:
            blockers.append('NEEDS CREDENTIALS')
        rows.append({'sport': row['id'], 'states': blockers or ['READY FOR TESTING'],
                     'missing_variables': missing})
    return {'model_validation': 'UNVALIDATED', 'publication_gate': 'BLOCKED',
            'credentials': presence, 'sports': rows}


def main():
    try:
        registry = json.loads(REGISTRY.read_text(encoding='utf-8'))
        report = readiness(registry, os.environ)
    except (OSError, ValueError, KeyError, TypeError, AttributeError):
        raise SystemExit('Provider registry is unavailable or invalid') from None
    print(json.dumps(report, indent=2))


if __name__ == '__main__':
    main()
