# Retrospective football score robustness · Phases 44–50

The independent scorer reproduced the frozen replay's six season-and-path
score pairs to the declared ten-decimal rounding. It reconciled the 608
pinned result rows, checked all date cutoffs and ordered fixture IDs, and
verified that each scored path uses the same 481 fixtures. Eligible real
prospective forecasts and outcomes remain **0**. Models **UNVALIDATED**.
Publication **BLOCKED**.

## Coverage and fixed score paths

| Season | Eligible / archive | Excluded by league / venue history | Standalone LL / Brier | + Form LL / Brier | Expanded LL / Brier |
| --- | ---: | ---: | ---: | ---: | ---: |
| 2024-25 | 260 / 320 | 30 / 30 | 1.039174 / 0.623849 | 1.036059 / 0.621340 | 1.007556 / 0.602699 |
| 2025-26 | 221 / 288 | 30 / 37 | 1.120730 / 0.678704 | 1.118621 / 0.676891 | 1.050747 / 0.633646 |

## Paired differences and date-cluster intervals

Differences are left minus right. Negative scores mean lower loss on the
observed fixture. Date-cluster intervals are exploratory 2.5th/97.5th
percentiles of 2,000 resamples. They preserve the 78 and 75 date clusters'
respective stratum sizes when pooling seasons. Repeated teams and overlapping
history can still create cross-date dependence. Interval endpoints support
no formal significance or future-performance claim.

| Scope | Pair | Mean log loss difference [interval] | Mean Brier difference [interval] | Lower / tie / higher (both metrics) |
| --- | --- | ---: | ---: | ---: |
| 2024-25 | Expanded − Standalone | -0.03162 [-0.06086, -0.00519] | -0.02115 [-0.04225, -0.00196] | 136 / 6 / 118 |
| 2024-25 | Standalone + form − Standalone | -0.00312 [-0.01014, +0.00449] | -0.00251 [-0.00716, +0.00270] | 139 / 14 / 107 |
| 2024-25 | Expanded − Standalone + form | -0.02850 [-0.05793, -0.00199] | -0.01864 [-0.03982, +0.00079] | 131 / 0 / 129 |
| 2025-26 | Expanded − Standalone | -0.06998 [-0.11877, -0.02100] | -0.04506 [-0.07881, -0.01138] | 117 / 0 / 104 |
| 2025-26 | Standalone + form − Standalone | -0.00211 [-0.00882, +0.00479] | -0.00181 [-0.00614, +0.00261] | 116 / 11 / 94 |
| 2025-26 | Expanded − Standalone + form | -0.06787 [-0.11752, -0.01950] | -0.04324 [-0.07608, -0.01041] | 116 / 0 / 105 |
| Combined | Expanded − Standalone | -0.04924 [-0.07616, -0.02300] | -0.03213 [-0.05109, -0.01389] | 253 / 6 / 222 |
| Combined | Standalone + form − Standalone | -0.00265 [-0.00783, +0.00262] | -0.00219 [-0.00555, +0.00120] | 255 / 25 / 201 |
| Combined | Expanded − Standalone + form | -0.04659 [-0.07438, -0.02019] | -0.02995 [-0.04930, -0.01178] | 247 / 0 / 234 |

The report JSON also gives median and population SD for every scope. For
example, the combined expanded-minus-standalone log-loss difference has
median −0.01167 and SD 0.26167, compared with mean −0.04924. The earlier-five
form intervals include zero for both metrics in both seasons and combined.

## Post-hoc coverage sensitivity

| Season | Minimum earlier venue matches per side | Eligible / coverage | Standalone LL / Brier | + Form LL / Brier | Expanded LL / Brier |
| --- | ---: | ---: | ---: | ---: | ---: |
| 2024-25 | 3 | 260 / 81.25% | 1.03917414 / 0.62384893 | 1.03605871 / 0.62134004 | 1.00755647 / 0.60269942 |
| 2024-25 | 4 | 240 / 75.00% | 1.04672232 / 0.62986112 | 1.04280148 / 0.62664103 | 1.00724980 / 0.60251765 |
| 2024-25 | 10 | 112 / 35.00% | 1.00921642 / 0.60399540 | 1.00767206 / 0.60321836 | 1.00677632 / 0.60321819 |
| 2025-26 | 3 | 221 / 76.74% | 1.12072985 / 0.67870400 | 1.11862120 / 0.67689115 | 1.05074732 / 0.63364638 |
| 2025-26 | 4 | 199 / 69.10% | 1.11894704 / 0.67636292 | 1.11789839 / 0.67513712 | 1.05251045 / 0.63470737 |
| 2025-26 | 10 | 77 / 26.74% | 1.02308318 / 0.60793795 | 1.01849765 / 0.60485093 | 1.01154278 / 0.60487166 |

Stricter thresholds subset the frozen predictions. Every formula has the
same fixtures within each row. The differences shrink at ten venue matches,
where only 112 and 77 fixtures remain. The 2024–25 expanded and form Brier
scores at ten differ by about 0.00000016, and the 2025–26 Brier ordering reverses
between those two paths. The analysis selects no threshold or formula.

## Outcome, time and calibration diagnostics

Against standalone, expanded log loss and Brier are higher on home wins and
lower on draws and away wins in both seasons. Away wins show the largest
negative mean difference. Expanded-minus-standalone log loss across the
earlier versus later halves of eligible dates is −0.05791 versus −0.00451
in 2024–25 and −0.11158 versus −0.02486 in 2025–26. These are composition
diagnostics and give no causal feature interpretation.

The machine-readable report includes all one-versus-rest bins, counts,
means, observed frequencies and available date-cluster intervals. Of 45
bins per season, 20 in 2024–25 and 23 in 2025–26 fall below the prespecified
count or cluster threshold. Sparse bins receive no interval. Calibration
displays describe this archive and do not establish prospective reliability.

Market, squad, player, stadium, nonzero H2H, opponent-adjusted and composed
V1–V6 paths remain **NOT EVALUABLE**. No forecast vector, source result, model
configuration or eligibility rule was altered.

## Reproduce

Read the [frozen protocol](PROTOCOL.md) and [report JSON](report.json).
Provision the pinned repository Git objects using the
[replay instructions](../football-chronological-replay/README.md). Then
run offline with Python 3.11 or newer and Node 22.

```sh
python scripts/football_score_robustness.py --check
python scripts/football_score_robustness.py --details
python -m unittest discover -s tests -p test_football_score_robustness.py
```

The review independently checks normalized vectors, observed class, clipping,
unscaled multiclass Brier, archive identifiers, venue counts, date cutoffs and
replay summary rounding. It checks sensitivity without regenerating forecasts
for different thresholds. The output contains all outcome and period strata
and the exact protocol, common cohort and upstream summary hashes.
