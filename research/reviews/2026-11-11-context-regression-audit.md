# Context research regression review — 11 November 2026

Reviewed main d0f9b847d8c851d1535daa068c67a892286ae161. This change adds regression coverage, not a new predictive model or demonstrated performance improvement.

## Evidence inspected
- Context pipeline, context tests, source/result corroboration code, market-evidence audit and the 7 November implementation audit.
- Context feed generated 07:56:00 UTC; runner feed 07:55:28 UTC. Generation time does not establish individual runner/quote freshness.
- All 79 context archive records passed existing hash/vector/pre-event validation. This is integrity validation, not independent attestation of first publication.
- Context feed has 58 settled entries, including 49 TWO_PUBLISHER_RESULT_CORROBORATED entries. Original immutable settlements remain single-source provisional. Corroboration does not establish independent underlying data origins or predictive validity.
- Existing context vs uniform evaluation: descriptive only. Brier difference -0.004733 and bootstrap interval [-0.010375, 0.001110], which includes zero. Existing context vs form comparison has 28 matched races and INSUFFICIENT_SAMPLE status. These are repository outputs, not newly estimated performance.
- The retrospective AW challenger remains a failed held-out comparison (26 test races). Historical downloads occurred after outcomes, and known final fields are not a prospective withdrawal simulation. No tuning or promotion performed.
- Inspected a timestamped source market capture and market audit implementation. This review does not establish executable odds or complete matched closing-line coverage, and makes no ROI/CLV claim.

## Reversible improvement
Added three targeted tests to tests/test_horse_context.py:
1. NONRUNNER and WITHDRAWN observations invalidate a frozen field; a one-active-runner field cannot produce a new vector; the original forecast stays unchanged.
2. Live field validity expires just beyond 30 minutes without rewriting the frozen record.
3. Equivalent offset and UTC observations retain identical freshness even across different calendar dates.

Existing tests also exercise same-day/future-history exclusion and discipline separation. No production code, model parameters, archives, settlements or data feeds were changed. This adds protection against regressions; it does not claim a newly discovered production defect.

## Validation
- Context suite: 18 tests passed.
- All test_horse_*.py suites: 123 tests passed.
- No live-browser or deployment check performed; no website publication claimed.

## Remaining gaps
Larger untouched prospective evaluation, price availability/closing benchmark coverage and independent source provenance remain unresolved. Keep UNVALIDATED, publication BLOCKED and paper-only restrictions. Future work should assess matched cohorts and missing-data exclusions rather than promote a model based on a small favourable average.
