#!/usr/bin/env python3
"""Run an offline date-ordered retrospective replay on the pinned PL result sample."""
import argparse
from collections import Counter
from datetime import date
from itertools import groupby
import math
from pathlib import Path
import subprocess
import sys
from unittest.mock import patch

if __name__ == '__main__':
    sys.dont_write_bytecode = True

if __package__:
    from . import football_model_recovery as recovery
    from . import football_prospective_evaluation as evaluator
else:
    import football_model_recovery as recovery
    import football_prospective_evaluation as evaluator

evidence, require, ROOT = recovery.evidence, recovery.require, recovery.ROOT
DIRECTORY = ROOT / 'research/football-chronological-replay'
PROTOCOL_SHA256 = '6710cfa4e4cfe44196c98e2b88db704394ae151f8daf72694c63aaf302195522'
SEASONS = {'2024-25': (date(2024, 7, 1), date(2025, 7, 1)),
           '2025-26': (date(2025, 7, 1), date(2026, 7, 1))}
ORDER = ('home', 'draw', 'away')
ARCHIVE_FIELDS = ('id', 'season', 'date', 'home', 'away', 'ft', 'winner_index',
                  'prior_league_matches', 'p_unadjusted', 'p_recent_form_alpha_0_025')
RESULT_FIELDS = ('id', 'season', 'date', 'home', 'away', 'ft')
NOT_EVALUABLE = {
    'squad_player_stadium': 'No authenticated pre-event player, squad or stadium inputs in this archive.',
    'market_paths': 'No exact pre-event price receipts.',
    'producer_prior_season_fallback': 'No comparable prior-season producer training inputs in the frozen protocol.',
    'opponent_adjustments_and_nonzero_h2h': 'No predeclared fixed comparable configuration in this replay.',
    'composed_v1_v6': 'No authenticated composed implementation or input set.',
}


def pinned_json(path, sha, description):
    raw = path.read_bytes()
    require(evidence.digest(raw) == sha, f'{description} SHA-256 mismatch')
    return evidence.decode(raw)


def eligible_source(document, model):
    require(isinstance(document, dict), 'archive is not an object')
    meta = document.get('meta')
    require(isinstance(meta, dict) and meta.get('name') == 'RECONSTRUCTED_POISSON_RESEARCH_V1' and
            meta.get('research_only') is True and meta.get('validated') is False and
            meta.get('model_publication_gate') == 'BLOCKED' and meta.get('outcomes_order') == list(ORDER),
            'wrong retrospective evidence tier or safety gates')
    configuration_keys = {'goal_rate_prior_pseudomatches': 'pseudo_matches', 'form_alpha': 'form_alpha',
                          'poisson_grid_goals_max': 'grid_max'}
    require(all(config in model and key in meta and meta[key] == model[config]
                for key, config in configuration_keys.items()) and
            [meta.get('lambda_min'), meta.get('lambda_max')] == model.get('lambda_range'),
            'archive and frozen model configuration disagree')
    records = document.get('rows')
    require(isinstance(records, list), 'retrospective rows unavailable')
    for row in records:
        evidence.fields(row, ARCHIVE_FIELDS, 'retrospective archive row')
    return [{key: row[key] for key in RESULT_FIELDS} for row in records]


def validate_results(records, expected_counts=None):
    require(isinstance(records, list), 'date-only results must be a list')
    ids, team_days, ordered_pairs = set(), set(), set()
    for row in records:
        evidence.fields(row, RESULT_FIELDS, 'date-only result')
        season, day, home, away = (row[key] for key in ('season', 'date', 'home', 'away'))
        require(isinstance(season, str) and season in SEASONS and
                all(isinstance(team, str) and team and team == team.strip() and '|' not in team
                    and team.isprintable() for team in (home, away)) and home.casefold() != away.casefold(),
                'invalid season or ordered team identity')
        require(isinstance(day, str), 'invalid calendar date')
        parsed = date.fromisoformat(day)
        start, end = SEASONS[season]
        require(parsed.isoformat() == day and start <= parsed < end, 'date outside canonical season')
        require(row['id'] == f'{season}|{day}|{home}|{away}', 'result ID differs from ordered fixture')
        result = row['ft']
        require(isinstance(result, list) and len(result) == 2 and
                all(type(goals) is int and 0 <= goals <= 30 for goals in result), 'invalid regulation score')
        pair = (season, home.casefold(), away.casefold())
        require(row['id'] not in ids and pair not in ordered_pairs,
                'duplicate or conflicting result identity')
        ids.add(row['id'])
        ordered_pairs.add(pair)
        for team in (home, away):
            key = season, day, team.casefold()
            require(key not in team_days, 'reordered fixture or multiple appearances on one date')
            team_days.add(key)
    if expected_counts is not None:
        require(Counter(row['season'] for row in records) == expected_counts, 'retrospective season coverage differs')
    return sorted(records, key=lambda row: (row['season'], row['date'], row['home'], row['away']))


def load_inputs():
    protocol = pinned_json(DIRECTORY / 'protocol.json', PROTOCOL_SHA256, 'frozen protocol')
    spec = protocol['input']
    document = pinned_json(ROOT / spec['path'], spec['sha256'], 'retrospective input')
    registry = pinned_json(recovery.DIRECTORY / 'registry.json', protocol['registry_sha256'], 'model registry')
    recovery.validate_registry(registry)
    models = {item['id']: item for item in registry['components']}
    for model_id, pin in protocol['models'].items():
        require(model_id in models and all(models[model_id].get(key) == value for key, value in pin.items()),
                'frozen model source or configuration unavailable')
    standalone = models['retrospective-poisson-and-form']['configuration']
    require(all(key in standalone for key in ('pseudo_matches', 'minimum_league', 'minimum_venue',
                                               'form_last', 'form_alpha', 'lambda_range', 'grid_max')),
            'standalone configuration incomplete')
    records = validate_results(eligible_source(document, standalone), spec['season_rows'])
    _, sources = recovery.verified_sources()
    return protocol, models, records, sources


def grid(home, away, maximum):
    def poisson(rate):
        values = [math.exp(-rate)]
        for n in range(1, maximum + 1):
            values.append(values[-1] * rate / n)
        return values
    p = [0., 0., 0.]
    for h, x in enumerate(poisson(home)):
        for a, y in enumerate(poisson(away)):
            p[0 if h > a else 1 if h == a else 2] += x * y
    total = sum(p)
    return [round(value / total, 12) for value in p]


def features(history, home, away, last):
    home_venue = [row for row in history if row['home'] == home]
    away_venue = [row for row in history if row['away'] == away]
    home_form = [row for row in history if home in (row['home'], row['away'])]
    away_form = [row for row in history if away in (row['home'], row['away'])]

    def window(matches, team):
        return [{'id': row['id'], 'goal_difference': (row['ft'][0] - row['ft'][1]) *
                 (1 if row['home'] == team else -1)} for row in matches[-last:]]

    def venue(matches, side):
        return {'matches': len(matches), 'goals_for': sum(row['ft'][side] for row in matches),
                'goals_against': sum(row['ft'][1-side] for row in matches)}

    return {'prior_results': len(history), 'home_venue': venue(home_venue, 0), 'away_venue': venue(away_venue, 1),
            'home_prior_appearances': len(home_form), 'away_prior_appearances': len(away_form),
            'home_form': window(home_form, home), 'away_form': window(away_form, away),
            'league_home_goals': sum(row['ft'][0] for row in history),
            'league_away_goals': sum(row['ft'][1] for row in history)}


def exclusion(x, rule):
    if x['prior_results'] < rule['minimum_prior_matches']:
        return 'insufficient_earlier_league_results'
    if min(x['home_venue']['matches'], x['away_venue']['matches']) < rule['minimum_venue_matches_per_side']:
        return 'insufficient_earlier_venue_results'
    if min(x['home_prior_appearances'], x['away_prior_appearances']) < rule['minimum_form_matches_per_side']:
        return 'insufficient_earlier_form_results'
    if min(x['league_home_goals'], x['league_away_goals']) <= 0:
        return 'nonpositive_league_goal_mean'
    return None


def standalone_model(x, cfg):
    count, w = x['prior_results'], cfg['pseudo_matches']
    league_h, league_a = x['league_home_goals'] / count, x['league_away_goals'] / count
    h, a = x['home_venue'], x['away_venue']
    ha = (h['goals_for'] + w * league_h) / (h['matches'] + w)
    hd = (h['goals_against'] + w * league_a) / (h['matches'] + w)
    aa = (a['goals_for'] + w * league_a) / (a['matches'] + w)
    ad = (a['goals_against'] + w * league_h) / (a['matches'] + w)
    low, high = cfg['lambda_range']
    baseline = [max(low, min(high, ha * ad / max(.01, league_a))),
                max(low, min(high, aa * hd / max(.01, league_h)))]

    def mean(rows):
        return sum(row['goal_difference'] for row in rows) / len(rows)

    delta = mean(x['home_form']) - mean(x['away_form'])
    adjusted = [baseline[0] * math.exp(cfg['form_alpha'] * delta),
                baseline[1] * math.exp(-cfg['form_alpha'] * delta)]
    return {'shrunk_venue_rates': [ha, hd, aa, ad], 'league_means': [league_h, league_a], 'form_delta': delta,
            'lambda_baseline': baseline, 'lambda_form': adjusted,
            'p_baseline': grid(*baseline, cfg['grid_max']), 'p_form': grid(*adjusted, cfg['grid_max'])}


def walk_forward(records, rule, cfg, expanded):
    output = []
    for season, season_rows in groupby(validate_results(records), key=lambda row: row['season']):
        season_rows = list(season_rows)
        names = {row[side] for row in season_rows for side in ('home', 'away')}
        require(len({expanded.norm(name) for name in names}) == len(names) and
                all(expanded.norm(name) for name in names), 'expanded aliases collide within season')
        history = []
        for day, bucket in groupby(season_rows, key=lambda row: row['date']):
            fixtures = list(bucket)
            history_hash = evaluator.contract.sha(history)
            training = None
            for row in fixtures:
                x = features(history, row['home'], row['away'], cfg['form_last'])
                entry = {**row, 'cutoff_date_exclusive': day, 'last_history_date': history[-1]['date'] if history else None,
                         'training_results_sha256': history_hash, 'features': x, 'exclusion_reason': exclusion(x, rule),
                         'configuration_hashes': {key: item['audit_configuration_sha256']
                                                  for key, item in rule['models'].items()},
                         'probabilities': None}
                if entry['exclusion_reason'] is None:
                    if training is None:
                        mapped = [{'home': result['home'], 'away': result['away'],
                                   'score_home': result['ft'][0], 'score_away': result['ft'][1]} for result in history]
                        teams, league_h, league_a = expanded.stats(mapped)
                        training = {'teams': teams, 'matches': len(history), 'avg_home_goals': league_h,
                                    'avg_away_goals': league_a, 'training_sha256': history_hash, 'source_receipts': []}
                    prior = standalone_model(x, cfg)
                    applied = expanded.model_forecast({'league': 'PL', 'home': row['home'], 'away': row['away']},
                                                      {'teams': {}}, training)
                    require(applied is not None, 'expanded kernel is unavailable on the declared matched cohort')
                    basis = applied['training_basis']
                    require(basis['mode'] == 'CURRENT_SEASON_SMALL_SAMPLE', 'expanded configuration path changed')
                    entry.update(probabilities={
                        'standalone_baseline': prior.pop('p_baseline'),
                        'standalone_form_alpha_0_025': prior.pop('p_form'),
                        'expanded_current_formula': [applied[f'prob_{side}'] for side in ORDER],
                    }, standalone=prior, expanded={'lambda': [basis['lambda_home'], basis['lambda_away']],
                                                    'basis': basis})
                output.append(entry)
            history.extend(fixtures)
    return output


def compare_standalone(records, entries):
    raw = subprocess.check_output(['node', str(ROOT / 'scripts/football_chronological_oracle.cjs')],
                                  input=evidence.canonical(records), cwd=ROOT)
    oracle = evidence.decode(raw)
    original = {row[0]: row[1:] for row in oracle}
    require(len(original) == len(oracle), 'pinned oracle repeats a fixture')
    paired = [row for row in entries if row['probabilities'] is not None]
    require(set(original) == {row['id'] for row in paired}, 'standalone source has different fixture eligibility')
    highest = 0.
    for entry in paired:
        forecast = entry['probabilities']
        for key, vector in zip(('standalone_baseline', 'standalone_form_alpha_0_025'), original[entry['id']]):
            require(len(vector) == len(ORDER), 'invalid pinned oracle outcome order')
            highest = max(highest, *(abs(actual - expected) for actual, expected in zip(forecast[key], vector)))
    require(highest <= 1.01e-12, 'standalone port differs from the pinned JavaScript calculation')
    return {'paired_fixtures': len(paired), 'probabilities_match_pinned_javascript': True}


def observed_class(score):
    home, away = score
    return 'home' if home > away else 'away' if away > home else 'draw'


def metrics(entries, variant_order):
    results = {}
    for season, season_rows in groupby(entries, key=lambda row: row['season']):
        block = list(season_rows)
        eligible = [row for row in block if row['exclusion_reason'] is None]
        exclusions = dict(Counter(row['exclusion_reason'] for row in block if row['exclusion_reason'] is not None))
        require(len(eligible) + sum(exclusions.values()) == len(block), 'season counts do not reconcile')
        scores, paired_scores = {}, {}
        for variant in variant_order:
            if not eligible:
                scores[variant] = {'status': 'insufficient_data', 'n': 0}
                continue
            values = [evaluator.scores(row['probabilities'][variant], observed_class(row['ft'])) for row in eligible]
            paired_scores[variant] = values
            scores[variant] = {'n': len(values), **{
                key: round(math.fsum(value[key] for value in values) / len(values), 10)
                for key in ('log_loss', 'brier')}}
        form = {'n': len(eligible), 'comparison': 'standalone_form_minus_standalone_baseline'}
        if eligible:
            pairs = list(zip(paired_scores['standalone_form_alpha_0_025'], paired_scores['standalone_baseline']))
            form['score_difference'] = {
                key: round(math.fsum(new[key] - base[key] for new, base in pairs) / len(pairs), 10)
                for key in ('log_loss', 'brier')}
            form['nonzero_form_delta'] = sum(row['standalone']['form_delta'] != 0 for row in eligible)
        else:
            form['status'] = 'insufficient_data'
        results[season] = {'rows': len(block), 'eligible': len(eligible), 'excluded': len(block) - len(eligible),
                           'coverage': round(len(eligible) / len(block), 10), 'exclusion_reasons': exclusions,
                           'first_date': block[0]['date'], 'last_date': block[-1]['date'],
                           'teams': len({row[side] for row in block for side in ('home', 'away')}),
                           'variants': scores, 'paired_form_component': form}
    return results


def report(include_fixtures=False):
    protocol, models, records, raw_sources = load_inputs()
    with patch.dict(sys.modules):
        _, expanded, _, _ = recovery.archived_modules(raw_sources)
        entries = walk_forward(records, protocol, models['retrospective-poisson-and-form']['configuration'], expanded)
    parity = compare_standalone(records, entries)
    result = {
        'schema_version': 1, 'label': 'date-ordered retrospective replay',
        'status': 'exploratory_retrospective_only', **evidence.SAFETY,
        'eligible_real_forecasts': 0, 'eligible_real_outcomes': 0,
        'protocol_sha256': PROTOCOL_SHA256, 'input': protocol['input'],
        'model_registry_sha256': protocol['registry_sha256'], 'models': protocol['models'],
        'standalone_parity': parity, 'outcome_order': list(ORDER),
        'seasons': metrics(entries, protocol['variant_order']),
        'not_evaluable': {name: {'status': 'NOT EVALUABLE', 'reason': reason}
                          for name, reason in NOT_EVALUABLE.items()},
    }
    if include_fixtures:
        result['fixtures'] = entries
    return result


def main():
    cli = argparse.ArgumentParser(description=__doc__)
    commands = cli.add_mutually_exclusive_group()
    commands.add_argument('--details', action='store_true', help='include per-fixture histories, features and reasons')
    commands.add_argument('--check', action='store_true', help='compare regenerated compact report to committed report')
    args = cli.parse_args()
    try:
        result = evidence.canonical(report(args.details)) + b'\n'
        if args.check:
            require((DIRECTORY / 'summary.json').read_bytes() == result, 'committed summary differs from replay')
            print('PASS: pinned chronological replay regenerates the committed summary')
        else:
            sys.stdout.buffer.write(result)
    except subprocess.CalledProcessError as error:
        cli.error(f'pinned standalone oracle failed with exit code {error.returncode}')
    except (ValueError, TypeError, KeyError, OSError) as error:
        cli.error(str(error))


if __name__ == '__main__':
    main()
