# Stage 10 — Player-Associated Goal Residual Diagnostic (Real Outcomes)

**Run date:** 2026-11-14. **Research-only; player-specific prediction UNVALIDATED; publication BLOCKED.**

## Intended question
Can an individually indexed player's **previously observed** attacking goal residual relative to a pre-match Poisson baseline add useful out-of-sample forecasting information? This is not a test of causal player impact or of current-future lineup availability.

## Inputs
- Premier League `2023-24` and `2024-25` 380-fixture schedules and results from `openfootball/football.json@e6744429ee395bc86f247348c6184bb08d4eb361`.
- 40 team-season archived lineup files from `withqwerty/availability-data@5c6286c24dd58b3c9a6b4f5ccbd0c6e6466cb7dd`.
- Existing rolling current-season home/away Poisson baseline (`scripts/match_intelligence_backtest.cjs`).
- All current-match XIs are used **only after** that fixture is complete. No same-day results/lineups can influence any forecast that calendar day.
- **Caveat:** retrospective archived lineup histories are not independently certified as they existed at historical forecast cutoffs. Only previously completed matches are used as features. Data rights and source correctness need external verification.

## Method — first associative signal
For each *completed earlier* eligible fixture, compute each team's bounded log goal residual:
`r = clamp(log((observed_goals+0.5)/(pre_match_Poisson_lambda+0.5)), -1, 1)`.
Each player in that earlier starting XI inherits the team's residual for that match. For player p with n prior appearances, calculate
`u_p = clamp((mean(r | p_started)-mean(r | team)) * n/(n+20), -0.35, +0.35)`.
At a later fixture, the signal is the mean `u_p` of the **last completed match XI**, *not the current actual XI*. Home-minus-away signals enter opposite-signed log-Poisson goal means with an experimental alpha.

This is highly confounded association, because players share game-level team outcomes and playing opportunity is nonrandom. There are not independent per-player observed causal outcomes. Each club uses its own player IDs, and baseline team mean subtraction guards against a constant team advantage being counted as a player effect.

## Fixed coefficient grid and actual results
Coefficients `alpha = [0, 0.15, 0.30, 0.60, 1]`, fixed in code.
2023/24 calibration **n=282**:

| alpha | baseline mean LL | challenger mean LL | challenger mean Brier |
|---|---:|---:|---:|
| 0 | 0.9761438083 | 0.9761438083 | 0.5786361144 |
| 0.15 | 0.9761438083 | 0.9764911682 | 0.5788773827 |
| 0.30 | 0.9761438083 | 0.9768497521 | 0.5791267420 |
| 0.60 | 0.9761438083 | 0.9776006205 | 0.5796497292 |
| 1.00 | 0.9761438083 | 0.9786717640 | 0.5803973502 |

Selected alpha **0** (the original baseline). 2024/25 later historical diagnostic **n=290**: baseline and selected challenger have identical mean LL **1.0154131664**, mean Brier **0.6093268123**. This is expected for an alpha-zero challenger and is **not** evidence of an individual player effect.

The later 2024/25 outcomes had been used in earlier experiments; they are **NOT** an untouched holdout, and cannot demonstrate independent prediction gains.

### Execution evidence
- GitHub Actions: https://github.com/aurelian2483-cmd/value-watch-lab/actions/runs/43637267071
- **85/85 automated regression tests passed, 0 failed.** Replayed full real historical archives through Stage 10 as an extra job step in the Stage 8E historical data replay workflow.
- Source: `research/match-intelligence/stage10-player-residuals.cjs`; tests: `tests/test_match_intelligence_stage10.cjs`.
- End-to-end output artifact: `stage10-player-residual-diagnostic`.

## Interpretation
**Reject this naive player-residual feature for production.** It did not improve calibration, and a zero-alpha model cannot offer new value estimates or betting ROI.

This null result does NOT prove players are unimportant. Team-game outcomes are weak, confounded labels for identifying individual player contribution; reference-minutes, fatigue, defensive contributions, opponent matchups, lineup forecasts, replacement quality and manager changes remain unmodeled.

The promising next line is verified pre-match availability and probability-of-start/expected-minutes combined with regularised, position-aware attack/defence features. Before another historical backtest, obtain legitimate, documented timestamped source evidence, freeze the selection and training splits, and select a *new, unexamined* season/competition or prospective time window. Avoid exposing repeatedly reused 2024/25 and 2025/26 matches as untouched holdouts.

No live Value Watch football engine, betting slip, market price or user-facing odds were modified.
