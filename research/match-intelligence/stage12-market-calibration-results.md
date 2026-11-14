# Stage 12 — Poisson vs Form vs Historical Bookmaker Market

**Date:** 2026-11-14. **Source:** Pinned EPL community mirror `skthewimp/football@9a0fa04365f4266d95f5cbb119ec6fc64f5e773c`, archived CSVs `epl_results_2024_25.csv` and `epl_results_2025_26.csv`. Research-only. **Unvalidated** and **publication BLOCKED**.

## Design and safeguards
- Same-season, earlier-date-only Poisson reconstruction, five pseudo-match league prior; alpha `0.025` for the recent-five-game raw form term locked from Stage 2 (no tuning in Stage 12).
- Data: 640 eligible 1X2 historical outcomes (320+320).
- Historical PSH/PSD/PSA and PSCH/PSCD/PSCA archived odds; each quoted triplet transformed into normalized implied probabilities: `p_i=(1/o_i)/sum_j(1/o_j)`. Raw bookmaker overround is recorded separately.
- Only **470/640** matches had complete valid archived opening AND closing odds. All four probability models are compared on exactly those 470 matches in the paired score table.
- **Archived odds provenance and decision-time availability are unverified.** PS quotes must not be claimed attainable at forecast time or sourced from Sky Bet.
- 2024/25–2025/26 outcomes have already been used in earlier model research and are not untouched holdout evidence.

## Fair paired model comparison (470 fixtures, lower is better)

| Model | Mean log loss | Mean Brier | Top choice accuracy |
|---|---:|---:|---:|
| Poisson | 1.015608539 | 0.608624560 | 51.06% |
| Poisson + recent form | 1.012831126 | 0.606799495 | 50.43% |
| Archived PS bookmaker open implied (de-vigged) | **0.980710726** | **0.586386949** | 53.83% |
| Archived PS bookmaker close implied (de-vigged) | **0.976885355** | **0.583098898** | 54.47% |

Full 640 eligible match comparison (different coverage):
- Poisson LL 1.033322915, Brier 0.620930216.
- Recent form LL 1.032152229, Brier 0.620273305.
- On some metrics recent form improves tiny amounts but top-choice accuracy can be lower. Predictive probability scoring, not raw hit rate, is the appropriate objective.

## Date-clustered paired uncertainty, 2,000 resamples
Difference means first model minus second; negative favours first:
- Form minus baseline, n=640: mean **-0.001170686**, approximate 95% interval **[-0.005079461,+0.002617402]**. Includes zero; cannot establish robust gain.
- Form minus PS archived open, n=470: mean **+0.032120400**, approximate 95% interval **[+0.007579564,+0.059160285]**. Bookmaker snapshot probabilities perform better on this retrospective sample.
- Archived PS open minus close, n=470: mean **+0.003825371**, interval **[-0.002748414,+0.010261070]**. Includes zero.
- These intervals do not correct for previous exploration on reused seasons, provider inconsistencies or selective quote coverage.

## Quote-only pseudo paper experiment — NOT achievable trading results

Fixed hindsight-quotation illustration: for each fixture where PSH/PSD/PSA triplet exists, calculate model fair probabilities, choose at most one 1X2 outcome with maximum estimated `EV=p*o-1\ge 0.05`, and assume a single unit stake at the archived PS quote. No market limits, actual account acceptance, provider-specific rules, transactional timestamps or execution receipts exist.

| Model | Hypothetical selections | Winners | Assumed units profit | Quote-only ROI | Peak-to-trough drawdown units |
|---|---:|---:|---:|---:|---:|
| Poisson | 409 | 116 | -13.29 | -3.25% | 42.14 |
| Recent form | 407 | 126 | +3.39 | +0.83% | 31.55 |

These are **different selection sets** and are NOT a controlled paired betting-profit experiment. +0.83% on unverifiable historical quoted prices is small and does NOT establish a positive edge. The result cannot be presented as real bets, achievable ROI or proof of profitability. Archived prices are from PS market columns, not independently verified Sky Bet prices.

### Decisions
1. **Do not deploy** new selection rules or promote estimated value signals. Alpha=0.025 recent form remains a research challenger only.
2. The archive market benchmark is materially stronger on the same 470 fixtures; this suggests starting with market-based calibration and investigating the source/coverage gap, not further tuning blindly.
3. Any later betting backtest requires source timestamps, genuine execution-price receipts, pre-match forecasts, proper rules and a fresh unseen time window. Separate baseline, market and model comparisons on the exact same priced/eligible fixtures.
4. Preserve Stage 11's unfinished player work, but **pause player research** per user decision.
5. No live Value Watch website changes, no actual wagering, and no forecast publication.

**Evidence:** GitHub Actions https://github.com/aurelian2483-cmd/value-watch-lab/actions/runs/43642003348 — **103/103 isolated tests passed**; historical integration replay with archived market quotes also executed. Source `research/match-intelligence/stage12-market-calibration.cjs`, regression tests `tests/test_match_intelligence_stage12.cjs`.
