# BSP Identity Matching — actual archived candidate worklist

15 November 2026. Source: repository-owned research archives, with no Betfair price files fetched.

- Frozen V1 forecast revisions inspected: **66**
- Candidate races with exactly one consistent full-field identity: **44**
- Forecast revisions withheld because their race had conflicting archived runner fields: **22** (revision-level count, not 22 unique races)
- Archived eligible prospective V3 records: **0**
- Imported licensed/authorized BSP receipts: **0**
- Verified Betfair horse-ID crosswalks: **0**
- Confirmed market comparisons against actual Betfair BSP: **0**
- Research gate: **UNVALIDATED / BLOCKED**

GitHub workflow **43709007705** completed successfully: **7 mapping tests and 11 comparator tests passed**, then created artifact `horse-bsp-identity-worklist-no-licensed-prices` containing the candidate race IDs, time, runner IDs/names, forecast hashes and unfilled Betfair identifiers.

Excluded revisions must be reconciled on runner status and model freeze times rather than silently choosing the later/better-looking field. The worklist intentionally does not infer Betfair EVENT_ID/SELECTION_ID from names or calculate BSP/CLV.

Betfair official CSV directory details: https://promo.betfair.com/betfairsp/prices/index.php. Betfair SP History explicitly states pricing data/database rights and licence requirements: https://promo.betfair.com/betfairsp/SP_history.html. Do not download or republish market data without establishing authorised use.

## Next gate

Verify whether the user has permitted access or a licence for the official daily BSP datasets. Given authorised CSV(s), reconcile exact Betfair event and selection IDs against the 44 candidate races and separately review the 22 conflicting archived forecast revisions. Until that evidence exists, no BSP score may be declared.
