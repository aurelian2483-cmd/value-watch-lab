# Value Watch Lab 3.0 — integrated research desk

The homepage and `/paper-lab/` now use the same research desk. The previous dashboard remains available at `/legacy-dashboard.html`, with its original saved-paper-list storage and historical research preserved.

## Implemented functionality

- Four editable approaches: Best Evidence, Balanced, Cross-Sport Explorer and Experimental Longshot. Each accepts 0–15 manually chosen legs, with no sport quota.
- Today, Tomorrow, 3/7/14-day presets and custom date ranges up to 90 days. A slip can span multiple dates. A filter change retains original selections.
- Add, remove, replace and reorder outcomes. One outcome per event per slip. Cancelled, postponed, withdrawn, stale or conflicting records cannot silently become current selections.
- Evidence-coverage shortlists drawn only from existing supported experimental forecasts. They are not positive-EV rankings. Populated slips are preserved, duplicate combinations are avoided and insufficient evidence leaves slots empty.
- Exact minor-unit stakes and rational decimal-price calculations. Singles, doubles, trebles and accumulator comparisons show line count, total stake and the illustrative gross/net if every selection wins with full payout. A supplied current source price is required for every leg. Publisher and user-recorded prices remain explicitly unverified and non-executable. Verified combined price, joint probability and EV remain unavailable.
- Canonical sport-discriminated event contracts, provider keys and source receipts across football, racing, tennis and NFL. Source-backed historical football finals use the existing two-publisher checks.
- Compact sport/competition navigation, nested sport → competition → event snapshot tracker, conditional finals, and asynchronously loaded H2H/recent-form/rankings/source tabs. Sourced racing form and existing football H2H summaries are displayed; missing data is unavailable rather than invented.
- Browser-local research journal with preserved model/source/price observations, SHA-256 integrity checking, original JSON export, conflict-safe storage, and recovery/export of plans saved in the previous paper workspace. Local integrity is not independent timestamp attestation and grants no official challenge credit.
- Complete local claim classification taxonomy, high-risk phrase review, safe source links and private research notes. Source links and positive past profit never verify alleged insider information. No fabricated tipsters, votes, ROI or trust badges.
- Pure sourced player-trend calculations: five unique completed appearances, optional minutes normalization, comparable baseline, configurable thresholds, descriptive scoring streak/drought and evidence-backed roster flags. Production player insight panels remain withheld because the connected feeds do not supply those records.
- Resilient snapshot transport with bounded retries, jitter, cancellation, monotonic publication checks, safety validation, partial last-good retention and pause/resume lifecycle. A separately tested optional WebSocket adapter supports shared reference-counted subscriptions, reconnect/replay and authoritative recovery after sequence gaps. No live endpoint is configured or claimed.

## Architecture

`engine.js` is a pure immutable domain layer. It validates feed identities and chronology, captures original evidence and evaluates paper structures without confusing experimental probabilities with prices. Money uses integer minor units and BigInt rational arithmetic for return rounding.

`store.js` batches state updates and uses selector subscriptions. Event cards are keyed by canonical IDs; refreshed quotes patch existing price nodes. The board renders 24 events at a time, with explicit pagination. Unchanged details, focus and event nodes are retained.

`insights.js` owns sourced player calculations, claim taxonomy and a bounded event/sport/season/source/tab cache. Abort tokens prevent a previously selected event or tab from overwriting the current panel.

`transport.js` separates network availability from source freshness. A successful fetch of old JSON does not refresh its observation time. Faults in one source do not discard other sources or original research.

`desk.js` binds these modules to a semantic DOM. Research inputs render as text; external evidence URLs require HTTPS and reject embedded credentials. There is no runtime UI framework or CSS CDN. Pinned Tailwind is compiled to a static asset; custom component CSS provides the visual system, reduced-motion behavior and price/drawer transitions.

## Data and service blockers

| Capability | Current limitation |
| --- | --- |
| Verified positive-EV or Grade A recommendations | Models remain UNVALIDATED; independently calibrated probabilities, verified exact-market odds and validation evidence are missing |
| Executable live odds and verified combined offers | No authorised exact-market live price service is configured |
| Live score/period/serve trackers | Existing infrastructure publishes snapshots; there is no permitted live subscription feed |
| Full player profiles/advanced statistics/roster flags | Event-linked sourced appearances, baseline metrics, participation and verified roster updates are absent |
| Public community accounts, votes and independently verified performance | Requires authentication, persistent backend services, moderation and prospective settlement evidence |
| Automatic slip settlement, each-way/dead-heat/retirement/partial outcomes | Exact market contracts and independently checked settlement evidence are not connected; all-win figures are arithmetic scenarios only |
| Community-vs-model ROI/CLV and portfolio advantage | Adequate immutable prospective records and matched market/settlement evidence are unavailable |
| New provider redistribution | No new data licence or provider connection has been asserted |

Models remain **UNVALIDATED**. Betting publication remains **BLOCKED**. No personal financial or betting-account statements are used or published. Private community notes and plans stay on the user's device unless they choose to export.

## Verification and maintenance

Run `node tests/test_paper_engine.cjs`, `node tests/test_paper_transport.cjs`, `node tests/test_paper_insights.cjs`, `node tests/test_paper_store.cjs` and the existing `tests/*.cjs`. Run all historical/collector regressions with `python -m unittest discover -s tests` (Windows Python needs timezone data).

The release branch workflow compiles pinned Tailwind, runs all regressions, then runs Chromium interaction tests and axe WCAG checks. It exercises real-feed desktop/mobile/tablet/large-screen layouts and separate synthetic test-only fixtures for cross-day edits, reordering, immutable history, price-node identity, partial failure, untrusted claim rendering and mobile drawer behavior. Synthetic fixtures never enter production feeds.

Rendered screenshots and the exact browser report are retained under `docs/preview/` on the review branch. A mobile animation offset found during visual review was fixed and added to the bounding-box regression.

This is tested research software, not a guarantee of flawless behavior or a demonstrated betting advantage. Authenticated-service load tests and comprehensive physical-device/screen-reader certification have not been performed.

## 3.1 personal research refinements

- Keeps the existing design and four manually requested research approaches. Build scope can follow all current filters or explore all supported sports within the selected dates. Existing nonempty slips remain unchanged.
- Model estimates appear inside expandable model details; the main outcome buttons show actual supplied source observations or Unpriced. Captured estimates remain intact.
- New slips start without a chosen stake (zero internally); the user enters a paper stake per line. Existing saved amounts are preserved. Totals and structure comparisons remain illustrative.
- Oddschecker sport comparison links are available on cards, selected legs and the tracker. Exact match URLs are used only when supplied by a source receipt. No event slugs, odds or automatic Oddschecker feed are invented. The site does not fetch or scrape Oddschecker, and clicking a link does not mark any quote checked.
- Private notes can link to an event and outcome, retain a source/date, distinguish opinion/question/unverified sourced claims, and record a counterargument. Linked notes are visible on event cards and in saved research; nothing is sent to a public service.
- A local append-only manual paper journal records pending/disputed/settled status, an HTTPS result source, reasoning and corrections. Settled monetary totals require original positive stakes and sourced pre-event prices. No payout is inferred. Latest corrections replace earlier totals; disputes are excluded. Mixed-sport slips are excluded from single-sport monetary views.
- The small progress chart uses only actual manually recorded eligible paper outcomes, with sport, saved-date and approach filters. There are no illustrative profit curves. No entries means no chart. All records remain manually supplied and unverified.
- Published snapshot files refresh about once per minute while visible and online, using the existing single-flight/last-good client. This does not collect fresh upstream data or create a live score service.

### Integration limits checked for this release

Sofascore officially offers free iframe widgets (https://corporate.sofascore.com/widgets), but its public API FAQ says data endpoints are not supplied (https://sofascore.helpscoutdocs.com/article/129-sports-data-api-availability). Event-specific approved embed URLs and identity mappings have not yet been verified for this feed. No speculative iframe, 2D player animation or horse-position tracking is enabled. Exact sourced Sofascore links can be displayed if supplied by event receipts. Oddschecker is an external price-check destination, not a connected automatic feed. Player pop-ups remain unavailable because sourced appearance/baseline records are missing. Existing H2H and recent-form tabs display only supplied records. Automatic market settlement is not connected; manual paper bookkeeping does not change model validation or publication gates. Storage remains browser-local; no cross-device sync or account statements are published.

## 3.2 clarity correction

Restores model win percentages directly on outcome buttons at the user's request; model estimates are labelled UNVALIDATED and bookmaker prices remain a separate line. A missing price no longer replaces a supplied probability. Current slip selections show the captured model estimate when no price exists.

Competition choices, sidebar counts and the event tracker now follow the selected dates, search, sport and event-status filters. A competition unavailable after a range change resets to All competitions. Coverage text distinguishes matching events from all loaded records. Captured selections outside the current date range carry an inline warning and remain intact.

The expandable 2D match overview draws a sport-specific pitch, tennis court, NFL field or racing-track schematic with actual supplied participant names, schedule and source-backed final scores where present. It explicitly does not animate players/balls/runners or claim a live tracking connection. No guessed Sofascore match identity is used. Official live widget integration remains blocked on verified embed mapping and delivery, rather than represented by a fake live display.

## 3.3 system model choices

The research desk now loads the compact current horse-predictions-data.json produced by the existing context pipeline. It uses RaceCards.contextForecast to match race identity, start time, full active field, current source hash, conditions signature and observation age. The existing context model already supports Flat/Hurdle/Chase/National Hunt Flat; its parameters and historical archives are unchanged. Percentages from that model are labelled experimental context weights, not calibrated win probabilities.

A current distinct highest model estimate receives MODEL FIRST CHOICE; a distinct second receives MODEL ALTERNATIVE. A tied lead produces no arbitrary first choice; tied second place produces no arbitrary alternative. Racing leaders are pinned into the initially visible runners, including when source order would otherwise hide them. These blue/purple labels are independent of the user's green selected outcome. Source odds never create model leaders. Stale, changed or insufficient model inputs withdraw current labels and display the model's exact blocker. The four research approaches can include an eligible model-backed racing outcome without changing an already nonempty slip.

The compact feed excludes retrospective archives and performance ledgers. Missing going, inadequate same-discipline form or other absent source evidence still prevents a forecast; the interface does not force a first choice to satisfy a visual target. Betting publication stays BLOCKED and model validation stays UNVALIDATED.

## Future racing: manual paper observations

A consistent source-listed field with at least two named active horses, distinct positive cloth numbers, a dated Sporting Life receipt/hash and an allowed pre-race status can be selected manually for provisional paper research. This is not final-declaration verification: fieldConfirmed remains false, prices/probabilities are withheld, the saved leg retains declarationStatus NOT_VERIFIED, and automatic shortlist generation excludes these entries. Unnumbered fields, doubtful/inconsistent runners, missing provenance, cancelled/started races and observations older than 30 minutes remain blocked. Current-day model-backed racing follows its existing checks.

Coverage and meeting calendars are collapsed by default. They use stable element IDs so clock ticks, filter changes and refreshes update a single panel instead of appending copies. The collector requests a refresh every 20 minutes; provider failures and GitHub scheduling delays can still leave a stale observation disabled.

## Racing colour evidence

Both entrypoints load Evidence v3 before the desk. GREEN uses a fresh complete observed bookmaker market where available; a separately labelled complete publisher betting forecast can supply a provisional forecast favourite. Forecasts are never converted into bookmaker quotes, executable prices, model probabilities or paper return calculations. Ties, partial fields, changed receipts and stale observations withhold the favourite.

BLUE requires an attributable primary forum post captured before the race with author, source-reported publication time, explicit selection, matching runner/race and content receipts. RSS headlines and media tips remain unverified leads. The bounded primary checker only accepts structured DiscussionForumPosting/Comment nodes at the exact linked post URL. Blocked pages or missing source metadata do not unlock badges. Source-reported publication times are not independent timestamp attestations. YELLOW additionally requires at least two distinct checked authors explicitly backing value in the same sourced thread, and a unique observed-market favourite; a publisher forecast alone cannot establish yellow. These colours describe evidence, not validated betting value. The community collector checks both current and future racecards.

## Community ingestion follow-up

The collector reads full Atom content, RSS content:encoded, original authors and alternate post permalinks; plural tips/selection headings are recognised. Native full-content Reddit and XenForo records can establish a primary post only with same-origin source receipts, platform post IDs, an attributable author, pre-race chronology and a positive unambiguous horse/course selection. Summaries, third-party headlines and quoted replies do not qualify. At most two observed public Reddit tips-thread feeds are followed to inspect reply selections. No access blocks or rate limits are bypassed. The active Fat Jockey forum feed comes from its advertised RSS link; its older article feed remains a separate blog source.

Community matching counts are exposed in the collapsed audit details. Yellow still requires a current observed bookmaker market and two distinct checked same-thread value backers. A publisher forecast, media endorsement or missing community evidence does not create yellow agreement. Reddit has announced public RSS support ending 13 November 2026: https://support.reddithelp.com/hc/en-us/articles/54353370049684-Changelog-October-8-2026 .
# Racing experimental colours

At the user's request, racing blue accepts dated source-linked forum, social-forum, blog and tipster selections without primary-post verification. Review-only mentions remain excluded. Yellow means a unique leader by distinct source domains also matches the complete fresh observed-price or publisher-forecast favourite. Ties do not award yellow. Both colours are explicitly experimental/unverified, not verified consensus or positive expected value. Primary verification metadata remains available separately; other sports' strict gates, paper-only use, UNVALIDATED and BLOCKED publication remain unchanged.

## Engine view comparison

Both desk entrypoints expose Current Engine 2.5 (default), Experimental Engine 3.0 and Side-by-Side Compare. These are read-only views of the existing engine, not separately calibrated prediction models. The preference uses `value-watch-engine-view-v1`; it never modifies the workspace or legacy saved lists. Four sports, four active approach slots and historical records retain their existing contracts. The 24-event pagination size is unchanged.

The experimental panel follows the selected paper slip. With a supplied captured model input and an eligible current source-matched decimal price, it computes unit-stake conditional EV `p*o-1`, break-even `1/o`, fragility `p-1/o`, derivative `dEV/dp=o`, and Bernoulli payoff variance `o²p(1-p)`. Fixed ±3 percentage-point sensitivity scenarios are clamped to [0,1] and explicitly illustrative, not confidence bounds. A nonpositive fragility margin indicates no positive central EV. Racing context weights are not calibrated win probabilities. Missing/stale/changed inputs withhold calculations. No fallback prices, odds from probabilities, independence assumptions or joint EV are introduced. Calibration, Bayesian uncertainty, adaptive ranking and backtesting remain unimplemented and are labelled accordingly. UNVALIDATED/BLOCKED gates and shortlist generation are unchanged.

Regression: `node tests/test_experimental_engine.cjs` checks mathematics, boundaries, missing inputs, defaults and both entrypoints. `npm run test:browser` additionally checks keyboard activation, selected-button semantics, comparison, persistence after reload, byte-for-byte workspace preservation, mobile overflow and axe accessibility.

## Published selection sources and racing refresh

Sporting Life's public Timeform tips page supplies explicit top-rated selections with source race/horse IDs. Its public Naps table supplies named publication selections with a displayed day, course and time. Both are checked against captured active runners; absent, ambiguous, wrong-day and withdrawn matches are rejected. Source receipts preserve page SHA-256, observation time and identities; unknown publication times are not fabricated. These are publisher opinions (experimental blue), not independently verified grassroots posts. Published tip prices are not imported as bookmaker quotes.

Current runner/market observations, future racecards and publisher selections refresh in the same bounded racing session. A failed future source retains the previous future snapshot without stopping the current-race model work. A successful main regression can trigger the existing age-gated fallback refresh; recent snapshots stop recursive refresh. Existing six-cycle active sessions and schedules remain bounded; GitHub scheduler delays can still exceed the unchanged 30-minute freshness limit. Snapshot-to-screen QA now compares actual green, blue and yellow counts on desktop and mobile.

## One blue leader and additional backups

The racing view includes a count of green favourites, blue leaders and yellow agreements across the selected dates and a jump to the first highlighted race. Individual missing forecasts explain incomplete/unpublished fields, rather than implying the whole range has no evidence. The publisher's explicit “No Forecast Available” and OLBG's canonical “No tips found” page are source absences, not parser failures. No model badge is shown on an unranked runner.

Racing blue now marks only the unique leader by distinct captured source identities. Equal support displays No clear leader and awards no blue or yellow. Named publications in the source-backed Naps table count once per horse, and duplicate Timeform records share one identity. Other sites contribute one domain vote per horse; OLBG aggregate totals never become multiple verified authors. Yellow still requires that unique leader to be the observed-price or publisher-forecast favourite. Other source opinions remain visible without blue borders.

OLBG public win-tip rows are a supplemental source, matched by exact start time, course and active horse name. First-page coverage is partial. The Racing Forum official advertised RSS is conditionally monitored: one probe returned ten dated posts, another returned 403. Only positive own-body selections with same-day publication, matching course, runner and off time can become experimental source observations. Quotes, negations and undated/ambiguous mentions remain review-only. Punters Lounge returned 403; Betfair Community returned a browser compatibility challenge. Both remain manual links, not active automated backups.
