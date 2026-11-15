# V1 / V3 versus Betfair BSP research comparator — 15 November 2026

**Executed:** GitHub Actions success, run 43708336185 (latest code at check).

## Current real archive coverage
- Immutable V1 full-field research forecasts found: **66**.
- Immutable prospective V3 forecasts found: **0**.
- Authorised mapped Betfair WIN BSP receipts available: **0**.
- Race-level matched comparison scores: **0** (correct evidence abstention).
- 11/11 comparator unit tests passed on synthetic, explicitly labeled fixtures.
- No pre-race executable prices, no estimated CLV, EV, ROI or staking information.

## Implemented
`scripts/compare_horse_bsp_models.py` requires:
1. An intact SHA-256 source-model receipt with blocked research gate, frozen more than 5 minutes pre-off.
2. An intact `BETFAIR_DAILY_WIN_BSP_MATCHED_V1` receipt, previously parsed from an authorised official daily WIN CSV and reviewed cross-provider ID mapping.
3. Exact race ID, timezone-normalized race start, entire active horse-ID field and exactly one official win outcome.
4. No duplicate BSP receipts for one race.
It computes race-level model and normalized BSP log loss and multiclass Brier, comparing V1 and V3 only if both exist for the same recorded race; output labels remain research only.

`.github/workflows/horse-v3-bsp-comparison.yml` runs the unit suite and audits archived V1/V3 and approved BSP receipt coverage. The workflow never fetches external betting prices, manufactures BSP receipts, writes to `main`, or changes website/paper slips.

## Data-quality and statistical caveats
- Matched source IDs and CSV checks provide consistency, not independent confirmation of a claimed user-supplied crosswalk or legal rights.
- BSP is at-off information: its comparison is a later reference benchmark, **not a prediction baseline available when the model froze**. Do not fit market blends on contemporaneously unavailable BSP.
- If V1 and V3 freeze at different times, paired score comparison is not necessarily a same-information experiment; the report records each freeze timestamp.
- Model-side historical form first-availability remains to be independently attested.
- Historical results and unvalidated market-based comparisons do not demonstrate positive expectation.

## Next hard dependency
Obtain a legitimately usable official Betfair WIN BSP CSV and a **full-field, manually checked Sporting Life ID to Betfair selection ID mapping** for some archived V1 races. Load these privately through the importer; do not commit licensed raw files. Then run descriptive scores and, separately, prospective V3/market evaluations under a predeclared chronological protocol.

**Status: UNVALIDATED / publication BLOCKED.**
