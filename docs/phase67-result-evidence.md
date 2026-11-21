# Phase 67 | Result receipt review

The [coverage inventory](all-sports-coverage.md) and the archived result review queue identify an improvement possible with the repository's existing observations. Previously the Validation Centre could show NFL agreement from the summary alone when the primary or secondary evidence failed to load. Tennis entries linked to the source pages but omitted the receipt timestamps and hashes.

The Validation Centre now joins each reported review candidate to its frozen forecast and both archived source observations by prediction ID, sport, exact fixture identity, market and outcome. It checks participant IDs, zoned chronology, archive generation times, source paths and receipt hashes. Duplicate and conflicting rows are withheld. A missing or mismatched archive shows an explicit reason. A queue or receipt archive older than 72 hours remains available as a historical view. The browser emits no new source requests, outcome records or model scores.

On the checked-in snapshots as of 21 November 2026, 12:00 UTC, **23 tennis and 2 NFL** matches now expose both dated source links and both receipt fingerprints. Tennis distinguishes an archived PDF receipt from a reviewed-facts fingerprint. NFL shows the archived schedule CSV score and game ID. These are material for human review. Different domains and hashes do not prove upstream independence, licensing or authenticating custody.

| Sport | Change and remaining dependency |
| --- | --- |
| Football | No new coverage. Existing exact fixture and 90-minute market matching stays in place. Time-matched executable prices and prospective inputs still require permitted access and independent evidence. |
| Horse racing | No new coverage. Existing race and runner receipts remain observational. Current declared fields, executable win and place prices, and independently reviewed settlement need approved sources. |
| Tennis | 23 archived results now show both receipt links, times and fingerprints. Human reviewers still need to verify exact external player/match mappings, collection rights, final status and retirement or walkover handling before any certification. |
| NFL | Two archived results now show both receipts and the exact archived nflverse score and game ID. Human reviewers still need to verify the source mapping, reuse rights, independence and overtime settlement before certification. |
| Rugby | No new coverage. Pro D2 and provider schedules are sampled. League calendar evidence does not establish Union outcome or market coverage. |
| Darts | No new coverage. Exact match time, approved retention and independently reviewed result evidence remain open. |
| Basketball | Discovery only. Needs authorized stable fixture and settlement feeds. |
| Cricket | Discovery only. Needs authorized stable fixture feeds and verified void/settlement cases. |
| Golf | Directory only. Needs an authorized schedule and stable tournament and player identities. |

## Access and reproduction

Inspected the forecast capture, first-provider result observation, secondary NFL collector and reconcile workflow. Configured secret names are `FOOTBALL_DATA_API_KEY`, `HORSE_RACING_API_KEY`, `RACING_API_USERNAME`, `RACING_API_PASSWORD` and `DARTS_API_KEY`. None was available in the local process. No secret values were read or printed. No fixture, odds or result endpoint was called in this phase. The official provider documentation was reachable and did not establish a new collection or redistribution grant. [Tennis API result statuses](https://docs.tennis-api.com/results) · [nflverse schedule docs](https://nflreadr.nflverse.com/reference/load_schedules.html) · [Football-data.org access policy](https://docs.football-data.org/general/v4/policies.html) · [The Racing API documentation](https://api.theracingapi.com/documentation)

```sh
node tests/test_result_review_receipts.cjs
node scripts/all_sports_browser_qa.cjs
```

The focused test joins the real repository archives and separately mutates copies to test missing feeds, staleness, duplicates, sport isolation, contradictory scores and fixture timestamps. The browser check opens the real evidence at 1440 and 390 px, simulates a receipt fetch failure and verifies recovery. See `result-receipts-{1440,390}.png` in the browser artifact.

**New eligible real forecasts: 0. New eligible real outcomes: 0.** The frozen archive contains 64 experimental forecast entries and the verified outcome feed is empty. Qualification, scoring inputs, research-only status, **UNVALIDATED**, and **BLOCKED** remain in place.
