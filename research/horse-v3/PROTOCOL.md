# Horse Racing V3 — Isolated Research Protocol

Status: PLANNED / NOT EXECUTED. Research only. UNVALIDATED; publication BLOCKED. This document does not authorize bets, website promotion, changes to collectors, or live forecasts.

## Frozen references
- Original baseline: `FORM_PERCENTILE_SOFTMAX_RESEARCH_V1` implemented in `scripts/horse_model_pipeline.py`.
- Failed historical pilot: `AW_CONDITIONAL_LOGIT_PILOT_V1`, `research/horse-challenger/model-v1.json`, `research/horse-challenger/features-v1.json`, and `research/horse-challenger/README.md`.
- Pilot's 26-race retrospective test (16–31 October 2026): log loss 2.438146 challenger, 2.346384 form baseline, 2.351176 uniform. Multiclass Brier 0.925900, 0.903849, and 0.903153 respectively. Do not reuse this test as evidence of a new model's independent validation.
- The previously discussed 34-race distance/going/temperature exploration is preliminary/in-sample and must not be presented as prospective validation.
- No historical scores, frozen forecasts, or parameter files are to be modified.

## V3 objective
Find out whether a simpler horse-racing model improves *out-of-sample* calibrated race-level win probabilities versus original form V1 and uniform probabilities. An improvement claim requires lower proper scores on new, completely untouched future-period data, uncertainty estimates, robust coverage, and an audit of pre-race information availability. A better hit rate alone is insufficient.

## First checkpoint: baseline reproducibility
1. Run `python scripts/reproduce_horse_challenger.py` with recorded Python, numpy and scipy versions.
2. Require integrity hash and numerical agreement with the frozen pilot; log environment, exact commit SHA, command, stdout, exit status and differences.
3. If reproduction fails, stop model development, investigate source of mismatch, and preserve originals.

## Expanded data specification
- Extend to several hundred eligible historical GB/Ireland races if auditable source records and licensing permit; do not declare a sample size achieved before collection.
- Specify discipline and surface in advance; compare like-for-like race samples. Keep all-weather-flat pilot separate from turf or jumps until independently designed evaluations exist.
- Capture race ID, UTC start, course, discipline, going, distance, class, field, horse IDs, prior runs, rating/weight availability, nonrunner decisions, observation timestamps and source receipts. For pre-race forecasts, do not use outcomes, post-event corrections, final-only fields or unavailable later history as inputs.
- Publish a race-by-race inclusion/exclusion ledger, duplicates, missingness, source first-availability limitations and integrity fingerprints. Never fill missing fields with invented values.

## Predeclared model comparisons
- M0: full-field uniform chance.
- M1: preserved original form V1.
- M2: V1 + distance-only signal.
- M3: V1 + going/surface-only signal.
- M4: V1 + distance + going with an optional interaction, only if training/validation support it.
- M5: limited class/course/rating/weight extensions **only after** individual ablations establish added value.
All V3 candidates need their own immutable parameters and model IDs; do not label them validated or deploy them.

## Chronology and evaluation
- Predeclare the chronological train, tune and untouched test dates *before* inspecting test labels. Exclude the previous 26-race pilot test from any claim of fresh untouched validation.
- Fit imputation/normalization/calibration and hyperparameters using training/tuning only. One model decision must be frozen before opening the new test set.
- Score identical eligible races and full runner fields with race-level log loss (primary) and multiclass Brier (secondary); report uniform and V1 comparisons, calibration bins, top-rank and top-three hit rates as descriptive diagnostics, stratified race conditions, coverage and abstention.
- Calculate paired race-level score differences, intervals and sensitivity across dates/tracks; account for within-day dependence. Do not infer profitability from win accuracy, CLV or market movement.
- A failure to beat V1 is reported plainly and retained; no retuning on the same test data while calling it untouched.

## Release boundary
V3 stays on this isolated branch until reproducibility, dataset provenance, independent chronological scoring, regression tests and manual review are demonstrated. No main merge, website update, paper-slip selection or live betting qualification is approved by this protocol. Market value research separately requires price timestamps, overround and executable odds evidence.

## Audit ledger
| Checkpoint | Status | Evidence |
|---|---|---|
| Branch isolation | DONE | `research/horse-v3-isolated` |
| Frozen benchmark identified | DONE | Existing V1 and challenger files; unchanged |
| Reproduction executed | NOT RUN | No execution result claimed |
| Expanded data collected | NOT STARTED | No new eligible race count claimed |
| V3 training | NOT STARTED | No fitted coefficients |
| Untouched evaluation | NOT STARTED | No score or win-rate claim |
| Publication | BLOCKED | Research only |
