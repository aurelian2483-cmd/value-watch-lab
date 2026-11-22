# Horse-racing research review — 20 November 2026

## Decision

The context model remains **UNVALIDATED** and betting publication remains
**BLOCKED**. This change does not alter a forecast, parameter, frozen archive,
price, settlement or website. It makes the existing comparison more
conservative by using only results for which the committed feed records an
exact-field and winner match from both Sporting Life and The Racing API.
Publisher corroboration is not proof of independent underlying data.

## Evidence reviewed

- Main `c29a884a6104b72e6dbf20d1415a47a612579c3f` (20 November 2026,
  07:48 UTC).
- 160 context archives and 108 original form archives passed their existing
  hash, chronology, field and safety validation.
- The 07:47 UTC racecard snapshot contained 39 races, 402 active-runner
  observations and 7 non-runner observations. It produced 13 context forecasts
  and 10 original form forecasts; every published current-field check was fresh
  and matched at generation time.
- Existing leakage controls reject current/future-day history, wrong-discipline
  history, unresolved outcomes, stale fields, late freezes and changed fields.
  Regression tests for withdrawals, going/context changes and chronology pass.
- The historical challenger remains a failed retrospective pilot. Phase 3 still
  reports zero independently timestamp-attested prospective pairs and zero
  independently reviewed outcomes.
- 3,734 market-observation archives were readable. The pending read-only market
  diagnostic matched 79 of 82 corroborated context outcomes to an exact-field
  price observation no more than 30 minutes before freeze. Context minus market
  was +0.06250 Brier and +0.27176 log loss (positive is worse). These are
  unverified, non-executable, non-closing source observations and cannot support
  ROI, CLV or value claims.

## Improvement

1. Add a separately labelled cross-source evaluation to the context feed.
2. Restrict the published context-vs-form comparison to cross-source-corroborated
   outcomes on both sides.
3. Validate the second receipt's provider endpoint, hash, post-start chronology,
   record identity, winner, primary receipt and BLOCKED safety fields.
4. Label the comparison result scope `TWO_PUBLISHER_CORROBORATED`.

The previous provisional comparison used 57 pairs. The stricter comparison uses
45 pairs. Context minus form is -0.000804 Brier (paired bootstrap interval
-0.002560 to +0.000739) and -0.002938 log loss (interval -0.009783 to +0.003104).
Both intervals include zero, so this evidence does not establish improvement.
Against uniform on 82 corroborated outcomes, the Brier interval also includes
zero; the log-loss interval is below zero, but the sample remains selected,
publisher-linked and not independent validation.

## Verification

- `python -m unittest discover -s tests -p 'test_horse_*.py'`: 128 passed.
- `python -m unittest discover -s tests -p 'test_racing_*.py'`: 17 passed.
- `python -m unittest discover -s tests -p 'test_published_racing_selections.py'`:
  6 passed.
- `git diff --check`: passed.
- New regression coverage rejects missing cross-source evidence, wrong winners,
  unsupported provider hosts and pre-start result observations.

## Remaining gaps

- No independently timestamp-attested Phase 3 outcomes.
- Cross-publisher results may share an upstream origin.
- Original form comparison covers selected all-weather Flat races only and uses
  different freeze times.
- Market observations are not verified executable or closing prices; the
  market-reference diagnostic remains in draft PR #104.
- Draft PR #103 (fractional-price validation) and PR #104 are open, non-mergeable
  against the current base and not deployed.
