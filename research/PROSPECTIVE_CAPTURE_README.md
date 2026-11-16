# Phase 6 — Prospective evidence collection (staging, not model approval)

This release is **stacked on PR #77** (the Independent Validation Centre). It cannot be deployed independently until PR #77 is merged or the integration branch is rebased onto current main.

## What exists
- A testable, offline, read-only source adapter for current `other-sports-data.json` (Tennis and NFL only).
- A one-time, first-write-wins capture into the existing `prediction-ledger.json`, with recorded-at UTC, event ID, sport+market+model identity, model outcome probability vector and source/training fingerprints.
- A bounded scheduled capture workflow (once hourly at minute 35, GitHub Actions schedules are not guaranteed exact). PR checks remain read-only.
- A `research/prospective-capture-audit.json` record of source rejections and capture counts.
- A `research/pending-independent-results.json` queue for events older than six hours without a result record.

## Controls
- No odds, EV, wager, or betting recommendation is generated.
- Existing ledger entries are never edited, and repeated scheduler runs do not duplicate them.
- Late, stale, ambiguous, invalid, nonpre-event, incorrectly scoped or uncalibrated-model-probability input is withheld.
- Revision of an existing event/model/market does not alter the frozen first version, even if its probabilities change. The same unique prediction ID remains first-write-wins.
- **Neither collector writes to \`results-feed.json\`**. A single ESPN response is not independent verification. The result observation queue cannot establish a verified score or certified model performance. No selection is settled automatically.
- The existing external football result script uses a **different legacy schema** and is not connected automatically.
- Every distinct sport requires independently proven market semantics and an approved source adapter. This first release supports the existing Tennis and NFL producer only; Football, Horse Racing, Darts, Rugby Union and Rugby League will have separate connectors after source/identity/chronology review.
- Git commit history gives a record of changes but **does not itself guarantee a tamper-proof or cryptographically immutable archive**. Independent protected storage, audit credentials and outcome-source corroboration are necessary for a certified result.

## Scoring
The Independent Validation Centre will be able to read captured records, but eligible scored pairs remain zero until independently verified outcome records exist. Missing outcome data must not be filled using guessed sources or historical summaries.

## Testing and release
`python -m unittest discover -s tests -p 'test_prospective_capture.py' -v` checks duplicate handling, pre-event timestamps, unknown outcomes, sports/matchup identity, source age, portfolio non-interference, queue withholding and unchanged ledger on repeat.

`research-regression.yml` runs all JS/Python tests on PR events. `prospective-evidence-capture.yml` also executes the isolated capture tests on the PR but does not publish anything until separately approved and merged.

Before merging:
1. Merge PR #77 or rebase this feature onto current main and resolve any differences in evidence contracts.
2. Verify the latest live source payload produces valid captures and audit the exact result counts.
3. Verify the scheduled workflow has repository write permissions and that branch protection/Actions concurrency avoids simultaneous record writes.
4. Approve publishing **experimental research records only**, then explicitly enable the scheduled run. Do not promote betting models or grading gates.
