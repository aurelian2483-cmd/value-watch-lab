"""Synthetic coverage of the descriptive London-date bootstrap.

This experiment consumes no race records and does not score Phase 3.
Run with NumPy 2.3.5 and a single BLAS thread to reproduce the receipt.
"""
import argparse
from itertools import product
import json
import math
from pathlib import Path
import random

import numpy as np

from horse_evaluation import date_cluster_interval


DATES = (2, 5, 10, 15, 22, 30, 60)
SCENARIOS = {
    'balanced_iid': {'truth': 0, 'common_sd': 0, 'size_mode': 'balanced'},
    'balanced_date_dependence': {'truth': 0, 'common_sd': .08, 'size_mode': 'balanced'},
    'unequal_informative_dates': {'truth': .048, 'common_sd': .08, 'size_mode': 'informative'},
}
REPEATS = 20000
BOOTSTRAP_SEED = 20261115
SIMULATION_SEED = 20261126
TRIALS = 1200


def draw_counts(days):
    rng = random.Random(BOOTSTRAP_SEED)
    labels = np.fromiter((rng.randrange(days) for _ in range(REPEATS * days)),
                         np.int64).reshape(REPEATS, days)
    counts = np.zeros_like(labels, dtype=np.float64)
    np.add.at(counts, (np.arange(REPEATS)[:, None], labels), 1)
    return counts


def bounds(draws):
    fifth_percentiles = (int(.025 * REPEATS), int(.975 * REPEATS) - 1)
    ordered = np.partition(draws, fifth_percentiles, axis=0)
    return ordered[list(fifth_percentiles)]


def oracle():
    """Cross-check the ratio statistic against a separate count-matrix implementation."""
    blocks = [[-.15] * 41, [.21] * 9, [-.04] * 7]
    rows = [{'startUTC': f'2026-11-{i + 10}T15:00:00Z', 'delta': value}
            for i, races in enumerate(blocks) for value in races]
    counts = draw_counts(len(blocks))
    sizes = np.array([len(block) for block in blocks])
    sums = np.array([sum(block) for block in blocks])
    lower, upper = bounds(counts @ sums / (counts @ sizes))
    got = date_cluster_interval(rows, 'delta')
    assert math.isclose(got['lower'], lower, rel_tol=0, abs_tol=1e-15)
    assert math.isclose(got['upper'], upper, rel_tol=0, abs_tol=1e-15)
    assert date_cluster_interval(rows[::-1], 'delta') == got
    # Enumerated two-date bootstrap draws. Two selections from date A, mixed,
    # and two from date B have weights 1/4, 1/2 and 1/4 respectively.
    extreme = [[0] * 18, [1] * 12]
    expected = sorted(sum(sum(extreme[i]) for i in d) / sum(len(extreme[i]) for i in d)
                      for d in product(range(2), repeat=2))
    assert expected == [0, .4, .4, 1]
    return {'count_matrix_matches': True, 'unequal_date_sizes': sizes.tolist(),
            'two_date_draw_distribution': expected}


def experiment(rng, days, scenario, counts):
    truth, common_sd = scenario['truth'], scenario['common_sd']
    # At two dates even the smaller informative date has 15 races, so the
    # implementation's >=30-race diagnostic gate is satisfied in every trial.
    if scenario['size_mode'] == 'balanced':
        sizes = np.full((days, TRIALS), 30)
        offsets = np.zeros_like(sizes, dtype=np.float64)
    else:
        high = rng.integers(0, 2, size=(days, TRIALS), dtype=bool)
        sizes = np.where(high, 60, 15)
        offsets = np.where(high, .08, -.08)
    # Conditional on size, the sum of iid race shocks is normal with
    # standard deviation sqrt(size) * race_sd. Date shocks are independent.
    totals = sizes * (offsets + rng.normal(0, common_sd, sizes.shape))
    totals += rng.normal(size=sizes.shape) * np.sqrt(sizes) * .10
    return measure(days, counts, totals, sizes, truth)


def measure(days, counts, totals, sizes, truth):
    covered, widths = [], []
    for start in range(0, TRIALS, 100):
        end = start + 100
        low, high = bounds((counts @ totals[:, start:end]) / (counts @ sizes[:, start:end]))
        covered.extend((low <= truth) & (truth <= high))
        widths.extend(high - low)
    probability = float(np.mean(covered))
    return {'dates': days, 'trials': TRIALS, 'true_race_weighted_mean': truth,
            'coverage': probability, 'monte_carlo_se': math.sqrt(probability * (1-probability) / TRIALS),
            'mean_interval_width': float(np.mean(widths))}


def serial_stress():
    """Days with identical marginal distributions but different serial correlation."""
    seed = 20261127
    rng = np.random.default_rng(seed)
    day_sd, race_sd, field_size = .08, .10, 30
    day_variance = day_sd**2
    race_mean_variance = race_sd**2 / field_size
    rows = []
    for days in (5, 15, 22, 60):
        counts = draw_counts(days)
        sizes = np.full((days, TRIALS), field_size)
        # Use the same innovations and race-level noise across correlations.
        innovations = rng.standard_normal(sizes.shape)
        race_mean_noise = rng.normal(0, math.sqrt(race_mean_variance), sizes.shape)
        for rho in (0., .3, .6):
            daily = np.empty_like(innovations)
            daily[0] = day_sd * innovations[0]
            innovation_sd = day_sd * math.sqrt(1 - rho**2)
            for pos in range(1, days):
                daily[pos] = rho * daily[pos - 1] + innovation_sd * innovations[pos]
            # The marginal and population race-weighted mean is exactly zero.
            # For adjacent dates the daily shock covariance is sigma_day² rho^lag.
            covariance_sum = sum((days-lag)*rho**lag for lag in range(1, days))
            variance = (days*(day_variance+race_mean_variance)
                        + 2*day_variance*covariance_sum) / days**2
            result = measure(days, counts, sizes*(daily+race_mean_noise), sizes, 0.)
            rows.append({'adjacent_date_correlation': rho,
                         'true_sampling_sd': math.sqrt(variance),
                         'observed_sampling_sd': float(np.std((daily+race_mean_noise).mean(axis=0), ddof=1)),
                         **result})
    return {'scope': 'SYNTHETIC_SERIAL_DATE_DEPENDENCE_DIAGNOSTIC',
            'research_only': True, 'model_validation': 'UNVALIDATED', 'publication_gate': 'BLOCKED',
            'numpy_version': np.__version__, 'bootstrap_seed': BOOTSTRAP_SEED, 'simulation_seed': seed,
            'replicates_per_trial': REPEATS, 'races_per_date': field_size,
            'day_shock_sd': day_sd, 'race_shock_sd': race_sd, 'oracle': oracle(), 'results': rows,
            'limitations': 'Stationary Gaussian AR(1) date shocks and independent race noise. This is a stress test, not a model of actual race dates.'}


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('output', type=Path)
    p.add_argument('--serial', action='store_true', help='Stress-test dependence across London dates')
    args = p.parse_args()
    if args.serial:
        report = serial_stress()
    else:
        check = oracle()
        rng = np.random.default_rng(SIMULATION_SEED)
        rows = []
        for days in DATES:
            counts = draw_counts(days)
            for name, scenario in SCENARIOS.items():
                rows.append({'scenario': name, **experiment(rng, days, scenario, counts)})
        report = {'scope': 'SYNTHETIC_RETROSPECTIVE_METHOD_DIAGNOSTIC',
                  'research_only': True, 'model_validation': 'UNVALIDATED', 'publication_gate': 'BLOCKED',
                  'numpy_version': np.__version__, 'bootstrap_seed': BOOTSTRAP_SEED,
                  'simulation_seed': SIMULATION_SEED, 'replicates_per_trial': REPEATS,
                  'scenarios': SCENARIOS, 'oracle': check, 'results': rows,
                  'limitations': 'Known synthetic ground truths only. Common draws across trials, independent synthetic samples. No dependence across dates simulated.'}
    with args.output.open('x', encoding='utf-8') as file:
        json.dump(report, file, allow_nan=False, indent=2)
        file.write('\n')


if __name__ == '__main__':
    main()
