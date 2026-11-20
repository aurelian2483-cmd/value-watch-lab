# Private historical bookmaker comparison (research-only)

This tool scores *the same historical football matches* in the saved independently reconstructed Sky research model against observed **closing** 1X2 odds. It does not acquire historical odds, run trading, create recommendations or modify the live system.

## Local usage
Manually obtain **lawfully permitted private** Football-Data-format Premier League season CSVs for 2024–25 and 2025–26. Keep publisher files **outside** the repository, obey source terms, and do not commit or redistribute raw odds.

From repo root with Node 18+:

 
node research/football-baseline-v1/compare.mjs research/football-baseline-v1/608-reconstructed-forecasts.json /private/2425.csv /private/2526.csv B365C /tmp/market-benchmark-summary.json
 

For another market source replace B365C with PSC (Pinnacle closing) or AvgC (average closing odds, **not** a bookie's executable quote). All 1X2 probabilities are proportional de-vigged, in home/draw/away order. Missing triplets are excluded, never imputed. Only same-date/teams/season fixtures whose full-time results agree are paired.

The output contains **aggregate scores only**, data-source SHA256 digests, coverage and explicit evidence gates; no row-level odds or individual bookmaker prices. It is retrospective, timestamp-unattested, unlicensed provenance not certified, NOT a model validation or proof of market edge, returns, or original Sky results. In particular, do not call Pinnacle or Bet365 odds "Sky Bet".

Validation without publisher data:

 
node tests/test_football_baseline_market.cjs
 

The PR's reproducibility workflow runs this synthetic test and the 608-fixture model replay separately. A full real-data rerun requires locally held authorized source CSVs and matching file digest receipts. Do not add paid providers or raw odds to this public repository.
