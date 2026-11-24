# Master research architecture and implementation audit

Recorded 2026-11-24 from the architecture approval conversation. Baseline inspected: 92d47c9bf01e3123b3bfff295a0bb0f3945d3a87. This specification is not proof of implementation, validation or deployment. Paper-only; real-money publication BLOCKED.

## Decision register

| Issue | Decision | Status |
|---|---|---|
| 1–2 | Separate systems: Value Watch predicts outcomes; Bottleneck investigates weaknesses; Alpha Hunt independently tests research hypotheses with read-only Value Watch evidence. | Approved; PR 169 and scope decision |
| 3 | Alpha Hunt v5; archive ACME and Zero-Based Reconstruction. Market Data → Prediction Model → Calibration → Disagreement Detection → False Edge Laboratory → Bayesian Posterior Engine → PEP → Decision Layer → Capital Allocation. | Approved; PR 170 |
| 4 | D disagreement, R historical reliability, C calibration, T evidence trust as initial baseline; retain market, league, sample size and uncertainty covariates; test contributions independently. | Proposed, not explicitly approved |
| 5 | Verified alternative bookmaker odds for research only; preserve source, timestamp, market contract and margin adjustment; never substitute another bookmaker's quote for Sky Bet. | User raised alternative sources; exact hierarchy not explicitly approved; issue 17 approves research alternatives |
| 6 | Separate chronological discovery, validation and prospective datasets; freeze predictions before events; retain failures; protect holdout; account for multiple testing. | Approved |
| 7 | Mandatory False Edge checks: randomness, overfitting, sample size, leakage, margin, selection bias, market drift, multiplicity, data quality and correlated evidence. Missing evidence = uncertain. | Approved |
| 8 | Adaptive Bayesian research, test priors and likelihoods, retain evidence history; no double counting. | Approved |
| 9 | Distinguish outcome probability, probability of genuine edge (original Posterior Edge Probability) and future persistence probability. Preserve distinct names and semantics; do not equate these. | Approved |
| 10 | Continuous evidence-led research, deduplication, versioning and reopening only on new evidence. | Approved |
| 11 | Shared evidence, separate research; no direct writes to Value Watch models from other systems; protected validation datasets. | Approved |
| 12 | Shared Research Control Centre: unique IDs, registry, queue, dataset versions, comparisons, failure archive, resource controls, handover. | Approved |
| 13 | Resource-bounded 250-experiment batches, checkpointed, no fixed lifetime limit, retain all results and prevent duplicates. No repeated holdout tuning. | Approved |
| 14 | Predefine primary metric; 5% relative improvement target, plus accuracy, log loss, Brier, calibration, uncertainty, stability, market comparison, generalisation, simulated returns and drawdown. Threshold is research target, not established success. | Approved |
| 15 | Prioritise data gaps, diagnosed weaknesses, underperformance and unresolved scientific questions; protect independent validation resources. | Approved |
| 16 | Evidence-based drift monitoring, suspension and revalidation; avoid reaction to random short-term fluctuations. | Approved |
| 17 | Shared data intelligence: provenance, versioning, chronology, reconciliation, deduplication, backups, authorised source reuse, alternative verified research observations. | Approved |
| 18 | Knowledge library: IDs, original formulas, variants, hypothesis, sources, results, failures, relationships, validation status and review dates. | Approved |
| 19 | Preserve conflicting conclusions, investigate independently; unresolved material conflicts block advancement. | Approved |
| 20 | External scientific research: source, assumptions, limitations, negative findings; independently test imported hypotheses. | Approved |
| 21 | Local-first CPU/GPU research, bounded parallelism, checkpoint recovery, start/pause/resume/stop, optional cloud only with spend approval. | Approved |
| 22 | Supervisor isolates corrupt data, handles bounded retries, detects resource/operational failure, logs and stops critical failures; cannot override scientific findings. | Approved |
| 23 | Decision layer and virtual capital laboratory paper-only; realistic simulation limitations, no forced selections or actual bets. | Approved |
| 24 | No evidence, no approval: complete traceable experiment manifests and reproducible independent review. | Approved |
| 25 | Close design phase, audit existing implementation, reuse working components, then implement and test missing capabilities. | Approved |

## Source inspection and gaps

- [Scope decisions](alpha-hunt-scope-decision.md): records 1–3; portal is informational; connection, posterior and validation not implemented. Later decisions above supplement, not silently overwrite, that history.
- [Method selection](../paper-lab/method-selection.js): seven selectable existing entries, not seven independently validated predictors: Current 2.5, Experimental 3.0, Hybrid 3.1 football, Side-by-Side Compare, Historical Reliability, Bottleneck readiness and Racing Top Four. Alpha Hunt is separate. Preserve labels, colour identity and selection persistence.
- [Bottleneck evidence review](../research/bottleneck/README.md): football and Pro D2 retrospective investigations, no validated improvement inferred; different archive tiers overlap. The dated report's empty verified outcome feed and unmatched forecasts must be rechecked against current pinned data, not reported as fresh counts.
- [All-sports ledger](all-sports-coverage.md): football, racing, tennis, NFL, darts and Pro D2 partial/implemented paths; Rugby League schedule-only, basketball/cricket/golf discovery gaps. Preserve sport-specific settlement contracts.
- [Paper Lab](../paper-lab/README.md): existing experimental methods and paper workflows; not proof of reliable probabilities.
- Existing validation centre, ops control, collector workflows and research archives are reuse candidates; full runtime inventory, current counts, tests, dependency audit and local runtime feasibility remain unverified.

## Implementation gates and order

1. Pin repository and dataset revisions. Inventory existing scripts, tests, schemas, storage, workflows and rights; reconcile all source tiers and exact IDs. Record implemented/partial/missing/unverified with file and test evidence. Do not sum overlapping archives.
2. Consolidate shared provenance and immutable as-of evidence contracts, source receipts, validation partition ACLs and failure behavior. Verify no future information leaks and no cross-system writes.
3. Extend existing formula registry and experiment ledger, content-addressed manifests, failed runs and reproducibility; avoid creating a duplicate library.
4. Audit current prediction and diagnostic paths; preserve baselines and previously examined windows. Separate distinct sports and markets.
5. Implement approved Alpha Hunt interfaces with explicit uncertainty and missing-evidence behavior; distinguish genuine-edge and persistence estimands. Do not label a static page or synthetic simulation as validated.
6. Establish local controlled research execution and supervision with bounded resources, cancellation, recovery, deterministic run IDs and no silent failure; test interrupted runs and duplicate handling.
7. Integrate existing dashboards with truthful runtime status, evidence links and controls. No invented counts or deployment claims.
8. Run existing full regression, new unit/integration tests, chronology and independence tests, browser tests and local recovery checks. Report exact commands, commit, results, skipped tests and unresolved evidence. Review before merge and deployment.

## Open details and blockers

Canonical PEP feature specification (issue 4) and exact source ordering (issue 5) are not final approvals. Mathematical priors, evidence labels, statistical thresholds, data permissions, local hardware/runtime access and full source inventory remain unresolved. Approval of research architecture does not establish real-world predictive accuracy or financial return. Preserve all existing publication blocks.
