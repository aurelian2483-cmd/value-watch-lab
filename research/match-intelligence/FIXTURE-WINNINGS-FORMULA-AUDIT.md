# Historical paper-winnings formula audit — old versus recent form

**Executed 2026-11-14.** GitHub Actions: https://github.com/aurelian2483-cmd/value-watch-lab/actions/runs/43647130251 . Research only; NO live deployment, no certified Sky Bet pricing, and no independently confirmed executable historical wagers.

## Fixed rule, real historical match outcomes
- 640 Premier League historical matches across 2024/25 and 2025/26.
- **470** had a complete archived bookmaker PS opening 1X2 quote; **170** had no qualifying archived price triplet.
- Same fixtures, same prices and 1-unit stake per model, at most one selection per match.
- Bet only on the model's largest estimated positive EV if `p * decimal_odds - 1 >= 0.05`. Otherwise `PASS`.
- Reconstruct old Poisson and fixed recent-form alpha=0.025 probabilities from earlier match results (not pre-event archived independent records).
- Stake 1 unit = hypothetical £1. Win P&L = odds - 1; loss = -1; PASS = 0.

| Statistic | Old Poisson | Recent form |
|---|---:|---:|
| Priced underlying fixtures | 470 | 470 |
| Selected bets | 409 | 407 |
| Wins | 116 | 126 |
| Losses | 293 | 281 |
| Total stake (units) | 409 | 407 |
| Hypothetical net profit (units) | **−13.29** | **+3.39** |
| Quote-only ROI | −3.25% | +0.83% |
| Max cumulative drawdown (units) | 42.14 | 31.55 |

**Headline:** Recent-form formula improved the *historical hypothetical profit* by **+16.68 units**, but no genuine executable improvement is proven.

### Selection churn — all 640 fixtures
- Same outcome selected by both: 376
- Different outcome selected: 8
- Old selected / recent form passed: 25
- Recent form selected / old passed: 23
- Both passed: 208 (includes 170 fixtures lacking valid archived prices)

### By season
| Season | Eligible | Priced | Old profit | New profit | Improvement |
|---|---:|---:|---:|---:|---:|
| 2024/25 | 320 | 320 | −9.90 | +7.54 | **+17.44** |
| 2025/26 | 320 | 150 | −3.39 | −4.15 | **−0.76** |
| **Total** | **640** | **470** | **−13.29** | **+3.39** | **+16.68** |

The gain is concentrated in 2024/25; the next historical season has fewer priced fixtures and the new model **lost** 0.76 units relative to old. Price coverage differs substantially and may bias evaluation.

### Uncertainty
Date-cluster bootstrap on 470 matched priced fixtures and 135 fixture dates, 4,000 resamples: observed profit gain **+16.68 units**; exploratory 95% interval for estimated comparable-total difference approximately **[−5.45, +40.26] units**. The interval contains zero; no dependable improvement established. Repeated reuse and retrospective selection are additional limitations not corrected by this interval.

### Concrete match-by-match entries
- Arsenal 3–1 Southampton, 2024-10-05: old AWAY 19.13 −£1, new AWAY 19.13 −£1.
- Brentford 5–3 Wolves, 2024-10-05: old HOME 2.14 +£1.14, new HOME 2.14 +£1.14.
- Crystal Palace 0–1 Liverpool, 2024-10-05: old DRAW 4.71 −£1, new PASS £0, improvement £1.
- Everton 0–0 Newcastle, 2024-10-05: old HOME 3.18 −£1, new PASS £0, improvement £1.
- Leicester 1–0 Bournemouth, 2024-10-05: both HOME 3.35 +£2.35.

### Reasons no profitable system has been established
1. The PS quote archive has **unverified first-known/decision-time availability**; the values are **not verified Sky Bet**.
2. This is a mathematical sensitivity calculation on old games, **not historical live orders or an independently recorded paper betting ledger**.
3. The selected models and historical seasons have been inspected during prior stages; no untouched future evaluation.
4. **5% EV estimates are not evidence of 5% true advantage**; the model frequently picked longshot outcomes with very large apparent EV, which could signal miscalibration or provider/data comparability problems. Must audit these rather than infer value.
5. With +0.83% hypothetical ROI and a confidence interval including a nonpositive relative return, the result does not support production deployment.

**Conclusion:** On archived data, recent-form formula improves the observed hypothetical total by 16.68 units. **Robust improved winning performance: UNPROVEN.** Further work should freeze both models and pricing capture in the existing prospective pipeline and compare genuinely verified predictions against actual outcomes. No formula change justified yet.

Source `research/match-intelligence/fixture-winnings-audit.cjs`, tests `tests/test_fixture_winnings_audit.cjs`, full per-fixture JSON artifact `fixture-winnings-audit-all` from CI run 43647130251. Automated research tests in prior run 43647069304: **128 passed / 0 failed**.
