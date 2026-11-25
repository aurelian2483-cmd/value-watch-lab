# Sky Universal Mathematical Research Library

Research catalogue v1 registers **340 specifications** across six sports, including 16 preserved v0 records and 324 entries added in batches. The 1,000-entry milestone remains open with **660 entries outstanding**.

| Classification | Count |
| --- | ---: |
| Distinct algorithms | 129 |
| Distinct models | 33 |
| Distributions | 29 |
| Frameworks | 4 |
| Model variants | 30 |
| Parameter configurations | 1 |
| Feature transformations | 13 |
| Diagnostics | 77 |
| Calibration methods | 7 |
| Ensembles | 8 |
| Decision rules | 9 |

A distinct algorithm specifies a computational procedure. A distinct model describes a different probabilistic or regression structure. Ensembles and calibration procedures have their own classifications. A variant must identify a parent and a material change in mechanism, fitting, support or dependence. A configuration must specify a historically meaningful frozen setup. Alternate naming, sport labels and parameter sweeps add no entries.

## Read and check

From this directory, use Node.js 18 or later.

```sh
node validate.mjs
node --test validate-v1.test.mjs
node catalogue.mjs summary
node catalogue.mjs search "tennis calibration"
node catalogue.mjs index > /tmp/sky-mathematical-index.md
node catalogue.mjs reference > /tmp/sky-mathematical-reference.md
node catalogue.mjs ledger > /tmp/sky-mathematical-evidence.json
```

The manifest orders batch files and pins the original catalogue by hash. JSON records are independently searchable. The reference command renders the equations, variable definitions, sport applications, limitations and citations. The index maps IDs to families and sports. The ledger distinguishes literature, documented derivations and repository provenance. [Equation reference](REFERENCE.md) · [Family and sport index](INDEX.md) · [Provenance and evidence ledger](evidence-ledger.v1.json) · [Progress](progress.v1.json) · [Review and recovery audit](review-audit.v1.json)

The checker detects duplicate IDs, normalized names and normalized specifications. Related-method links and the review audit document semantic overlap. Algebraic equivalence, source accuracy and real input availability still require human review. A sport tag identifies a plausible application under its required inputs and assumptions. A citation locates mathematical provenance. No entry carries new empirical test evidence.

For any future forecasting experiment, record a prediction cutoff and verify when each input version first became available. Restrict fit transformations, ratings, hyperparameters, calibration and weights to earlier samples. Real data acquisition and any use of a reserved evaluation set fall outside this catalogue review. Generic input profiles describe requirements and exclusions. Rights to actual feeds must be established separately.

## Audit corrections

The [evidence audit](EVIDENCE-AUDIT-2026-11-20.md) records the original findings. All original 286 IDs remain registered. Before batch 016, the 105 records classified as distinct algorithms represented 104 after the recorded `prox-l1` → `ista` equivalence. Their iterates agree for the same smooth loss, L₁ penalty, penalty mask and initialization at constant step η=1/L. An exempt intercept receives the ordinary gradient step. FISTA adds extrapolation. This count reflects the recorded equivalence and remains subject to further review. [Beck and Teboulle, §§3–4](https://www.ceremade.dauphine.fr/~carlier/FISTA)

Every sport tag depends on the conditions in its [applicability profile](sport-profiles.v1.json). Assessment and causal methods use authorized development or historical study records with settled outcomes. IPW and AIPW require pre-treatment covariates and settled outcomes for effect estimation. At-cutoff methods use the data version and fitted parameters available at each origin. Locating a historical breakpoint or decoded state using a full prefix gives it the availability time of that calculation.

Source checks included the Glicko update and separate game expectation, the run-length recursion and prior reset, Cho’s GRU gate convention, constant-step ISTA and FISTA, the Nelder–Mead acceptance branches, the COM-Poisson geometric boundary and the one-sample Cramér–von Mises statistic. The remaining definitions retain their provenance locators. [Glickman](https://www.glicko.net/glicko/glicko.pdf) · [Adams and MacKay](https://arxiv.org/pdf/0710.3742) · [Cho et al.](https://aclanthology.org/D14-1179.pdf) · [Beck and Teboulle](https://www.ceremade.dauphine.fr/~carlier/FISTA) · [Lagarias et al.](https://www.math.kent.edu/~reichel/courses/optimization/reading.material.2/nelder.mead.pdf) · [COM-Poisson count data](https://link.springer.com/article/10.1186/s40488-017-0077-0) · [SciPy and Csörgő–Faraway](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.cramervonmises.html)

**Empirically qualified entries: 0.** The validator tests catalogue integrity, evidence classification, timing rules and selected mathematical identities on invented values. Full primary-source verification, deeper equivalence review, and sport data availability remain open. The [Sky 81-configuration reconstruction](sky81/README.md) tracks the separate grid and archive evidence.

## Candidate hypotheses for later review

| Hypothesis | What would distinguish it in a separately authorized study | Main unresolved condition |
| --- | --- | --- |
| A filtered change signal helps identify recent performance shifts | Compare prior-history CUSUM and Bayesian online change detection on residuals from a frozen score model | Schedule adjustment and sparse false-alarm calibration |
| Duration and exposure improve cross-sport state tracking | Compare fixed-step smoothing with elapsed-time OU transitions for horse sectionals and tennis serve aggregates | Reliable timestamped histories and legal access |
| Explicit count dependence improves football scoreline reliability | Compare low-score correction and shared-component Poisson with a common independent baseline | Negative dependence and sparse score cells |
| Role-aware hierarchical priors help with cold starts | Compare partial pooling across stable role or competition groups | Exchangeability and pre-event roster availability |
| Scoring rules explain where an aggregate skill rating loses information | Compare rules-based tennis and darts recursions with direct event-rating models on agreed targets | Independently available point and throw histories |
| Forecast disagreement can inform calibration | Compare fixed linear pooling with a prespecified disagreement gate and separate calibration | Correlated component bias and earlier forecast receipts |

The five review perspectives are recorded in the audit. Next intake needs deeper sources and method coverage for control, physics, deep learning, evolutionary computation, causal inference, numerical analysis, and sport-specific modelling.

The review gate remains closed for tournaments and promotion. The original 608-match replay, existing predictions, website, production branches and deployment configuration are outside this PR’s diff.

## Batch 016 admission

Three assessment-only specifications were admitted after structural intake and source-definition review. At the end of batch 016, the catalogue had 289 entries, including 106 distinct-algorithm classifications (105 after recorded equivalences). The two batch 017 candidates were staged for subsequent review. No empirical qualification is claimed. See [admission review](BATCH-016-ADMISSION.md).

## Batch 017 admission

Two assessment-only specifications admitted following structural intake and published definition review. At the end of batch 017 the catalogue contained 291 entries. Three batch 018 candidates were staged. No empirical qualification claimed. See [admission review](BATCH-017-ADMISSION.md).

## Batch 018 admission

Three assessment-only specifications admitted after structural intake and source-definition review. At the end of batch 018 the catalogue contained 294 entries. Three batch 019 candidates were staged. No empirical qualification claimed. See [admission review](BATCH-018-ADMISSION.md).

## Batch 019 admission

Three assessment-only specifications admitted after structural intake and source-definition review. At the end of batch 019 the catalogue contained 297 entries. Five batch 020 candidates were staged. No empirical qualification claimed. See [admission review](BATCH-019-ADMISSION.md).

The intake CLI supports `--next` to identify the staged batch from the current manifest; it does not admit entries automatically.

## Batch 020 admission

Five assessment-only specifications admitted after structural and source-definition review. At the end of batch 020 the catalogue contained 302 entries; three batch 021 candidates were staged. No empirical qualification claimed. See [admission review](BATCH-020-ADMISSION.md).

The snapshot checker can verify the generated index, reference, summary and ledger against their committed counterparts without writing files.

## Batch 021 admission

Three assessment-only specifications admitted after structural and source review. At the end of batch 021 the catalogue contained 305 entries; four batch 022 dependence diagnostics were staged. See [admission review](BATCH-021-ADMISSION.md). No empirical qualification claimed.

## Batch 022 admission

Four assessment-only dependence diagnostics admitted after structural and source review. At the end of batch 022 the catalogue contained 309 entries; three batch 023 candidates were staged. See [admission review](BATCH-022-ADMISSION.md). No empirical qualification claimed.

## Batch 023 admission

Two dependence diagnostics admitted; one derivative diagnostic withheld as a direct reuse of Pearson correlation on lagged inputs. Original candidates retained with explicit disposition. Current catalogue: 311 specifications. Six new numerical optimisation candidates are staged and unregistered. See [review](BATCH-023-ADMISSION.md). No empirical qualification claimed.

## Batch 024 admission

Six general numerical optimisation specifications admitted after source-definition and overlap review. Catalogue: 317 entries; three provisional numerical eigenvalue candidates staged. No empirical qualification claimed. See [review](BATCH-024-ADMISSION.md).

## Batch 025 admission

Three standard eigenvector algorithms admitted after mathematical source and overlap review. Catalogue: 320 entries; five new candidates staged. See [review](BATCH-025-ADMISSION.md). No numerical implementation or empirical validation claimed.

## Batch 026 admission

Five numerical linear algebra specifications added after external source and conceptual overlap review. Catalogue: 325 entries. Three further candidates staged. No implementation or empirical validation claimed. See [review](BATCH-026-ADMISSION.md).

## Batch 027 admission

Three general numerical linear algebra specifications admitted after mathematical source and overlap review. Catalogue: 328 entries. Two unregistered candidates staged. No implementation or empirical validation claimed. See [review](BATCH-027-ADMISSION.md).

## Batch 028 admission

Two general numerical linear algebra specifications admitted: one algorithm and one sensitivity diagnostic. Catalogue: 330 entries. Two provisional candidates staged. No implementation or empirical validation claimed. See [review](BATCH-028-ADMISSION.md).

## Batch 029 admission

One relaxed Gauss–Seidel variant admitted; fixed-step Richardson withheld as a quadratic gradient-descent derivative. Catalogue: 331 specifications. Two provisional batch 030 candidates staged. See [review](BATCH-029-ADMISSION.md). No empirical qualification claimed.

## Batch 030 admission

Two numerical linear algebra specifications admitted; catalogue: 333. See [review](BATCH-030-ADMISSION.md). No empirical qualification claimed.

## Batch 031 admission

One rank-one solve algorithm and one block power-iteration variant admitted after mathematical source and overlap review. Catalogue: 335. Two provisional root-solving candidates staged. See [review](BATCH-031-ADMISSION.md). No implementation or empirical qualification claimed.

## Batch 032 admission

Two general scalar root-solving algorithms admitted after source and overlap review. Catalogue: 337 specifications. Two provisional candidates staged for review. See [review](BATCH-032-ADMISSION.md). No implementation or empirical qualification claimed.

## Batch 033 admission

One bracket-preserving secant variant admitted; standalone inverse quadratic interpolation withheld as a constituent mechanism of Brent. Catalogue: 338. Two provisional quadrature candidates staged. See [review](BATCH-033-ADMISSION.md). No empirical qualification claimed.

## Batch 034 admission

Two general quadrature specifications admitted after mathematical source and overlap review. Catalogue: 340. Two provisional candidates staged. See [review](BATCH-034-ADMISSION.md). No empirical qualification claimed.
