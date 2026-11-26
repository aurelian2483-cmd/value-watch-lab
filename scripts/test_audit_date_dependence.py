"""Independent small oracles for the synthetic-only interval audit."""
from itertools import product
import unittest

import numpy as np
from scipy.stats import t

import audit_date_dependence as audit


class MethodOracle(unittest.TestCase):
    def test_moving_block_paths(self):
        sample = audit.draw_indices(np.random.default_rng(17), 7, 200, 'moving', 3)
        self.assertTrue((sample[:, :6].reshape(-1, 2, 3) <= 6).all())
        self.assertTrue((np.diff(sample[:, :6].reshape(-1, 2, 3), axis=2) == 1).all())
        self.assertTrue((sample[:, [0, 3, 6]] <= 4).all())

    def test_stationary_bootstrap_continuation_and_uniform_start(self):
        n, block, replicates = 11, 4, 10000
        sample = audit.draw_indices(np.random.default_rng(31), n, replicates, 'stationary', block)
        continuation = (sample[:, 1:] == (sample[:, :-1]+1) % n).mean()
        expected = .75+.25/n
        self.assertLess(abs(continuation-expected), .008)
        start_frequencies = np.bincount(sample[:, 0], minlength=n)/replicates
        self.assertLess(abs(start_frequencies-1/n).max(), .012)
        iid = audit.draw_indices(np.random.default_rng(31), n, replicates, 'iid', 1)
        stationary = audit.draw_indices(np.random.default_rng(31), n, replicates, 'stationary', 1)
        np.testing.assert_array_equal(iid, stationary)

    def test_percentile_interval_matches_exhaustive_ratio_on_unequal_dates(self):
        totals = np.array([[0.], [12.], [-10.]])
        sizes = np.array([[18.], [12.], [5.]])
        draws = list(product(range(3), repeat=3))
        matrix = audit.count_matrix(np.array(draws), 3)
        low, high, finite = audit.bootstrap(totals, sizes, matrix)
        scalar = sorted(sum(totals[x, 0] for x in indices)/sum(sizes[x, 0] for x in indices) for indices in draws)
        self.assertAlmostEqual(low.item(), .35*scalar[0]+.65*scalar[1])
        self.assertAlmostEqual(high.item(), .65*scalar[-2]+.35*scalar[-1])
        self.assertEqual(finite.item(), 1.)

    def test_missing_day_is_a_calendar_gap_and_bootstrap_can_withhold(self):
        totals, sizes = np.array([[1.], [0.], [2.]]), np.array([[1.], [0.], [1.]])
        matrix = audit.count_matrix(np.array(list(product(range(3), repeat=3))), 3)
        low, high, valid = audit.bootstrap(totals, sizes, matrix)
        self.assertEqual(valid.item(), 26/27)
        self.assertEqual((low.item(), high.item()), (1., 2.))
        no_good = np.array([[0, 3, 0]]*4 + [[3, 0, 0]]*4, dtype=float)
        low, _, fraction = audit.bootstrap(totals, sizes, no_good)
        self.assertEqual(fraction.item(), .5)
        self.assertTrue(np.isnan(low.item()))

    def test_hac_matches_explicit_bartlett_quadratic_form(self):
        values = [1., 7., 0., 2., 4., 2., 1., 5.]
        dates = [1., 3., 0., 1., 2., 1., 4., 2.]
        n, bandwidth = len(dates), 3
        estimate = sum(values)/sum(dates)
        influence = [score-estimate*size for score,size in zip(values, dates)]
        sigma2 = sum(
            max(0., 1-abs(a-b)/(bandwidth+1))*influence[a]*influence[b]
            for a,b in product(range(n), repeat=2)
        )/n
        half = t.ppf(.975, 6)*(sigma2/n)**.5/(sum(dates)/n)
        low, high, ess, acf = audit.hac(np.array(values)[:,None], np.array(dates)[:,None], bandwidth)
        self.assertAlmostEqual(low.item(), estimate-half)
        self.assertAlmostEqual(high.item(), estimate+half)
        self.assertAlmostEqual(ess.item(), sum(x*x for x in influence)/sigma2)
        self.assertAlmostEqual(acf[0,0], sum(a*b for a,b in zip(influence, influence[1:]))/sum(x*x for x in influence))

    def test_known_targets_and_exact_balanced_effective_sample_size(self):
        rng = np.random.default_rng(71)
        _, _, _, full, observed = audit.generate(rng, 120, 100, .75, 'informative', 'mnar')
        self.assertAlmostEqual(full, .048)
        self.assertAlmostEqual(observed, .01955555555555555)
        self.assertAlmostEqual(audit.balanced_truth(60, 0)['ess_dates'], 60)
        # At n=2 the variance ratio is 1 plus the correlation of the date means.
        analytic = audit.balanced_truth(2, .75)
        self.assertAlmostEqual(analytic['ess_dates'], 2/(1+.75*.0064/(.0064+.01/30)))


if __name__ == '__main__':
    unittest.main()
