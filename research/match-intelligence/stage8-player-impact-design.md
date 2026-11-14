# Stage 8 — Player Impact Modelling: identification and readiness

**Status: partial implementation, research only, unvalidated, live publishing BLOCKED.**

## What is implemented
- `player-impact-preflight.js`: immutable retrospective lineup round links to explicit fixture IDs, club, competition, season and verified official fixture-mapping URL; checks date-stamped source claims against pre-kickoff cutoff, duplicate fixture IDs, player evidence IDs, round conflicts, missing linkage and unavailable timestamps.
- `tests/test_match_intelligence_stage8.cjs`: six regression tests for missing mapping, unknown prematch player status, later announcements, valid date guards, duplicate IDs and identity mismatch.
- Regardless of inputs, the preflight reports `player_impact_coefficients: null`, `model_training_executed: false`, `probability_adjustment: null`. This is intentional: **the data is not ready to estimate honest pre-match player effects.**

## Why player association is not player impact
- Better players start more frequently in important matches, and coaches select lineups based on opponent, fitness, schedule and tactics. A simple win-rate difference with/without a player is **selection-biased**, not a causal estimate.
- Retrospective realized XI becomes known only around matchday and must not enter a model predicting a historic pre-match cutoff unless independent dated lineup announcements establish knowledge by then.
- Round number does not uniquely identify a fixture across postponed/rescheduled matches; match ID, season, opponent and date must be independently verified.
- Absence classifications are not interchangeable: injured, suspended, bench, tactical omission, transfer and unclassified absence mean different things.
- Individual player's contribution is highly correlated with teammates and manager effects; only controlled/regularized models with adequate coverage should estimate weights.
- Sources and data-use rights need review before use in production.

## Proposed mathematical design (not yet fitted)
For fixture `m` with pre-match snapshot time `t`, let `P_0(m)` be the unaltered Poisson 1X2 baseline. Define prior-only team strength and squad indicators from valid reports available before `t`, with:
- `a_{p,m,t}`: player expected-availability feature from an explicitly archived pre-cutoff status; missing is **unknown**, never assumed zero.
- `u_{p,t}`: shrunk historical player effect estimated on training data preceding `t`.
- `q_{m,t}`: opponent quality, manager, venue, rest and current-form controls.

An **experimental** attacking and defensive perturbation could use
`log(lambda_H_new) = log(lambda_H_base) + sum_p u_attack[p,t] a[p,m,t] - opponent_defence_adjustment`
and similarly for the away side. Coefficients require regularisation, interaction terms and uncertainty estimation; the exact parameterisation must be locked *before* touching fresh holdout data.

Minimum acceptance gates:
1. Distinct fixture ID/date/opponent and data ownership/rights verified.
2. Historical source content, player IDs, matchday statuses and kickoff time independently verified.
3. Every feature demonstrates its first-known timestamp at/before the model snapshot cutoff.
4. Calibration and model-selection only on historical training; future matches remain untouched.
5. Compare with baseline using log loss, Brier, calibration, confidence intervals and source-coverage/selection bias tests; avoid discovering and then reusing the same holdout.
6. No forecast promotion without better prospective evidence and independently defensible betting-market probability benchmarks.

## Dataset state
Previous source archive `withqwerty/availability-data@5c6286c24dd58b3c9a6b4f5ccbd0c6e6466cb7dd`:
- Chelsea and Arsenal 2024/25 retrospective files structurally had 38 rounds each with 11 starters in each round.
- These are **not** an authenticated pre-match availability dataset and do **not** give complete dates or opponent fixture mappings.
- Neither zero player impact nor nonzero player impact has been statistically established.

No production deployment, confirmed probability gain, profitable edge, or completed player-impact training has occurred.
