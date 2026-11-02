# Additional football competitions

Championship (E1), Champions League (UCL), La Liga (SP1), Bundesliga (D1), Serie A (I1) and Ligue 1 (F1) use a separate research pipeline. The existing Premier League pipeline is not replaced.

## Collection and admission

Each competition has its own ESPN daily discovery requests, source receipts, Sky competition-name guard, explicit team aliases, model inputs and performance sample. Discovery covers 22 UTC days, with the eligible fixture window from capture plus 90 minutes to capture plus 21 days. A prediction requires complete primary discovery and an unambiguous second-source home/away and kickoff match within 60 seconds. Missing evidence never becomes a predicted betting opportunity.

## Models

Domestic training uses the complete previous Football-Data season for the same division. Newly promoted teams can receive a separately labelled current-season small-sample fallback only when both teams have at least three matches in their relevant venues. All rates are shrunk towards that competition's league averages using five pseudo-matches. No team is given another league's parameters.

Champions League uses the 2025/26 league phase: 144 matches, 36 clubs, exactly four home and four away games per club. The reference match dates come from UEFA's published calendar:
https://www.uefa.com/uefachampionsleague/news/029a-1de997bb1779-486bab913658-1000--uefa-champions-league-league-phase-draw/

ESPN supplies result snapshots for the individual matchdays. Completeness checks must pass before caching the historical data. The UCL calendar needs updating when the reference season changes. Clubs without sufficient tournament history remain unmodelled.

These are uncalibrated Poisson research baselines. Shrinkage choices, rate caps and minimum samples are exploratory assumptions, not evidence of predictive validity or betting value.

## Archives and results

Forecast files are content-hashed and captured at least five minutes before kickoff. Later model/input changes preserve revisions. Scoring selects one latest archived forecast per competition, home/away pair and kickoff, preventing revision-count inflation.

All 1X2 estimates refer to 90 minutes. ESPN must report a completed FT result. Domestic results use Football-Data corroboration, with a Sky FT fallback. Champions League results require Sky FT corroboration. Extra-time/penalty totals are excluded rather than treated as 90-minute results. Source disagreement or inaccessible historical pages leave results pending.

## Operation

Run **Expanded football leagues research** on `main` once after deployment. It is also scheduled at 08:40 and 18:40 UTC. The compact artifact is `football-expanded-research-feed.zip`; source snapshots are separate. The unified page reads both `research-dashboard-data.json` and `football-expanded-data.json`.

Each league may have different data coverage and forecast counts. All remain research-only, UNVALIDATED, publication BLOCKED, and official challenge 0/100. No verified Sky Bet prices, betting expected value or qualified recommendations are added.
