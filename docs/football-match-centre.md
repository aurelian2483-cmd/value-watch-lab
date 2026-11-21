# Football Match Intelligence Centre

The preview is served at `/football-match/` from the `codex/value-watch-development` branch. From a local checkout, run `python -m http.server 8000 --bind 127.0.0.1`, then open `http://127.0.0.1:8000/football-match/`. The local market screen links to the exact fixture after an observation passes the verifier. The production homepage and data publishers have no new entry point.

[Desktop screenshot](preview/football-match/1440.webp) · [Mobile screenshot](preview/football-match/390.webp)

## Branch and research history

- Merged main commits `271c8e84` (future racing), `5ecc4ce1` (racing source observations), and `8b58e759` (Hybrid market). Main then advanced with daily racing, future racecards and publisher selection updates. Those commits were reconciled through `1f5dc292` and the market and racing snapshots match that main snapshot byte for byte.
- The PR #109 journal assertion remains in branch history and both desk entry points retain journal revision 3.
- Merged the exact draft PR #114 head into development. The catalogue, Sky 81 grid, archived Phase 3 replay and PR head's historical football baseline remain intact. PR #114 retains its own review history.

## Evidence contracts

| Area | Preview behavior |
| --- | --- |
| Fixture identity | Expanded football uses an ESPN event key with exact competition and ordered participants. Source-free identity uses competition, ordered participants and UTC kickoff. A repeated, consistent ESPN key can carry a newer kickoff when both observations are present. Conflicting identity, same-time contradictory revisions and two provider IDs owning an exact fixture are withheld. |
| Market crosswalk | An exact fixture and kickoff must match. GoldEdge uses a provider event ID bound to its receipt URL and reviewed participants. Sky Bet uses the captured event ID and full-time market ID, with ordered participants cross-checked against its source URL. Provider IDs that bind to multiple fixtures or conflicting observations are withheld. |
| Pre-event cutoff | The 1X2 capture uses regulation time, a complete Home/Draw/Away set, a source URL and SHA-256, and a consistent HTTP date, observation, capture and snapshot chronology. The existing 30-minute capture window and five-minute pre-kickoff buffer apply. Reschedules retain the earliest known kickoff as a conservative cutoff and do not attach an old kickoff's prices to the revised fixture. |
| Models and match facts | The preview shows available forecast vectors, observed time, supplied cutoff, eligible recent venue sample and descriptive H2H. Model names, source evidence and limits follow the supplied evidence. The separate 608-row historical reconstruction compares both variants on the same match, reports the matched-sample Brier and log loss, and explicitly labels its retrospective earlier-date cutoff. |
| Navigation | Event, competition and search appear in the URL. Desktop fixture links and the mobile picker share the same state. Back restores the previous URL. The preview does not read or write paper slips, journal or application storage. |

## Limits

- The snapshots do not supply verified lineups, player stats, a match timeline or a live status stream. Kickoff elapsed is shown separately from a verified final. Some games have no detailed receipts, model cutoff or historical team inputs.
- A source hash is retained provenance metadata. The browser does not retrieve or rehash original provider payloads and does not independently certify the snapshots.
- The schedules contain no durable cross-provider alias registry or complete revision history. A fallback fixture without a provider ID cannot safely follow a change in kickoff, and old event links can become unavailable when a fixture drops out of the snapshots.
- No accessible copy of the sports website ZIP was available. The fixture rail, mobile picker, event header, evidence disclosures and comparison chart are original adaptations of the interaction patterns in the audit, without copied assets or code.
- Models stay **UNVALIDATED** and publication stays **BLOCKED**. The preview has no bets, bookmaker accounts, live odds requests or deployment.

## Verification

`node tests/test_football_match.cjs` covers reschedules, missing and conflicting providers, incomplete markets, stale and post-cutoff captures, research archive gates and the journal revision. `node scripts/football_match_browser_qa.cjs` exercises both widths against a local server, including the market handoff, keyboard access, filtering, Back, shared links, storage preservation, reconstruction and source failure. GitHub branch-push checks run full research regression and no-deployment browser QA.

## Strict model training cutoff

Eligibility requires an explicit timestamp with a time zone, at or before the earliest known kickoff and at or before the recorded model observation. The observation itself must precede the earliest known kickoff. Training receipts must have a safe source URL, SHA-256 and a valid observation timestamp at or before the explicit training cutoff. Every receipt must pass this check. The verifier checks supplied metadata and does not independently audit the training dataset.

The preview preserves gated, matched probability estimates that fail these checks under **UNVERIFIED EXPERIMENTAL ESTIMATES**, with the recorded provenance and a reason. They are excluded from the eligible chart and the market model-leader calculation. The separate retrospective archive retains its own earlier-date cutoff and performance sample.

[Manchester City v Fulham desktop](preview/football-match/cutoff-1440.webp) · [Manchester City v Fulham mobile](preview/football-match/cutoff-390.webp)

The receipt boundary screenshots use synthetic observations in the browser test. An exact-cutoff receipt remains eligible and a receipt one microsecond later is withheld. The original Manchester City v Fulham estimate remains visible with its missing-cutoff reason.

[Receipt boundary desktop](preview/football-match/receipt-cutoff-1440.webp) · [Receipt boundary mobile](preview/football-match/receipt-cutoff-390.webp)

## Phase 3 analytical workspace

The preview now uses a persistent fixture rail, a compact mobile picker and anchored section navigation. Competition, query, selected fixture and section are represented in the URL. Filters preserve an explicitly selected fixture while the matching list changes.

Match Facts shows recent form, venue-specific samples, goals per match, an expandable results timeline, and recorded head-to-head meetings where records match. The Premier League view uses the 608-row retrospective reconstruction with explicit club aliases. Other competitions use the published expanded-football finals with two source hosts. Duplicate identical finals count once; conflicting scores are withheld. Results on or after the fixture cutoff date are excluded from descriptive history. Counts and rates describe that source sample and can omit real matches. This history never changes model eligibility.

The Models view offers side-by-side eligible estimates and the largest outcome disagreement in percentage points. The retrospective reconstruction has its own matched-sample Brier and log-loss evidence. The discrepancy between two estimates is not a confidence interval. Missing eligible models remain explicit, and the unverified section retains original estimates and reasons. The Sources view shows fixture snapshot age and preserves the existing receipt disclosures and cutoff gates.

The archive and expanded snapshots do not supply verified lineups, player or injury data, complete league histories, or in-match timelines. A useful next step is a versioned results feed with stable team IDs and full season coverage, followed by documented lineup and event feeds and prospective matched-sample calibration.

[Desktop match](preview/football-match/phase3-1440.webp) · [Tablet match](preview/football-match/phase3-820.webp) · [Mobile match](preview/football-match/phase3-390.webp) · [Historical model comparison](preview/football-match/phase3-models-1440.webp)

## Phase 4 fixture discovery

The desktop rail and native fixture picker group their results by Europe/London calendar date. Date, competition, search, status and favourites-only filters combine in the URL. Previous and Next follow the order of the filtered date groups, and browser Back restores the prior fixture and filters. An explicitly selected fixture remains open outside the filters with a clear notice. Filter changes retain the current fixture's open evidence and chart controls.

Favouriting a competition adds a pinned shortcut. Favourites use a new browser-local key, `value-watch-football-discovery-favourites-v1`. Existing paper selections and journals keep their existing storage contracts. Favourites are local to a browser, so the favourites-only filter in a shared URL uses the recipient's preferences. If storage is blocked, favourites remain available for the current page session.

A scheduled match is a future kickoff in the snapshot. Elapsed kickoffs remain separate from finals. A source-backed final requires an exact competition, ordered participants and kickoff match against the existing two-source regulation-time evidence. The archive remains a separate historical reconstruction. The snapshots provide no live or independently verified in-play status.

[Desktop](preview/football-match/phase4-1440.webp) · [Tablet](preview/football-match/phase4-820.webp) · [Mobile](preview/football-match/phase4-390.webp)
## Phase 5 — fixture-local market and evidence matrix

The Match Centre now includes a dedicated **Markets** section. It uses only the existing paper-lab/hybrid-market-data.json observations after the exact fixture, regulation-time 1X2, source URL, provider event ID, participants, complete Home/Draw/Away price set, source hash, and timestamp chronology pass the existing verifier.

The fixture matrix shows source, all three decimal prices, raw implied probabilities, proportional no-vig reference probabilities, overround, observation/capture times, and a disclosure containing provider identifiers, market ID, source URL, source hash, snapshot and HTTP date. Rejected source observations retain fixture-specific reasons where the fixture can be identified. The separate Market Intelligence page adds a source filter and the same provenance/history treatment.

**Movement and opening-price limits:** the currently committed football market snapshot contains five fixture records and six source observations (five Pinnacle-via-GoldEdge and one Sky Bet). It contains no repeated capture for the same fixture and source. Therefore all current source histories have one observation; opening prices and price movement are unavailable. The UI labels the earliest recorded capture as an observation, never as the market opening. A movement is calculated only when two or more observations share the same fixture, source event, source, market, settlement period, source market ID and outcome set. Same-time conflicting quotes or changed provider market identity are withheld.

Overround is calculated as the sum of the three raw implied probabilities minus one. The proportional no-vig reference divides each raw implied probability by their sum. This is a transparent normalization, not a validated true probability or expected-value calculation.

Model-to-market comparison is shown only when the model passes the explicit training cutoff, model-observation and every training-receipt timestamp/hash/URL check. The current five frozen comparison records have training cutoffs at their fixture kickoffs but model observations earlier than those cutoffs; they therefore fail the strict cutoff rule. No eligible model-to-market comparison is currently shown. Unverified estimates remain separate, and the matrix does not calculate EV, publish selections or recommend bets.

The current main snapshot records the GoldEdge collection as **RATE_LIMITED**. These are historical captured observations, not live prices. No copied-site code, unauthorised endpoint or new provider feed was used. The current dataset does not support reliable opening-to-latest movement, live market depth, exchange liquidity or complete bookmaker coverage.

### Phase 5 verification

The football regression now covers repeated comparable observations, deduplication, overround arithmetic, source-market ID changes, reused provider IDs, conflicting same-time quotes, and model eligibility. Browser QA checks the fixture Markets section and the dedicated market source filter at desktop, tablet and mobile widths. Existing cutoff, market completeness, exact fixture identity, journal/storage, model status and production safeguards remain in force.
