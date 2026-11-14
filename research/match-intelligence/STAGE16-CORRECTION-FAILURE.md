# Stage 16 — Chronological selected-outcome optimism correction: REJECTED

**Executed 14 November 2026** on research branch. GitHub Actions https://github.com/aurelian2483-cmd/value-watch-lab/actions/runs/43649985562 — 145 unit/regression tests passed, 0 failed; historical script and full JSON artifact `stage16-chronological-ev-correction` ran successfully.

**Goal:** Fix the Stage 15 observation that *chosen bets*, even where the full 1X2 probability vector is roughly calibrated in aggregate, systematically overestimate their actual win frequency. Avoid directly fitting to the reused 2024/25 and 2025/26 outcomes.

**Method:** Train outcome-specific selected-bet bias on the earlier 2023/24 EPL season (**314** priced source fixtures) by outcome H/D/A:
`bias_i = max(0, sum_selected_predicted_i - sum_selected_won_i) / (n_selected_i + 30)`.
Then correct **EV selection** without changing the normalized 1X2 probability forecast:
`EV*_i = max(0, p_i - bias_i) * archived_odds_i - 1`.
Select the largest corrected EV >= 0.05 with optional odds cap 5.0. Fixed model shares 0.5/1 and cap 5/no cap tested as clearly separate candidates.

**Reasoning:** A 30-observation pseudocount shrinks overfit from small training buckets, but the value of 30 and form of the correction have not been independently optimized or validated; *not* a standard error estimate or credible confidence bound. No future data used to train the coefficients, but design itself was inspired by the already seen later datasets, so later historical results are **NOT an untouched independent holdout**.

## Closest comparator: Stage14 50% market blend + odds cap 5
2023/24 learned adjustments after shrinkage: **HOME −0.0690**, **DRAW −0.0503**, **AWAY −0.1057** probability points (i.e., subtract probability 0.069 / 0.0503 / 0.1057, not percent of original p). Counts: 69 selected home, 8 selected draw, 55 selected away.

| Metric | Existing 50%-market + cap 5 | New training-derived EV correction |
|---|---:|---:|
| Same underlying priced fixtures | 470 | 470 |
| Bets | 220 | **19** |
| Wins | 79 | 7 |
| Losses | 141 | 12 |
| Pass | 250 | 451 |
| Paper profit (units) | **+32.33** | +4.37 |
| Quote-only ROI | +14.70% | +23.00% |
| 2024/25 bets / profit | 139 / +23.04 | 5 / +1.81 |
| 2025/26 bets / profit | 81 / +9.29 | 14 / +2.56 |

**Interpretation:** 201 fewer selections; relative to existing, loses 72 winning opportunities and removes 129 losses. Higher retrospective ROI is a small denominator effect, not a validated profitable signal or superior expected yield. **Reject** as an acceptable model improvement/replacement.

## Negative-control: anchor 50%, NO odds cap
| Metric | Existing | EV corrected |
|---|---:|---:|
| Bets | 318 | 71 |
| Wins | 89 | 13 |
| Losses | 229 | 58 |
| Total hypothetical profit | **+8.27** | **−16.22** |
| ROI | +2.60% | **−22.85%** |

The uncapped correction produces a strongly negative empirical paper result. This is important falsification evidence: blindly subtracting empirically measured selected probability optimism does not solve the objective.

## Decision and next mathematical target
**REJECT Stage 16 EV bias correction as tested; keep Stage14/15 control variants unchanged. No production change, no live tips.** Do not tune cap/prior/bias coefficients against the same 2024–26 outcomes to produce a prettier retrospective result.

Next: investigate whether selection optimism arises from market odds misalignment, fixture strength, home/away subgroup shifts or structural model forecasting error. Use true prospective, timestamped predictions and verified source-specific bookmaker odds; evaluate base-rate calibration using strictly earlier observations and fit uncertainty using training-only residuals. A candidate needs enough selections, meaningful market-beating out-of-sample log loss and paired profit evidence under independently timestamped quotes.

**No independently confirmed Sky Bet quote times or achievable historical bets. UNVALIDATED. Publication BLOCKED.**
