#!/usr/bin/env python3
"""Independently score and describe the pinned date-ordered retrospective replay."""
import argparse
from collections import Counter, defaultdict
from itertools import groupby
import json
import math
from random import Random
from statistics import median, pstdev
import sys

if __name__ == '__main__':
    sys.dont_write_bytecode = True

if __package__:
    from . import football_chronological_replay as replay
else:
    import football_chronological_replay as replay

evidence, require = replay.evidence, replay.require
DIRECTORY = replay.ROOT / 'research/football-score-robustness'
PIN = '892c61cc45699e22f0ba9b2040e42bb68ce920103b2bc343a432c4d92eb0d76b'
CLASSES = ('home', 'draw', 'away')
VARIANTS = ('standalone_baseline', 'standalone_form_alpha_0_025', 'expanded_current_formula')
METRICS = ('log_loss', 'brier')


def score(vector, outcome, floor):
    require(isinstance(vector, list) and len(vector) == 3 and
            all(type(p) in (float, int) and 0 <= p <= 1 and math.isfinite(p) for p in vector) and
            abs(sum(vector) - 1) <= 1e-9, 'invalid ordered probability vector')
    require(type(outcome) is int and 0 <= outcome < 3, 'invalid outcome class')
    return dict(log_loss=-math.log(max(floor, vector[outcome])),
                brier=sum((p - (index == outcome)) ** 2 for index, p in enumerate(vector)))


def aggregate(rows):
    if not rows:
        return {'n': 0, 'status': 'insufficient_data'}
    return {'n': len(rows), **{variant: {metric: round(mean(
        [row['scores'][variant][metric] for row in rows]), 10) for metric in METRICS}
                              for variant in VARIANTS}}


def mean(values):
    return math.fsum(values) / len(values)


def scored_rows(fixtures, source_rows, floor):
    require(isinstance(fixtures, list) and isinstance(source_rows, list), 'replay rows unavailable')
    source = {row['id']: row for row in source_rows}
    by_id = {row['id']: row for row in fixtures}
    require(len(source) == len(source_rows) and len(by_id) == len(fixtures) and source.keys() == by_id.keys(),
            'duplicate or mismatched fixture identities')
    ordered = sorted(source_rows, key=lambda row: (row['season'], row['date'], row['id']))
    eligible, excluded = [], defaultdict(Counter)
    for season, block in groupby(ordered, key=lambda row: row['season']):
        home_games, away_games, games = Counter(), Counter(), Counter()
        total, last_day, goals_h, goals_a = 0, None, 0, 0
        for day, bucket in groupby(block, key=lambda row: row['date']):
            rows = list(bucket)
            for original in rows:
                fixture = by_id[original['id']]
                require(all(fixture.get(key) == original[key] for key in replay.RESULT_FIELDS),
                        'replay changed a result or ordered fixture')
                x = fixture['features']
                home, away = original['home'], original['away']
                venue = min(home_games[home], away_games[away])
                reason = ('insufficient_earlier_league_results' if total < 30 else
                          'insufficient_earlier_venue_results' if venue < 3 else
                          'insufficient_earlier_form_results' if min(games[home], games[away]) < 3 else
                          'nonpositive_league_goal_mean' if min(goals_h, goals_a) <= 0 else None)
                require(fixture['cutoff_date_exclusive'] == day and fixture['last_history_date'] == last_day
                        and x['prior_results'] == total and x['home_venue']['matches'] == home_games[home]
                        and x['away_venue']['matches'] == away_games[away] and
                        (x['league_home_goals'], x['league_away_goals']) == (goals_h, goals_a)
                        and fixture['exclusion_reason'] == reason, 'cutoff or eligibility disagreement')
                probabilities = fixture['probabilities']
                if reason is not None:
                    require(probabilities is None, 'excluded fixture has predictions')
                    excluded[season][reason] += 1
                    continue
                require(isinstance(probabilities, dict) and probabilities.keys() == set(VARIANTS),
                        'missing or extra prediction path')
                hg, ag = original['ft']
                outcome = 0 if hg > ag else 2 if hg < ag else 1
                eligible.append({'id': original['id'], 'season': season, 'date': day, 'venue_min': venue,
                                 'outcome': outcome, 'probabilities': probabilities,
                                 'scores': {variant: score(probabilities[variant], outcome, floor)
                                            for variant in VARIANTS}})
            for row in rows:
                home_games[row['home']] += 1
                away_games[row['away']] += 1
                games[row['home']] += 1
                games[row['away']] += 1
                goals_h += row['ft'][0]
                goals_a += row['ft'][1]
            total += len(rows)
            last_day = day
    return eligible, excluded


def verify_summary(eligible, excluded, summary):
    require(summary['outcome_order'] == list(CLASSES) and set(summary['seasons']) == set(replay.SEASONS),
            'summary outcome order or season mismatch')
    for season, block in summary['seasons'].items():
        rows = [row for row in eligible if row['season'] == season]
        require(len(rows) == block['eligible'] and excluded[season] == block['exclusion_reasons']
                and sum(excluded[season].values()) == block['excluded'] and
                block['rows'] == block['eligible'] + block['excluded'], 'summary coverage disagreement')
        require(block['variants'].keys() == set(VARIANTS), 'summary forecast paths differ')
        for variant, scores in block['variants'].items():
            require(scores['n'] == len(rows), 'summary scoring denominator mismatch')
            for metric in METRICS:
                actual = mean([row['scores'][variant][metric] for row in rows])
                require(abs(actual - scores[metric]) <= 5.01e-11, 'summary differs beyond declared rounding')


def pair_vectors(rows, protocol):
    return {f'{left}_minus_{right}': {metric: [row['scores'][left][metric] - row['scores'][right][metric]
                                               for row in rows] for metric in METRICS}
            for left, right in protocol['pair_order']}


def describe(values, tolerance):
    return {'mean': round(mean(values), 8), 'median': round(median(values), 8),
            'population_sd': round(pstdev(values), 8),
            'left_lower': sum(value < -tolerance for value in values),
            'tie': sum(abs(value) <= tolerance for value in values),
            'left_higher': sum(value > tolerance for value in values)}


def date_key(row):
    return row['season'], row['date']


def date_draws(rows, bootstrap):
    groups = defaultdict(set)
    for row in rows:
        groups[row['season']].add(date_key(row))
    strata = [sorted(dates) for _, dates in sorted(groups.items())]
    counts = {season: len(dates) for season, dates in sorted(groups.items())}
    if not strata or min(counts.values()) < bootstrap['minimum_dates_per_season']:
        return counts, []
    rng = Random(bootstrap['seed'])
    return counts, [tuple(dates[int(rng.random()*len(dates))] for dates in strata for _ in dates)
                    for _ in range(bootstrap['replicates'])]


def date_interval(rows, values, draws, quantiles):
    require(len(rows) == len(values), 'paired resampling values not aligned')
    if not draws:
        return {'status': 'insufficient_date_clusters'}
    clustered = defaultdict(list)
    for row, value in zip(rows, values):
        clustered[date_key(row)].append(value)
    totals = {key: (math.fsum(block), len(block)) for key, block in clustered.items()}
    means = []
    for sample in draws:
        selected = [totals[key] for key in sample if key in totals]
        n = sum(pair[1] for pair in selected)
        if n:
            means.append(math.fsum(pair[0] for pair in selected) / n)
    if len(means) != len(draws):
        return {'status': 'empty_resampled_bin', 'nonempty_replicates': len(means)}
    means.sort()

    def percentile(probability):
        pos = probability * (len(means) - 1)
        left, right = math.floor(pos), math.ceil(pos)
        return round(means[left] + (means[right] - means[left]) * (pos - left), 8)

    return {'status': 'exploratory_retrospective', 'interval': [percentile(q) for q in quantiles]}


def paired(rows, protocol, draws):
    return {name: {metric: {
                **describe(values, protocol['tie_tolerance']),
                'date_cluster_interval': date_interval(rows, values, draws, protocol['bootstrap']['percentiles']),
            } for metric, values in metrics.items()} for name, metrics in pair_vectors(rows, protocol).items()}


def subgroup(rows, protocol):
    return {'scores': aggregate(rows), 'paired_means': {
        pair: {metric: round(mean(values), 8) for metric, values in metrics.items()}
        for pair, metrics in pair_vectors(rows, protocol).items()} if rows else {}}


def bin_index(probability, edges):
    return next(i for i, (low, high) in enumerate(zip(edges, edges[1:]))
                if low <= probability < high or probability == high == 1)


def calibration(rows, protocol, draws):
    cfg = protocol['calibration']
    result = {}
    for variant in VARIANTS:
        result[variant] = {}
        for index, label in enumerate(CLASSES):
            groups = defaultdict(list)
            for row in rows:
                groups[bin_index(row['probabilities'][variant][index], cfg['edges'])].append(row)
            bins = []
            for i, (low, high) in enumerate(zip(cfg['edges'], cfg['edges'][1:])):
                subset = groups[i]
                n, dates = len(subset), len({date_key(row) for row in subset})
                hits = [int(row['outcome'] == index) for row in subset]
                adequate = n >= cfg['minimum_rows_per_interval'] and dates >= cfg['minimum_dates_per_interval']
                bins.append({'bounds': [low, high], 'n': n, 'dates': dates,
                             'mean_probability': round(mean([r['probabilities'][variant][index] for r in subset]), 8) if n else None,
                             'observed_rate': round(mean(hits), 8) if n else None,
                             'observed_rate_interval': date_interval(subset, hits, draws, protocol['bootstrap']['percentiles'])
                                                       if adequate else {'status': 'sparse_bin'}})
            result[variant][label] = bins
    return result


def season_report(rows, season_rows, excluded, protocol):
    clusters, draws = date_draws(rows, protocol['bootstrap'])
    dates = sorted({row['date'] for row in rows})
    earlier = set(dates[:len(dates)//2])
    parts = [[row for row in rows if (row['date'] in earlier) == is_earlier] for is_earlier in (True, False)]
    return {'archive_rows': season_rows, 'eligible': len(rows), 'exclusions': dict(excluded),
            'date_clusters': clusters, 'scores': aggregate(rows), 'paired': paired(rows, protocol, draws),
            'coverage_sensitivity': {str(minimum): {
                'coverage': round(sum(row['venue_min'] >= minimum for row in rows) / season_rows, 8),
                'scores': aggregate([row for row in rows if row['venue_min'] >= minimum]),
            } for minimum in protocol['venue_minima']},
            'by_outcome': {label: subgroup([row for row in rows if row['outcome'] == index], protocol)
                           for index, label in enumerate(CLASSES)},
            'by_period': {label: {'first_date': part[0]['date'] if part else None,
                                  'last_date': part[-1]['date'] if part else None, **subgroup(part, protocol)}
                          for label, part in zip(('earlier_dates', 'later_dates'), parts)},
            'calibration': calibration(rows, protocol, draws)}


def report(details=False):
    protocol = replay.pinned_json(DIRECTORY / 'protocol.json', PIN, 'robustness protocol')
    primary = replay.pinned_json(replay.DIRECTORY / 'summary.json', protocol['replay_summary_sha256'], 'replay summary')
    rebuilt = replay.report(include_fixtures=True)
    fixtures = rebuilt.pop('fixtures')
    require(rebuilt == primary and protocol['score_order'] == list(CLASSES), 'pinned replay summary changed')
    document = replay.pinned_json(replay.ROOT / rebuilt['input']['path'], rebuilt['input']['sha256'], 'result source')
    source = [{key: row[key] for key in replay.RESULT_FIELDS} for row in document['rows']]
    eligible, excluded = scored_rows(fixtures, source, protocol['log_floor'])
    verify_summary(eligible, excluded, primary)
    clusters, draws = date_draws(eligible, protocol['bootstrap'])
    output = {'schema_version': 1, 'label': 'retrospective exploratory score robustness',
              **evidence.SAFETY, 'eligible_real_forecasts': 0, 'eligible_real_outcomes': 0,
              'protocol_sha256': PIN, 'replay_summary_sha256': protocol['replay_summary_sha256'],
              'cohort_sha256': evidence.digest(evidence.canonical([row['id'] for row in eligible])),
              'not_evaluable': primary['not_evaluable'],
              'arithmetic_verified': True, 'combined': {'date_clusters': clusters, 'scores': aggregate(eligible),
                                                      'paired': paired(eligible, protocol, draws)},
              'seasons': {season: season_report([row for row in eligible if row['season'] == season],
                                                block['rows'], excluded[season], protocol)
                          for season, block in primary['seasons'].items()}}
    if details:
        output['eligible_fixtures'] = eligible
    return output


def main():
    cli = argparse.ArgumentParser(description=__doc__)
    flags = cli.add_mutually_exclusive_group()
    flags.add_argument('--details', action='store_true', help='include ordered per-fixture scores')
    flags.add_argument('--check', action='store_true', help='verify the exact committed report bytes')
    args = cli.parse_args()
    try:
        result = report(args.details)
        raw = (json.dumps(result, sort_keys=True, ensure_ascii=False, indent=2, allow_nan=False) + '\n').encode()
        if args.check:
            require((DIRECTORY / 'report.json').read_bytes() == raw,
                    'committed report differs from regenerated bytes')
            print('PASS: retrospective robustness report reproduces the committed bytes')
        else:
            sys.stdout.buffer.write(raw)
    except (ValueError, TypeError, KeyError, OSError) as error:
        cli.error(str(error))


if __name__ == '__main__':
    main()
