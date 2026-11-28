# Batch 023 — candidate dispositions and source review

24 November 2026. Both exact-head workflows passed at daafe0383664d0a339595a4c537043ceb40bd0e4 (45445431724, 45445431573).

- Admitted: first-order partial correlation. [NIST definition](https://www.itl.nist.gov/div898/software/dataplot/refman2/auxillar/partcorr.htm) directly confirms the three-variable formula. Distinct conditional linear association diagnostic relative to Pearson and VIF; no causal inference implied.
- Admitted: Bartlett correlation-matrix sphericity test. [Factor Analyzer documentation](https://factor-analyzer.readthedocs.io/en/latest/factor_analyzer.html) and [reference implementation](https://github.com/EducationalTestingService/factor_analyzer/blob/main/factor_analyzer/factor_analyzer.py) confirm log-determinant statistic and degrees of freedom. Distinct from Bartlett's univariate variance homogeneity test and PCA; requires a valid positive-definite correlation matrix.
- Withheld: fixed-overlap lagged cross-correlation. [Pearson definition](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.pearsonr.html) matches the core computation; changing aligned input pairs does not justify a separate catalogue count here. Original candidate archived intact; explicit machine-readable disposition recorded.

Reviewed against existing family index and identifiers. This is a limited conceptual and structural review, not exhaustive novelty proof or independent empirical validation. Batch 024 stages six general numerical optimization candidates; their external sources and potential overlap require subsequent verification. No data evaluation, financial decisions or deployment.
