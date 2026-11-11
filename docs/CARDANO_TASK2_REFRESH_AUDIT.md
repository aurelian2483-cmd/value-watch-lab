# Task 2 — paper slip refresh and coverage audit
Date: 2026-11-11
Scope: development branch inspection, no deployment.

## Verified source behaviour
- `paper-lab/transport.js` keeps the last good snapshot for each path when a refresh request fails, returns `status:'degraded'` and an error record with `retained:true`.
- `paper-lab/desk.js` `createFreshDailySlips()` awaits refresh, requires at least one snapshot, checks for concurrent plan changes, derives seven-day candidates from current in-memory events, and preserves the prior plan on failed eligibility or storage write.
- The success message currently says `Fresh feeds checked` even if `result.errors.length>0`. A degraded refresh can therefore be described ambiguously; this is a **confirmed wording/observability defect**, not evidence of incorrect prediction calculations.
- `paper-lab/engine.js` explicitly marks empty or duplicate shortlist combinations `INSUFFICIENT_DISTINCT_EVIDENCE`, and only rotates across sports with qualifying evidence. A tennis-only shortlist is not by itself proof of a defect.
- The UI exposes four paper slips, and research-only UNVALIDATED/BLOCKED safeguards are present.

## Repair sequence
1. Make the refresh outcome explicitly distinguish fully refreshed vs degraded/retained snapshots. Surface retained source counts and snapshot age where reliable; do not call retained snapshots fresh.
2. Add deterministic four-sport fixture tests for no data, single-sport data, eligible multi-sport data, identical rankings, duplicate combinations, and partially failed sources.
3. Check the refresh controller's event state after source failures, retries, date changes and new plan creation, including preservation of old saved research.
4. Reconcile the actual source coverage and exclusion reasons before claiming football, racing or NFL is missing because of a software bug.
5. Run browser regressions on development preview and verify unchanged publication gates.

## Limitations
No current production/browser execution or real-source coverage reconciliation has been performed in this audit. No betting recommendation, data fabrication, merge or deployment is authorised.
