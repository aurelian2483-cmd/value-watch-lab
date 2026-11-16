# Independent Validation Centre — implementation contract

This is a **read-only research QA view** separate from sports-model development. It does not write to or change forecasts, data collectors, archives, betting slips or production grades.

## Source inventory

- Football: `research-dashboard-data.json`
- Horse racing: `horse-research-status.json`
- Tennis & NFL: `other-sports-data.json`
- Darts: `darts/feed.json`
- Rugby Union & League: `rugby-research-data.json`
- Prospective forecasts: `prediction-ledger.json`
- Independently observed results: `results-feed.json`
- **Excluded legacy research:** `research-history.json` (historical descriptive scoring, not independently verified prospective forecasts)

The live snapshot timestamps are read only. Current/stale does **not** mean validated. One data source may supply multiple sport divisions, but they are independently identified in the scoreboard.

## Eligibility for descriptive forecast/outcome scoring

`prediction-ledger.json` must retain `schemaVersion:1`, `kind:"PROSPECTIVE_PREDICTION_LEDGER"`, and `records:[]`.

A future record must contain `prediction_id`, `sport` (one of the seven IDs in core.js), `event_id`, `model_version`, `market`, `recorded_at_utc`, `event_start_utc`, `snapshot_sha256` and a complete `probabilities` object (two to 32 named mutually exclusive outcomes, finite numbers strictly between zero and one, summing to one within 1e-6).

`recorded_at_utc` must predate the event start by at least five minutes. Duplicate prediction IDs are excluded. Never backfill forecasts after the event or alter immutable forecasts to agree with results.

`results-feed.json` must retain `schemaVersion:1`, `kind:"VERIFIED_OUTCOME_FEED"`, and `records:[]`.

A future result record must contain the same `sport`, `event_id` and `market`, plus `actual_outcome`, `observed_at_utc`, `independently_verified:true` and two or more `source_receipts` with distinct HTTPS hostnames and SHA-256 content hashes. Each receipt includes `url`, `sha256` and `observed_at_utc`. The final result observation must postdate the event start. Duplicate result identities are blocked.

These are **machine-checkable evidence requirements**, not proof that archived receipts or outcomes are authentic. External source verification, immutable storage guarantees and independent auditing are still required before any claim of independently validated predictive performance.

Metrics: multiclass Brier score = sum over outcomes of (forecast probability minus one-hot outcome)^2; log loss = negative log probability of observed outcome. Lower is better, but without appropriate baselines, sufficient samples, uncertainty analysis, calibration, and an independently verified chronology these values cannot demonstrate a betting advantage.

## Current known gap

The prospective ledger and verified-outcome archive were both empty when this feature was implemented on 16 November 2026. The page therefore correctly shows **0 scored pairs and no validated ROI**. It does not fabricate outcomes from other published schedules or historical snapshots.

## QA and deployment

- `node tests/test_independent_validation.cjs` covers seven sport identities, forecast chronology, probability normalization, source receipts, duplicate handling, sport/market mismatch and descriptive-only scores.
- `node scripts/pro_design_browser_qa.cjs` includes responsive page, archived-data zero state and retry checks.
- Existing GitHub Actions `research-regression.yml` and `pr-browser-qa.yml` execute those tests on PR creation.
- This branch should be reviewed separately from sport-model branches. Do not merge without checking current branch conflicts, passing tests and preserving live data.
