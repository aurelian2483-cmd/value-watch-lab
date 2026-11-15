# Official Irish non-runner observation pilot — 15 November 2026

**STATUS: UNVALIDATED; publication and real-money betting BLOCKED.**

## Scope and implementation

Added `scripts/archive_ihrb_nonrunner_page.py`, which retrieves the public Irish Horseracing Regulatory Board (IHRB) non-runner page, checks structured table rows, records a source-observation timestamp, hashes the retrieved bytes and stores immutable research-only receipts. It excludes rows whose logged time is blank, reporting their count. A regulator's displayed logged time must not be confused with independently proved first public availability.

Added `scripts/crosscheck_ihrb_publisher_candidates.py`. This produces **unverified identity candidates only**, using course/day and unique horse-name-prefix evidence from the source-observed publisher runner archive. IHRB's page combines horse and rider names; this method does not independently establish horse IDs or cross-provider race-number correspondence. All candidates stay blocked pending manual review.

Both collectors now run in the scheduled default-branch GitHub Actions workflow, with evidence committed only to the isolated branch `research/horse-v3-isolated`. Errors from the regulator source do not create imaginary non-runners and do not block separately valid runner collection. Diagnostics remain workflow artifacts.

## Verified execution

- Dedicated IHRB pilot: https://github.com/aurelian2483-cmd/value-watch-lab/actions/runs/43721904579 — 11/11 focused tests passed; 6 complete regulator rows captured, 2 incomplete rows rejected.
- Scheduled full workflow: https://github.com/aurelian2483-cmd/value-watch-lab/actions/runs/43722029314 — **54/54** tests across source, archive, dashboard, IHRB and matching checks passed; entire scheduled workflow succeeded.
- Scheduled run covered 20 horse racecards and archived 9 valid source-observed pre-off field snapshots.
- The regulator evidence contained 6 distinct entries. Exactly 1 potential unverified Sporting Life horse identity candidate was found; 5 lacked a candidate in the currently available publisher observations.
- Current daily research dashboard reports 3 publisher-field changes, 66 historical V1 forecasts, 0 V3 forecasts.
- No official notice to bookmaker **observation-lag measurement** has yet been established for a verified matching pair; no validated official withdrawal-time comparison is claimed.
- No Betfair BSP sources imported, no verified cross-provider Betfair runner IDs, no CLV, EV, ROI or betting selections produced.

## Critical limitations

1. The IHRB source is Ireland only; this collector does not validate British non-runners.
2. The regulator page has two incomplete rows with blank logged-time fields. Therefore this collection is **not proof of complete non-runner coverage**.
3. The public page is a later observation; its 'logged' field is not independent real-time publication proof.
4. Cross-provider horse-name-prefix matches require external verification and must never be promoted to verified horse identities or race mapping automatically.
5. The live betting homepage and the existing mathematical model coefficients remain unchanged; the research-only gate remains blocked.

## Next technical gate

Add exact race identity and verified horse ID crosswalks (regulator, Sporting Life) with independent race ordinals and evidence receipts. Only after two separately timestamped observations may research compute **observed source-lag intervals**, clearly separating their bounds from claimed actual withdrawal times. Continue IHRB hourly archival; do not infer negative evidence from missing notices or delayed GitHub schedule executions.
