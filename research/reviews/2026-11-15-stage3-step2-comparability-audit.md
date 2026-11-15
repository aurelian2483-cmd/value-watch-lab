# Stage 3 / Step 2 — Formula comparability and artifact recovery
Date: 2026-11-15
Status: documentary audit; no evaluation run in this session; no production changes.

## Key finding: a source-backed five-league football replay exists on a research branch
Original document: [research/LEAGUE_COMPARISON_2026-11-14.md](https://github.com/aurelian2483-cmd/value-watch-lab/blob/research/league-comparison-20261114/research/LEAGUE_COMPARISON_2026-11-14.md).
Source branch: `research/league-comparison-20261114` (not assumed merged to main).

The paper records 3,208 scored, eligible historical fixtures in five leagues across 2024/25 and 2025/26. Incomplete source coverage prevents interpreting this as the totality of these leagues' fixtures.

| League | Eligible fixtures | Top-1 accuracy | Multiclass 1X2 log loss |
| --- | ---: | ---: | ---: |
| Serie A | 581 | 55.42% | 0.98662 |
| La Liga | 603 | 49.75% | 1.00045 |
| Premier League | 608 | 50.33% | 1.01981 |
| Bundesliga | 486 | 48.77% | 1.03693 |
| Championship | 930 | 46.45% | 1.04919 |
| **Total** | **3208** | not reported as aggregate | not reported as aggregate |

Model: same-season goal-rate Poisson, prior shrinkage of five pseudo-matches, recent five-match goal-difference adjustment with frozen alpha=0.025. Every match on a date uses only earlier match dates. The report pins openfootball/football.json commit `e6744429ee395bc86f247348c6184bb08d4eb361`. It does not include bookmaker prices or a market benchmark and is a results-only replay, not timestamp-attested forecasts.

**Comparability:** the *same model* is compared across five league subsets; this is NOT a paired test of different formulas. No conclusion that any league offers profitable wagers. The reported 141 prior EPL losses are a different sample.

## Football five-form reliability branch: source-code recovery
Source: [reliability-lab/challenger.js](https://github.com/aurelian2483-cmd/value-watch-lab/blob/research/historical-reliability-challenger/reliability-lab/challenger.js).

Research-only five-result pattern:
- home qualifies as favourite pattern if home wins >=4 of last 5 AND away wins <=1 of last 5;
- away qualifies symmetrically.
- Smoothed form proxy: raw outcomes `[home_wins + 5-away_wins-away_draws +2, home_draws+away_draws+2, 5-home_wins-home_draws +away_wins +2]`, divide by sum.
- Bookmaker proxy: 1X2 implied odds `1/decimal`, divided by overround.
- Legacy benchmark: 50/50 blend of form and de-vigged market probabilities; challenger uses form-only probabilities.
- Price gate: decimal <=5.0 and `p*decimal-1 >= 0.05`. Challenger must target the identified favourite-pattern side.
- The script itself states the form input is a smoothed five-result proxy, not canonical frozen team form.

**Missing:** this script does not itself demonstrate the claimed 3749 / 279 / 175 test census. That numerical report remains conversation-recovered (C), pending matching immutable dataset/run artifact. A five-result toy model must not be confused with the separate historical 3,749-match research until experiment identity is proven.

## Horse racing experimental V3 code recovered
Source: [v3-research/live-compare-core.js](https://github.com/aurelian2483-cmd/value-watch-lab/blob/research/horse-v3-isolated/v3-research/live-compare-core.js).

Fixed research settings: lookback 730 days, min 3/max 6 form runs, 90-day half-life, neutral prior 5, inverse softmax temperature 2, matched-distance window 20%, fixed distance/surface context coefficient 0.15 each.
V3 exponent (per horse): `2 * (form + 0.15*distance_context + 0.15*surface_context)`; divide exponentials by race total.
This is a *separate fixed V3 pilot*, not the conversation-reported 12-grid 'distance=1, going=2, temperature=4' experiment. V3 output expressly calls weights experimental and not calibrated probabilities. The code checks active field, freshness and all-weather eligibility, and compares against frozen V1 when matching data exists.

## Direct comparable horse-racing test confirmed on main
Source: [horse challenger pilot report](../horse-challenger/README.md) and [trained model](../horse-challenger/model-v1.json).
Same 26 target races, preserved result scores:
- 10-feature challenger log loss 2.438146; Brier 0.925900
- original form log loss 2.346384; Brier 0.903849
- uniform log loss 2.351176; Brier 0.903153
**Decision:** no challenger promotion. The original baseline had lower log loss and Brier than challenger; uniform Brier was slightly below form Brier. Retrospective card provenance, not prospective.
The 34-race context search was a different dataset and cannot be compared numerically to this 26-race holdout as if paired.

## Comparison eligibility matrix

| Pair | Same events and rules? | What can be said now? |
| --- | --- | --- |
| Horse 10-factor vs original form | Yes, same 26 retrospectively reconstructed fields | Challenger worse on both logged metrics |
| Horse 10-factor vs uniform | Yes, same 26 fields | Challenger worse on both logged metrics |
| Horse 34-race context settings | Reported same 34 races; exact configuration grid not recovered | Reported in-sample log-loss difference only; needs run artifacts |
| Horse V3 fixed vs 34-race grid | No demonstrated matching event list or shared coefficient definitions | No valid cross-test improvement claim |
| Football league-replay vs league-replay | Same model, *different league events* | League-diagnostic scores only; not paired formula selection |
| Football 3749 reliability vs 3208 five-league replay | Different reported experiment definitions/data | Cannot compare 62.7% with unfiltered top-1 accuracy as model uplift |
| Football 640-holdout Poisson vs recent form | Conversation reports paired holdout but code/data run receipt missing | Small reported improvement, awaiting source matching |
| Football 50/50 form-market vs unblended form | Some experiments reported; exact source price/time and event identities missing | Do not claim positive EV |

## Follow-up artifact retrieval (without repeating completed tests)
1. Identify original data and code hashes for 3,749-match screening, 2,280/640-holdout experiment, 34-race 12-configuration grid and 220-selection 50/50 test.
2. Inspect branch histories/workflow artifacts when available, preserving run dates and arguments.
3. Validate event identity, time-before-outcome, coverage, market source, denominator, scoring definition and selected samples. Do not replace retrospective data with current revised data.
4. Document conflicts without modifying original artifacts.
5. Keep `UNVALIDATED`, `BLOCKED`, paper-only behaviour and no-live-model-change rules.

**Audit limits:** This Step 2 document identifies and compares existing recorded results and source implementations; no code test or fresh backtest was executed here.
