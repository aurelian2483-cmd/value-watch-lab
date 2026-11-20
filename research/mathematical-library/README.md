# Sky Universal Mathematical Research Library

Research catalogue v1 registers **244 specifications** across six sports, including 16 preserved v0 records and 228 entries added in batches. The 1,000-entry milestone remains open with **756 entries outstanding**.

| Classification | Count |
| --- | ---: |
| Distinct algorithms | 75 |
| Distinct models | 29 |
| Distributions | 25 |
| Frameworks | 4 |
| Model variants | 25 |
| Parameter configurations | 1 |
| Feature transformations | 13 |
| Diagnostics | 48 |
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

## Candidate hypotheses for later review

| Hypothesis | What would distinguish it in a separately authorized study | Main unresolved condition |
| --- | --- | --- |
| A filtered change signal helps identify recent performance shifts | Compare prior-history CUSUM and Bayesian online change detection on residuals from a frozen score model | Schedule adjustment and sparse false-alarm calibration |
| Duration and exposure improve cross-sport state tracking | Compare fixed-step smoothing with elapsed-time OU transitions for horse sectionals and tennis serve aggregates | Reliable timestamped histories and legal access |
| Explicit count dependence improves football scoreline reliability | Compare low-score correction and shared-component Poisson with a common independent baseline | Negative dependence and sparse score cells |
| Role-aware hierarchical priors help with cold starts | Compare partial pooling across stable role or competition groups | Exchangeability and pre-event roster availability |
| Scoring rules explain where an aggregate skill rating loses information | Compare rules-based tennis and darts recursions with direct event-rating models on agreed targets | Independently available point and throw histories |
| Forecast disagreement can inform calibration | Compare fixed linear pooling with a prespecified disagreement gate and separate calibration | Correlated component bias and earlier forecast receipts |

The five review perspectives are recorded in the audit. Next intake needs deeper sources and method coverage for control, physics, deep learning, evolutionary computation, causal inference, numerical analysis, and sport-specific modelling. A recoverable experiment manifest would allow a direct duplicate and provenance crosswalk for the reported 81-formula inventory.

The review gate remains closed for tournaments and promotion. The original 608-match replay, existing predictions, website, production branches and deployment configuration are outside this PR’s diff.
