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

## Phase 3 — local fixture persistence

Create a new empty, dedicated directory outside the checkout, then run `node persistence.mjs <directory> <full-revision>` from this folder. The adapter reuses registry manifests, lifecycle events and content-addressed checkpoints. Repeated runs recompute the five fixed cases, verify terminal evidence and reuse the existing history. `--recover` permits finalization of a verified CHECKPOINTED fixture only; RUNNING and INTERRUPTED records require explicit review. An exclusive lock prevents simultaneous cooperating writers. Stale locks require manual review; no takeover or automated repair. The local path checks are not an OS sandbox or protection from concurrent hostile filesystem changes. A failure result is retained with a terminal failure and its artifact reference. This is fixture-level recovery, not mid-iteration solver checkpointing. CI uses a disposable dedicated store and publishes persistence summaries.

## Phase 4 — bounded CPU worker execution

Run `node parallel.mjs <full-revision> [workers]`. The fixed five fixtures run in a bounded queue (1–4 requested workers, restricted by available CPU slots and a conservative free-memory estimate). Every worker has V8 old/young-generation heap and stack limits plus a per-fixture timeout. Workers are terminated after a result or timeout, with failures retained; serial-reference agreement and known-answer PASS are both required. Resource reports include measured worker elapsed time, wall time, heap usage and peak concurrent workers. These are not hard process RSS/OS memory limits; free memory is not reserved. GPU detection and acceleration are disabled, not tested. No throughput or speedup claim. CI emits cpu-resource-report.json. This runner executes only the existing fixed synthetic cases, not registry jobs or actual predictive workloads.

## Phase 5 — read-only control-centre adapter

`status.mjs <artifact-directory> <full-revision> <json|html>` reconciles the four fixed reports by expected checkout label, benchmark fingerprint, fixture identity, terminal verdict, counts and worker limits. Secondary reports carry the benchmark fingerprint; this is not a signature or authentication. Missing or inconsistent evidence suppresses aggregate success counts. The adapter does not execute solvers, read external datasets or change registry state. CI produces lab-status.json and lab-status.html; actual Python output is included in the end-to-end check. The adapter is a standalone static control-centre preview, not yet wired into the existing deployed UI or another draft branch. Browser acceptance and broader audit remain pending.

## Quality audit

See [audit findings](QUALITY-AUDIT-20261124.md). The expanded workflow checks actual terminal artifacts, a copied dedicated store, and the static report in Chromium. No changes to the catalogue or publication gate.
