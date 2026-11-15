# Hourly racing evidence collector — first executed checkpoint

Date: 15 November 2026. **UNVALIDATED — betting publication BLOCKED.**

## Design and deployment

GitHub's `schedule` runs only from the default branch. A minimal scheduler was added to `main` as `.github/workflows/horse-research-scheduled-capture.yml`, which checks out `research/horse-v3-isolated` and runs **only research collectors and tests**. The scheduled job does not edit the website, betting selections, model coefficients, or BSP data. Only new immutable V2 field captures / eligible V3 forecast archives are committed to the isolated branch.

Schedule is `17 8-20 * * *` (13 hourly opportunities per day, at HH:17 UTC). GitHub Actions schedules are best effort and may be delayed or skipped; do not treat exact times or continuous monitoring as guaranteed.

Source flow: fresh Sporting Life race discovery -> fresh runner-source retrieval -> V2 evidence gate (strict runner freshness) -> hash-named append-only field observations -> consecutive V2 field diff -> eligible experimental V3 attempt -> research-only archive and diagnostics. The change detector ignores legacy V1 receipts which did not meet the later freshness requirement.

## First end-to-end test

Run: https://github.com/aurelian2483-cmd/value-watch-lab/actions/runs/43720284105

- Workflow status **SUCCESS** and 37/37 tests passed: 17 prior V3/BSP, 14 provenance snapshot, 6 field-diff tests.
- 20 racecards discovered and all 20 refreshed.
- 238 active runner and 29 nonrunner observations in the fresh publisher feed.
- 10 V2 source-observed field snapshots recorded; 9 racecards excluded by pre-event buffer and 1 by race stage.
- Diff audit reported 13 races with valid V2 records, **0 observed changes**, and 17 invalid/ineligible legacy V1 snapshots. Those older V1 records were not silently promoted.
- Zero V3 model snapshots were accepted because model scope or race timing failed. No BSP, CLV, EV, return prediction or staking conclusion.

## Evidence limitations

These are single-publisher snapshots, not regulator-certified scratches or independent original-publication time attestations. Runner appearance or disappearance cannot be treated as a confirmed official non-runner without other source records. No legal rights to exchange datasets are presumed. The scheduled collector does not validate trading edge. Live betting publication remains BLOCKED.
