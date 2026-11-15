# Darts Research — D1 (research-only)

## Status
The public Darts research page is a **working Elo calculation and inspection interface**, not a source-verified live darts betting model. It is reachable from the Value Watch Pro homepage at `darts/`.

- All research probabilities are **UNVALIDATED**, `publication_gate: BLOCKED`.
- No live bookmaker prices, EV, paper-slip selections or betting recommendations.
- Published feed `feed.json` is intentionally empty until a dedicated collector with permitted API credentials, provenance, and source acceptance checks is approved. Do not populate by guessing.
- The optional browser import is local-only and explicitly **unverified**.
- This implementation does **not** change the original four sports, existing slip engine, archived bets, or V1/V3+ racing models.

## Mathematics
Deterministic Elo K=24, base rating 1500, logistic probability `1/(1+10^((rating_b-rating_a)/400))`.
One UTC day's match results are updated as a batch from ratings at the prior day's boundary, eliminating arbitrary ordering within dates. Requires at least eight completed matches per player before a forecast is shown. Includes only completed, timestamped, unique, winner-labelled two-player records before the forecast cutoff. Predictions are not independently calibrated.

Checkout %, three-dart averages, opponent form, venue, starting advantage and match leg/set formats remain deliberately **not implemented** until independently sourced and properly assessed. Elo is a match-level baseline, not a validated leg-by-leg probability.

## Data contract
Local JSON: `{"results":[...],"fixtures":[...]}`. Result: `id`, `played_at` ISO UTC, `status:"FINAL"`, `player_a:{id,name}`, `player_b:{id,name}`, `winner_id`. Fixture: `id`, `start_utc` ISO UTC, `status:"SCHEDULED"`, `competition`, `player_a`, `player_b`. Fixture start must be >5min after evaluation. At most 50,000 results and 1,000 fixtures, max 3MB file in browser. Invalid inputs fail closed. Browser local input must not be treated as independently authenticated.

## External data integration
Darts API documentation: https://dartsapi.com/documentation. It requires a key, free results are delayed; terms, redistribution permission, schedule timestamps, final settlement, completeness and rate limits must be verified before a server-side collector can be authorised. Never embed API keys in published browser JS or static site JSON. Do not scrape unauthorised sources. After implementing a collector, use a separate CI workflow with scoped permissions and a secret, keep a preserved source digest and observation timestamp per result, and update the published status only after a reviewed schema and publisher-rights check.

## Verification
`node tests/test_darts_model.cjs` — mathematical sanity, deterministic and fail-closed controls.
No historical backtest, pre-event forecast pairing, calibration assessment or odds-based EV has been performed here.
