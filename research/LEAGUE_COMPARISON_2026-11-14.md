# Cross-league football diagnostic — 14 November 2026

**Status:** Preliminary RESULTS-ONLY replay, research only. No odds, paper profits, market-anchored predictions, verified betting edge, or production model change.

## Research question
Does the frozen Value Watch *recent-form Poisson* model predict outcomes more accurately in some leagues than others? Compare the **same algorithm**, using only earlier dates *within each season*.

## Source and controls
- CC0 public-domain openfootball/football.json, pinned commit [e6744429ee395bc86f247348c6184bb08d4eb361](https://github.com/openfootball/football.json/commit/e6744429ee395bc86f247348c6184bb08d4eb361) (downloaded directly with GitHub repository fetch).
- Files: `2024-25/{en.1,en.2,es.1,de.1,it.1}.json` and `2025-26/{en.1,en.2,es.1,de.1,it.1}.json`.
- Only fixtures with `score.ft` are included. These files are **incomplete** in several league-seasons. Results should not be described as a complete league or season census.
- Same-season Poisson baseline: historical home/away goal rates with five pseudo-match league prior and `lambda` clamped to [0.15,4]. Minimum 30 earlier league matches, 3 earlier home matches for home side, 3 earlier away matches for away side; five-match goal-difference form, 3 prior appearances per team.
- Frozen recent-form adjustment alpha = **0.025**, home goal rate multiplied by `exp(alpha * (mean(last5 home team goal differences) - mean(last5 away team goal differences)))`, away rate multiplied by inverse adjustment. Exact Poisson 1X2 score matrix 0..11 goals then normalized.
- Every match on a calendar date is forecast using results from **previous dates only**. Teams begin a new state for each season. Historical results were known at replay time, not timestamp-verified prospective forecasts.
- Metrics: mean multiclass 1X2 log loss (lower better); top-probability outcome accuracy. No retrospective odds-based selection is computed because the CC0 data have **no odds**.

## Initial unadjusted league comparison

| League | Eligible scored matches, 2024/25 + 2025/26 | Mean 1X2 log loss (lower better) | Top-class accuracy |
|---|---:|---:|---:|
| Serie A | 581 | **0.98662** | **55.42%** |
| La Liga | 603 | 1.00045 | 49.75% |
| Premier League | 608 | 1.01981 | 50.33% |
| Bundesliga | 486 | 1.03693 | 48.77% |
| Championship | 930 | 1.04919 | 46.45% |

### Season-by-season log loss
| League | 2024/25 | 2025/26 |
|---|---:|---:|
| Serie A | 0.98874 | 0.98428 |
| La Liga | 1.01332 | 0.98736 |
| Premier League | 1.01467 | 1.02552 |
| Bundesliga | 1.07148 | 1.00033 |
| Championship | 1.05119 | 1.04701 |

### Source coverage / scored counts
| League | 2024/25 completed records / eligible | 2025/26 completed records / eligible |
|---|---:|---:|
| Premier League | 380 / 320 | 353 / 288 |
| Championship | 557 / 485 | 521 / 445 |
| La Liga | 370 / 304 | 365 / 299 |
| Bundesliga | 306 / 250 | 294 / 236 |
| Serie A | 370 / 305 | 344 / 276 |

## Interpretation and **non-claims**
The unchanged recent-form model's measured loss was lowest in Serie A and highest in the Championship **on this particular source and scored subset**. This does **not** establish that Serie A is intrinsically easier, that Championship betting is harder, or that any league provides an edge. The leagues differ in draw/home/away base rates, team competitive balance, number of teams, record completeness, and time periods. Historical source updates may not have equal coverage. No margin-adjusted bookmaker benchmark is available here. The 141 previously investigated losses were EPL **only** and are not the sample used in this table.

## Next required test (separate)
Obtain suitably licensed and source-timestamped **complete 1X2 opening odds** and complete results for these exact five leagues over matching seasons. On exactly the same eligible games within each league, run: (1) original Poisson, (2) frozen 0.025 recent form, (3) market-only de-vigged, (4) frozen 50/50 market-form challenger with maximum decimal odds 5.00 and estimated EV >= 5%, and preserve passes. Count missing prices; compute paired log loss, Brier, within-league market-relative improvements, selections, observed outcomes, and *illustrative* paper ROI. No claim of executable historic prices. This archive is not a fresh out-of-sample test: future prospective fixtures still needed.

**Production/website:** no changes. The 50/50 candidate remains research only, no demonstrated improved prediction or betting edge.
