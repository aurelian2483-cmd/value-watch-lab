# Result verification — Phase 7 review layer

The live prospective archive records frozen, pre-event Tennis and NFL forecasts. This phase adds a **conservative result review dashboard**, *not* automated outcome certification.

## Three evidence tiers
1. Frozen forecast: first-write-wins `prediction-ledger.json` entry with model vector, source fingerprint and pre-event time.
2. **Primary observation only**: `research/provider-result-observations.json`, created by the original ESPN provider collector. It remains `SINGLE_PROVIDER_FINAL_UNVERIFIED`.
3. **Secondary observation claimed**: optional file `research/secondary-result-evidence.json` with its own source URL, independently observed timestamp, response hash, identical sport, event/market ID, participant IDs and outcome. It must remain marked `SECONDARY_UNVERIFIED`. This file is **not currently produced by any collector**; no second data provider has been independently verified or connected.

`scripts/reconcile_result_evidence.py` compares these *claims* with frozen forecasts and publishes `research/result-review-status.json`. Possible statuses:
- `AWAITING_EVENT`: event has not started.
- `AWAITING_PRIMARY_FINAL`: original provider has no acceptable final observation.
- `AWAITING_INDEPENDENT_SOURCE`: one unverified primary final exists.
- `SECONDARY_INVALID`: second receipt, timestamp, identity, participant mapping or source differs from contract.
- `SECONDARY_CONFLICT`: two sources claim different outcomes.
- `READY_FOR_HUMAN_REVIEW`: two matching claims exist and require actual human inspection.
- `IDENTITY_CONFLICT` and `ARCHIVE_INVALID`: fail closed.

## Non-negotiable safeguards
- Neither the collector nor reconciliation writes `results-feed.json`.
- All review rows have `auto_certified:false`, `betting_eligible:false`; top-level `independently_verified_results_added:0` and `publication_gate:BLOCKED`.
- A second URL, different hostname or SHA-256 string is **not independent evidence by itself**. The underlying external event result, immutable retrieval provenance, independence of the source operator, settlement rules and matches must be independently checked.
- Unsupported sports or missing records do not get synthetic results.
- Review statuses and the dashboard are not model grades, win rate, price evidence or ROI.
- Existing mathematical models, source collectors, forecasts, paper slips and betting recommendations are not modified.

## Rollout and tests
`python -m unittest discover -s tests -p 'test_result_reconciliation.py' -v` exercises missing sources, mismatches, duplicate records, false timestamps, identical provider hosts, conflicts and complete-with-manual-review transitions.
`scripts/pro_design_browser_qa.cjs` checks the Validation Centre displays real archived forecast counts, including populated live archives, and handles missing review reports.
The existing scheduled collector will generate the review-status report after the primary provider observation step if the PR is merged.

**Release gate:** keep PR unmerged until the user approves a production update. This phase implements review readiness, not independently verified scores.
