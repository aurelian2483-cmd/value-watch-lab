# GitHub components for Value Watch

Reviewed 19 November 2026. Each candidate has a specific job and an evidence status.

| Project | What we can reuse | What was checked |
| --- | --- | --- |
| [Useless NRL Stats](https://github.com/uselessnrlstats/uselessnrlstats) | NRL match history for a chronological model replay | Reused a pinned CSV for the replay below. Its historical Australian “Super League” rows belong to 1997 and are excluded. |
| [nrlR](https://github.com/DanielTomaro13/nrlR) | Source discovery for UK Rugby League and NRL draws | The checked revision `93d3b6428c88a0a38809704dd68b87c9a3b375b1` reads Rugby League Project for results and NRL.com for fixtures. I fetched the 2025 UK Super League page directly. Applying that revision's column assumption required at least 11 cells and returned zero scored rows. The table actually uses 10 cells and mixes 166 league and playoff results with 27 Challenge Cup results. Use competition headings and verify date and match identity before any import. |
| [NRL Predictor](https://github.com/timothyohare/nrl-predictor) | Reference for Elo, team-sheet timing and chronological testing | Code and backtest layout available. No repository-level licence identified in the checked revision. Used as a design reference. |
| [nflverse](https://github.com/nflverse/nflverse-data/releases/tag/schedules) | Secondary NFL schedule and result feed keyed by ESPN ID | Downloaded the schedule CSV. The 2026 sample contains 272 fixtures, with unique ESPN IDs on all 150 scored rows. Verify date, teams and final status against the source rule before integrating. |
| [openfootball](https://github.com/openfootball/football.json) | Football fixture cross-check and historical scores | Downloaded publicly available 2026/27 Bundesliga JSON. It has 306 rows and includes Bayern–Cologne on 20 November. It provides a comparison of identities, dates and scores. Market evidence still requires separate sources. |
| [Wharton Darts Moneyball](https://github.com/WhartonSABI/mba2026_darts) | PDC historical match, leg and visit data for method review | The match archive exists and the project documents 26,196 matches from 2019–2025. The licence covers code. The data owner’s reuse and redistribution terms need confirmation. Its competition and period also differ from a current Grand Slam fixture. |
| [The Edge Letter](https://github.com/Chadhauser/edge-letter-open-data) | Aggregate Betfair Starting Price calibration comparison for UK and Irish racing | Upstream declares CC BY 4.0 with attribution to [The Edge Letter](https://theedgeletter.com). Aggregate results can act as a benchmark. Event- and runner-level validation still needs matched individual records. |
| [sportsdata-mcp](https://github.com/DanielTomaro13/sportsdata-mcp) | Reference for market schemas and source discovery | The provider list includes Pinnacle and Betfair. Sky Bet coverage was not identified. Value Watch can evaluate narrowly scoped read-only adapters and keep the existing price-evidence gates. |

The original Jeff Sackmann ATP repository returned 404 during this check. Its mirrors are discovery leads. Verify dataset provenance, terms and season coverage before connecting one.

## NRL replay

The replay reuses the [pinned Useless NRL Stats match CSV](https://raw.githubusercontent.com/uselessnrlstats/uselessnrlstats/7077ff459e26718a41d4c97885e63a067241c151/cleaned_data/nrl/match_data.csv). The input SHA-256 is `9dae5279597ce91263be9c93e20fb8927efdf2ee089e2f3b7b722b0fbfe95b8c`.

```sh
python research/rugby-league/replay_nrl.py /path/to/match_data.csv
```

The comparison starts with 1,789 warm-up games from 2015–2023. Elo uses a 20-point update coefficient, a fixed home-designation bonus of 50 rating points and season-to-season shrinkage of 0.75. Both methods use the running historical draw rate. All probabilities for a date are generated before that date's results are applied. The simpler baseline uses expanding historical home, draw and away frequencies. Scores use the same three outcomes and the same matches for both methods. Lower scores are better.

| Evaluation period | Matches | Elo log loss | Frequency log loss | Elo Brier | Frequency Brier |
| --- | ---: | ---: | ---: | ---: | ---: |
| 2024 | 213 | 0.669454 | 0.707325 | 0.455468 | 0.491764 |
| 2025 | 213 | 0.680522 | 0.712942 | 0.466304 | 0.497428 |
| 2026 through 19 June | 114 | 0.663953 | 0.689326 | 0.468339 | 0.492686 |

This is a retrospective NRL baseline. Home designation is used as supplied, including neutral venues. The archive provides final scores, so its outcome definitions need checking against specific market settlement rules before market comparison. The run uses no odds and provides no UK Super League, betting-profitability or prospective validation evidence. Status is **UNVALIDATED** and betting publication remains **BLOCKED**.
