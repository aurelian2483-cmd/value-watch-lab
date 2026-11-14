# Stage 15 — Home / draw / away probability and selected-odds calibration audit

**Date:** 2026-11-14. **State:** EXECUTED, research-only, UNVALIDATED for wagering. Workflow: https://github.com/aurelian2483-cmd/value-watch-lab/actions/runs/43649407187 (**140 tests passed, zero failed**). Complete underlying JSON artifact: `stage15-outcome-odds-calibration`.

## Provenance / denominators
- Two reused historical EPL seasons, **640 prediction-eligible fixtures**. Only **470** had all three archived PS opening decimal odds; **170 unpriced** excluded from this audit (320 priced 2024/25, 150 priced 2025/26).
- Actual results used for settlements. Earlier-match-only predictive reconstruction; no authenticated archival receipt for prediction or odds quote availability before historical match kickoff.
- Distinguish **all-match event calibration** on 470 fixtures from **selected-outcome calibration** on strategy-selected bets. Both are informative, but only the latter diagnoses the 281 and 141 losing selections.
- Predicted wins in a group = sum of selected predicted probabilities; observed wins = count of won bets. Difference (observed minus expected) compares predictive calibration; paper net P/L uses 1-unit hypothetical stake at unverified PS opening odds.
- All results have been previously inspected in multiple research stages; not an independent holdout. The odds cap was discovered after examining historic losses.

## All 470 priced fixtures: home/draw/away event calibration
The two formula variants make the **same underlying match pool** but assign somewhat different event probabilities.

| Outcome | Actual results | Recent-form expected | 50% market-anchor expected |
|---|---:|---:|---:|
| Home | 202 | 199.665 | 204.447 |
| Draw | 113 | 109.696 | 109.991 |
| Away | 155 | 160.639 | 155.561 |
| Total | 470 | 470.000 | 469.999 (rounding) |

**Important:** Whole-fixture event totals are close even for raw recent form. This does not mean the particular bets chosen by maximum estimated EV are well calibrated. Selection amplifies optimistic errors.

## Among 407 selected raw recent-form bets (NO odds cap)
| Selected outcome | Bets | Predicted wins | Actual wins | Actual-minus-predicted | Net hypothetical P/L |
|---|---:|---:|---:|---:|---:|
| Home | 148 | 64.194 | 52 | −12.194 | −6.22 |
| Draw | 20 | 5.024 | 6 | +0.976 | +8.19 |
| Away | 239 | 85.646 | 68 | **−17.646** | +1.42 |
| **Total** | **407** | **154.864** | **126** | **−28.864** | **+3.39** |

The biggest selected-count optimism is away outcomes and home outcomes, while total all-fixture event probabilities were closer to actual aggregate frequencies. This is consistent with **winner's curse / maximizing noisy estimated EV**, but causal source not established.

## Original recent-form selections by archived odds
| Odds | Bets | Expected wins | Actual wins | Net hypothetical units |
|---|---:|---:|---:|---:|
| 1.01 to below 2.00 | 41 | 27.752 | 29 | +8.10 |
| 2.00 to below 3.00 | 98 | 48.548 | 39 | −1.34 |
| 3.00 to below 5.00 | 136 | 48.298 | 42 | +25.88 |
| 5.00 to below 10.00 | 114 | **27.860** | **15** | **−22.29** |
| 10.00+ | 18 | 2.404 | 1 | −6.96 |

The 5-to-below-10 selection band is notably overoptimistic (12.860 fewer winners than estimated). This odds-specific loss contributes heavily to the incentive for research on market disagreement and model calibration. Sample sizes for draws or odds >=10 are small; do not overinterpret.

## Among 220 selected 50%-market-anchored, capped-odds-5 bets
| Selected outcome | Bets | Predicted wins | Actual wins | Actual-minus-predicted | Net hypothetical units |
|---|---:|---:|---:|---:|---:|
| Home | 72 | 28.865 | 26 | −2.865 | +6.65 |
| Draw | 32 | 7.928 | 7 | −0.928 | −0.63 |
| Away | 116 | 43.857 | 46 | +2.143 | +26.31 |
| **Total** | **220** | **80.650** | **79** | **−1.650** | **+32.33** |

The strong all-selection aggregate fit hides opposing effects by category; the draw category was a slight hypothetical loss.

## Anchored + capped selection odds bands
| Odds | Selections | Expected wins | Actual wins | Net hypothetical units |
|---|---:|---:|---:|---:|
| Below 2.00 | 15 | 9.199 | 9 | +1.32 |
| 2.00 to below 3.00 | 68 | 30.636 | 28 | +2.25 |
| 3.00 to below 5.00 | 137 | 40.815 | 42 | +28.76 |
| **Total** | **220** | **80.650** | **79** | **+32.33** |

## Critical limitations and proposed next step
1. **Same archive odds used to anchor probabilities and calculate quoted EV**; source price cannot independently validate the model and can produce mechanically market-aligned calibration with no true bet advantage.
2. Price quotes are PS historical archive, **not independently verified Sky Bet** and no availability/booking receipt.
3. Unverified historical executable returns, repeated reuse of data, post-hoc odds cap, uneven season coverage (320 and 150 priced).
4. Marginal bin/sample estimates are **not reliable calibration coefficients**. Do not directly multiply future probabilities by a historical success ratio from sparse cells.
5. Recommended next controlled experiment: lock separately predicted 1X2 probabilities for existing raw model, recent-form capped version and market-anchored capped version on **same new future fixtures**; record verified odds+capture timestamps, all PASS decisions, and actual outcomes in an append-only ledger. On clean future sample compare class-specific and odds-band reliability, proper log loss/Brier, profit difference and paired uncertainty. Investigate conservative prior shrinkage of **estimated EV** independently from betting caps, but do not auto-promote coefficients.

**NO PRODUCTION DEPLOYMENT. NO VERIFIED PROFIT. PUBLICATION BLOCKED.**

**Code:** `research/match-intelligence/stage15-outcome-odds-calibration.cjs`
**Tests:** `tests/test_match_intelligence_stage15.cjs`
**CI:** https://github.com/aurelian2483-cmd/value-watch-lab/actions/runs/43649407187
