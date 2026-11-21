#!/usr/bin/env python3
"""Verify model-recovery pins and run isolated synthetic football calculations."""
import argparse
import ast
from contextlib import redirect_stdout
from datetime import datetime, timedelta
from io import StringIO
import json
import math
from pathlib import Path
import re
import subprocess
import sys
from tempfile import TemporaryDirectory
from types import ModuleType, SimpleNamespace
from unittest.mock import patch

if __name__ == '__main__':
    sys.dont_write_bytecode = True

if __package__:
    from . import football_evidence_ledger as evidence
else:
    import football_evidence_ledger as evidence

ROOT = evidence.ROOT
DIRECTORY = ROOT / 'research/football-model-recovery'
BASE = '9898e7e7773878ec32a0bfd3c38197fddb566893'
ARCHIVE = 'a29079994013f159f8a67861d029c6b12f5061e5'
PRODUCER = '0ab96a96fd66608d931c4109392ee29fe2ba3650'
LABEL = 'SYNTHETIC TEST OUTPUT — NOT MODEL EVIDENCE'
require = evidence.require
COMPOSITION = ('commit', 'path', 'source_sha256', 'configuration')


def validate_registry(registry):
    evidence.fields(registry, ('schema_version', 'model_validation', 'publication_gate', 'components'), 'registry')
    require(type(registry['schema_version']) is int and registry['schema_version'] == 1 and
            registry['model_validation'] == 'UNVALIDATED' and registry['publication_gate'] == 'BLOCKED',
            'unsupported registry or safety gates')
    seen = set()
    for item in registry['components']:
        evidence.fields(item, ('id', 'status', 'commit', 'path', 'configuration', 'inputs', 'outputs', 'tests',
                               'source_sha256', 'git_commit_date', 'audit_configuration_sha256',
                               'empirical_validation', 'prospective_eligibility'), 'component')
        key = item['id']
        require(key not in seen, 'duplicate recovery component')
        seen.add(key)
        require(item['empirical_validation'] == 'unvalidated' and item['prospective_eligibility'] == 'not_admitted',
                'unsupported registry eligibility or validation')
        fingerprint = evidence.digest(evidence.canonical({key: item[key] for key in COMPOSITION}))
        require(fingerprint == item['audit_configuration_sha256'], 'configuration fingerprint changed')
    require(seen, 'no recovery components')


def git_source(revision, path, digest, root=ROOT):
    require(revision in (BASE, ARCHIVE, PRODUCER) and
            isinstance(path, str) and re.fullmatch(r'[a-zA-Z0-9_./-]+\.(?:py|cjs|mjs|js)', path) and
            all(part not in ('', '.', '..') for part in path.split('/')), 'invalid pinned source path or revision')
    result = subprocess.run(['git', '--no-lazy-fetch', 'show', f'{revision}:{path}'], cwd=root,
                            capture_output=True, check=False)
    require(result.returncode == 0, f'pinned repository object unavailable: {revision}:{path}')
    require(evidence.valid_hash(digest) and evidence.digest(result.stdout) == digest,
            f'pinned source SHA-256 mismatch: {path}')
    if revision == BASE:
        raw = (root / path).read_bytes().replace(b'\r\n', b'\n')
        require(evidence.digest(raw) == digest, f'working implementation differs from audit pin: {path}')
    return result.stdout


def verified_sources():
    registry = evidence.load(DIRECTORY / 'registry.json')
    validate_registry(registry)
    data = {}
    pins = [(r['commit'], r['path'], r['source_sha256']) for r in registry['components']]
    pins += [(r['commit'], r['path'], r['sha256']) for r in evidence.load(DIRECTORY / 'dependencies.json')]
    for revision, path, digest in sorted(set(pins)):
        data[revision, path] = git_source(revision, path, digest)
    return registry, data


def run_module(name, path, raw):
    module = ModuleType(name)
    module.__file__ = str(ROOT / path)
    exec(compile(raw, module.__file__, 'exec'), module.__dict__)
    return module


def archived_modules(data):
    def load(name, revision=PRODUCER):
        path = f'scripts/{name}.py'
        module = run_module(name, path, data[revision, path])
        sys.modules[name] = module
        return module

    # Keep only the exact name-normalization code. The unrelated discovery
    # module initializes a London zone database at import and has a live CLI.
    discovery = 'scripts/experiment62_fixture_discovery.py'
    tree = ast.parse(data[PRODUCER, discovery])
    tree.body = [node for node in tree.body if
                 (isinstance(node, ast.FunctionDef) and node.name == 'norm') or
                 (isinstance(node, ast.Assign) and any(isinstance(t, ast.Name) and t.id == 'ALIASES'
                                                       for t in node.targets))]
    module = ModuleType('experiment62_fixture_discovery')
    module.re = re
    exec(compile(tree, discovery, 'exec'), module.__dict__)
    sys.modules[module.__name__] = module
    load('football_h2h')
    expanded = load('expanded_football')
    h2h_backtest = load('football_h2h_backtest')
    dashboard = load('experiment102_poisson_research')
    load('collect_international_football', BASE)
    international = load('international_football_analysis', BASE)
    return dashboard, expanded, h2h_backtest, international


def probabilities(row):
    result = [row[f'prob_{side}'] for side in ('home', 'draw', 'away')]
    require(all(math.isfinite(value) and 0 <= value <= 1 for value in result) and
            math.isclose(sum(result), 1, abs_tol=1e-12), 'invalid synthetic probability vector')
    return result


def synthetic_dashboard(dashboard):
    fixture = {'home': 'Synthetic Home', 'away': 'Synthetic Away', 'kickoff_utc': '2026-11-25T18:00:00Z',
               'verification': 'SCHEDULE_CROSS_CHECK'}
    fallback = {**fixture, 'home': 'Synthetic Other Home', 'away': 'Synthetic Other Away'}
    unavailable = {**fixture, 'home': 'Synthetic Unknown'}
    base = {'generated_at_utc': '2026-11-21T10:00:00Z', 'research_only': True, 'publication_gate': 'BLOCKED',
            'upcoming_fixtures': [fixture, fallback, unavailable]}
    output = {}
    dashboard.FEED = SimpleNamespace(read_text=lambda: json.dumps(base),
                                     write_text=lambda text: output.update(json.loads(text)))
    def csv(home, away, n):
        return ('Div,Date,HomeTeam,AwayTeam,FTHG,FTAG,FTR\n' +
                f'E0,20/11/2026,{home},{away},2,1,H\n' * n).encode()
    payloads = [csv(fixture['home'], fixture['away'], 300), csv(fallback['home'], fallback['away'], 30)]
    class Response:
        status = 200
        def __enter__(self):
            return self
        def __exit__(self, *_):
            return False
        def read(self, _):
            require(bool(payloads), 'unexpected producer source access')
            return payloads.pop(0)
    dashboard.urllib = SimpleNamespace(request=SimpleNamespace(Request=lambda url, **kwargs: url,
                                                               urlopen=lambda *_a, **_k: Response()))
    grid_calls = []
    poisson = dashboard.poisson
    def observed_poisson(rate, goals):
        grid_calls.append((rate, goals))
        return poisson(rate, goals)
    dashboard.poisson = observed_poisson
    with redirect_stdout(StringIO()):
        dashboard.main()
    rows = output['experimental_model_forecasts']
    require(not payloads and [r['model'] for r in rows] == ['POISSON_BASELINE_2025_26_V1',
            'POISSON_CURRENT_SEASON_SHRINKAGE_V1'] and len(output['experimental_model_unavailable']) == 1,
            'dashboard composition changed')
    vectors = [probabilities(row) for row in rows]
    require(vectors[0] == vectors[1] and len(grid_calls) == 576 and
            [grid_calls[i][0:1] + grid_calls[i+1][0:1] for i in (0, 288)] == [(2, 1), (2, 1)],
            'synthetic dashboard lambda or grid changed')
    return {'prior': vectors[0], 'current': vectors[1], 'lambda_home': 2, 'lambda_away': 1,
            'fallback_basis': rows[1]['training_basis'], 'unknown_team': 'unavailable'}


def synthetic_python(data):
    with patch.dict(sys.modules):
        dashboard, expanded, h2h_backtest, international = archived_modules(data)
        pl = synthetic_dashboard(dashboard)
        fixture = {'league': 'E1', 'home': 'Synthetic Home', 'away': 'Synthetic Away',
                   'kickoff_utc': '2026-11-25T18:00:00Z'}
        totals = {'hgf': 20, 'hga': 10, 'hn': 10, 'agf': 10, 'aga': 20, 'an': 10}
        training = {'matches': 30, 'teams': {expanded.norm(team): totals for team in (fixture['home'], fixture['away'])},
                    'avg_home_goals': 2, 'avg_away_goals': 1, 'training_sha256': 'a' * 64, 'source_receipts': []}
        model = expanded.model_forecast(fixture, training)
        comparison = expanded.current_season_comparison(fixture, training)
        require(model['training_basis']['lambda_home'] == 2 and model['training_basis']['lambda_away'] == 1 and
                probabilities(model) == probabilities(comparison) and
                expanded.model_forecast({**fixture, 'home':'Unknown'}, training) is None,
                'expanded formula or input gate changed')
        h2h = {'sample_size': 6, 'home_team_wins': 6, 'draws': 0, 'away_team_wins': 0}
        hp = h2h_backtest.challenger_probabilities([.5, .25, .25], h2h, weight=.2)
        require(math.isclose(hp[0], .55) and math.isclose(sum(hp), 1), 'H2H blend differs from hand calculation')
        now = datetime.fromisoformat('2026-11-21T10:00:00+00:00')
        nationals = {**fixture, 'home_team_id': '4101', 'away_team_id': '4102'}
        results = [{'id':str(i), 'competition':'synthetic', 'home_id':'4101', 'away_id':'4102',
                    'home':fixture['home'], 'away':fixture['away'], 'home_goals':1, 'away_goals':1,
                    'startUTC': (now-timedelta(days=i+1)).isoformat(),
                    'source_receipt':{'observed_at_utc':now.isoformat()}} for i in range(5)]
        international_model = international.analyse(nationals, results, now)
        require(international.analyse(nationals, results[:4], now)['status'] == 'INSUFFICIENT_CAPTURED_RESULTS' and
                international_model['expected_home_goals'] == international_model['expected_away_goals'] == 1,
                'international sample or lambda changed')
        vector = probabilities(international_model)
        require(math.isclose(vector[0], vector[2]), 'equal international means are not symmetric')
        return {'dashboard': pl, 'expanded': {'lambda_home':2, 'lambda_away':1,
                'probabilities':probabilities(model), 'current_comparison':probabilities(comparison)},
                'h2h_challenger': list(hp), 'international': {'lambda_home':1, 'lambda_away':1,
                                                             'probabilities':vector}}


def node_run(data, archived_tests=False):
    with TemporaryDirectory(prefix='football model recovery ') as temporary:
        root = Path(temporary)
        for (revision, path), raw in data.items():
            if revision != ARCHIVE:
                continue
            destination = root / path
            destination.parent.mkdir(parents=True, exist_ok=True)
            destination.write_bytes(raw)
        if archived_tests:
            process = subprocess.run(['node', '--test', *sorted(map(str, (root / 'tests').glob('*.cjs')))],
                                     cwd=root, check=True, capture_output=True)
            return process.stdout
        raw = subprocess.check_output(['node', str(ROOT / 'scripts/football_model_smoke.cjs'), str(root)], cwd=ROOT)
        return evidence.decode(raw)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('command', choices=('check', 'smoke', 'archived-tests'))
    args = parser.parse_args()
    try:
        registry, data = verified_sources()
        if args.command == 'check':
            print(f"PASS: {len(registry['components'])} registered components and {len(data)} exact source pins")
        elif args.command == 'archived-tests':
            sys.stdout.buffer.write((LABEL + '\n').encode() + node_run(data, archived_tests=True))
        else:
            report = {'label': LABEL, **evidence.SAFETY, 'outcome_order': ['home', 'draw', 'away'],
                      'python': synthetic_python(data), 'javascript': node_run(data),
                      'unavailable': ['authenticated_player_coefficients', 'stadium_effect', 'composed_v1_v6']}
            sys.stdout.buffer.write(evidence.canonical(report) + b'\n')
    except subprocess.CalledProcessError as error:
        sys.stderr.buffer.write(error.stderr or error.stdout or b'')
        parser.error('isolated Node check failed')
    except (OSError, ValueError, TypeError, KeyError) as error:
        parser.error(str(error))


if __name__ == '__main__':
    main()
