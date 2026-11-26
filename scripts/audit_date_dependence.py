"""Synthetic calendar-date dependence audit. Reads no racing or ledger data."""
import argparse
import json
import math
from pathlib import Path
import platform

import numpy as np
import scipy
from scipy.stats import t


SEED = 20261126
SCENARIOS = {
    'iid_balanced': (0., 'balanced', 'complete'),
    'moderate_balanced': (.4, 'balanced', 'complete'),
    'strong_balanced': (.75, 'balanced', 'complete'),
    'strong_unequal': (.75, 'unequal', 'complete'),
    'strong_informative_size': (.75, 'informative', 'complete'),
    'informative_mcar': (.75, 'informative', 'mcar'),
    'informative_outages': (.75, 'informative', 'outages'),
    'informative_mnar': (.75, 'informative', 'mnar'),
}


def generate(rng, n, trials, rho, size_type, missing):
    """A stationary Gaussian date shock plus independent race and type noise."""
    z = rng.standard_normal((n, trials))
    shocks = np.empty_like(z)
    shocks[0] = .08 * z[0]
    for day in range(1, n):
        shocks[day] = rho * shocks[day - 1] + .08 * math.sqrt(1 - rho**2) * z[day]
    large = rng.random((n, trials)) < .5
    sizes = np.full((n, trials), 30) if size_type == 'balanced' else np.where(large, 60, 15)
    effect = np.where(large, .08, -.08) if size_type == 'informative' else 0.
    totals = sizes * (shocks + effect) + np.sqrt(sizes) * .10 * rng.standard_normal(sizes.shape)
    available = np.ones(sizes.shape, dtype=bool)
    if missing == 'mcar':
        available = rng.random(sizes.shape) < .75
    elif missing == 'mnar':
        available = rng.random(sizes.shape) < np.where(large, .35, .85)
    elif missing == 'outages':
        draws = rng.random(sizes.shape)
        available[0] = draws[0] < .75
        for day in range(1, n):
            # P(available | available)=.90, P(available | unavailable)=.30.
            # Stationary availability .75; at a gap, preserve calendar time.
            available[day] = draws[day] < np.where(available[day - 1], .90, .30)
    truth = .048 if size_type == 'informative' else 0.
    observed_truth = (60*.35*.08 - 15*.85*.08)/(60*.35 + 15*.85) if missing == 'mnar' else truth
    return totals * available, sizes * available, available, truth, observed_truth


def draw_indices(rng, n, reps, method, length):
    if method == 'iid':
        return rng.integers(0, n, size=(reps, n))
    if method == 'moving':
        blocks = math.ceil(n / length)
        starts = rng.integers(0, n-length+1, size=(reps, blocks, 1))
        return (starts + np.arange(length)).reshape(reps, -1)[:, :n]
    if method != 'stationary':
        raise ValueError('Unknown bootstrap method')
    # Independent uniform initial location, followed by geometric-length runs.
    starts = rng.integers(0, n, size=(reps, n))
    restart = rng.random((reps, n)) < 1/length
    indices = starts.copy()
    for day in range(1, n):
        indices[:, day] = np.where(restart[:, day], starts[:, day], (indices[:, day-1]+1) % n)
    return indices


def count_matrix(indices, n):
    weights = np.zeros((len(indices), n), dtype=np.float64)
    np.add.at(weights, (np.arange(len(indices))[:, None], indices), 1)
    return weights


def ratio(numerator, denominator):
    result = np.full(numerator.shape, np.nan, dtype=float)
    return np.divide(numerator, denominator, out=result, where=denominator > 0)


def bootstrap(totals, sizes, weights):
    trials = totals.shape[1]
    low, high, valid_fraction = (np.full(trials, np.nan) for _ in range(3))
    for first in range(0, trials, 100):
        last = min(first+100, trials)
        denominators = weights @ sizes[:, first:last]
        draws = ratio(weights @ totals[:, first:last], denominators)
        fraction = np.mean(denominators > 0, axis=0)
        eligible = (np.count_nonzero(sizes[:, first:last], axis=0) >= 2) & (fraction >= .95)
        if eligible.any():
            values = np.nanquantile(draws[:, eligible], [.025, .975], axis=0)
            low[first:last][eligible], high[first:last][eligible] = values
        valid_fraction[first:last] = fraction
    return low, high, valid_fraction


def autocovariances(values, max_lag):
    return np.array([(values[lag:] * values[:len(values)-lag]).mean(axis=0)
                     * (len(values)-lag)/len(values) for lag in range(max_lag+1)])


def hac(totals, sizes, bandwidth):
    """Bartlett long-run variance of the calendar-date ratio influence series."""
    n = len(sizes)
    estimate = ratio(totals.sum(axis=0), sizes.sum(axis=0))
    influence = totals - sizes*estimate
    gamma = autocovariances(influence, max(bandwidth, 5))
    taps = 1 - np.arange(1, bandwidth+1)/(bandwidth+1)
    lrv = gamma[0] + 2*(taps @ gamma[1:bandwidth+1])
    observed = (sizes > 0).sum(axis=0)
    eligible = (observed >= 3) & (gamma[0] > 0) & (lrv > 0)
    # Student-t is a finite-sample sensitivity convention, without a t-law
    # guarantee for a ratio or serially dependent influence values.
    critical = t.ppf(.975, np.maximum(observed-1, 1))
    half = critical*np.sqrt(ratio(lrv, sizes.mean(axis=0)**2*n))
    half[~eligible] = np.nan
    return estimate-half, estimate+half, ratio(n*gamma[0], lrv), ratio(gamma[1:6], gamma[0])


def summaries(low, high, truth, observed_truth):
    usable = np.isfinite(low) & np.isfinite(high)
    mid = (low+high)/2
    count = int(usable.sum())
    def coverage(target):
        return int(((low <= target) & (high >= target) & usable).sum())
    covered = coverage(truth)
    probability = covered/count if count else None
    return dict(usable=count, coverage_full_conditional=probability,
                coverage_full_unconditional=covered/len(low),
                coverage_observed_conditional=coverage(observed_truth)/count if count else None,
                mc_se=math.sqrt(probability*(1-probability)/count) if count else None,
                mean_width=mean_finite(high-low),
                midpoint_bias_full=mean_finite(mid-truth))


def mean_finite(values):
    valid = values[np.isfinite(values)]
    return float(valid.mean()) if valid.size else None


def balanced_truth(n, rho):
    rho_daily_means = rho * .08**2 / (.08**2 + .10**2/30)
    design = 1 + 2*sum((1-lag/n)*rho**lag*.08**2/(.08**2 + .10**2/30)
                       for lag in range(1, n))
    return dict(lag1=rho_daily_means, ess_dates=n/design,
                sampling_sd=math.sqrt(design*(.08**2 + .10**2/30)/n))


def run(trials, reps):
    cells = []
    seeds = np.random.SeedSequence(SEED).spawn(4*len(SCENARIOS))
    for j, n in enumerate((8, 22, 60, 120)):
        length = math.ceil(n**(1/3))
        plans = [('iid', 1)] + [(method, size) for method in ('moving', 'stationary')
                                for size in (length, min(2*length, n-1))]
        for k, (name, params) in enumerate(SCENARIOS.items()):
            source_seed, draw_seed = seeds[j*len(SCENARIOS)+k].spawn(2)
            rng = np.random.default_rng(source_seed)
            totals, sizes, available, truth, observed_truth = generate(rng, n, trials, *params)
            estimate = ratio(totals.sum(axis=0), sizes.sum(axis=0))
            error = estimate-truth
            methods = {}
            for (method, size), seed in zip(plans, draw_seed.spawn(len(plans))):
                weights = count_matrix(draw_indices(np.random.default_rng(seed), n, reps, method, size), n)
                low, high, valid_fraction = bootstrap(totals, sizes, weights)
                methods[f'{method}_{size}'] = {**summaries(low, high, truth, observed_truth),
                                              'mean_valid_draw_fraction': float(valid_fraction.mean())}
            low, high, ess, acf = hac(totals, sizes, length)
            methods[f'hac_bartlett_t_{length}'] = summaries(low, high, truth, observed_truth)
            cells.append(dict(
                scenario=name, dates=n, rho=params[0], cluster_sizes=params[1], missing=params[2],
                truth_full=truth, truth_observed=observed_truth, mean_observed_dates=float(available.sum(axis=0).mean()),
                mean_observed_races=float(sizes.sum(axis=0).mean()), estimator_available=int(np.isfinite(estimate).sum()),
                estimator_bias_full=mean_finite(error), estimator_bias_observed=mean_finite(estimate-observed_truth),
                estimator_sd=float(np.std(estimate[np.isfinite(estimate)], ddof=1)),
                estimator_rmse_full=math.sqrt(mean_finite(error**2)),
                mean_estimated_ess_dates=mean_finite(ess),
                mean_influence_acf_lag_1_to_5=[mean_finite(lag) for lag in acf],
                mean_weight_only_ess_dates=mean_finite(ratio(sizes.sum(axis=0)**2, (sizes**2).sum(axis=0))),
                analytic_balanced_truth=balanced_truth(n, params[0]) if params[1] == 'balanced' else None,
                methods=methods))
    return dict(scope='SYNTHETIC_METHOD_DIAGNOSTIC', model_status='UNVALIDATED', publication_gate='BLOCKED',
                seed=SEED, trials=trials, replicates=reps, nominal_coverage=.95,
                python=platform.python_version(), numpy=np.__version__, scipy=scipy.__version__,
                common_resample_indices_within_cell=True, cells=cells)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('output', type=Path)
    parser.add_argument('--quick', action='store_true', help='Small deterministic software smoke test')
    args = parser.parse_args()
    report = run(24, 199) if args.quick else run(1000, 3999)
    with args.output.open('x', encoding='utf-8') as handle:
        json.dump(report, handle, allow_nan=False, indent=2)
        handle.write('\n')


if __name__ == '__main__':
    main()
