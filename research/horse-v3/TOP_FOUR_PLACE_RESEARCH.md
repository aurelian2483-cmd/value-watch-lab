# Horse V3: top-four finishing research (experimental)

**Status:** implemented as an isolated research utility and regression tests; live UI and frozen V1/V2 untouched. Model validation remains UNVALIDATED and betting publication BLOCKED. This does **not** mean all fourth-place finishes are paid.

## Why
Some each-way or extra-place markets pay on fourth place. Preserve **three distinct questions**:
1. *Who wins?* Existing complete-field win probability.
2. *How well do predicted four horses cover the actual first four?* Descriptive ranking metric. The top four highest **win-probability-ranked** horses are not necessarily the highest-probability four **place** horses.
3. *Would a fourth-place finish pay on a specific offer?* Market terms, number of actual starters, and settlement rules must be observed and verified. This is separate from historical model scoring.

## Standard Sky Bet place terms (as consulted 15 November 2026)
Official source: https://support.skybet.com/app/answers/detail/horse-racing-rules

- 2–4 starters: win only.
- 5–7 starters: 2 places at 1/4 the win odds (handicap and non-handicap).
- 8–11 starter handicaps: 3 places at 1/5.
- 12–15 starter handicaps: 3 places at 1/4.
- 16+ starter handicaps: 4 places at 1/4.
- 8+ non-handicaps: 3 places at 1/5.
- Promotions may pay extra places under different fractions, and nonrunners can change the settled terms. **Only an observed market's terms, price, timestamp and eventual settlement can justify a payout statement.**

Source terms refer to horses actually under starter's orders, not merely declared runners. The code intentionally sets `paid_fourth: null` without confirmed settlement and never invents observed market terms.

## Code
`scripts/horse_v3_top4_research.py` includes:
- `analyze_top_four(race, win_probabilities_by_horse_id)`: evaluates descriptive overlap with the actual top four if all finishing positions 1–4 are observed, unambiguous and aligned to the full field; returns winner-in-predicted-top-4, overlap count and recall. It refuses missing/ambiguous finish fields rather than counting an unplaced horse incorrectly.
- `standard_each_way_terms(starters, handicap)`: informational standard bookmaker term table, **not** captured offered terms.
- `fourth_place_payout_status(...)`: blocks automatic paid-place assertions.
- `tests/test_horse_v3_top4_research.py`: boundary tests for field sizes, missing finishes and non-inference of place probabilities/EV.

Run `python -m unittest discover -s tests -p test_horse_v3_top4_research.py -v` or the isolated GitHub Actions workflow `.github/workflows/horse-v3-top4.yml`.

**No race-level top-four metrics have yet been produced from actual V3 predictions.** The frozen 26-race challenger matrix stores winner labels, not necessarily the official first-four order. The 2025 retrospective collection stores finishes, but historical form gaps prevent full-field V1 probabilities for its initial ten-race pilot. Do not graft results from different samples or use post-event data to claim pre-race performance.

## Next gate
Recover the full-field historical form; verify official finish positions and starter counts for each race; record offered each-way terms and prices as separate time-stamped evidence. Only then compute descriptive top-four metrics and, with properly modelled place probabilities and complete costs/settlement rules, experimental place-market expected value. An independently validated place model is not assumed to exist.
