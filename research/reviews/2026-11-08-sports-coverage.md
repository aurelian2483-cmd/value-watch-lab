# Sports coverage audit — 8 November 2026

Audited `main` starting at `763bd25`. The current repository identifies itself as Value Watch Lab 3.0, with the previous dashboard retained. This repair preserves that structure, four sports, the legacy 24 paper slips, current-season football comparisons, research history, UNVALIDATED models and BLOCKED publication.

## Verified counts for 9–15 November (UK dates)

Counts below agree across saved records, the production normalizer and the desktop/phone browser checks. They describe source coverage, not a complete sporting calendar.

| UK date | Racing before → after | Observed entry rows after | Tennis before → after | NFL before → after | Football unchanged |
|---|---:|---:|---:|---:|---:|
| 9 Nov | 0 → 22 | 208 | 9 → 17 | 1 → 1 | 0 |
| 10 Nov | 0 → 20 | 162 | 0 → 0 | 1 → 1 | 0 |
| 11 Nov | 0 → 27 | 419 | 0 → 0 | 0 → 0 | 1 |
| 12 Nov | 0 → 20 | 356 | 0 → 0 | 0 → 0 | 12 |
| 13 Nov | 0 → 19 | 310 | 0 → 0 | 0 → 1 | 17 |
| 14 Nov | 0 → 1 | 41 | 0 → 0 | 0 → 0 | 16 |
| 15 Nov | 0 → 3 | 99 | 0 → 0 | 0 → 11 | 9 |
| Total | 0 → 112 | 1,595 | 9 → 17 | 2 → 14 | 55 |

All 112 recovered race records normalize; 1,592 entry rows have active source status and three are non-runners. Entry rows are observations, not distinct horses or verified final declarations. Horses can appear in multiple future races. All future entry cards remain nonselectable, without forecast probabilities or prices. Three fields contain doubtful runners; their source uncertainty is retained. The 19 meeting fixtures remain separate records, with daily counts 3, 3, 4, 3, 3, 1, 2.

## Traced defects and repairs

1. Sporting Life's `racing/racecards?date=YYYY-MM-DD` returned 14 meetings and 122 races dated **8 November** for every requested future day. Response hashes differed, so the existing identical-response check did not detect the semantic mismatch. The alternative dated index path also returned today's data. The collector now reports SOURCE_DATE_MISMATCH with actual meeting dates rather than interpreting this as an empty future calendar.
2. The existing free fixture collector already supplied real dated `/racing/meeting/YYYY-MM-DD/course/id` links. These pages embed `fastResults.fast_results[].race`, containing real race summaries and entry lists. The new adapter follows those observed links, checks meeting ID, course, date, race ID, kickoff and runner identities through the existing discovery/runner validators. Course punctuation is normalized while meeting ID remains exact. Original response bytes supply receipt hashes; no synthetic event or runner data is published. All 19 pages were collected successfully. UK/Ireland scope remains enforced.
3. The future-racing normalizer previously discarded runner data and always produced schedule placeholders. It now preserves observed names, with expandable entry lists, while retaining the declaration and paper-selection block. The normalizer's 30-minute racing freshness rule and all publication gates remain unchanged. Labels say source-observed rather than verified.
4. NFL collected only the default current-week scoreboard. Explicit current and next regular-season weekly requests now retain both full slates, correct week labels, source URLs/hashes/times and bye-team diagnostics. Week 18 does not wrap into an invented regular-season week. This live run observed 15 week-9 events (six still upcoming) and 14 week-10 events (14 upcoming). Four of the six current-week games occur on 8 November and two next-week games occur after 15 November, leaving 14 games in the audited range. Thursday US games can fall on Friday UK time; Monday US games can fall on Tuesday UK time. No fixed slate size is assumed. Prior-season 272-game/32-team/17-games-per-team training checks are unchanged.
5. Tennis already loops over seven daily ATP/WTA pages. Those pages contain whole tournament draws, repeated matches from other dates, and placeholder rounds. The collector now records per-request tournament counts and singles slots grouped by **actual match date**, with reasons for rejecting unknown participants, unknown times and non-upcoming records. Tournament metadata now reports confirmed-match counts when matches are present. Tennis's 9 → 17 increase on 9 November reflects newly published provider data on refresh, not a proven parsing repair.
6. The desk's date, sport, competition, search and upcoming filters do not discard the recovered records. Pagination displays 24 initially and offers Show more. NFL is now included in the day-by-day coverage panel. The new report uses the production normalizer and distinguishes saved, normalized, upcoming, first-page and selectable counts, with source diagnostics and snapshot timestamps.

## Tennis provider limits

In the refreshed source, ATP has six eligible matches on 9 November; WTA has eleven. On 10 November ATP has 12 draw slots (eight with unknown participants, four with unconfirmed times); WTA has 16 with unconfirmed times. On 11 November WTA has eight unknown-participant slots; on 12 November ATP/WTA each have four; on 13 November each has two; on 14 November ATP has one and WTA three. WTA has one unknown-participant slot on 15 November; the separately probed ATP 15-Nov page has a tournament but zero singles competitions. These are source-page observations, not an independently complete draw census. No valid timed named match was proven lost for 10–15 November. Keep those gaps visible instead of inventing matchups or turning placeholder 05:00 times into confirmed starts.

The normal seven-day tennis window on 8 November is 8–14 November inclusive. The audit explicitly probed 15 November too; it is not normally requested until 9 November. This is documented window semantics, not evidence of an off-by-one defect. Monthly tennis history endpoint completeness is not independently established; this change does not promote the Elo model or claim a verified backtest.

## Actions and freshness

- [Tennis/NFL run 42501443006](https://github.com/aurelian2483-cmd/value-watch-lab/actions/runs/42501443006): successful, 16:44 UTC; logs confirm 12 tennis and 13 NFL records, no collection errors. Restored cache receipts preserve original collection time. Configured cron is minute 15 every hour, but observed scheduled runs were 02:24, 10:12 and 16:40 UTC, followed by the 16:44 push run. Configured frequency is not an execution guarantee.
- [Future racing run 42518143891](https://github.com/aurelian2483-cmd/value-watch-lab/actions/runs/42518143891): successful, 20:03 UTC; logs confirm zero future races, 19 meeting fixtures, and all seven index pages containing 8-Nov meetings. HORSE_RACING_API_KEY was empty in that run, so the authenticated alternative was not in use. Its plan and future-day limits remain unverified. Existing 05:40 and 17:40 UTC schedules are preserved.
- [Horse discovery run 42520609468](https://github.com/aurelian2483-cmd/value-watch-lab/actions/runs/42520609468): successful at 20:32 UTC. Current-day discovery is separate from future entry collection and remains intact.
- Other-sports source artifacts now upload even if collection fails. New schedule tests run before publication; full regression continues to cover all sports. The diagnostic workflow retains a four-sport coverage report artifact.

## Verification

173 Python tests pass. All 19 browser-independent JavaScript test scripts pass; JavaScript syntax and whitespace checks pass. New regressions cover next-week NFL games, UK Tuesday dates, season/week and duplicate identity rejection, week-18 bounds, tennis draw-slot classification, ignored racing date selectors with changing hashes, meeting identity and original source digests, and future runner display without enabling selections or publication.

Reproduce snapshot-to-normalizer diagnostics with `node scripts/sports_coverage_report.cjs 2026-11-09 2026-11-15`. Live source diagnostics are embedded in other-sports-data.json and racing-future-data.json. Sources can change after this capture; later snapshots will legitimately change counts. Full competition completeness, final future declarations, independently verified odds, external provider reliability and a calibrated profitable model are not established by these repairs.

Targeted headless Chrome checks passed at 1440×1000 and 390×844: all four sport filters and Show more produce exactly 112 racing, 17 tennis, 14 NFL and 55 football cards for 9–15 November, with real entry names visible and no page errors. Reproduce with `node scripts/sports_coverage_browser.cjs 2026-11-09 2026-11-15` after installing Playwright Chromium (or setting COVERAGE_BROWSER_EXECUTABLE). The full existing browser suite also passed using installed Chrome: 21 interaction/layout checks, no page errors and zero accessibility violations in the desktop and mobile-slip audits. Its stale empty-state assertion and synthetic football fixture were updated to match the existing current-season evidence gate; manual selection checks explicitly clear auto-generated slips first.

Post-publication Actions exposed two legacy validators requiring exactly 14 races over six fixed dates (and Racing Post-only URLs/empty runners). These were replaced with date-window, chronology, identity, source-receipt, unvalidated-runner and publication-gate invariants. The duplicate future-racing workflow now requires seven days and shares the same concurrency group as the main future collector. Initial full regression and both repaired live collectors passed on GitHub; follow-up validation changes are separately committed.
