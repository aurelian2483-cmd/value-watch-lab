# Football result reconciliation

Research only. Models **UNVALIDATED**. Publication **BLOCKED**.

Regenerate with `python scripts/audit_football_result_reconciliation.py --write`.

| Input snapshot | Tier | Input rows | State |
| --- | --- | ---: | --- |
| `historical-reliability-data.json` | SINGLE_SOURCE_UNVERIFIED | 734 | loaded |
| `football-expanded-data.json` | TWO_SOURCE_EXPANDED_FINAL | 66 | loaded |
| `research-history.json` | LEGACY_SCORED_ARCHIVE | 18 | loaded |
| `research/football-baseline-v1/608-reconstructed-forecasts.json` | RETROSPECTIVE_RECONSTRUCTION | 608 | loaded |
| `prediction-ledger.json` | PROSPECTIVE_FORECAST_LEDGER | 64 | loaded |
| `results-feed.json` | PROSPECTIVE_OUTCOME_FEED | 0 | loaded |

Ordered date/name candidates: **51** distinct single-source rows.

| Single-source classification | Rows |
| --- | ---: |
| exact_fixture_and_score | 0 |
| likely_overlap_identity_review | 51 |
| ambiguous_identity | 0 |
| score_conflict | 0 |
| unmatched | 611 |
| duplicate_or_repeated | 0 |
| outside_centre_coverage | 72 |

Total classified rows: **734**.

Likely overlaps by reference evidence tier: LEGACY_SCORED_ARCHIVE: 10, TWO_SOURCE_EXPANDED_FINAL: 41.

Candidate pairs by disposition (including reference repeats): duplicate_or_repeated: 4, likely_overlap_identity_review: 51.

Reference rows by disposition: duplicate_or_repeated: 4, included: 688.

Reference dispositions by tier: TWO_SOURCE_EXPANDED_FINAL (included: 66); LEGACY_SCORED_ARCHIVE (duplicate_or_repeated: 4, included: 14); RETROSPECTIVE_RECONSTRUCTION (included: 608).

Single-source rows with a stable fixture ID: 0.
Single-source rows with multiple receipts: 0.
Expanded rows meeting the two-source metadata contract: 66.
Football rows in the prospective forecast ledger: 0.

The JSON records input hashes, ordered participants, aliases, date precision, source receipts and every decision.
DATE_ONLY_END_OF_DAY preserves the source date only. Reference season labels inferred from dates use a July boundary.
A CSV hash establishes file provenance. It does not identify a fixture or establish independent verification.
Retrospective records remain separate. Legacy score receipts and reconstructed histories do not establish pre-event predictions.
A trusted provider fixture ID or reviewed crosswalk, exact competition and participants, regulation-time settlement,
and separately sourced result receipts would be needed before promoting any row to a verified-results view.
This audit changes no evidence tier or input snapshot.
