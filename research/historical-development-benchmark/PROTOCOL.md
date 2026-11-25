# Predeclared development-only historical comparison — Bundesliga 2024/25

Protocol v1, selected before downloading either full-season data response. User authorized continuing the bounded historical certification and mathematical research work; this is a separate retrospective development cohort, not access to any existing protected partition. No production model, odds, stakes or publication.

## Sources and rights

One GET to the completed-season OpenLigaDB endpoint https://api.openligadb.de/getmatchdata/bl1/2024 (official API docs https://api.openligadb.de/index.html). ODbL 1.0; attribution: Data from OpenLigaDB (www.openligadb.de), licensed under ODbL 1.0. Data licence https://www.openligadb.de/en/license and API conditions https://www.openligadb.de/en/terms-of-use reviewed 25 November 2026. One request, no polling, retries or redirects. Project issues URL in User-Agent. Do not fetch logo/image URLs. 
One GET to https://raw.githubusercontent.com/openfootball/football.json/bd189ea365936c8e9c6c64261fcdd608e3cec3c5/2024-25/de.1.json; exact Git blob 9921b1d8485429913ff6d161500beb519d8b0e51, size 88232, licence CC0 at https://github.com/openfootball/football.json/blob/bd189ea365936c8e9c6c64261fcdd608e3cec3c5/LICENSE.md. The CC0 declaration applies to rights the contributor owns. Openfootball JSON is generated from upstream Football.TXT and the Germany repository also has an OpenLigaDB mirror directory. Per-row upstream independence is not established. Matching sources are called concordant, never independently certified.
No automated collection from Bundesliga's website (its legal notices reserve data mining and prohibit automated access/analysis). The DFB tribunal statement and Union Berlin's public announcement are documentary evidence of a special settlement issue, not input datasets:
https://www.dfb.de/news/dfb-sportgericht-wertet-bundesligaspiel-in-berlin-fuer-bochum
https://www.fc-union-berlin.de/en/news/court-of-arbitration-confirms-dfb-judgements-ARsCFX
Exclude Union Berlin hosting Bochum on 14 December 2024 from both training and scoring regardless of agreement, because played and adjudicated outcomes differ. No other manual result corrections.

## Cohort and reconciliation

Regular-season 18 teams, 34 matchdays, 306 unique ordered home/away pairings per source. Exact explicit club aliases; no fuzzy identity, no guessed missing records, no silent corrections. Match same season, round, ordered pair and Berlin calendar date; exact score agreement required. Quarantine unmatched/conflicting pairs and the above special match from both model history and target outcomes. At least 290 concordant ordinary fixtures required to run the descriptive study. Structural source anomalies prevent use. Only aggregate counts, source fingerprints and metrics may enter the public repository/CI artifact; raw responses and individual forecasts remain in memory within this isolated run, not published. This is not a private immutable raw-data archive.

## Fixed methods and evaluation

Retrospective development experiment only. Reconstruct using the entire available concordant cohort, but each target calculation receives only earlier records with kickoff at least 48 hours before the target. This is a conservative assumed observation delay, not verified historical availability; source revisions may postdate the cutoff. Require >=90 earlier eligible league matches, >=3 earlier home appearances for host, >=3 earlier away appearances for visitor. Use the same paired targets for every method. Never use a target's outcome in its own computation. Keep all evaluated outcomes, no cherry-picking.
Five fixed variants:
1. Uniform categorical reference (1/3 each).
2. Expanding empirical outcome frequencies, additive 1 per category.
3. Independent league-average home/away Poisson.
4. Venue-specific team attack and defence independent Poisson with 5 league-average pseudo-matches per rate and expected goal rates bounded to [0.15,4].
5. Same venue Poisson plus existing reconstructed last-five goal-difference form adjustment exp(±0.025 delta), then bound rates to [0.15,4].
All Poisson distributions use 0..30 goals then normalize. Compute multiclass Brier (unscaled), natural-log loss, and top-class hit rate with fractional credit for exact ties. Log loss primary, Brier secondary; no parameter tuning, selection or statistical significance claim. Descriptive paired differences and calendar-period counts only. No probability-of-edge estimates, no model promotion. This is public historical development data, not an untouched or prospectively frozen holdout. Existing protected splits are not opened.

## Acceptance and boundaries

Verify source schema, completeness, identity, timestamps, result semantics, count reconciliation and source rights; compare source bytes and pinned second blob. Offline synthetic tests precede a single opening-event CI retrieval. One attempt; no automatic retry. All source disagreements and computation failures retained as counts. Report only actual findings; if insufficient coverage, return a blocked development result. Source overlap may bias the retained sample. Independent result certification and prospective empirical qualification remain blocked pending independently evidenced lineage, raw evidence retention and a genuinely frozen evaluation protocol. No production execution authorization, dispatch, settlement certification, protected evaluation, catalogue promotion, publication, merging or deployment.
