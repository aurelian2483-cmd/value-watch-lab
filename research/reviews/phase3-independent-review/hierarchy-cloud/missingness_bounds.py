"""An exact synthetic diagnostic for identification under missing race dates."""
import json

# (race count, observed mean difference in invented milli-units)
DATES = ((10, -19), (6, -17), (7, -16), (6, -18), (4, -12), (7, -17),
         (8, -14), (7, -14), (6, -13), (9, -15), (20, None), (30, None))
BOUNDS = (-120, 120)


def experiment(repetitions):
    dates = DATES*repetitions
    total = sum(races for races,_ in dates)
    observed = sum(races for races,mean in dates if mean is not None)
    observed_sum = sum(races*mean for races,mean in dates if mean is not None)
    missing = total-observed
    low, high = (round((observed_sum+missing*value)/total,6) for value in BOUNDS)
    return dict(dates=len(dates), race_count=total, observed_races=observed, missing_races=missing,
                observed_mean_milli=round(observed_sum/observed,6),
                lower_ground_truth_milli=low, upper_ground_truth_milli=high)


if __name__ == '__main__':
    original, replicate = experiment(1), experiment(100)
    assert original['lower_ground_truth_milli'] < 0 < original['upper_ground_truth_milli']
    for label in ('lower_ground_truth_milli', 'upper_ground_truth_milli', 'observed_mean_milli'):
        assert original[label] == replicate[label]
    print(json.dumps(dict(
        scope='EXPLORATORY_SYNTHETIC_ONLY',
        question='Can the sign of a race-weighted mean be identified with large missing clusters?',
        design='Same observed races in both worlds; every missing race takes one imposed support endpoint.',
        sampling='Exact deterministic enumeration; no random seed or estimated interval.',
        limitation='The imposed score range and illustrative date weights do not describe registered forecasts.',
        support_milli=BOUNDS, scenarios=[original,replicate]), indent=2, sort_keys=True))
