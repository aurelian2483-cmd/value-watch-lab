# Horse Racing Market Benchmark V1 — First Executed Evidence (15 November 2026)

**STATUS: UNVALIDATED / RESEARCH-ONLY / PUBLICATION BLOCKED**

Executed CI workflow: [GitHub Actions run 43705889738](https://github.com/aurelian2483-cmd/value-watch-lab/actions/runs/43705889738) at research branch commit `f43e26e523b95371014f6107183e66fa8a7dd0d1`.

**12 of 12 isolated unit tests passed.** CI uploaded exact `proportional.json` and `power.json` artifacts named `horse-market-benchmark-descriptive-only` (artifact ID 14157804601). The evaluation algorithm hashes each resulting report.

## Input coverage

- 66 frozen historical V1 forecast archives.
- 49 provisional scored source receipts; no amended receipts excluded in this run.
- 1,997 archived publisher-observed Sky Bet market captures.
- 49 latest V1 forecasts had a provisional result; 32 were paired with acceptable same-field price receipts observed **before model freeze**.
- 17 candidate forecasts had no qualifying price observed at or before model freeze.
- 43 invalid market observations were encountered in selection checks; **this count is observations, not unique races** and must not be added to 17 as if the exclusions were disjoint.
- Zero genuinely frozen and paired V3 forecasts in these archives. V3 market comparison is **not yet available**.

## Scored evidence: lower is better

| Margin removal | Paired races | V1 mean log loss | Observed-market mean log loss | V1–market log-loss delta | V1–market Brier delta |
| --- | ---: | ---: | ---: | ---: | ---: |
| Proportional | 32 | 2.3487 | 2.1498 | **+0.198936** | **+0.024483** |
| Power | 32 | Not separately summarised | Not separately summarised | **+0.202164** | **+0.021461** |

On the proportional comparison, V1 beat the market on log loss in **11/32** races; the market beat V1 on the average proper scores. This **does not show a profitable market betting strategy**: this is a small selected descriptive analysis, third-party observations with no executable price verification, one-publisher provisional outcomes, and no untouched independent validation.

## Model and price release gates

1. **Do not** treat source-observed Sky Bet quotes as Betfair BSP or reliably executable odds.
2. **Do not** compute claimable positive EV, CLV or ROI from these data.
3. Obtain genuine Betfair historical BSP with race/horse mapping, source receipts, dated off-time, verified runner settlement and commission specification.
4. Develop immutable, timestamped and correctly matched **V3** pre-event snapshots, not post-event JS recalculations.
5. Add chronological untouched market benchmark comparison, paired uncertainty, proper calibration diagnostics and multiple-model controls.
6. Only after verified independent evidence, consider publication and risk review separately. Paper-only until then.

**Full machine-readable reports:** GitHub workflow artifact ID 14157804601. Source code: `scripts/horse_market_benchmark_v1.py`, `scripts/run_horse_market_benchmark.py`, `tests/test_horse_market_benchmark_v1.py`. No frozen V1 or V2, production model, website betting slips, or `main` altered.
