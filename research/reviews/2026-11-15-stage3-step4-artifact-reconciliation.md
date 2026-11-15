# Stage 3 / Step 4 — original experiment artifact reconciliation
Date: 2026-11-15
Status: **research-only documentary and numerical audit; no model or production changes**.

## Scope and evidence levels
- **A: inspected original run artifact** — original GitHub Actions ZIP downloaded, contents inspected, aggregate statistics independently recomputed from preserved per-race rows; source collector inputs have not themselves been independently re-executed.
- **B: branch-backed source report** — original research-branch report and model/code are accessible; underlying historical input/replay has not been independently re-executed in this review.
- **C: conversation-reported only** — reported figures exist in [recovery ledger](2026-11-15-mathematical-experiment-recovery.md), but the corresponding immutable run receipt/dataset has not been identified.
- Do not promote B or C to A based on their being mentioned in summaries.

## HR-MKT-01: Frozen V1 vs observed-market benchmark (A)
- Run: https://github.com/aurelian2483-cmd/value-watch-lab/actions/runs/43705889738
- Artifact ID: `14157804601`, `horse-market-benchmark-descriptive-only`, retained/available at audit; ZIP size 14,365 bytes, published archive digest `sha256:a2dcfdd1fdba4294a4092b23c77bdfacd708187b862cd36d582a06064c6fd721`.
- Workflow source branch `research/horse-v3-isolated`; pinned commit `f43e26e523b95371014f6107183e66fa8a7dd0d1`. Job `market-benchmark`, ID `132786751958`, conclusion `success`.
- Files and raw uncompressed SHA-256:
  - `README.md`: `4670be7d000b0565e167c64f9f81d2d72c6c017cd87bc750ab44861002ec251e`
  - `proportional.json`: `883a0239a29619e99de810184a4c7d6236719ebbc9c0303cdd294cc7f5677116`
  - `power.json`: `caa9bd6c8a9683a543e1c3a27960b6857bec94fb0c54aadc14aa7fba2c5b31e2`
- Both JSON files parse; both say `model_validation=UNVALIDATED`, `publication_gate=BLOCKED`, `betting_eligible=false`, `expected_value=null`, `roi=null`, `clv=null`. Both list `FORM_PERCENTILE_SOFTMAX_RESEARCH_V1` only. Zero V3 paired forecasts.
- Both have **32 rows, 32 unique race IDs, 32 unique (race, forecast SHA, market SHA) combinations**. The ordered race/forecast/market identities and winner IDs are identical between proportional and power methods. Calculations below were recomputed by arithmetic averaging over `rows`, not copied from the narrative summary.

| Measure | V1, same 32 races | Proportional market | Power market |
|---|---:|---:|---:|
| Mean log loss | 2.34874950 | 2.14981356 | 2.14658586 |
| Mean multiclass Brier | 0.89885764 | 0.87437426 | 0.87739701 |
| V1 minus market, mean log loss | n/a | +0.19893593 | +0.20216364 |
| V1 minus market, mean Brier | n/a | +0.02448338 | +0.02146064 |
| Races where V1 log loss lower than market | n/a | 11/32 | 12/32 |

- Captured source coverage: 66 archived forecasts, 49 provisional result entries, 1,997 market captures, 49 candidate forecast/result pairs, 17 without acceptable market quote at/before forecast cutoff; 43 invalid *market observations* (not distinct races); 17 ignored forecast revisions; zero amended forecast receipts excluded.
- Sanity checks: observed raw overround across paired rows ranges approximately 1.141734–1.522891; no market prices are certified executable. Both report margins are descriptive de-vig methods, not Betfair BSP.
- **Finding:** the observed market had lower *mean* log loss and Brier on this paired subset. Research only: one-publisher provisional outcomes, unverified publisher-observed prices, sample selection, incomplete pre-event independent attestation, no untouched model validation. Do not infer a profitable betting strategy. The original JSON files and their row-level immutable hashes remain in the artifact; this report does not duplicate or mutate those originals.
- Original branch report: [market benchmark result](https://github.com/aurelian2483-cmd/value-watch-lab/blob/research/horse-v3-isolated/research/horse-v3/MARKET_BENCHMARK_V1_FIRST_EXECUTED_2026-11-15.md).

## FB-LEAGUE-01: Five-league recent-form replay (B)
- Original research branch `research/league-comparison-20261114`, report: [LEAGUE_COMPARISON_2026-11-14.md](https://github.com/aurelian2483-cmd/value-watch-lab/blob/research/league-comparison-20261114/research/LEAGUE_COMPARISON_2026-11-14.md).
- Pinned external openfootball/football.json source commit: `e6744429ee395bc86f247348c6184bb08d4eb361`.
- Reported code rule: same-season Poisson goal-rate model with five pseudo-match shrinkage, recent five-match goal-difference multiplier `exp(0.025 * difference)`, using only previous match dates. No verified pre-event real-time forecasts.
- Scored eligible fixtures: Serie A 581 (top-1 55.42%; log loss 0.98662), La Liga 603 (49.75%; 1.00045), Premier League 608 (50.33%; 1.01981), Bundesliga 486 (48.77%; 1.03693), Championship 930 (46.45%; 1.04919); sum **3,208**.
- Source seasons: 2024/25 and 2025/26; underlying archives incomplete for several league-seasons; **not** a complete fixture census.
- This is **the same model across distinct league samples**, not a paired challenger-vs-baseline formula comparison and not an odds/ROI test. No independent re-execution undertaken in this audit.

## HR-V3-ABLATION-01: Fixed V3 single race (B)
- Original [V3 first fixed ablation](https://github.com/aurelian2483-cmd/value-watch-lab/blob/research/horse-v3-isolated/research/horse-v3/V3_FIRST_FIXED_ABLATION_RESULT.md).
- Race 887765, Wolverhampton 2025-11-03, five finishers, after-event overlay.
- M1 V1 log loss/Brier 1.6854944516 / 0.8309271403; M2 distance 1.6975984597 / 0.8359250090; M3 surface 1.6927837353 / 0.8339626591; M4 both 1.7050080663 / 0.8390192510.
- All context variants worse than V1 **on this one retrospective race**. Different definitions from the 34-race grid; not evidence about that grid.

## Still unreconciled (C or proposed)
1. **Football 3,749/279/175 historical reliability screen:** branch `research/historical-reliability-challenger` has a five-form challenger implementation, but no original immutable 3,749-match census/receipt was recovered by the preceding Step 2 audit. Do not claim its exact rules/source inputs were verified.
2. **Football 2,280-fixture / 640 chronological holdout**, gamma grid, player residual test and **220-selection 50/50**: preserve conversation-reported results; missing exact run SHA, matched IDs, data and odds timing.
3. **Horse 34-race / 12-setting context grid:** preserve conversation-reported numerical results separately from HR-V3-ABLATION-01 and HR-MKT-01; original 12-row grid and identities still missing.
4. **Football V6**: proposed shrinkage, not a demonstrated validated deployment.

## Next investigation priorities (not permission for new tests)
- Search the GitHub Actions run list and archived artifacts for those specific old test names; inspect associated branches, historical commits and original code/data hashes.
- Compare same event identifiers, forecasts frozen before the result, odds snapshot times, eligibility, definitions, and metrics. A current backfill is **not** proof that the original test used that information.
- Distinguish statistical predictive scoring from executable betting value, settlement and ROI.
- Preserve `UNVALIDATED` and `BLOCKED`. No change to scripts, production code, selections, data collectors or published user interface was made in this Step 4 audit.

## Audit actions performed
Downloaded original non-expired GitHub Actions artifact 14157804601 and inspected its three ZIP members, row identities, score means and source coverage. Fetched original research-branch football replay and V3 ablation reports and checked branch inventory. No historical model fitting or re-execution of the original data collection pipeline was performed; no live deployment.
