# Sky / Value Watch — Universal Mathematical Research Centre
**Master design record — agreed discussion, 20 November 2026**  
**Status:** DESIGN APPROVED IN PRINCIPLE; IMPLEMENTATION PARTIAL; RESEARCH ONLY. This document is not a deployment approval.

## 0. Mandatory catalogue completion gate — user decision 20 Nov 2026

**Do not progress to the next Mathematical Research Centre development phase until the shared library contains at least 1,000 properly registered catalogue entries.** Current audited baseline when this decision was made: **16** entries in isolated research PR #112 (one implemented research baseline and fifteen IDEA records), hence **984 additional qualified entries required**. This is a blocking **catalogue-readiness** milestone, NOT a claim of 1,000 implemented, independently validated or sport-effective models.

Catalogue quality gate: every entry must have unique ID, actual reproducible mathematical definition or algorithm specification, classification (distinct method vs parameter variant/ensemble/diagnostic), stated purpose, sport suitability, required inputs, assumptions/limits, provenance/source or clearly declared original proposal, validation status and duplicate/family linkage. Formula variants count toward total registered *entries* but must be reported separately from distinct algorithms. Reject fake padding, synonyms and undocumented names.

**Phase progression:** catalogue intake and verification may continue; no broad 500-candidate tournament, holdout evaluation, website Compare integration, deployment or activation simply because the count reaches 1,000. Formal readiness requires the size gate plus schema validation, citation/provenance review, and a breakdown of independently defined methods vs variants and implementation/test coverage. User review is required before unlocking the next phase. Existing isolated QA/debugging may continue to safeguard previously written research, but is not promotion of the new laboratory.

## 1. Goal and design principles
Create a *universal, expandable* catalogue of mathematical methods and evidence for football, horse racing, tennis, NFL, darts and rugby, with the ability to adapt sound ideas from mathematics, physics, engineering, history, forecasting and other sports.

**Analyse the sport and event first, then retrieve appropriate mathematics.** A large catalogue is useful for coverage and discovery; it does not mean applying all methods to every event. Neither 30 nor 81 nor 500 is a permanent cap. A catalogue of 1,000+ registered methods and configurations is an *initial aspirational target*, not a claim that they exist or have been implemented. Distinguish original methods, variations, hyperparameter configurations, feature engineering, diagnostics and combinations; deduplicate rather than inflate counts.

Each entry should record stable ID, mathematical definition/reference, purpose, sport suitability, required inputs and licence, compatible methods, computational cost, code/version, provenance, tests, experiment evidence, failure modes and status (IDEA / SPECIFIED / IMPLEMENTED / TESTED / VALIDATED / REJECTED / RETIRED). Cross-sport transfer always requires validation in the target sport.

## 2. Shared architecture
1. **Universal Formula Library:** one versioned catalogue, searchable by mathematical role, input requirements, supported sport and evidence.
2. **Sport-specific problem analyser/selector:** identify the event's characteristics and available *pre-event* evidence; choose only relevant, compatible, previously tested candidates under explicit rules. Missing data means abstain or fall back, not invented inputs.
3. **Combination Engine:** compare individual methods and compatible ensembles/adjustments; use reproducible configuration IDs and recorded inclusion/exclusion criteria. Do not exhaustively enumerate every possible combination.
4. **Lab bottleneck controls:** within the combination/experiment workflow, check duplicates, data integrity, leakage, time/compute budget, sample sufficiency, instability, multiple-testing/selection bias and overfitting. Preserve interesting unsuccessful experiments.
5. **Historical Experiment and Evaluation:** same-event log loss as a primary football probability metric, multiclass Brier, calibration, accuracy, uncertainty, stability across time and transparent failure analysis. Use chronological evaluation and require meaningful improvement, not just the highest backtest score.
6. **Scientific Knowledge Library and Reporting:** versioned experiment ledger; sources, hypotheses, data hashes, model code revisions, outputs, findings, failures and why decisions were made. Report both success and negative results.
7. **Candidate freeze and independent validation:** finalists are frozen *before* reserved or prospective evaluation. Do not use holdout feedback for another tuning cycle without assigning a new genuinely untouched set.

These components form an architecture proposal, not running autonomous infrastructure.

## 3. Five initial specialist research roles
- **Mathematics and Statistics:** derive/check probability methods, assumptions and uncertainty.
- **Physics and Complex Systems:** investigate dynamics, regime shifts, change detection and cross-domain applicability.
- **Forecasting and Prediction:** calibration, ensembles, chronological evaluation and model selection.
- **Sports and Market Research:** sport-specific causal/contextual features, market mathematics and source quality; bookmaker data subject to legal and timestamp restrictions.
- **Historical Research and Methods:** identify prior research, forgotten methods, original citations, replicability and negative findings.

Specialists are **assigned research responsibilities/workflows**, not verified independently running people or agents. Coordinate proposals through a shared evidence queue. Research and testing may be automated in bounded, reversible steps only after implementation and verification; no automatic promotion or betting.

## 4. First proof of concept: Premier League
- Source: pinned CC0 OpenFootball football.json commit `e6744429ee395bc86f247348c6184bb08d4eb361`; no new login/payment needed for this dataset.
- Recorded 2024–25 completed fixtures: 380, of which **320** eligible for the reconstructed research model.
- Recorded 2025–26 completed fixtures in the pinned archive: 353, of which **288** eligible. Total model-eligible: **608**.
- Reconstructed Poisson V1 is **not** the recovered original Sky production model; the earlier historical report's `1.01981` log loss remains unreplicated.
- Development: 320 eligible 2024–25 fixtures. Intended later retrospective validation: 288 eligible 2025–26 fixtures. Strict previous-calendar-date feature cutoffs, no outcome leakage.
- WARNING: an early experimental V0 script was written to score the 2025–26 set automatically after fitting on 2024–25. Before any *new* broad lab model-selection tournament, audit whether that V0 was actually executed/inspected; treat any already-viewed 2025–26 scores as exposed and obtain a new untouched test window for strong confirmatory claims. The term 'reserved' refers to design intent, **not a guarantee of pristine unseen data**.
- Formula starting families: football score/rate models; team-strength and ratings; time weighting and change-point detection; Bayesian/statistical; compatible combinations and calibration; cross-sport/physics/engineering methods. Expand when ideas are supported by real definitions and usable inputs.
- A staged elimination or screening funnel (suggested `500 → 250 → 125 → 75 → 30 → 10 → 3`) is an **optional design concept**, not a fixed execution mandate. Do not force quotas, rank repeatedly on the same fixtures or treat 500 as methods needed per match. Actual number of executed experiments depends on sample size, diversity, available compute and predeclared statistical safeguards.

## 5. Website integration — approved interface concept
- Preserve every existing Sky prediction-method dropdown option and its behaviour.
- Add **Compare** beside the method dropdown, after research evidence and explicit release approval.
- On a match card, display the active **Standard/selected method** and the **Bottleneck Lab** experimental method side-by-side: home/draw/away probabilities, percentage-point differences, event IDs, model versions, prediction/capture times and freshness.
- Display bookmaker odds **separately** from model probabilities, never silently alter odds or imply odds are Sky's forecasts. Provide a concise observation cue and optional saved observation for investigation.
- The website should consume versioned precomputed, approved results, **not** run the enormous mathematical experiment library in the browser.
- Pre-event shadow comparison on upcoming fixtures (initially a proposed ~two-week observation window) precedes any approved live model integration; that window alone might be insufficient evidence.
- **Live/in-play odds reaction and last-minute event recalculation are explicitly postponed.** No automatic bets, wagers, or unverified edge/ROI claims.

## 6. Engineering separation and capacity
- **GitHub repository:** source code, indexed catalogue metadata, reviews, issues, reproducible configurations and modest versioned summary reports.
- **Execution:** bounded GitHub Actions for small/medium research jobs; benchmark CPU, memory, duration, concurrency and usage on real workloads before asserting capacity. Use dedicated/controlled compute if larger experiments exceed safe runner budgets.
- **Results:** store immutable/traceable run outputs and only aggregate/public-safe website artefacts; evaluate structured external storage if datasets/outcomes become too large for repo JSON. Keep licensed/secret inputs outside public Git.
- **Frontend:** display vetted, timestamped prediction results with sensible error/empty states and preserved existing behaviour.
- Ensure data rights, event-time availability, source hashes, review gates, reproducible tests and no silent deployment.

Existing evidence: `research/LEAGUE_COMPARISON_2026-11-14.md`, issue [#111](https://github.com/aurelian2483-cmd/value-watch-lab/issues/111), and isolated research PR [#112](https://github.com/aurelian2483-cmd/value-watch-lab/pull/112). The latter contains replay and preliminary bottleneck code, **not** a validated universal lab. Dedicated baseline CI previously passed, while later broader QA/regression failed; investigate failures separately. No master-plan claim should imply they were fixed.

## 7. Staged execution and release gates
1. **Preserve the design** (this document) and audit current branch/tests; keep live systems unchanged.
2. **Establish the catalogue schema** and populate a real, quality-controlled starter inventory; do not generate fake entries to hit a quota.
3. **Implement the five bounded specialist workflows** as proposal/review/test roles with source evidence and explicit handoffs.
4. **Benchmark research execution** and add controlled matching, compatibility and anti-overfitting safeguards.
5. **Football research first:** validate V0 test execution, repair relevant CI failures, design an independently valid validation split, and measure genuine gains over exactly matched baseline records.
6. **Add further sport adapters** incrementally, reusing verified shared methods and independently evaluating each sport.
7. **Shadow-test upcoming matches** with immutable pre-event model receipts and subsequent independently verified outcomes.
8. **Implement and review the website Compare UI** on an isolated branch; deploy only after regression tests, data provenance and explicit approval. Live odds are out of current scope.

**Status and authority:** This file records agreed direction and recommendations, not verified implementation of the complete system. No paid subscriptions, credentials, live model promotion, production deployment or wagering actions are authorized by it.
