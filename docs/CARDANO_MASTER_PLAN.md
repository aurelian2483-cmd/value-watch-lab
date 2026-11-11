# Value Watch 3.0 Cardano — engineering master plan

Status: development planning, not a validated betting system. Owner approval required before merging to main, live deployment, new costs, destructive operations, or relaxing safety gates.

## Non-negotiable invariants
- Four sports: football, horse racing, tennis, NFL. Preserve existing paper slips: Best Evidence, Balanced, Cross-Sport Explorer, Experimental Longshot.
- Models remain UNVALIDATED and betting publication BLOCKED until independent evidence and explicit owner approval. No real-money betting integration.
- Never invent odds, event data, research findings, automated agents, probability estimates, test runs, or external source provenance.
- Keep historical research, rejected candidates, and failed hypotheses for honest retrospective evaluation. Protect personal data and API secrets.
- Research effort: Applied 40%, Experimental 35%, Frontier Discovery 25%. These are effort allocations, not selection quotas.
- No merge or deployment without explicit owner approval. No paid resources without approval.

## Architecture / workstreams
1. **Evidence & ingestion:** typed event records, immutable source receipts, timestamped Sky Bet odds where legally and technically accessible, provenance and freshness flags, source quality, schema validation, deduplication, ingestion diagnostics.
2. **Sport intelligence:** football current-season adaptive form, first 5–7 fixtures as uncertain early evidence, transfers/manager changes; racing race-day conditions, verified odds movement and optional manually authorised video annotations; tennis surface/fatigue/head-to-head; NFL shortlist of 3–5 strongest candidates, never forced.
3. **Cardano mathematical laboratory:** hypothesis registry, baseline models, probability calibration, Bayesian and robust methods, mathematical invention and physics-inspired modelling as falsifiable research rather than asserted edges.
4. **Experiment factory:** reproducible datasets, fixed seeds, preregistered hypotheses, temporal holdouts, leakage checks, sensitivity tests, ablations, negative controls, multiple-testing adjustments, independent sceptic review.
5. **Research memory:** versioned experiments, source references, rejected and selected candidates, predictions at issue time, later outcomes, immutable result snapshots, audit trail, schema migrations.
6. **Control Tower:** distinguish running jobs, scheduled jobs, proposals, failed jobs and disconnected agents; no simulated activity portrayed as real. Accessible Windows/mobile layouts.
7. **Quality, operations and release:** deterministic tests, Playwright smoke and regression, GitHub Actions, failure triage, data persistence checks, security scanning, cost monitoring, manual release approval.

## Research roles (design targets, not active services)
- Cardano-inspired mathematician: formulate novel equations, compare to baselines, seek counterexamples.
- Billy Walters-inspired betting strategist: market assumptions, risk controls, price reliability, retrospective critique.
- Physicist: uncertainty propagation, dynamical systems, signal/noise, falsification.
- Statistician/data scientist: calibration, leakage, selection bias, uncertainty intervals.
- Sceptic / QA reviewer: independently challenge every improvement.
- Race-video specialist: manual evidence now; automated recognition only after authorised data and validated implementation.

## Stage gates
**G0 Inventory:** verify branch file inventory, workflow paths, existing tests and data contracts. Produce evidence-based gap register.
**G1 Contracts:** define event/odds/experiment schemas and validation, migration and rollback plans without changing existing production behaviour.
**G2 Memory:** build append-only experiment and prediction ledger with reproducible test fixtures, persistence and recovery checks.
**G3 Sports:** improve each sport in isolation, preserving provenance and uncertainty; test all four paper-slip strategies.
**G4 Discovery:** add experiment orchestration and independent statistical review; record negative results.
**G5 Control Tower:** connect actual workflow/job state; no fictional autonomy.
**G6 Release candidate:** full cross-module and browser QA, security, data migration, performance and owner approval. Keep main unchanged until approved.

## First engineering backlog
- [ ] G0: Inventory relevant modules, CI workflows, fixtures and data provenance. Confirm what is genuinely automated.
- [ ] G0: Create a baseline test matrix for four sports, four slips, import/persistence, empty/invalid data, and publication gates.
- [ ] G1: Draft a versioned experiment record schema with provenance, status and reproducibility fields.
- [ ] G1: Add schema validation and negative tests on development branch, without changing published predictions.
- [ ] G2: Prototype append-only research memory and explicit rejected-candidate logging.
- [ ] G3: Football current-season adaptive form research protocol and backtest design.
- [ ] G3: Horse-racing video/manual evidence and odds movement provenance audit.
- [ ] G4: Register and evaluate one falsifiable mathematical hypothesis against a simple baseline.
- [ ] G5: Wire Control Tower to verifiable GitHub Actions results and recorded experiment history.
- [ ] G6: Full regression evidence and proposed release notes; no deployment.

## Definition of done for any task
Code reviewed; relevant tests actually executed with results linked; negative cases covered; source-data compatibility and persistence assessed; no fabricated live data; research-only and publication gates retained; changes and remaining risks documented. Passing an isolated smoke test is not equivalent to production validation.

## Constraints and open dependencies
Real-time verified Sky Bet odds, licensed race video, reliable historical outcomes, and continuous cloud agents are not established. Copilot Free availability does not prove coding-agent assignment or autonomous PR capability. Codespaces is configured but not confirmed started or tested. Github Actions can run only configured jobs within account limits.

## Immediate next step
Run G0 repository and test audit; record verified findings and create targeted follow-up commits. No release action.
