# Bottleneck Lab — evidence bridge (research-only)

This additive module connects the isolated Bottleneck selector to *existing repository evidence* without changing the website, selecting a betting outcome, deploying an engine, or activating the 250-method tournament.

## Inputs
- `research/football-baseline-v1/608-reconstructed-forecasts.json`: recomputes two historical reconstructed Poisson probability scores for the **same 608 match records**; checks score and season counts. Neither reconstructed variant is a verified identity match to Current Engine 2.5 or Experimental Engine 3.0.
- `prediction-ledger.json`: reads saved pre-event forecast receipts; validates basic timestamps, unique IDs, research-only flags, and probability vectors.
- `results-feed.json`: counts archived outcomes. File names/provider flags alone do not certify independent verification.
- `research/performance-report-latest.json`: checks that published forecast and outcome counts reconcile with the current source ledgers; fails closed if they do not.
- `research/mathematical-library/progress.v1.json`: reads the live 1,000-entry catalogue readiness count. The original provenance and explicit approval gates remain mandatory.

The 23 November 2026 snapshots contained **74 prospective forecasts**, **0 settled outcome rows**, **0 contract-matched pairs**, and **286 registered mathematical entries** with 0 empirically qualified entries. The CLI reads live repository files; these figures are not frozen as constants.

## Run on Node.js 22
```sh
node --test research/bottleneck-selector/selector.test.mjs research/bottleneck-selector/evidence-bridge.test.mjs
node research/bottleneck-selector/evidence-bridge.mjs > /tmp/bottleneck-evidence.json
```

The JSON output includes input SHA-256 hashes. It contains summary scores and counts, not raw forecasts, keys or executable bookmaker odds. `screenEvent()` passes **no invented independently reviewed assessment** to the selector, and catalogue/approval gates stay closed. The outcome is abstention, not a winner.

## What is still missing
1. A true versioned mapping from each website method to its model code, market, exact event and immutable as-issued forecast.
2. Independently reviewed prospective outcomes paired to the same event, market and method.
3. Untouched chronological testing, statistical uncertainty and multiple-testing controls.
4. Catalogue quality review and explicit later authorization.
5. Cross-module integration tests and release review, including existing desktop/mobile behaviour.

**UNVALIDATED / BLOCKED**, no verified Sky Bet edge, ROI, stake or automatic publishing. Keep this PR draft pending source-data CI and review.
