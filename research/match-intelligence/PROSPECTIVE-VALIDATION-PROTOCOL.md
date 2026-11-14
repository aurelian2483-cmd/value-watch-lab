# Value Watch — Prospective Football Model Validation Laboratory

**Prepared 2026-11-14.** This is a new **forward-looking research protocol**. No future outcomes have been observed or scored in this lab. Historical experiment Stage 1–13 scores are *context only* and do not count as prospective evidence.

## Frozen hypotheses and competing models
- H0: adding the pre-registered five-match recent-form adjustment to the same-season home/away Poisson baseline gives **no reduction** in 1X2 mean log loss on previously unseen matches.
- H1: the fixed alpha=0.025 raw-form challenger reduces log loss relative to the identical-fixture Poisson baseline.
- The archived market benchmark from previous stages was more accurate; market comparison is secondary and is restricted to independently evidenced, pre-cutoff complete 1X2 quotes.

**Locked configuration:** `VW-FOOTBALL-PROSPECTIVE-2026-11-14`. Model `poisson-form-alpha-0.025-v1`, form matches 5, three prior matches minimum, five pseudo-match league prior in existing baseline, 1X2 Poisson goal range 0–11, 0.025 form coefficient. No new player features, blend weight, odds rules or parameter tuning.

## Prospective evidence and data protocol
1. **Pre-match** record fixture ID, teams, kickoff timestamp, historical results with each past result's observed/known timestamp, model prediction timestamp, model input snapshot, and both probability vectors.
2. Reject results known after the forecast cutoff and all same-calendar-day fixture results to match the earlier-only historical rules.
3. Save the machine-generated prediction **before kickoff in independently verifiable GitHub commit history or signed append-only external receipt**. The local JSON's user-supplied created-at field and SHA-256 detect accidental changes but **DO NOT independently prove publication time or prevent deliberate re-hashing**.
4. If a bookmaker quote is available, attach its named provider, three 1X2 prices, receipt ID/URL, provider timestamp, capture timestamp and settlement rule. Metadata alone does **not** prove the quote genuine or that it could be accepted at that price. The code always marks execution unverified, and publication BLOCKED.
5. **After** the match, add actual full-time result as a *separate* settlement record with verifiable result URI and observation timestamp; never edit the pre-match prediction. Store a source-revision audit trail.
6. Show every eligible fixture and each PASS: insufficient history, missing quote, unresolved identity, invalid timing, conflict or unsupported settlement. Do not cherry-pick.
7. Independently verify both historical and prospective data rights, completeness, fixture identities and sources before scientific or production claims.

The CLI is included:
```sh
node research/match-intelligence/prospective-lab-cli.cjs freeze fixture-and-history.json
node research/match-intelligence/prospective-lab-cli.cjs score frozen-predictions-and-results.json
```
The JSON must contain actual externally acquired evidence. The CLI **does not** independently fetch fixtures, collect bookmaker prices, schedule itself or record bets. No fabricated test data can count toward a prospective result.

## Primary and secondary outcomes
For the **same matched fixtures**, calculate:
- Primary: mean 1X2 log-loss difference `form−baseline` (negative favours recent form).
- Secondary: multiclass Brier difference, categorical accuracy and high-confidence calibration bins.
- On genuinely pre-cutoff verified quoted fixtures: separately compare both against *de-vigged market probabilities*. Record total missing priced fixtures and coverage.
- Future: date-clustered paired uncertainty intervals after sufficient results, repeated by calendar blocks and teams; avoid claiming statistical confirmation if intervals include zero. Report every time; do not optimize weights after looking at prospective outcomes.
- Paper bet ROI, drawdown, closing-line comparisons and EV remain **NOT VERIFIED** unless original source timestamps, full market rules and price receipts have been independently validated. A favourable predicted EV alone cannot establish profitability.

## Evaluation milestones (not a betting quota)
- 0 scored genuine prospective fixtures: **NOT MEASURED**.
- First 50: early data-quality and calibration diagnostics **only**.
- First 200: exploratory matched prediction comparisons and intervals; still do not call a profitable edge.
- 500+: evaluate whether the locked, originally preregistered hypothesis appears stable across time and competitions; this sample size is an observation milestone, not a predetermined statistical-power guarantee.
- Any trustworthy inference requires effective sample size, time/dependence, missingness, repeated looks and uncertainty analysis; even 500 outcomes may be insufficient.
- Any strategy/probability changes require a **new experiment ID and new prospective collection window**, never overwrite or relabel earlier forecasts.

## Current measurable state
| Measure | Current value |
|---|---|
| Real verified prospective pre-kickoff forecasts entered | **0 (not yet collected)** |
| Independently confirmed pre-cutoff market receipts | **0 (not yet collected)** |
| Settled new prospective fixtures | **0** |
| Prospective mean log-loss/Brier deltas | **NOT MEASURED** |
| Prospective paper ROI / validated betting edge | **NOT MEASURED** |
| Live Value Watch changes | **NONE** |
| Betting publication gate | **BLOCKED** |

## Next integration work
Wire an authorized, attributable future-fixture provider and independent timestamp-verified pricing receipts to the CLI; establish immutable publication evidence and strict event-by-event outcome reconciliation. Test capture before accepting any predictions as genuinely prospective.

**Important:** Source archives for 2023/24–2025/26 were already examined and must **never** be substituted for independent new unseen prospective evidence.

## Software
- `research/match-intelligence/prospective-validation-lab.cjs`
- `research/match-intelligence/prospective-lab-cli.cjs`
- `tests/test_match_intelligence_prospective_lab.cjs`
- `research/match-intelligence/CONTINUOUS-IMPROVEMENT-SCOREBOARD.md`

The software can correctly process prepared fixtures and settlement data in tests; **this does not prove its model forecast advantage or live betting value**.
