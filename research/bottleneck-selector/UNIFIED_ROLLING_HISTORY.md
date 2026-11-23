# One shared, continuously updated historical research view

**Confirmed operating rule, 23 November 2026:** Historical means every safely usable completed match: yesterday's game, last week's games, completed rounds from this season, and prior seasons. It does NOT mean only previous seasons.

Use all legitimate available historical data and keep feeding results from existing external source collectors into ONE logical research history. Do not create competing datasets that confuse the user and the research results.

## One source of truth, many evidence tiers

1. External approved collectors refresh their existing source files.
2. Completed results become historical data after their correct cutoff.
3. A unified read-only view loads the sources with sport, competition, event identity, score, date, provenance and time precision, without duplicating source files.
4. Every model is evaluated strictly as of the original prediction cutoff. No future scores, same-day date-only results or later revisions can be used to generate an earlier prediction.
5. Compare methods only on identical events, markets and eligibility rules, preserving unsuccessful forecasts.
6. Retrospective method tests can proceed now. Original-response authenticity and independent prospective verification are separate evidence and release questions, not proof that historical data are missing.

## Confirmed repository coverage

At the inspected 23 November 2026 snapshot:

- Historical Reliability archive: 782 football results from 2026/27 across seven competitions, including 48 completed fixtures dated 20–22 November 2026. These are recent historical data.
- Football reconstruction archive: 608 results from 2024/25–2025/26, each with two reconstructed research-model vectors. They must not be labelled original as-issued live forecasts.
- Darts sample: 80 day-only final results.
- Prospective frozen ledger: 74 tennis/NFL model forecasts, kept separately as predictions, not counted as historical final outcomes.
- Racing, rugby and other tennis/NFL existing source archives remain available even when an event-level matching adapter has not been validated. Do not classify them as missing merely because the unified source view does not yet normalize every provider ID.

## External refresh that already exists

The existing football collector is scripts/collect_reliability_history.py. Its scheduled workflow is .github/workflows/reliability-results-refresh.yml, declaring runs at 02:15 and 14:15 UTC daily across all seven competitions. Reuse it; do not create another independent football collector. A declared schedule is not proof every run succeeded: consult workflow logs and the latest archive timestamps to assess source freshness.

## Critical training cutoff

The current-season football source has DATE_ONLY_END_OF_DAY carrier timestamps; the darts sample has day-only carrier dates. These are NOT exact kickoff times. Those results may join a point-in-time training snapshot only from the FOLLOWING UTC day, never earlier on the same match day. Where authentic observation times exist, use them rather than inventing times.

Keep one source-specific exact identity for each record, retain original provenance, and quarantine duplicate/conflicting identities. Never sum potentially overlapping archives as if they were distinct events. Cross-provider matches require exact sport, competition, participants, event and settlement market mapping.

The zero-record independently certified outcome file does NOT mean there is zero historical data. Do not let missing original response bodies stop properly labelled historical research and chronological backtests.

## Connected implementation

The read-only rolling-history.mjs module reads the actual current-season football, older reconstructed football, darts and frozen-forecast files, with source-specific identities, chronology safeguards, counts, and last-seven-day coverage. completion-audit.mjs includes its summary. These adapters are initial coverage, not a claim of complete cross-sport normalization. Extend existing sport adapters within the same unified system, not via disconnected new databases.

No change to live betting eligibility, verified performance status or the six-option method selector is authorised by this data-sharing decision.

**Project rule:** Last week's completed games are historical. Outside collectors keep adding results. One rolling shared history, multiple clearly-labelled evidence tiers.
