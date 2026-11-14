# Stage 5 — Official Football Source Discovery and Provenance

**Recorded:** 2026-11-14. **Research only / model UNVALIDATED / publication BLOCKED.**

## Built
- `research/match-intelligence/source-catalog.js`: accepted provenance categories, checks URLs, publication dates, optional exact publication timestamps, snapshot cutoff, duplicates and source-topic enums.
- `research/match-intelligence/official-source-catalog-2026-11-14.json`: five official source leads from Premier League and Chelsea Football Club, as well as confirmed scheduled 21 November league fixtures Chelsea–Leeds and Newcastle–Arsenal.
- `tests/test_match_intelligence_stage5.cjs`: six additional safeguards. Stage 1–5 research CI run https://github.com/aurelian2483-cmd/value-watch-lab/actions/runs/43630250383 passed **27 tests, zero failures**.

## Evidence quality restrictions
- The source catalog records article titles and publication **dates** only. When exact publication time is not attested, the source remains `DATE_ONLY_REQUIRES_TIME_ATTESTATION`; it cannot be promoted to timestamp-verified known-before-cutoff evidence.
- Even a timestamped URL is merely **metadata**. The source content, claims, identity, availability and status require separate substantive verification and extraction.
- Earlier Sunderland-match injury reporting is not proof that any player will be absent or available against Leeds on 21 November.
- Chelsea vs Arsenal is an illustrative matchup in this research workflow, not asserted to be a fixture on a synthetic date.
- The `source-catalog.js` module does not actually crawl websites or ingest current injuries. No background job, live data connector, source authentication, player identity matching or inference model has been deployed.
- No squad-strength impact coefficients, odds, projected starting XI or 1X2 adjustments have been produced.
- The separate stage-3 historical replay continues to run for CI regression only. It does not provide fresh validation.
- Official provider licensing and reuse terms need review before automated extraction, scraping, redistribution or production deployment.

## Next controlled step
1. Verify actual publication instants from official provider feeds or reliable archived capture timestamps.
2. For one real pre-match snapshot, extract only explicit factual claims (doubtful, out, available, lineup) with direct provenance and independent review.
3. Assess source coverage and conflicting updates by club and time horizon.
4. Collect an appropriately sized, chronologically partitioned historical availability dataset before estimating player-impact and match-context model coefficients.
5. Compare a locked challenger to the unchanged Poisson baseline on new, genuinely unexamined match outcomes.

**No changes to live betting or main-branch football predictions.**
