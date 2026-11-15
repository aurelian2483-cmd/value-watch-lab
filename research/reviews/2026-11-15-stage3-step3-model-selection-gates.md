# Value Watch — Stage 3 Step 3: Evidence-gated model selection (2026-11-15)

Status: **DOCUMENTED / RESEARCH ONLY / UNVALIDATED / PUBLICATION BLOCKED**. This file is a decision framework and newly recovered evidence index, **not** an implemented adaptive selector or approval to change wagers.

## New source-backed evidence from isolated horse V3 branch

### H-V3-1 — Single-race fixed ablation
Original [V3_FIRST_FIXED_ABLATION_RESULT](https://github.com/aurelian2483-cmd/value-watch-lab/blob/research/horse-v3-isolated/research/horse-v3/V3_FIRST_FIXED_ABLATION_RESULT.md).
Historical Wolverhampton 2025-11-03 race 887765, five finishers; seven prior runs recovered in a separate overlay:
- M1 original frozen V1: log loss 1.6854944516; Brier 0.8309271403.
- M2 +0.15 distance: log loss 1.6975984597; Brier 0.8359250090.
- M3 +0.15 surface: log loss 1.6927837353; Brier 0.8339626591.
- M4 +0.15 distance and +0.15 surface: log loss 1.7050080663; Brier 0.8390192510.
- All winner ranks 4 and top-four overlap 3/4.
**Decision:** All three added context variants lost to V1 on *this one after-event race*. Do not generalise or tune on this outcome. Not a prospective test; CI regression execution for the ablation module was not confirmed by the report.

### H-MKT-1 — Executed V1 vs observed-market descriptive benchmark
Original [MARKET_BENCHMARK_V1_FIRST_EXECUTED](https://github.com/aurelian2483-cmd/value-watch-lab/blob/research/horse-v3-isolated/research/horse-v3/MARKET_BENCHMARK_V1_FIRST_EXECUTED_2026-11-15.md). GitHub Actions run [43705889738](https://github.com/aurelian2483-cmd/value-watch-lab/actions/runs/43705889738), branch commit f43e26e523b95371014f6107183e66fa8a7dd0d1, reported 12/12 unit tests passed, workflow artifact ID 14157804601.
- 66 frozen historical V1 forecasts; 49 provisionally settled; 1,997 publisher-observed Sky Bet market captures.
- 32 races with acceptable same-field price observations *at or before model freeze*. 17 with no qualifying price at that cutoff; 43 invalid market observations encountered (not 43 distinct races, may overlap exclusions).
- Paired proportional margin removal: V1 mean log loss 2.3487 vs market 2.1498; V1 minus market +0.198936; Brier difference +0.024483. V1 better log loss on 11/32.
- Power margin removal: V1 minus market mean log-loss +0.202164 and Brier +0.021461.
- Zero frozen paired V3 forecasts. NO V3 market score demonstrated.
- These quotes were not executable-verified, not BSP, and outcomes were publisher-provisional. No demonstrated positive EV, CLV, ROI, or independent untouched validation.
**Decision:** Preserve V1 as model reference and the observed de-vigged market as a descriptive benchmark only. Do not deploy market blend without matching timestamps, pricing/rights and independent test.

## Eligibility gates for any future adaptive model selector

A model must pass ALL gates before being considered for ranking, and a separate, stricter release decision is required to affect betting selections:

1. **Identity/provenance:** exact immutable source code hash, model parameter hash, event/runner IDs, applicable sport/race type, data collector and input time.
2. **Pre-event availability:** features and full-field inputs genuinely available before event, with timestamps, nonrunner/fixture reconciliation, no final-only fields.
3. **Fair test:** same eligible events and settlement conditions for comparator pair; chronological tune/test split; no tuning on test labels.
4. **Probability quality:** log loss and Brier vs simple baseline and market (only with trustworthy matched data); calibration, uncertainty, coverage and abstentions. Do not select by hit rate alone.
5. **Model stability:** meaningful sample size, checks by league/race type and period, no uncontrolled multiple comparisons or selecting winners of repeated retests.
6. **Financial evidence (separate):** market-accurate odds, commission/fees, executable verification and settlement rules; positive EV cannot be inferred from scoring improvement or favourite hit rate.
7. **Operational boundary:** pass regression/reproducibility and independent review, then explicit approved promotion; until then outputs remain shadow/paper only. Existing UNVALIDATED/BLOCKED gates unchanged.

## Proposed shadow selector (not coded)

- Football baseline: current frozen production reference; research candidates include recent-form Poisson and reliability-filter research, each with separate provenance. Abstain when exact comparable independent evidence missing.
- Horse racing baseline: original V1 for historical form reference; V3 fixed context and 10-factor challenger remain *unpromoted*. Do not choose the 10-factor challenger based on training metrics; it lost on the 26-race later retrospective test.
- Score candidate models on predeclared unseen matched event sets; never switch a formula per horse/match using outcome-aware retrospective model choice.
- If no model clears all gates, return `RESEARCH_ONLY_NO_PROMOTION`, not a fabricated 'best value' candidate.
- Do not automatically average two model probabilities; first prove calibration and defensible evidence for weights. A bookmaker-based probability blend is not independent of the bookmaker market.

## Recovered source inventory / unresolved experiments

| Item | Status | Next evidence requirement |
| --- | --- | --- |
| 26-race 10-factor horse pilot | SOURCE-BACKED RETROSPECTIVE | Preserve unchanged; prospective independent comparison |
| 34-race, 12-setting context search | CONVERSATION-REPORTED | Recover exact grid, race IDs, result files and chronology |
| V3 single-race ablation | SOURCE-BACKED RETROSPECTIVE | More predeclared matched, timestamped races |
| 32-race V1 vs observed market | SOURCE-BACKED EXECUTED CI | Inspect preserved proportional/power artifact and audit mappings |
| 3749-match football screen, 279 selections | CONVERSATION-REPORTED | Match dataset+code+timestamp/ROI ledger |
| 3208-fixture league diagnostic | SOURCE-BACKED RETROSPECTIVE | Same-event candidate vs benchmark comparison |
| 640-match Poisson/form holdout | CONVERSATION-REPORTED | Recover source run and immutable holdout dataset |
| 220-selection 50/50 study | CONVERSATION-REPORTED | Recover odds/time and unique-event IDs |
| V6 shrinkage | PROPOSED | Separate implementation and untouched validation |

## Constraints and next action
1. Retrieve run 43705889738 artifact `horse-market-benchmark-descriptive-only` (ID 14157804601), inspect exact 32 race identities, report hashes and margin methods.
2. Recover original football and horse grid experiment artifacts from branch/workflow history or uploaded exports. Distinguish results actually tested from those cited only in conversation.
3. Consider implementing a **read-only** model selection eligibility report after artifact recovery, not a live adaptive picker.
4. No model coefficients, collector behavior, website UI, production workflows, or paper selections were changed in this documentation step.
