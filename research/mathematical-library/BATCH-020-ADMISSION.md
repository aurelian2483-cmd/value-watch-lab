# Batch 020 — source-definition review

24 November 2026. Both workflows passed at 4532e4fa3a4d2e734dd0ed29577dfb66725ab719.

- [NIST paired sign test](https://www.itl.nist.gov/div898/software/dataplot/refman1/auxillar/signtest.htm) and [SciPy binomial test](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.binomtest.html): sign counts and exact binomial null conditional on nonzero differences.
- [Pearson contingency test](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.chi2_contingency.html): expected counts from marginals; no continuity correction in stated formula.
- [Fisher exact test](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.fisher_exact.html): fixed margins and probability-ordered two-sided convention.
- [One-way ANOVA](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.f_oneway.html): classical equal-variance setting and independence.
- [Cochran Q](https://www.statsmodels.org/stable/generated/statsmodels.stats.contingency_tables.cochrans_q.html): matched binary observations, multiple conditions and asymptotic reference.

Conceptual and structural review only; not independent empirical validation or exhaustive novelty review. Three next-batch candidates require checks and review. No protected evaluation data accessed.
