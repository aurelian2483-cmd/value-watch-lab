# Stage 14 — Candidate market-anchored EV and longshot exposure experiment

**Executed 14 November 2026.** Research branch only; hypothetical paper analysis of **previously examined** outcomes and **non-timestamp-verified** archived PS quotes. **No independent edge validated. Publication BLOCKED.** Workflow: https://github.com/aurelian2483-cmd/value-watch-lab/actions/runs/43647810346 (all jobs successful, **135 passing isolated tests**, archived replay executed).

## Mathematical rationale
Old research recent-form 1X2 probabilities are `p_model` (Poisson adjusted with alpha 0.025). Bookmaker PS opening odds converted to normalized implied `p_market,i = (1/O_i) / sum_j (1/O_j)`.

Candidate probability *market anchoring*:
`p_new,i = (1-w) p_market,i + w p_model,i`,
where `w` is the frozen research model weight from `[1,.75,.5,.25,.1,0]`. Experimental `w=.5` uses equal weights. Candidate selection rule `EV_i = p_new,i * O_i - 1 >= 0.05`, selecting maximal EV, maximum one 1X2 outcome per priced fixture. An optional *odds exposure cap* rejects alternatives exceeding 3, 5, or 10 decimal odds, not the entire fixture; a different qualifying 1X2 alternative may be selected. `null` means uncapped. This is an **experimental research candidate**, not a proven calibrated probability.

The one-source market anchor is not independent sharp-market validation; a different provider and verified quote times are required for forward testing. The original Stage 13 2023/24 **calibration log-loss optimum is w=0**, market-only, which cannot yield nominal positive EV on its own overround-normalized source odds. Do not choose w=.5 on this in-sample profit result as a predictive calibration finding.

## Historical paper betting outcomes, fixed rule
2024/25 + 2025/26 Premier League: 640 prediction-eligible fixtures, 470 complete PS archived opening triplets (320 + 150), 170 without usable price evidence. One hypothetical 1-unit bet on maximum EV >=5% or PASS. Every variant evaluated on exactly the **same 470 underlying priced fixtures**; number of placed hypothetical selections differs.

| Model share w | Maximum allowed decimal odds | Selections | Wins | Losses | Total quote-only profit | Quote-only ROI | Mean 1X2 LL |
|---:|---:|---:|---:|---:|---:|---:|---:|
| 1.00 (raw form) | None | 407 | 126 | 281 | **+3.39** | +0.83% | 1.012831 |
| 1.00 (raw form) | 5.00 | 312 | 118 | 194 | **+32.83** | +10.52% | 1.012831 |
| 0.50 | None | 318 | 89 | 229 | **+8.27** | +2.60% | 0.987410 |
| 0.50 | 5.00 | 220 | 79 | 141 | **+32.33** | +14.70% | 0.987410 |
| 0.25 | None | 204 | 52 | 152 | **+5.09** | +2.50% | 0.981765 |
| 0.25 | 5.00 | 109 | 40 | 69 | **+24.99** | +22.93% | 0.981765 |

These are retrospective *sensitivity* calculations on previously inspected outcomes. **DO NOT PRESENT ROI OR PROFIT AS REAL OR ACHIEVABLE**, and do not rank coefficients by this hindsight ROI; fewer selections inflate variance and can distort ROI.

### Mechanism: odds bands of the original recent-form hypothetical selections
- Decimal odds below 2: 41 bets, 29 wins, **+8.10** units.
- 2.00 to below 5: 234 bets, 81 wins, **+24.54** units.
- 5.00 to below 10: 114 bets, 15 wins, **−22.29** units.
- 10+: 18 bets, 1 win, **−6.96** units.

The original recent-form strategy's high odds (>=5) total **132 selections, 16 winners, -29.25 units**. This empirical pattern was noticed after repeatedly observing the same historical data; odds 5 is a **post-hoc discovered filter**, not an honest pre-declared profitable strategy.

### Season-specific control
| Variant | 2024/25 priced 320 | 2025/26 priced 150 |
|---|---:|---:|
| w=1, uncapped | +7.54 (275 bets) | −4.15 (132 bets) |
| w=1, cap 5 | +18.08 (202 bets) | +14.75 (110 bets) |
| w=.5, uncapped | +16.88 (216 bets) | −8.61 (102 bets) |
| w=.5, cap 5 | +23.04 (139 bets) | +9.29 (81 bets) |
| w=.25, uncapped | +9.84 (144 bets) | −4.75 (60 bets) |
| w=.25, cap 5 | +15.74 (71 bets) | +9.25 (38 bets) |

The stronger-looking outcome for odds-capped selections in both historical seasons is **NOT independent replication**; data were already used and the filter was chosen after viewing losses. Market anchor improves mean log loss in this reused sample, but the 2023/24 calibration optimum still prefers market-only; no independent incremental edge is established.

## Decision
1. Keep raw formula, w=.5 anchored, and capped w=1 and w=.5 as **separate, clearly labelled research candidates**, do not silently replace production probabilities.
2. **Freeze** a new prospective comparison against genuinely new, source-timestamped fixtures and actual independently verifiable **Sky Bet** 1X2 odds. Price-provider mismatch means historical quote-only P&L cannot validate profitability. Need timestamped comparator sharper market captured separately, if available.
3. Explicitly log PASS and excluded bets, by odds bin, actual selection, result, P&L, coverage, drawdown and paired date-cluster uncertainty. For any calibration, train and evaluate on chronologically separate data; do not use 2024/25 and 2025/26 again as a new holdout.
4. Investigate source odds anomalies and bookmaker margin / odds movement, especially huge apparent longshot EV; a lower losing-bet count by itself does not mean a reliable positive return.
5. Do not deploy or claim real winnings or qualifying positive EV.

**Code:** `research/match-intelligence/stage14-market-anchored-ev.cjs`
**Tests:** `tests/test_match_intelligence_stage14.cjs`
**Full executed JSON:** GitHub Actions run 43647810346, artifact `stage14-market-anchor-reused-history`.
