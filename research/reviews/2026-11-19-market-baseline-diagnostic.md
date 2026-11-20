# Read-only market-reference diagnostic — 19 November 2026

Reviewed main a14d541c. No racing scripts/tests/research protocols changed since the previous inspected main. Read context/evaluation and market archive code and the frozen Phase3 protocol/status; prospective status remains dated 15 November. Earlier source-audit limitations and failed retrospective challenger remain applicable.

Improvement: scripts/audit_horse_market_baseline.py makes the missing market-reference comparison reproducible. It only reads archives and prints JSON. It is not imported into production or used for tips, model selection, validation promotion or settlement profits.

For each scored context forecast, match exact race/start/course/active field. Select the latest unique Sky Bet/Sporting Life observation at or before freeze and no more than 30 minutes earlier. Reject ambiguous latest captures; validate hashes, prices, chronology and source-backed settlement scores. Normalize inverse decimal odds proportionally across the field. This retrospective matching/normalization rule is an analyst choice, not a preregistered test or evidence that quotes were obtainable.

Run: `python scripts/audit_horse_market_baseline.py`

Pinned input result: 88 matched of 90 scored races; two lack an eligible pre-freeze market observation. Mean context-minus-market Brier +0.05533986234033414; log loss +0.2503625444231629. Positive means context worse. This is descriptive predictive scoring, not ROI/CLV or a closing-price benchmark. No stakes, profits or edge are inferred. Source-time integrity is not independent first-availability attestation. Results remain provisional and coverage selective.

Existing comparison: 48 context/form matched AW races; Brier delta -0.0006487425, log loss -0.0038105275. Both exploratory intervals include zero. Uniform comparison on 90 races: Brier delta -0.0070191799, log loss -0.0334061875. Beating uniform does not establish superiority to market or form. Do not tune the model against these repeatedly examined results.

Verification: 131 horse tests pass (six new tests cover independent score arithmetic, stale/future prices, field mismatch, ambiguous captures, integrity, duplicate settlements and missing-data output). git diff --check passes. All 143 context archives pass existing validation; no old context/form archive modified/deleted since yesterday. All 3067 market snapshots pass hash, pre-start chronology and finite-price checks. Materialized results: 90 scored, 72 two-publisher corroborated; no amendments/withheld counts reported. Two publishers need not be independent upstream sources.

Freshness: feed generated 05:09 UK, example runner receipt 05:08:58, stale at morning review. Current snapshot lists 34 observed races, 12 forecasts and 22 exclusions; those are captured coverage, not current available tips. Existing tests cover non-runners and same-day/future-history leakage. Genuine untouched A/B enrollment and independently attested capture remain unresolved. The script does not repair scheduling or obtain new source data.

No parameters, frozen forecasts, settlements, website or paper restrictions changed. UNVALIDATED/BLOCKED retained. PR103 remains a separate unmerged price-parser fix. Revert these three new audit/test/documentation files to remove this improvement. No deployment claimed.
