# Horse V3 / Betfair BSP — executed checkpoint (15 November 2026)

Status: UNVALIDATED; publication BLOCKED; no betting eligibility.

## Implemented
- scripts/import_betfair_daily_bsp.py: strict CSV importer for official Betfair WIN BSP files obtained separately by an authorized user; checks EVENT_ID, selection IDs, dates, BSP and single winner; explicit manually reviewed Sporting Life-to-Betfair ID crosswalk required. No automatic names-only matching or downloading. Source and crosswalk SHA-256 retained.
- scripts/freeze_horse_v3_research.py: creates immutable SHA-named V3 race forecasts based on current all-weather Flat full-field pre-event inputs, with minimum 3 prior Flat finishes per active runner and 5-minute pre-start buffer. Preserves provenance and uncalibrated research status.
- .github/workflows/horse-v3-bsp-capture.yml: on branch push or manual dispatch, runs tests, reads published main race snapshot, attempts to freeze qualifying V3 records on isolated branch and saves diagnostic artifact.
- tests/test_horse_bsp_v3_capture.py: 17 integrity and fail-closed regression tests.

## Actual execution
- First run: 17/17 tests passed; 20 racecards all out of scope; zero eligible V3 snapshots; housekeeping failure from staging a nonexistent archive folder.
- Corrected run: 17/17 tests passed, workflow SUCCESS, zero eligible snapshots preserved as valid absence. No V3 probabilities or market edge fabricated.
- Betfair BSP CSV observations actually imported: ZERO. No authorized source file and no complete reviewed cross-provider mapping available.
- Previous source-publisher Sky Bet benchmark: 32 V1 paired descriptive comparisons, NOT Betfair BSP or independently verified executable prices.

## Manual mapping input contract
mapping_verified: true (manual assertion), market_type: WIN, event_id: exact Betfair EVENT_ID, race_id: exact Sporting Life race ID, startUTC: offset-aware race timestamp, runner_id_map: complete mapping of Sporting Life horse IDs to Betfair SELECTION_IDs.
Missing, duplicate or ambiguous runner identities reject a race. The mapping flag does not constitute independent verification by this software.

## Next
1. Obtain official Betfair daily WIN CSV lawfully and check source terms.
2. Build full-field BSP market comparison only when source CSV and exact verified mapping are available. BSP is a later closing benchmark, not an executable pre-event offer.
3. Continue pre-race V3 capture for eligible future all-weather races; append final outcomes separately after the off.
4. Compare market, frozen V1 and frozen V3 on identical races with prospective scoring and chronological validation. No betting publication before independent evidence.

Source: https://promo.betfair.com/betfairsp/SP_history.html
Source: https://support.developer.betfair.com/hc/en-us/articles/360002407732-What-data-is-provided-by-the-Historical-Data-service
