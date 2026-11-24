# Shared data evidence inventory — 2026-11-24

Pinned source revision: 22a82369ab45143e639981fc4d5cd8a521ec0260. Read-only inspection. Counts are raw stored records, not additive across datasets; no new certification.

| Path | Git blob SHA | Observed records / meaning |
|---|---|---|
| results-feed.json | 5feddf86ef85f0c1b67da2e867d6c504bc255e23 | 0 verified outcomes |
| prediction-ledger.json | 5698ae6d7f4af10adf6bcd00b8c024ce3454e687 | 80 frozen-ledger records |
| research/performance-report-latest.json | faf16b3b7eeb57b0066b97b1a10a8cda770495aa | 80 forecasts, 0 contract-matched pairs, NO_PAIRED_RESULTS |
| research/result-review-status.json | 2a6e58f299105a3900ab18b8d9b3bc534873e5ce | 36 ready for human review, 2 awaiting primary final, 20 awaiting independent source, 22 awaiting event |
| historical-reliability-data.json | 858bb6857402b1f63a5ae943d71bd949c60e7157 | 782 current-season single-source results, seven competition audit entries |
| football-expanded-data.json | b83290b2b82ece640264ba410e4511650d894277 | 212 upcoming fixtures, 116 scored performance entries, 136 pending entries, 354 archive records including revisions, 0 experimental_model_forecasts rows in this snapshot |
| research/bottleneck/inventory.json | e3dffc319daa8fdd6519dd335839b042e08888b9 | 25 dataset entries; older pinned source inventory, not a fresh aggregate |

## Evidence contract proposal

Reuse prediction-ledger, results-feed, result review reconciliation, research-audit-core, and existing sport-specific source adapters. Do not duplicate collectors or flatten evidence tiers.

- Event identity: sport, competition, provider namespace, event ID, ordered participant IDs, scheduled UTC time, time precision and approved crosswalk; keep source-native IDs. No fuzzy joins for verified settlement.
- Market identity: explicit market, settlement rules, outcome identifiers and complete vector where required. Regulation, overtime, win and place contracts stay separate.
- Observation: source URL/operator, observed UTC, content digest, retained artifact reference, ingestion version and known rights. A digest or different hostname alone does not prove independent provenance.
- Prediction: preserve existing immutable prediction_id, model_version, probabilities, source/training fingerprints, recorded_at_utc and event_start_utc; no retrospective promotion to prospective.
- Outcome: preserve raw source claims, reconciliation status and independently reviewed settlement separately. Only authorised review may promote to verified feed; never overwrite frozen forecasts.
- Dataset manifest: immutable revision, content hashes, evidence tier, chronology, split assignment, rights, source counts, deduplication and rejection counts. Holdout data must not be exposed to optimisation.
- Access: Alpha Hunt consumes read-only research snapshots, produces separate derived records, no direct Value Watch writes. Paper-only gates preserved.
- Missing or conflicting evidence: return explicit uncertain/blocked status. No synthetic settlements, fabricated timestamps or source substitutions.

## Implementation acceptance checks

1. Reproduce inventory from pinned content and compare counts, without modifying source files.
2. Test exact IDs, duplicate/revised events, conflicting scores, wrong sport/market, time precision, future-data leakage, malformed vectors and missing receipts.
3. Test read-only boundary and immutable manifests, protected split access, and unchanged source hashes.
4. Reuse current result review queue; independently inspect 36 candidate records before any certification. No automated promotion from READY_FOR_HUMAN_REVIEW.
5. Keep retrospective analyses separate from prospective validation; assess rights and timing limits.
6. Run existing tests and new integration tests before publication.

This is a proposed implementation contract and partial audit, not an executable adapter, proof of access control, certified data review or runtime test. Full 25-entry current inventory and actual independent result review remain outstanding.
