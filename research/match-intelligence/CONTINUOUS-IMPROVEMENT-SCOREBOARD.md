# VALUE WATCH — CONTINUOUS FOOTBALL RESEARCH SCOREBOARD

Updated 2026-11-14. **Research only. No live publication, validated EV or verified betting profitability.**

## Mandatory reporting contract for EVERY subsequent stage

Each new research stage MUST update this ledger in the same commit or follow-up commit, with:
1. Stage, change introduced, hypothesis, branch SHA, code paths, execution run URL and test status.
2. Historical sample seasons, number of eligible fixtures, priced fixture coverage, source pin and pre-kickoff availability evidence.
3. Same-fixture baseline and challenger mean 1X2 **log loss**, **Brier** and accuracy; challenger-minus-baseline `delta LL` / `delta Brier`; percentage change when useful.
4. Paired date-clustered interval for loss differences; untouched holdout or reused diagnostic disclosure.
5. Decision-time bookmaker source, provider-specific rules, quoted timestamp, odds validity and bookmaker-implied market benchmark when available.
6. Paper-only selections, stake basis, estimated EV distribution, realized returns, ROI, max drawdown, no-price count and missing coverage **only if receipts exist**; never substitute hypothetical archived quote returns for certified betting ROI.
7. Explicit verdict **IMPROVED / WORSE / EQUAL / UNTESTED**, including model selected weight and any rejection; no improvement claim based solely on tests passing, simulation or code volume.
8. Retain failed variants and provenance. No artificial stage promotion. Production gate BLOCKED pending independent validation.

For missing evidence write `NOT MEASURED`; never invent an outcome.

## 1. Commensurable 640-fixture historical Poisson studies

2024/25 and 2025/26: **640 eligible matches** (320 each), reused previously inspected historical group. Research reconstruction is **not confirmed identical to live production selector**.

| Stage/variant | Base LL | Candidate LL | Delta LL (candidate − base) | Base Brier | Candidate Brier | Delta Brier | Verdict |
|---|---:|---:|---:|---:|---:|---:|---|
| 1: Venue-Poisson | 1.0333229150 | 1.0333229150 | 0 | 0.6209302156 | 0.6209302156 | 0 | Reference |
| 2A: Recent 5-game raw form, alpha .025 | 1.0333229150 | 1.0321522290 | -0.0011706860 | 0.6209302156 | 0.6202733052 | -0.0006569104 | Small exploratory gain |
| 2B: Opponent-adjusted form, alpha .05 | 1.0333229150 | 1.0329844120 | -0.0003385030 | 0.6209302156 | 0.6209573156 | +0.0000271000 | Mixed: LL better vs base, Brier worse; worse than 2A |
| 3: Opponent-defence normalized scoring | 1.0333229150 | 1.0333229150 | 0 | 0.6209302156 | 0.6209302156 | 0 | Calibration chose gamma=0; no change |

Stage 12 paired date-clustered form minus baseline LL mean -0.001170686, 95% exploratory interval **[-0.005079461,+0.002617402]**: includes zero; no robust advantage established.

## 2. Player and lineup stage results — different fixture coverage

| Stage | Hypothesis / change | Evaluation set | Base LL | Candidate LL | Delta LL | Status |
|---|---|---|---:|---:|---:|---|
| 4–6 | Time-aware team/squad information evidence schemas/catalogues | No pre-match probability evaluation | — | — | — | UNTESTED |
| 7 | Chelsea & Arsenal historical retrospective XI importer | 38+38 archival fixture records, not forecasts | — | — | — | DATA INTEGRITY, not performance |
| 8 | Source/cutoff preflight gates | No probability backtest | — | — | — | SAFETY, not performance |
| 8B | Dynamic signed player impact scenario formula | Hypothetical scenario | — | — | — | UNCALIBRATED |
| 8C | Synthetic known-player-effect recovery | 3x 1,400 synthetic test cases | — | — | — | Mathematical consistency, not real betting performance |
| 8D | 38+38 independent dated fixture/XI joins | Real data, structural audit only | — | — | — | DATA INTEGRITY |
| 8E | Previous-two-XI stability, alpha -0.1 | 320 matches 2024/25 | 1.0150126723 | 1.0177752805 | **+0.0027626082** | WORSE |
| 9 | Signed player relevance evidence filter | Not backtested | — | — | — | SAFETY, not performance |
| 10 | Prior player/team goal residual, selected alpha 0 | 290 matches 2024/25 | 1.0154131664 | 1.0154131664 | **0** | EQUAL; reject nonzero effect |
| 11 | Teammate-adjusted ridge proxy | Research paused at user request | — | — | — | NOT PROMOTED; no confirmed final score |

Stage 8E diagnostic Brier 0.6088065406 baseline vs 0.6110161099 challenger (worse +0.0022095693). Stage 10 diagnostic Brier 0.6093268123 in both columns because selected alpha=0. These results are on **different, partly overlapping evaluation subsets** and are not a cumulative progression series.

## 3. Proper 470-fixture market comparison — Stage 12

Complete archived PS 1X2 opening+closing quotes in 470 of 640 scored fixtures, 2024/25–2025/26. The other 170 are omitted. Prices NOT independently verified at forecast decision time; NOT Sky Bet.

| Model | Mean LL | Mean Brier | Top prediction accuracy |
|---|---:|---:|---:|
| Poisson | 1.015608539 | 0.608624560 | 51.06% |
| Recent form | 1.012831126 | 0.606799495 | 50.43% |
| De-vig archived PS market open | **0.980710726** | **0.586386949** | 53.83% |
| De-vig archived PS market close | **0.976885355** | **0.583098898** | 54.47% |

Form minus market open LL +0.032120400; approximate 95% date-cluster interval [+0.007579564,+0.059160285]: market stronger in reused retrospective diagnostic.

### Unverified historical quote-only sensitivity (NOT executable returns)
Assumption: one selection max per fixture, one unit stake, maximal nominal model EV >=5% at recorded PS `opening` odds, no verified quote-time availability.
- Poisson: 409 selections, 116 winners, -13.29 theoretical units, -3.25% quote-only ROI, 42.14 max drawdown units.
- Recent form: 407 selections, 126 winners, +3.39 theoretical units, +0.83% quote-only ROI, 31.55 max drawdown units.
These are DIFFERENT selections and NOT proof that betting strategy performance improved. Achievable historical ROI: **NOT MEASURED**.

## 4. Stage 13 market/model blend

Training on 314 eligible quoted 2023/24 fixtures, frozen weights on recent-form `[0, .10, .25, .50, .75, 1]`. Mean LL respectively `[0.924342158,0.926619793,0.931359385,0.942581013,0.957927737,0.977769131]`; **market-only weight 0 selected**.

Later 470 quoted 2024/25–2025/26 fixtures: market and selected blend LL **0.980710726** (delta 0). Form alone 1.012831126. No model incremental gain demonstrated.

## 5. Current champion (RESEARCH, NOT deployment)
- In Poisson-only within-season research, raw 5-game form alpha=.025 is the least-worse challenger with a small **unproven** edge over Poisson.
- On mutually priced fixtures, historical margin-adjusted PS market probabilities are the stronger benchmark.
- Adding the Poisson/form challenger to the market did not improve calibration; do not conflate accuracy gains with betting value.
- Every stage must compare against the **best existing benchmark on exactly the same fixtures**, not automatically just the oldest Poisson score.
- New/unseen prospective collection, verified odds/receipt provenance and future outcomes are necessary before any independent betting performance claim.

## Source reports
- `stage2-opponent-form-results.md`
- `stage3-opponent-defence-results.md`
- `stage8c-player-impact-falsification-results.md`
- `stage8de-real-lineup-outcome-results.md`
- `stage10-real-player-residual-results.md`
- `stage12-market-calibration-results.md`
- `stage13-market-blend-results.md`

**Never label a mere test pass, source-join success or simulation gain as improved football forecast log loss.**
