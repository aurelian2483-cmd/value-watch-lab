# Stage 2 — Opponent-adjusted form research (2026-11-14)

**Experiment status:** EXPLORATORY / UNVALIDATED / publication BLOCKED.

## Provenance
- Six EPL CSVs from `https://github.com/skthewimp/football/tree/main/data/raw`: `epl_results_2020_21.csv` through `epl_results_2025_26.csv`. This is an external community mirror; its original source attribution, completeness, rights and timestamps require separate verification before any production adoption.
- Each file contained 380 match records (2,280 source rows total).
- This experiment was **executed in a read-only JavaScript research session** using those six files. The new committed `scripts/match_intelligence_backtest.cjs` reproduces the same algorithm, but the committed script's own CLI run and regression tests are **not yet independently verified on GitHub Actions**.
- Calibration seasons: 2020/21, 2021/22, 2022/23.
  - **Correction:** Actual code uses **four seasons**, 2020/21 to **2023/24**, not three.
- Later holdout: 2024/25 and 2025/26.

## Test design
- Same-season rolling **Poisson venue-goal baseline** with league-average shrinkage by five pseudo-matches, 0..11 goal enumeration; no prior-season carryover.
- Same-day fixtures are evaluated before adding results from that date. Only earlier dated matches determine both team and opponent state.
- Form: preceding **five matches** per team (all venues), requiring at least three; performance signal based on goal difference.
- Opponent strength available at each historic kickoff: previous points per match, with 8 prior pseudo-matches at 1.35 PPG. Never derive it from a final season table.
- The experimental opponent-adjusted goal difference is `GD_adjusted = GD + 0.5*(opponent_prematch_PPG - 1.35)`. This is a **research hypothesis**, not an estimated true causal effect.
- Challenger changes home and away Poisson means in opposite directions: `lambdaH' = clamp(lambdaH*exp(alpha*(formH-formA)))`, `lambdaA'=clamp(lambdaA*exp(-alpha*(formH-formA)))`.
- Candidate `alpha`: 0, 0.025, 0.05, 0.10, 0.15, 0.20. Raw and opponent-adjusted forms independently selected by minimum calibration log loss. No coefficient selection on holdout.

## Numerical results

| Group | Eligible | Baseline log loss | Raw form selected | Opponent-adjusted selected |
|---|---:|---:|---:|---:|
| 2020/21–2023/24 calibration | 1,272 | 0.9993164271 | 0.9967722439 (alpha 0.025) | 0.9967876893 (alpha 0.05) |
| 2024/25–2025/26 holdout | 640 | 1.0333229150 | **1.0321522290** | 1.0329844120 |

Holdout Brier: baseline **0.6209302156**, raw form **0.6202733052**, opponent-adjusted form **0.6209573156**.

Per-holdout-season log loss:

| Season | Baseline | Raw form | Opponent-adjusted |
|---|---:|---:|---:|
| 2024/25 (n=320) | 1.0150126723 | 1.0146738845 | 1.0165995407 |
| 2025/26 (n=320) | 1.0516331578 | 1.0496305734 | 1.0493692834 |

**Finding:** The calibrated raw-form adjustment delivered a small improvement over baseline on this holdout, but this first opponent-strength-adjusted form version delivered a **worse log loss than raw form** and a marginally worse Brier score than baseline.

## Decisions and limitations
1. **Do not deploy** the 0.05 adjusted-form weight; do not claim opponent adjustment was validated. No bookmaker value or profitable betting edge established.
2. The candidate used points-per-match as a rough opponent proxy and a manually proposed 0.5 scaling; results must not be treated as proof opponent quality is irrelevant.
3. The baseline is a **research reconstruction** of the current-season venue-Poisson scheme, **not** the exact historical prior-season-first production selection logic.
4. Data coverage, independent fixture/source verification, predictive calibration, confidence intervals, competition transferability, missing-player context, and live cutoff receipts have not been certified.
5. The 2024/25 and 2025/26 holdout was examined during this experiment. **Further formula changes must use fresh later or separate data** for honest evaluation.
6. Next candidate: opponent-adjusted attack and defence using source-timestamped goal/xG expectations; register the transformation and fit it on earlier seasons only before checking an unused league/season.

Re-run with six legally obtained, verified local historical CSVs:
```sh
node scripts/match_intelligence_backtest.cjs data/raw/epl_results_2020_21.csv data/raw/epl_results_2021_22.csv data/raw/epl_results_2022_23.csv data/raw/epl_results_2023_24.csv data/raw/epl_results_2024_25.csv data/raw/epl_results_2025_26.csv
```
