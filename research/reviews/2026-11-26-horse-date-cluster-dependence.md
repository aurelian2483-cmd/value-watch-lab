# Horse research review — race-date dependence sensitivity (26 November 2026)

## Scope and safety state

Reviewed fetched `origin/main` at `e2ec193c195c68e8a3337ccd7e2c7cfb59c6ae51`, the model and validation documentation, source audits, immutable context/form/challenger/reference archives, provisional result ledgers, the locked Phase 3 protocol/status, and the append-only market observations. No forecast probabilities, model parameters, archived records, settlements, paper selections, website files or publication gates were changed.

The models remain `UNVALIDATED`, publication remains `BLOCKED`, challenge credit remains zero, and no betting or profitability claim is made.

## Reversible improvement

`scripts/horse_evaluation.py` now reports a race-date-cluster bootstrap interval alongside its existing whole-race interval. It groups races by `Europe/London` date, resamples complete dates with all their races, uses the fixed Phase 3 seed `20261115`, and performs 20,000 replicates. This addresses dependence from same-day meetings, weather, going and shared collection conditions without replacing the previous diagnostic or changing a forecast.

The new fields are added consistently to:

- form/context versus uniform evaluation;
- context versus the existing form baseline; and
- challenger versus the form vector embedded in the identical frozen forecast.

The function refuses an interval below 30 races or with fewer than two race dates. Tests cover order independence, British Summer Time date conversion, malformed values, small samples and integration with the existing race-level interval.

## Current evidence audit

All 287 context, 193 form and 132 challenger forecast records passed their existing hash, schema, probability, pre-race capture and safety validation. All 1,006 uniform reference records and 5,622 source-market records passed hash and pre-start chronology checks. Historical feature dates were checked across the three model archives: zero target/future-date history rows were found.

The current runner collection was generated at `2026-11-26T05:14:02.790310+00:00`. At the 08:52 UTC review it was about 218 minutes old, so none of its 35 races was currently forecast-eligible under the 30-minute runner-freshness rule. It contained 354 active-runner observations and no observed non-runner, but this stale snapshot cannot establish the current field. Frozen records were not rewritten. Existing pending ledgers correctly retain field-change voids: 19 context, 13 form and 11 challenger records.

Result evidence remains provisional:

| Evaluation feed | Scored | Two-publisher result agreement | Independently verified |
|---|---:|---:|---:|
| Context | 173 | 144 | 0 |
| Form | 129 | 108 | 0 |
| Challenger | 88 | 85 exact-event matches through the form result ledger | 0 |

Two-publisher agreement does not establish independent upstream origin or official finality.

## Descriptive comparisons

Negative deltas favour the model named first. These are repeatedly observed, provisional data—not an untouched validation set.

| Comparison | Races / London dates | Mean Brier delta | Date-cluster 95% interval | Mean log-loss delta | Date-cluster 95% interval |
|---|---:|---:|---:|---:|---:|
| Context minus uniform | 173 / 22 | -0.008115 | [-0.012859, -0.003368] | -0.036220 | [-0.052752, -0.018347] |
| Form minus uniform | 129 / 18 | -0.006942 | [-0.010868, -0.003025] | -0.036807 | [-0.056930, -0.016534] |
| Context minus form, separately captured AW fields | 112 / 16 | -0.001106 | [-0.001981, -0.000301] | -0.005834 | [-0.009491, -0.002307] |
| Challenger minus exact-freeze embedded form | 88 / 15 | -0.003325 | [-0.018188, 0.012408] | -0.013389 | [-0.080073, 0.061081] |
| Challenger minus exact-freeze form, two-publisher subset | 85 / 15 | -0.000604 | [-0.017810, 0.018169] | -0.001063 | [-0.076154, 0.083234] |

The context/form comparison remains confounded by different capture times. The challenger comparison removes that field/freeze confounding, but both clustered intervals cross zero; it has no demonstrated improvement.

A read-only rerun of the open market-reference diagnostic matched 166 of 173 context results to a complete same-field source-price observation within 30 minutes before the forecast freeze; seven had no eligible observation. Context minus normalized observed-price reference was `+0.072649` Brier and `+0.287738` log loss, so context was materially worse on this retrospective sample. The 5,622 captures all state `executable_verified: false`; opening, closing, SP/BSP coverage and independent timestamp attestation are not established. This is not CLV, ROI or evidence that a quote was obtainable.

## Verification

- `python -m unittest discover -s tests -p 'test_horse_evaluation.py' -q`: 26 passed.
- `python -m unittest discover -s tests -p 'test_horse*.py' -v`: 136 passed after the added integration test.
- `python -m unittest discover -s tests -p 'test_*.py'`: 343 passed before the final added integration assertion; the targeted suite was rerun afterward.
- every `tests/*.cjs` regression script passed.
- `git diff --check` passed.

## Remaining gaps

1. The registered Phase 3 fixed-window status still contains zero genuinely pre-event paired races, zero independently reviewed outcomes and zero independent timestamp attestations. It has not been updated since 15 November.
2. There is no auditable executable or closing-price baseline, so no EV, CLV, ROI or staking conclusion is available.
3. Current runner/price observations were stale at review time. A successful fresh collection is required before any race card can be treated as current.
4. The source-linked result agreements are useful corroboration but not independent official verification.
5. Date-cluster intervals reduce false precision from same-day dependence; they do not cure repeated analysis, selection bias, source dependence or an absent untouched confirmatory window.

This change is removable by reverting the evaluation, test and review commit. It is not merged or deployed by this review.
