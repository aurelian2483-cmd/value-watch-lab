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
