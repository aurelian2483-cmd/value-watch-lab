# Batch 019 — source-definition review

24 November 2026. Both workflows passed at b26c1a50c2bf87ebf37a35c912a42af76d1d4cc6. Reviewed statistical interpretation and assumptions against:

- [Brunner–Munzel](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.brunnermunzel.html): independent groups, relative-effect null, approximate reference, not a general equal-distributions test.
- [Bartlett](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.bartlett.html): equal variances, sensitivity to non-normality.
- [Paired t-test](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.ttest_rel.html): matched observations, mean difference, n−1 degrees of freedom.

Structural and conceptual source review only. No new numerical implementation verification, exhaustive semantic novelty review or empirical validation is claimed. Five batch 020 candidates await structural and source review. Intake discovery is automatic; admission still requires review and explicit commit.
