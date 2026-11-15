# Prospective field-observation archive — freshness correction and audit

Date: 15 November 2026. Research-only, UNVALIDATED, publication BLOCKED.

## Implemented
New script `scripts/archive_racing_field_observations.py` records immutable full-field publisher observations, source URLs and SHA-256 receipts, exact runner IDs and source status, collection/source timing, and main-feed source commit. No official non-runner log or exchange data is simulated.
The isolated `.github/workflows/horse-v3-bsp-capture.yml` workflow now runs the field-capture unit suite and writes eligible receipts only in the isolated research branch. It does not change main, model coefficients or betting slips.

## First run and corrected interpretation
At the initial run (43714292537), the first version wrote **17** source-observed field snapshots from 20 racecards. This was a source-feed archival success, but **not a valid current/fresh prospective observation claim**: source runner timestamps were stale by the time the workflow executed. Do not use those archived `SOURCE_OBSERVED_RACING_FIELD_V1` receipts as evidence of fresh real-time non-runner visibility.
A V2 gate now enforces `-5 minutes <= capture_time - runner_observed_at <= 30 minutes` in addition to source-feed chronology, before treating a field as a prospective capture.

## Verified corrected execution
Workflow 43714403259 passed **31/31 automated tests** (17 previous V3/BSP + 14 field capture tests). The published feed contained 20 racecards; **0 fresh field observations** passed. Three races were too near or past the pre-event buffer, and **17 were stale at capture**. V3 also archived **0** experimental forecasts.

These zeros are data freshness findings, not proof of no non-runners or no predictive opportunity. Existing V1 field observations remain in the immutable audit trail with their older provenance classification, but must never be promoted into independently attested or current official observations. Only future V2 snapshots meeting the stricter gate are candidates for further source review.

## Unresolved dependency
Real-time freshness requires new race runner source observations before our 30-minute eligibility threshold. The isolated workflow currently reads the latest published main feed; refreshing GitHub without refreshing that feed cannot create legitimate new observation evidence.
The separate official withdrawal record collection and authorised Betfair BSP/runner crosswalk remain unconnected. Even a future V2 publisher snapshot cannot independently prove a regulator's exact announcement time.

Release gate remains `UNVALIDATED / BLOCKED`.
