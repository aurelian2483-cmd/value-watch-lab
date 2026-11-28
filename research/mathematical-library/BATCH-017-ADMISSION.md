# Batch 017 — source-definition review

24 November 2026. Both workflows passed at 2efaa2b8e3d9a368ceec86241830d36dcd0b8bdb. Reviewed published definitions against:

- [SciPy Wasserstein distance](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.wasserstein_distance.html): CDF-integral and coupling definitions, comparable units, finite first moments. Descriptive distance alone is not a test.
- [SciPy two-sample KS](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.ks_2samp.html): two-sided empirical CDF maximum separation; independent continuous null reference. Not equivalent to the registered one-sample KS or integrated squared discrepancy.

Structural and source-definition review only. No independent empirical performance, new numerical test, comprehensive semantic novelty audit or protected evaluation is claimed. Original entries remain preserved. Batch 018 candidates require structural checks and subsequent review.
