# Batch 016 — source-definition review

Reviewed on 24 November 2026. The candidate intake workflow at 0d44b9dd passed. The three entries are admitted as specifications only; no empirical or independent sports validation is claimed.

- Benjamini–Yekutieli: [original paper, Theorem 1.3](https://www.math.tau.ac.il/~ybenja/MyPapers/benjamini_yekutieli_ANNSTAT2001.pdf) and [SciPy documentation](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.false_discovery_control.html). Harmonic adjustment confirmed; related to BH, not independent evidence.
- Energy distance: [SciPy definition](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.energy_distance.html). Square-root convention and first-moment restriction retained.
- Two-sample Cramér–von Mises: [SciPy documentation](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.cramervonmises_2samp.html). The continuous no-ties CDF-integral expression was also compared with SciPy's rank statistic on three small synthetic samples; numerical agreement to floating-point precision. No claims for ties or dependent samples.

Scope: source definitions and catalogue structure only, not a comprehensive proof of mathematical novelty. No existing IDs removed. Batch 017 contains two additional unregistered candidates requiring intake. Full-scale research and publication remain blocked.
