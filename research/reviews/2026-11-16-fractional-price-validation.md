# Racing review — 16 November 2026

Reviewed main a6330da6, context pipeline, market parser, source-connection and refresh audits, failed challenger documentation, Phase2 validation and Phase3 executive report. Previous market-ID fix is already on main through PR81.

## Reversible improvement

Synthetic malformed fractional quotes reproduce a real parser defect: huge numerator/denominator convert to infinity, yielding NaN; abs(NaN)>tolerance is false. An infinite denominator or zero numerator can also yield decimal 1 while a nearby reported decimal passes rounding tolerance. Such quotes were incorrectly marked COMPLETE_SOURCE_OBSERVATION. No claim these inputs occurred in published records.

Validate finite, strictly positive fractional components, then finite derived decimal in (1,10000], before agreement checks. Use that validated value in output. Reject entire incomplete market with INVALID_QUOTE and empty quotes/favourites. Existing rounding tolerance, EVS and market-ID rules remain. Revert code/test commit to undo; no historical files need rewriting.

## Executed checks

- New regression: three malformed-price cases fail before fix, pass after.
- 126 horse Python tests pass, including freshness boundaries, non-runners, same-day/future-history exclusion, settlement and comparison checks.
- git diff --check passes.
- All 116 immutable context records pass existing hash, vector and pre-event archive validation. These checks do not independently attest original first availability.

## Evidence and unresolved gaps

Pinned context feed generated 16 November at 05:48:09 UTC: 16 observed races, four forecasts, 12 exclusions. Generation time is not runner-observation freshness. Thirty-minute field age and five-minute pre-start buffer remain; frozen forecast times are intentionally separate from current field confirmations. Refresh audit documents GitHub scheduling delays, so this review does not certify live freshness.

Materialized context results: 76 scored races, 61 two-publisher corroborated results. Raw provisional settlement store retains source receipts and amendments. Two publishers need not have independent upstream data. Context minus uniform mean Brier -0.00678736 and log loss -0.03103054 are descriptive, not validation. Existing form comparison remains 34 matched AW races; both paired score intervals include zero, and different freeze times remain a confound.

Market archive contains 2389 files. Inspected observations preserve shared-field quotes and source timestamps but explicitly lack executable-price verification and established closing/SP/BSP coverage. No new market-performance or CLV computation was run; a consistently timed, matched market evaluation remains outstanding. Do not treat missing prices as obtainable or backfill them.

Context features exclude same-day/future history and use prior same-discipline outcomes; chronological tests pass. Retrospective training cards can still contain post-event corrections. The failed trained AW pilot remains unpromoted. Phase2's 76 races were already examined; its later 18-race diagnostic is not untouched validation. Phase3 report records zero genuine new paired forecasts/results at its recorded acquisition, and no unattended A/B workflow. Those historical report counts are not asserted to be live counts today.

Models, parameter definitions, immutable forecasts, settlements and website unchanged. UNVALIDATED, BLOCKED and paper-only controls remain. No deployment or predictive improvement claimed.
