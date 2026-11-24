# Batch 021 — source review

24 November 2026. Both workflows passed at 32259c29f3e8fe0f576e9b2926adcdde38e7f413.

- [Jarque–Bera](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.jarque_bera.html): skewness and kurtosis diagnostic; chi-square approximation requires large samples. SciPy cautions about samples below roughly 2,000 observations.
- [NIST runs test](https://www.itl.nist.gov/div898/handbook/eda/section3/eda35d.htm): binary runs count, conditional expectation and variance checked against the handbook. Normal approximation is restricted to adequate symbol counts.
- [SciPy permutation test](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.permutation_test.html): paired single-sample sign reversals, exact enumeration under sign invariance. The specification explicitly uses an absolute-tail convention.

Structural and conceptual review only; no empirical performance, exhaustive semantic novelty review, or protected evaluation claimed. Four dependence diagnostics await admission review. Related statistics do not constitute independent evidence simply because they have different names.
