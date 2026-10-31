# Value Watch 2.6 — implementation audit (31 October 2026)

This audit distinguishes **working code**, **interface only**, and **blocked integration**. It does not certify any betting model or live data connection.

| Objective | Observed implementation | Status / next step |
| --- | --- | --- |
| Four-sport research | Mixed-sport-feed.json contains dated football and horse snapshots; tennis/NFL empty | PARTIAL: connect source-attributed tennis and NFL feeds |
| Automatic fixture updates | Hourly GitHub Actions workflow and Python fetcher for PL/ELC; requires FOOTBALL_DATA_API_KEY | BLOCKED until secret, provider coverage and successful run verified |
| Website fixture display | index.html fetches fixture-feed.json and reports freshness | IMPLEMENTED UI; no fixture-feed.json published at audit |
| Horse form, rule-aware model, forum intelligence | Historical qualitative research only | NOT IMPLEMENTED |
| Sky Bet odds, timestamps and market settlement rules | No provider, no price collection | NOT IMPLEMENTED; never invent odds |
| Independent calibrated probabilities / Grade A–D EV | No reproducible predictive model or validation dataset | NOT IMPLEMENTED; grading blocked |
| Football props and correlated Bet Builders | No exact market catalogue or joint model | NOT IMPLEMENTED |
| Prospective pre-event records / 100-Prediction Challenge | UI says 0/100; no durable prediction ledger | NOT IMPLEMENTED; do not backfill |
| Results and settlement | Placeholder results laboratory; no verified results feed | NOT IMPLEMENTED |
| Trial basket | Browser-local add/remove/import/export, singles/multiples tabs | WORKING UI; no real odds or payouts |
| ChatGPT hourly research | Separate ChatGPT automation, not connected to GitHub | SEPARATE; no automatic chat-to-repository sync |
| Historical selections | research-data.json and embedded defaults in index.html | PRESERVED |

## Development priorities

1. **Operational truth:** Configure a licensed/allowed fixture source and verify one successful hourly GitHub Actions run. Missing credentials must not be reported as a successful refresh. Preserve old snapshots with explicit age.
2. **Actionable candidate funnel:** Publish a machine-readable research queue with event ID, event time, market, supporting and opposing signals, source URL, observation time, status (DISCOVERED / NEEDS_PRICE / NEEDS_MODEL / PAPER_ELIGIBLE / PASS), and precise blocker. Candidate != qualified bet.
3. **Prospective prediction ledger:** Append immutable pre-event prediction IDs, version, 1X2 probabilities and source timestamps only when produced by a reproducible model; mark blocked otherwise. Never fabricate 100-Prediction Challenge progress.
4. **Outcome verification:** Attach official results to original IDs without modifying locked predictions. Evaluate direction and calibration only with auditable records.
5. **Sport coverage:** Add tennis and NFL schedules/results, horse declarations/form/forum evidence under source licences and availability. Do not label snapshots LIVE.
6. **Probability and market validation:** Develop chronological out-of-sample validation, independent probabilities and verified Sky Bet quotes before A/B EV grading. Keep real-money recommendations blocked until independently validated.

## Release rules

- Never force picks or show fabricated odds, probabilities, scores, ROI, CLV or win rates.
- Prefer specific, sourced, unpriced research leads over an empty report, but keep them explicitly experimental.
- No automatic stake placement. Preserve browser-local baskets and all historical research.
- Keep GitHub website workflows distinct from ChatGPT hourly research; no assumed shared persistent storage.
