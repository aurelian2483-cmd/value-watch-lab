# Stage 8C — First Attempt to Falsify/Verify Player-Impact Estimation

**Date:** 2026-11-14. **Status:** controlled synthetic proof-of-concept only. No real-world player-importance effect has been validated. Publication BLOCKED.

## What was executed
- Research implementation: `research/match-intelligence/player-impact-falsification.js`
- Automated checks: `tests/test_match_intelligence_falsification.cjs`
- GitHub Actions run: https://github.com/aurelian2483-cmd/value-watch-lab/actions/runs/43633368264
- **58 unit/regression tests passed (0 failed)** across Stage 1–8C. Pinned archive integration tests from Stage 7 and older Stage 3 diagnostic replay also passed.
- Controlled Poisson data generator with a deterministic pseudorandom seed. Two independent signed binary feature values are *hypothetical player-effect indicators*, not named real players. Training on first 2,600 synthetic matches and scoring on later 1,400 synthetic matches, without showing the holdout to the fitter.
- Fit ridge-regularised signed log-goal influence with Poisson likelihood. Comparison measures normalized 1X2 log loss and Brier score; fitted coefficients are allowed to be zero or negative.
- Coefficients are estimated from training data rather than manually supplied to the estimator.

## Results — three separate deterministic synthetic scenarios

| Generating coefficients | Fitted coefficients | Baseline holdout log loss | Candidate holdout log loss | Log-loss change |
|---|---|---:|---:|---:|
| +0.27, -0.19 | +0.2641, -0.1774 | 1.044853 | 0.937128 | -0.107725 |
| 0, 0 | +0.0098, +0.0196 | 1.044846 | 1.044232 | -0.000614 |
| -0.25, +0.15 | -0.2470, +0.1569 | 1.049863 | 0.989290 | -0.060572 |

The null case **still produced a tiny apparent holdout improvement through random noise**, so a seemingly improved score does not prove any real effect. Multiple independent replicates and uncertainty testing are needed.

Positive and reversed synthetic cases recovered the sign and approximate size of the planted effects. This demonstrates estimator behavior under controlled assumptions, **not** predictive success with actual football lineups.

## Critical limitations

1. **These are simulated outcomes from the same simplified Poisson model family used for estimation**. The match between generator and estimator is artificially favorable, so the large gains cannot be transferred to football.
2. Pseudo-player feature values were explicitly available before the simulated match, unlike actual historical last-minute lineup reports.
3. There are no verified club/player fixture joins in the real retrospective archive, nor reliably timestamped pre-cutoff features and independently sourced status histories sufficient to train the user’s actual dynamic form/matchup/expected-minutes model.
4. The experimental fitter estimates only a **two-dimensional symmetric log-goal adjustment**, not the full Stage 8B player-specific attack/defence/minutes/form/matchup/reliability scenario model.
5. No real-world holdout test, external baseline improvement, betting EV validation, bookmaker odds or deployment has occurred.
6. Later seasons from the prior Premier League analyses have already been reused, so use a genuinely untouched source/competition/date segment for eventual predictive evaluation.

## Decision
**Confirmed:** the implementation can mathematically recover planted signed effects and test a zero-effect control while keeping a held-out simulated sample.

**Not confirmed:** whether actual player availability has incremental predictive value once team strength, recent form, manager, opponent and match conditions are controlled.

**Next scientific step:** source independently verified fixture IDs, kickoff times, identities, prior-only injury/availability and predicted starting minutes; predefine training and holdout partitions before inspecting real outcomes; fit regularized effects; report confidence intervals and PASS when improvement is not defensible.

Research branch only, no modifications to live Value Watch football predictions.
