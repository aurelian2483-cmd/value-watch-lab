# Offline development record, 25 November 2026

## Decision and benchmark identity

Lock the equal probability pool of venue-normalised recent-form Poisson and Davidson–Elo in six_seasons.py as the sole finalist from this batch. Keep the original reconstructed recent-form benchmark frozen. This decision was made after scoring the six named development seasons and before obtaining any confirmation outcomes. None of the six may serve as independent evidence. Whether an earlier researcher saw any proposed confirmation partition requires an independent provenance check.

The reconstructed benchmark divides the home attack × opponent away concession product by the league **away** scoring mean and the away product by the league **home** mean. The challenger divides each product by the league mean for the corresponding scoring venue, leaving eligibility, shrinkage, form adjustment, cap and grid alone. Elo starts equal each season, home advantage 60 points, K=20, Davidson draw parameter 0.70, with simultaneous date-batched updates. Each fixture has the same weight. The switch is a challenger specification. The original summary-only replay and the event-level reconstruction have different log losses. The latter exactly reproduces the previously supplied temperature improvements to two decimal places. Promotion against the original summary-only implementation would require verified identity.

## Locked evaluation protocol

Before access to further outcomes, record the two specific EPL season IDs, data supplier, licence, historic visitation/overlap checks, schema and immutable input manifests in an append-only receipt. Select the most recent two consecutive eligible, completed, untouched historical EPL seasons according to access records only. Exclude seasons used by any upstream contributor for model selection, benchmark reconstruction or diagnostics, and exclude seasons with unknown inspection history. Earlier-than-development tests must be described as historical transport, with temporal direction explicit. A prospective claim requires later data. If neither the source history nor two eligible seasons can be established, leave the confirmation gate closed.

One attempt, both seasons reported, season state reset, previous calendar dates only. Use the fixed completed-score schema and same eligibility as the pinned benchmark. Require all eligible fixture IDs exactly once on both sides, finite strictly positive normalised vectors, and reconciled source coverage. Absent benchmark fixtures, unresolved score encodings, duplicate events, unresolvable chronology or identity differences stop confirmation before scoring. Hash predictions and eligibility before joining labels for each scoring batch. Compare mean natural-log loss on identical fixtures in each season. At least 5% relative reduction in each confirms the requested point-estimate target. At least 2% in each only warrants paper-trial consideration. Report paired ISO-week cluster bootstrap intervals and sensitivity to adjacent-week dependence, classwise calibration, top-label ECE and Brier scores. Do not use accuracy, pooled results, a single season or a confidence interval to substitute for either season's point target. Record any failed or aborted attempt and retire any inspected holdout. Further tuning creates a new research line and needs fresh partitions.

## Evidence and reproducibility

Run from the repository root with Python 3 and NumPy (tested with 2.3.5).

```sh
python research/offline-development/replay.py
mkdir -p /tmp/epl-development
for s in 2020-21 2021-22 2022-23 2023-24 2024-25 2025-26; do
  curl -fsSL "https://raw.githubusercontent.com/openfootball/football.json/e6744429ee395bc86f247348c6184bb08d4eb361/$s/en.1.json" -o "/tmp/epl-development/$s.json" || exit 1
done
python research/offline-development/six_seasons.py /tmp/epl-development
```

source-hashes.json pins the six CC0 development files. Both scoring scripts run offline. The six-season replay independently checks all 608 overlapping benchmark vectors against archived probabilities to absolute tolerance 1e-10. The first run stopped on 27 array-format scores in 2025–26. Following the benchmark's score.ft rule excluded them and reproduced 288 eligible fixtures. That season had 380 source rows, 353 accepted full-time scores and 288 eligible fixtures. Confirmation requires resolving source completeness in advance.

results.json retains all seven initial alternatives on the two archived development seasons, including the temperature control. League frequencies use only previous eligible dates with a uniform Dirichlet pseudocount. Adaptive pooling uses date-batched log loss. six-season-results.json retains three structural candidates over six seasons. Each comparison includes coverage, Brier, 10-bin top-label ECE, classwise signed calibration error and seeded 20,000-resample paired week bootstrap intervals. The intervals use within-batch Bonferroni adjustments across 14 and 18 comparisons respectively. They assume exchangeable calendar weeks, omit cross-week dependence and do not cover all earlier research or eliminate selection bias.

inventory.csv maps all 286 unique catalogue entries to the registered role, required inputs, timing, compatible methods, failure conditions, implementation and evidence fields. Blank evidence is unknown. Cataloguing a diagnostic or numerical solver does not make it a standalone predictor. Sport tags describe proposed applications. Replay-specific evidence is distinct from catalogue-recorded testing.

## Remaining research

Tennis needs a dated player/surface ledger, match-order and retirement rules, and a frozen singles Elo baseline. NFL needs prior-game team ratings, stable identities, venue and tie handling with a frozen home-adjusted Elo baseline. Racing requires sourced pre-race going, draw, course/first-bend geometry, non-runners, final fields and official placings. Score race-win probabilities against field-size or predeclared strength probabilities and top-four inclusion probabilities separately against min(4,n)/n with explicit dead-heat rules. Record context coverage separately. Darts and rugby require format-specific player or team baselines and event-time availability. This batch did not verify those datasets end to end. Continue with tennis data reconciliation and football confirmation metadata independently; never consume a fresh season simply to keep testing.
