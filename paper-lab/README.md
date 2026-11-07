# Value Watch Lab 3.0 - research workspace

Open `paper-lab/` from the existing dashboard. This is an additive static workspace, not a sportsbook or validated betting model.

## Implemented

- Four optional paper-slip slots for each chosen UK date, 0-12 legs per slot, across football, racing, tennis and NFL. Manual hypotheses only; no automatic forced daily picks.
- Separate adapters over the existing five published JSON documents. Unsupported dates show unavailable coverage. Premier League rows without per-event receipts remain blocked; no attribution is invented.
- One outcome per event per slip; duplicate checks, pre-event five-minute buffer, snapshot/source expiry, field status checks and source price matching. Changing/removed outcomes cannot remain silently current.
- Captured labels, sources, timestamps and quotes are preserved separately from current checks. Racing quotes are publisher observations marked unverified and non-executable. No combined price, payout, calibrated EV or settlement is inferred.
- Browser-local date persistence, export, read-only history snapshots, storage failure and cross-tab safeguards. Local history is not an independently attested prospective ledger and earns no official challenge credit.
- Sport-agnostic event cards, source/statistics disclosure, conditional historical final-score accordion through existing two-publisher result normalization. No live score claims.
- Community methodology/claim review preview with safe text rendering and high-risk claim disclosure. Source links are not fact verification. No fictional profiles, votes, trust scores, win rates or ROI.
- All pre-existing dashboard functionality, browser storage keys, collector workflows and historical datasets retained.

## Blocked or deliberately withheld

| Capability | Missing prerequisite |
| --- | --- |
| Player props and player insight statistics | Event-linked sourced data, participation, market definitions and permission to use it |
| Verified odds / combined prices / betting EV | Licensed exact-market provider, current quote and settlement verification, calibrated independent model and joint dependency model |
| Automated four-slip selection/ranking | Validated selection policy and adequate permitted evidence; empty slots are valid |
| Community profiles/voting/results | Authenticated service, moderation, append-only pre-event records, result/settlement verification and abuse controls |
| Public community ROI / trust badges | Independently verified prospective sample and transparent methodology; past profit cannot verify hearsay |
| Historical slip ROI / automatic settlement | Frozen price evidence, identity matching, void/dead-heat/each-way/correlation rules and independent results |
| Real-money publication | Explicitly BLOCKED; every model remains UNVALIDATED |
| New live connections / expanded redistribution | API access and provider licensing have not been established |

No personal account statements are used or published. Community input stays in the page and is never submitted to a server. Slips/history stay in browser storage unless the user exports them.

## Validation

`node tests/test_paper_lab.cjs` checks real-feed adapter compatibility, price/field matching, dates/DST, leg limits, stale source handling, score provenance, immutable capture and publication gates.

`node tests/test_paper_lab_ui.cjs` executes the application against a lightweight DOM harness: single-flight refresh, partial failure retention, expiry, persistence, history, redundant-render avoidance, safe claim rendering and cross-tab lockout.

All `tests/*.cjs` and all 115 Python regression tests pass locally after the portable evidence path fix. Windows Python needs `tzdata`; CI uses Linux system timezone data. The new read-only regression workflow runs the full suite on pushes and PRs.

Visual verification remains incomplete: the connected browser preview failed to create a tab; the Chrome window was minimized and unavailable to that control interface. Responsive CSS uses a single column below 800px, wrapping content and minimum 44px controls, but this is not a claim of rendered mobile QA.
