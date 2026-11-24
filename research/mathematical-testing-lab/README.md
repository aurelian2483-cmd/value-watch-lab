# General Mathematical Testing Laboratory — Phase 1

Isolated draft branch based on verified catalogue commit 53ce0b33d88e547cccc78796f34a2668b2669074. Fixed synthetic mathematical benchmarks only, independent of the catalogue growth task.

## Run

```sh
node --test research/mathematical-testing-lab/*.test.mjs
node research/mathematical-testing-lab/suite.mjs "$(git rev-parse HEAD)"
```

Five known-answer fixtures exercise four methods: root bisection, composite trapezoid, composite Simpson, and symmetric power iteration. Tolerances are defined in advance; the quadratic trapezoid fixture allows the theoretical discretization error 1/(6n²), plus a small floating-point allowance. The power iteration result reports a residual; residual convergence alone cannot certify dominance (the tests explicitly illustrate an invariant non-dominant start).

Reports contain deterministic existing registry-compatible experiment identities, fixture hashes, absolute errors, convergence state, diagnostic fields and retained failures. The revision is caller-declared. This initial runner does not create persistent lifecycle records or run the existing experiment scheduler. CI repeats the suite and compares bytes; generated artifacts are written outside the repository. No arbitrary input code, network, historical sport inputs, model fitting, holdout evaluation, financial decisions, catalogue promotion or deployment. The 1,000-entry and independent-review gates remain unchanged.

Next work: reference implementation cross-checks, benchmark contract expansion, bounded local lifecycle/checkpoint integration, resource and reproducibility acceptance. This is numerical software QA, not scientific predictive qualification.

## Phase 2 — independent analytical cross-check

Python standard-library Decimal (60-digit context) and Fraction references independently check all five fixed fixture outputs, convergence metadata, predefined tolerances and report counts. The quadratic trapezoid case checks both the continuous integral and the exact discrete quadrature value, detecting a result that merely lands within the integral tolerance. CI adds reference-check.json. This is an independent analytical reference calculation, not an external independent reviewer or a full general-purpose numerical implementation. Hash reconstruction and persistent experiment lifecycle remain outstanding.
