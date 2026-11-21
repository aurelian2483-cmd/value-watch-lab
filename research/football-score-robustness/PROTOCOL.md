# Frozen robustness review protocol

Verify the pinned replay summary and reconstruct the identical row-level
cohort. Independently score home/draw/away with negative natural log of
the realized probability (floor 1e-15) and the sum of three squared
one-hot errors. Check summary rounding at ten decimals. Compare unrounded
paired losses as left minus right. Absolute differences up to 1e-12 count
as ties. Report mean, median, population SD and sign counts by season and
combined. Combined means weight fixtures equally.

Keep matches on the same date together. For each scope draw calendar-date
clusters with replacement, retaining the original number of clusters in each
season. The ratio of summed scores to sampled fixture count gives each
bootstrap mean. Use seed 20261121, 2,000 replicates and linearly interpolated
2.5th/97.5th percentiles, with at least 20 eligible dates per season. This is
a retrospective dependence diagnostic. Date exchangeability is an
approximation. Repeated teams, overlapping training windows, chronology
and archive selection can induce dependence across dates. These intervals
neither describe future performance nor support formal significance claims.

Sensitivity is explicitly post hoc. Subset the original fixture predictions
at venue minima 3, 4 and 10 per side, retaining the earlier-league and form
gates. Three is the replay minimum. Four appears in the independent market
display's venue input check. Ten is the expanded prior-season model's
venue minimum and the comparison's small-sample boundary. This exercise
changes only coverage, uses the same cohort across paths within each row
and selects no threshold. No models are refit.

Use one-versus-rest calibration bins of width .2 for each class and path
within each season. Bins are left-closed with one included in the final bin.
Show mean probability, observed frequency, count and date clusters.
Only show a date-resampled observed-rate interval with at least 20
observations and 10 contributing dates. Retain the expected-probability
mean as a descriptive reference. Also decompose paired means by actual
result and by earlier/later halves of eligible dates within each season.
These are descriptive diagnostics with no multiple-comparison inference.
