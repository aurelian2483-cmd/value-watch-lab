# Value Watch Phase 3 independent review package

Prepared for external statistical and technical review. Value Watch remains **UNVALIDATED** and betting publication remains **BLOCKED**. External reviewer sign-off is outstanding.

| Pin | Exact SHA |
| --- | --- |
| Draft checkpoint under audit | `93cf2f508729ca489636f1197d59b7c4ca083aa5` |
| Main used for the scheduler and pinned feed inventory | `fa350b91abfe0ded8518aff8f7dd5a9d31b6e2fb` |
| Main snapshot containing the original 612 protected forecast files | `e2ec193c195c68e8a3337ccd7e2c7cfb59c6ae51` |

Use the immutable repository commit in the link to this package as the package revision. `git rev-parse HEAD` identifies the checked-out revision. `SHA256SUMS` covers the experiment, tests, receipts, audited Phase 3 code, protocol, registration and earlier statistical evidence. The [scheduler inventory](scheduler-inventory.json) also records workflow hashes and the exact Git blob and SHA-256 of the inspected feed. This package includes no retained body from the live feed.

## Statistical methods and assumptions

All trials use generated scores and fields. No protected race, production score, real outcome or model weight entered any comparison. The simulation reads no files. The study uses 32 cells, 1,000 independent synthetic replicates per cell and 3,999 bootstrap draws per method per trial. Draw-index matrices are reused across trials within each cell. Consequently the binomial Monte Carlo standard errors are conditional on those matrices and omit finite-bootstrap randomisation variance. Methods and block lengths are fixed before comparing outcomes.

- **Estimand.** Sum of paired score deltas divided by the sum of race counts. A date is a sampling unit. Equal averaging of date means targets a different quantity when date size varies.
- **Data generator.** The calendar grid has 8, 22, 60 or 120 dates. Each date has a stationary Gaussian AR(1) shock with marginal standard deviation 0.08, plus independent race shocks with standard deviation 0.10. Adjacent shock correlations are 0, 0.4 and 0.75 depending on the cell. A balanced date has 30 races. Unequal dates have 15 or 60 with equal probability. Informative size also assigns expected deltas −0.08 and +0.08, respectively. The full race-weighted population mean is 0 or 0.048 as appropriate.
- **Missingness.** Observed date availability is 75% independent in MCAR, or a stationary Markov outage process independent of scores with stay probabilities 0.90 observed and 0.70 missing. In the informative-missingness scenario, small dates are observed with probability 0.85 and large dates with 0.35. The concealed date type affects outcomes. The observed population mean is exactly 0.0195556, versus 0.048 for the full target. A census containing that latent type would change the missingness assumption. Missing dates occupy their calendar positions and contribute zero observed numerator and zero weight. They contribute no imputed scores.
- **Intervals.** Independent-date percentile bootstrap is the reference diagnostic. Moving blocks sample non-wrapping consecutive dates and truncate the last block. Stationary blocks start uniformly and restart geometrically with probability 1/L using circular continuation. The prespecified lengths are ceiling(n^(1/3)) and twice that length, capped at n−1. All resample the numerator and weight together. The percentiles use NumPy linear interpolation. Intervals with fewer than two observed dates or fewer than 95% usable draws are withheld. These conventions are for this synthetic audit. [Künsch moving blocks](https://doi.org/10.1214/aos/1176347265) · [Politis–Romano stationary bootstrap](https://doi.org/10.1080/01621459.1994.10476870)
- **Dependence-sensitive alternative.** The Bartlett HAC interval estimates long-run variance of the chronological influence series Sᵢ−θ̂Nᵢ with the shorter prespecified length as the bandwidth. It divides by n times squared mean weight to estimate the ratio variance. The t critical value uses observed dates minus one as degrees of freedom. That convention does not imply an exact t distribution. At least three observed dates and positive estimated variance are required. [Newey–West estimator](https://doi.org/10.2307/1913610)
- **Diagnostics.** The receipt records lags 1–5, Kish weight-only date count and calendar date-equivalent ESS from nγ₀ divided by Bartlett long-run variance. Estimates may exceed elapsed dates if estimated autocovariance is negative. The balanced-case oracle gives exact finite-window variance, true lag-one correlation and analytic ESS. Diagnostic ESS never changes Phase 3 enrollment or its minimum date count.
- **Metrics.** [Full results](synthetic-results.json) include conditional and unconditional coverage of the full target, conditional coverage of the observed target, usable-interval counts, mean width, midpoint bias, point estimator bias, standard deviation and RMSE. Bias and widths are in the synthetic score units.

### Selected results

| Synthetic scenario | Dates | IID date percentile | Moving blocks, shorter | Stationary blocks, shorter | Bartlett HAC/t |
| --- | ---: | ---: | ---: | ---: | ---: |
| Independent, balanced | 8 | 88.7% | 83.3% | 83.9% | 87.8% |
| Strong dependence, balanced | 8 | 45.6% | 47.7% | 44.0% | 56.6% |
| Strong dependence, balanced | 60 | 50.6% | 74.1% | 76.7% | 78.0% |
| Strong dependence, unequal sizes | 60 | 58.5% | 74.8% | 76.6% | 79.5% |
| Strong dependence, informative missingness | 120 | 46.4% | 56.6% | 56.4% | 59.5% |

Coverage is conditional on an interval being available. For 60 strong balanced dates, interval widths in the last four columns were 0.0387, 0.0619, 0.0643 and 0.0672. Doubling block length gave 77.2% moving and 77.5% stationary coverage. The analytic ESS was 9.49 dates, while the mean truncated Bartlett estimate was 21.99. The mean lag-one estimate was 0.642 versus the analytic 0.713. With unequal sizes, the mean weight-only ESS was 44.19 of 60 dates before accounting for serial covariance.

At 120 dates with informative missingness, the point bias versus the full population was −0.0305. Bartlett HAC/t covered the full target 59.5% of the time and the observed target 86.4% of the time. Widening intervals did not remove the selection bias. In the eight-date outage scenario the shorter moving-block method produced an interval in 864 of 1,000 trials. The finite scenarios, conditional Monte Carlo standard errors, Gaussian assumptions and known simple missingness mechanisms bound what can be inferred from this study. The study makes no choice for the locked racing evaluation.

## Collection and recovery audit

The [inventory](scheduler-inventory.json) covers the draft checkpoint and the pinned default branch. Horse discovery refreshes upstream production feeds. The scheduled isolated horse workflow writes the V3-side research archives. The separate prospective workflow services Tennis/NFL. Full research regression exercises the Phase 3 tests. No Phase 3 collector invocation appears in either inspected workflow tree. The original Phase 3 adapter is a manual one-shot and the protocol excludes production and scheduled collector edits. GitHub also documents that scheduled events on the default branch can run late or be dropped. [GitHub schedule events](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#schedule)

| Audit area | Verified behaviour and outstanding issue |
| --- | --- |
| Acquisition and rights | Bounded read, redirect policy, SHA-256 mismatch and declared commit/path mismatch were exercised. An internally self-authored but consistent local receipt was accepted as a local match and kept independent attestation false. The pinned upstream blob is independently reproducible from Git. The blob and its author timestamps do not establish independent first availability of actual paired bytes. [Source and permissions matrix](source-verification.md) |
| Receipt freshness and clock | The exact 30-minute original/current observation and two-hour envelope limits accepted the fixtures. One additional microsecond was rejected. The exact five-minute cutoff was rejected. A backwards jump was blocked and a three-hour forward jump expired the feed. The batch uses one timestamp. A simulated delay let the second pair be written after its cutoff with the earlier shared timestamp. Production route readiness remains blocked until actual per-object timing and a separately trusted pre-event receipt are demonstrated. |
| Identity and concurrency | A duplicate race in one envelope was rejected. A sequential retry returned the existing immutable forecast and a permitted revised input had a separate record. A changed start was rejected. Two synchronized writers that saw the same empty ledger each created a forecast for the exact same input. The content-addressed file path protects exact bytes and cannot provide a logical uniqueness transaction on its own. |
| Atomicity and interruption | Three child processes exited after the input write, after fsync of a forecast temp file before publication, or after forecast publication before the event write. Early retries completed one forecast. The orphan temp file stayed outside normal reads. A late retry kept the existing forecast and logged an unchanged-input event. It did not restore the missing published-forecast event. This verifies process-interruption behavior on the test filesystem. Power-loss durability, directory fsync and network-volume semantics are unverified. |
| Time attestation | No implemented collector admission path issues or verifies an independent timestamp for the canonical paired bytes. The local fixture correctly stayed unattested. RFC 3161 defines a signed time-stamp token over a digest. A future proof design requires a separately trusted authority, verification of imprint, nonce, policy, certificate chain and time, plus provenance for the event and retention of token/receipt. Git author/committer times are client metadata. A repository-based proof would require independent server-side first-observation evidence bound to the actual paired bytes. Neither path was activated or asserted. [RFC 3161](https://www.rfc-editor.org/rfc/rfc3161) |

The [disposable audit receipt](intake-audit.json) is reproducible without network access. The tests use artificial races, injected clocks, forced interleaving and subprocess termination. Before any live activation, technical review must cover single logical writer or an atomic uniqueness transaction, per-pair cutoff evidence, an append/recovery design that preserves audit links, and independent timestamp and authorised source evidence. These are outstanding gates for live operation. The registered evaluator, model definitions, state and course coverage rules keep their existing bytes.

## Reproduction and handoff

Run from the repository root with Python 3.12.14 and the pinned dependencies. A one-thread OpenBLAS run reproduces the stored Linux receipts byte for byte. Other runtimes or BLAS builds can differ at floating-point roundoff.

```sh
git rev-parse HEAD
sha256sum -c research/reviews/phase3-independent-review/SHA256SUMS
python research/reviews/phase3-independent-review/verify_pins.py
review_tmp="$(mktemp -d)"
python -m venv "$review_tmp/venv"
"$review_tmp/venv/bin/python" -m pip install -r research/reviews/phase3-independent-review/requirements.txt
export OPENBLAS_NUM_THREADS=1
"$review_tmp/venv/bin/python" scripts/test_audit_date_dependence.py
"$review_tmp/venv/bin/python" scripts/audit_date_dependence.py "$review_tmp/synthetic-results.json"
cmp "$review_tmp/synthetic-results.json" research/reviews/phase3-independent-review/synthetic-results.json
python scripts/audit_phase3_isolation.py "$review_tmp/intake-audit.json"
cmp "$review_tmp/intake-audit.json" research/reviews/phase3-independent-review/intake-audit.json
python -m unittest discover -s research/horse-ab-phase3-master-20261115 -p 'test_*.py'
python -m unittest discover -s tests
for test in tests/*.cjs; do node "$test"; done
```

The [local test receipt](local-test-evidence.json) records executed test counts against the pinned main integration. The full research workflow also covers the mathematical catalogue and frozen Phase 3 replay. Hosted browser QA checks the combined draft/main tree with no deployment. The distribution candidate contains code, synthetic results, results-source documentation, source hashes and reproducible test evidence. External statistical and technical reviewers have yet to sign off. Registered qualifying pairs, reviewed outcomes and independent timestamp attestations remain zero.
