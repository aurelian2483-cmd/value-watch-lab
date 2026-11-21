# Phase 3 integration and five-site reference review

Reviewed Match Centre commit `0495ac42` and main snapshot `158c100b`. This review leaves the Phase 3 interface, evidence gates and research catalogues intact.

## Racing schedule and integration

Newcastle race **950179**, Make The Move To Midnite Handicap (Div 1), kept the same race and runner IDs across two captured schedules. Both captures name **Mr Moonshine**, runner **93135**, as the first Timeform choice on the Sporting Life racecard.

| Evidence | Scheduled start, UK | Capture, UK | Provenance |
| --- | --- | --- | --- |
| Original verdict | 21 Nov 14:48 | 20 Nov 07:47:34, first seen 19 Nov 16:49:03 | `verdict-b3d3791f3032298f25ead5a9`, source SHA-256 `8ec4e6d2d36090f1f70666edbcf4b38004a2dda8ca9de6b48a495f46213da54c` |
| Later future-card observation | 21 Nov 14:49 | 20 Nov 21:14:05 | Future card at commit `0495ac42`, runner source hash starts `8af3866c1b1a` |
| Daily card and replacement verdict | 21 Nov 14:49 | 21 Nov 00:13:44 card, 00:13:56 verdict | Card from `37d3ee7c`, verdict `verdict-219c9069db87b99a99648bfb` refreshed by `b960aac9`. Shared source SHA-256 `e95ac9fc50c82359641e37072d15f25368bab9fd32ba5707a6b8644f5a87cbea` |
| Publisher listing | 21 Nov 14:49 | 21 Nov 00:14:59 | `publisher-ddf7d99122ba15011cfaedfd`, separate Timeform listing page via the same publisher, hash begins `5640ee1ad511` |

14:49 is authoritative for the current captured **schedule**. The records do not establish actual off time or independent corroboration. The earlier 14:48 capture remains historically valid. The failure arose because both revisions remained classified as current public selections after the race entered the daily card, so its old selection failed the exact-time assertion.

The record now carries `HISTORICAL_SCHEDULE_SUPERSEDED` and a link to the later receipt. Its original time, source hash, receipt, selection and observation history remain intact. The one-record reconciliation requires the audited IDs, historical hash and exact successor receipt on the current card. It leaves unmatched or ambiguous input untouched. The combined CI runner applies the same reconciliation after overlaying raw main data and before running the unchanged exact-time assertion. The output remains confined to the runner. Other schedule changes require their own supporting evidence.

### Main review and synchronisation

| Main changes since merge base | Treatment |
| --- | --- |
| `d1f0244a` prospective Tennis/NFL evidence, `a407aea9` seven-competition result reliability | Already present as equivalent patches |
| `31c5da5f`, `37d3ee7c` daily racing cards, forecasts and associated evidence | Cherry-picked in order |
| `b3ff9fd2`, `ed0d601b` future racecards and coverage, `cb5ab063` seven-day schedules | Cherry-picked in order |
| `ac9da0e0`, `b960aac9` publisher selections, `1a9dac32` candidate community archive, `2bde43eb` read-only horse evidence status | Cherry-picked in order |
| `d52f42cb` research dashboard, `1d416637` international fixtures, `2c774b13` expanded football, `158c100b` rugby | Cherry-picked in order |

All 15 patches are represented on development. No merge or deployment. The maths catalogue, Sky 81, PR #114 ancestry, both cutoff fixes, and Phase 3 application files are preserved. Models remain **UNVALIDATED** and publication **BLOCKED**.

## Archive scope and evidence quality

The supplied ZIP contains 414 members, approximately 24.5 MB uncompressed. All five `index.html` captures, bundled CSS and JavaScript were inspected statically. Local assets include icons, sprites, branding, fonts and campaign imagery. Raster dimensions and the largest image candidate were checked. No full-page screenshot was identified. No copied code ran, and no network requests were made from a copied page. Bundle identifiers show implemented or planned code paths, while static labels and embedded initial state give stronger evidence of what the capture exposes. Neither demonstrates that the copied backend or interactions work offline.

| Site | Capture inventory | Observed interface and design pattern | Comparison with Phase 3 |
| --- | --- | --- | --- |
| **Flashscore** | 152 files, 48 CSS, 33 JS. `index.html`, `3323d236c95f10798c8dfa7e.css`, `1b71e6f16484461aaca54fba.js`. Downloader skipped 844 links. | Visible Scores, News, Favourites, Pinned Leagues, My Teams, country-to-competition tree, and match links. The main score area includes a loading state. Event-row and scoreboard styles plus lineups and standings bundle references support a dense discovery layout. No complete live match or lineup interaction was verified. | Phase 3 already has sticky section navigation and exact fixture URLs, but a single competition selector and flat rail take more work to scan. Add date and competition grouping, a pinned view, and clear fixture evidence states. New live score and lineup data would need separate feeds. |
| **OddsPortal** | 138 files, 4 CSS, 22 JS. `index.html`, `1b81e1e7fb6bfba7a14f21ae.css`, `a176cbed68986cb50df0a40a.js`. Report notes 222 skipped links and one missing SVG. | Visible match status categories, featured competitions, archived results, standings, odds format controls, market research destinations and opening/current/moving odds descriptions. The odds-history bundle supports the design direction. Account coupons and promotional areas are outside scope. | Phase 3 surfaces market receipts and links to an existing read-only price screen. A fixture-local source × outcome matrix and explicit chronology would reduce navigation. Movement only makes sense for two or more comparable complete observations with exact event, market and source matching. |
| **Betfair** | 44 files, 2 CSS, 4 JS. `index.html` contains `skeleton-content` and `picker-root`. `40bc0e9d41846c062ba78141.css` and `790e835bc22815963d6426f9.js` contain market, sticky, refresh and price-change clues. The 3000×1442 asset is stadium seating imagery. | Exchange identity and a shell are visible. Market/coupon styling and price-change references suggest compact updateable rows. Back/lay execution, liquidity and cash-out were not observed in a functioning capture. | Borrow compact aligned outcomes and changes between verified snapshots. Value Watch has no exchange depth or execution contract. A complete source-price matrix is feasible, while exchange depth and live prices would require separately scoped evidence and rights. |
| **Paddy Power** | 43 files, 2 CSS, 6 JS. `index.html` renders an error shell and empty `page-container`. `1d5c4f065422278b5cac4b41.css` contains scoreboard and market styles. `7798be69d32858ec2e51d2ed.js` references in-play and lineup features. Most large JPGs are wide campaign assets. | The visible page says the service is having issues. Localised labels hint at A–Z navigation and progressive expansion, with no working fixture, match-stat or market screen demonstrated. | The useful design lesson is a clear partial-failure state with successful source sections still available. Phase 3 already retains partial evidence and can improve per-source retry and coverage reporting. |
| **Sky Bet** | 37 files, 10 CSS, 17 JS. `index.html` has a root shell and `__TBD_PRELOADED_CATALOG__`. `3041e75c583ed9f8c19e6cc8.css` includes scoreboard and market styles. | Embedded structured data contains one home view, a sport ribbon, ten sport link cards, four quick-link grid groups, a sidebar and a bottom bar. Bundle references to lineups and event tabs are weaker evidence than the captured navigation catalog. The capture supplies no verified football match payload. | Use a progressive route from competition to fixture to evidence, with frequent destinations available on mobile. Phase 3 already has keyboard-friendly section navigation, so enhance its discovery layer without duplicating it. |

### Where Value Watch can differentiate

Phase 3 already has shareable fixture and section state, source-gated form and venue comparisons, historical timelines, eligible probability comparisons, receipt timestamps, and explicit unverified estimates. The strongest opportunity is to combine reference-grade discovery and market reading with **reproducible evidence**. For a single selected fixture, readers should be able to trace the event identity, price observation, model cutoff, result coverage and comparable historical sample through to the original receipt.

| Rank | Improvement | Feasibility and acceptance evidence |
| --- | --- | --- |
| 1 | **Competition and fixture navigation** with date groups, pinned leagues and fixture-state filters | Existing fixture IDs, competition, kickoff and URL-state contract are enough. Preserve selected fixture and section through filters and Back. Provide keyboard access and distinguish elapsed kickoff from a verified final. |
| 2 | **Fixture evidence and market matrix** with selectable source rows and cutoff timeline | Reuse recorded 90-minute 1X2 and model receipt contracts. Show source, hash, observed/captured times, completeness, disagreements and withheld reasons. Render movement only for genuinely comparable repeated captures. Leave unverified estimates outside comparisons. |
| 3 | **Coverage-aware team and competition dashboards** | Reuse Phase 3's 608 retrospective Premier League results and the 66 expanded-competition finals in the reviewed snapshots. Add matched date range, denominator, venue/competition filters and accessible chart tables. These can show the observed sample; complete standings require a complete result feed. |
| 4 | **Auditable historical model comparisons and calibration** | Existing reconstructed variants support paired retrospective comparison. A prospective view needs frozen pre-event vectors, matching outcomes and baselines, sample sizes, uncertainty and independent evidence. Neither the mathematical catalogue nor the Sky 81 grid supplies model validation. |
| 5 | **Match events, lineups and live updates** | Acquire rights to a versioned data feed with stable IDs and pre-event chronology. Pilot one competition, then test delay, absent lineups, disputed events and reconnect behaviour. Player stats, xG, injuries and event timelines remain unavailable until sourced. |

Use original HTML, styling, icons and terminology for any approved next phase. Navigation grouping, progressive disclosure, semantic status columns and comparison layouts are reusable interaction concepts. The ZIP does not establish permission to reuse vendor code, stylesheet content, branding, fonts, club/media assets, captured data or endpoints. A script reference to WebSocket or polling is no grant of feed access. Any integration needs authorised usage, display and retention terms, attribution where required, and its own data and security review.
