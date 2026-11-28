# Batch 018 — source-definition review

24 November 2026. Both workflows passed at 983e7be2ffe88fb4268567083d3ebb674ed57c11. Reviewed against the published documentation:

- [Mann–Whitney U](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.mannwhitneyu.html): independent samples, equal-distribution null and tie-aware reference; not generally a median test.
- [Welch t-test](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.ttest_ind.html): independent means comparison without equal-variance assumption, approximate degrees of freedom.
- [Levene test](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.levene.html): mean-centred absolute-deviation approach; distinguish the mean centre from median and trimmed versions.

Structural and source-definition review only. No numerical implementation verification, independent empirical performance, exhaustive semantic novelty audit, or protected evaluation is claimed. Original entries remain preserved. Batch 019 candidates await structural checks and review.
