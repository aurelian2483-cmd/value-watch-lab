"""Exact synthetic sensitivity to bounded measurement error and missingness."""
from fractions import Fraction
from itertools import product
import json

OBSERVED_COUNT = 70
MISSING_COUNT = 50
OBSERVED_MILLI = -16
LOW, HIGH = -120, 120
COVERAGE = Fraction(OBSERVED_COUNT, OBSERVED_COUNT+MISSING_COUNT)


def bounds(error, shift):
    observed_low = max(LOW, OBSERVED_MILLI-error)
    observed_high = min(HIGH, OBSERVED_MILLI+error)
    missing_portion = 1-COVERAGE
    return (COVERAGE*observed_low+missing_portion*max(LOW,observed_low-shift),
            COVERAGE*observed_high+missing_portion*min(HIGH,observed_high+shift))


def independent_extrema(error, shift):
    observed = range(max(LOW,OBSERVED_MILLI-error), min(HIGH,OBSERVED_MILLI+error)+1)
    candidates = [Fraction(OBSERVED_COUNT*a+MISSING_COUNT*b,OBSERVED_COUNT+MISSING_COUNT)
                  for a,b in product(observed, range(LOW,HIGH+1)) if abs(a-b)<=shift]
    return min(candidates),max(candidates)


def main():
    scenarios = []
    for error,shift in product((0,4,8),(0,20,30,100,240)):
        expected = bounds(error,shift)
        if expected != independent_extrema(error,shift):
            raise RuntimeError('exact end points differ from independently enumerated feasible worlds')
        scenarios.append(dict(measurement_error_milli=error,missing_mean_shift_milli=shift,
                              full_mean_low_milli=str(expected[0]),full_mean_high_milli=str(expected[1]),
                              sign='negative' if expected[1]<0 else 'unresolved'))
    report = dict(scope='SYNTHETIC_MEASUREMENT_ERROR',
                  question='How much mean shift can overturn a negative observed difference?',
                  design='Every synthetic observed row shares one true mean and one bounded measurement offset. '
                         'Every missing row shares a second true mean. Enumerate integer feasible means.',
                  observed_count=OBSERVED_COUNT,missing_count=MISSING_COUNT,observed_mean_milli=OBSERVED_MILLI,
                  support_milli=[LOW,HIGH],coverage=str(COVERAGE),repetitions=1,
                  seed=None,oracle='exhaustive enumeration with exact rational arithmetic',
                  limitations='Means within each group are fixed within a world. Bounds are conditional on '
                              'imposed support and error restrictions; these are not sampling intervals.',
                  scenarios=scenarios)
    print(json.dumps(report,indent=2,sort_keys=True))


if __name__=='__main__':
    main()
