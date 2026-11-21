# Frozen protocol · date-ordered retrospective replay

Only the 608 committed reconstructed Premier League rows are eligible as
*result inputs*. Use season, date, ordered team names and full-time score.
Ignore archived probabilities, winner labels, sample sizes and metrics.
The missing 125 fixtures from the original source sample are not restored.
The original archive is a selected sample, and coverage is measured against
its 320 and 288 rows. Exclude every other evidence tier.

A season starts on 1 July and ends before 1 July the next calendar year.
Require canonical dates, unique ordered team pairs per season, correct
season/date/team IDs, distinct teams, nonnegative integer regulation scores,
and no team appearing twice on the same date. Reject incompatible rows or
changed bytes. Freeze history at each exclusive date, generate every
prediction for that day, then add that day's results. Reset at the season
boundary. Assign no kickoff time, capture time or retrospective freeze.

The common cohort requires 30 earlier results, three home and away venue
observations for the matching sides, three matches per side for form, and
positive league goal means. Use the joint intersection for all reported
metrics. The three predeclared paths are:

1. Standalone venue shrinkage and its baseline formula.
2. The same standalone path plus its **single** fixed earlier-five
   goal-difference form component at alpha 0.025.
3. The pinned expanded current-season formula kernel with its existing
   small-sample thresholds, applied to the same Premier League fixture
   and history. This is a formula comparison with a shared input adapter.
   It does not recreate an expanded feed or its prior-season fallback.

Apply the existing five pseudo-match shrinkage, rate denominators, clamp
order and Poisson grids. Preserve each path's own arithmetic.
Score the derived 1X2 class with the existing evaluator's natural log loss
(floor 1e-15) and unscaled multiclass Brier. Report season-specific coverage,
denominators and descriptive score means. No weight tuning, model selection,
uncertainty claim, or prospective or performance-validation claim.

H2H as a nonzero adjustment, squad and player features, market features,
prior-season producer fallback, opponent-adjusted alternatives and the full
V1–V6 composition are outside the predeclared variant set. They are
**NOT EVALUABLE** here without the fixed comparable configuration and
required evidence. Use no external or reserved data.
