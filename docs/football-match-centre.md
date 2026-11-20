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

Eligibility requires an explicit timestamp with a time zone, at or before the earliest known kickoff and at or before the recorded model observation. The observation itself must precede the earliest known kickoff. Training receipts must have a safe source URL, SHA-256 and an observation timestamp no later than the model observation. The verifier checks supplied metadata and does not independently audit the training dataset.

The preview preserves gated, matched probability estimates that fail these checks under **UNVERIFIED EXPERIMENTAL ESTIMATES**, with the recorded provenance and a reason. They are excluded from the eligible chart and the market model-leader calculation. The separate retrospective archive retains its own earlier-date cutoff and performance sample.

[Manchester City v Fulham desktop](preview/football-match/cutoff-1440.webp) · [Manchester City v Fulham mobile](preview/football-match/cutoff-390.webp)
