# Secondary Tennis result provider feasibility — not production-connected

Research review completed 16 November 2026. The current automatic collector **does not** approve or certify independently corroborated Tennis outcomes.

## Candidate external sources

- [Tennis API results documentation](https://docs.tennis-api.com/results): documents result types `completed`, `retired`, `walkover`, `default` and winner/player identifiers, which are essential for safely withholding nonstandard settlements. Core player and match IDs do **not** equal ESPN's event/player IDs; robust ID mapping is required.
- [Tennis API getting started](https://docs.tennis-api.com/getting-started): identifies distinct live/core match ID namespaces and warns about ambiguous player names and returning 400 for duplicates.
- [Tennis Database API player-matches docs](https://tennisdatabaseapi.com/documentation/endpoints/player-matches): documents scores and retirement statuses but says the endpoint is unavailable on the free tier (403 upgrade required).
- [Third-party survey of publicly reachable tennis data](https://sportsapis.dev/tennis-api): describes theScore tennis endpoints as a possible free second source; its exact contract, licensing, identity coverage, stability and retirement/withdrawal semantics are not established by this project.

## Release blockers (explicit)

1. Legal/API terms permitting automated collection; if access is paid, a vetted credential and supported tier.
2. Frozen ESPN IDs must map one-to-one to external player names/IDs, tour, tournament edition and event date **before** scoring.
3. Rescheduled matches, doubles, walkovers, defaults, retirements, postponed finals and ambiguous duplicate player names must fail closed.
4. Real observation endpoints must be tested against *completed* events and source response receipts captured at read time.
5. Conflicts must enter human review. Do not automatically write `results-feed.json` even with apparent agreement.

**Decision:** no fabricated Tennis second-source data, no unverified provider claims labelled as independently verified, and no new third-party API key silently purchased. Tennis remains marked `NOT_ESTABLISHED` in the Phase 9–14 weekly source-health report.
