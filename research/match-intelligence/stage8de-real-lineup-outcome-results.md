# Stage 8D–8E — Real Fixture-Linking and Lagged Starting-XI Diagnostic

**Date:** 2026-11-14. Research-only. **Player-impact prediction validation: UNVALIDATED. Betting publication: BLOCKED.**

## Verified archive linkage
2024/25 380-match Premier League schedule/result archive with explicit gameweeks: `openfootball/football.json@e6744429ee395bc86f247348c6184bb08d4eb361`, `2024-25/en.1.json`. Independent retrospective lineup source `withqwerty/availability-data@5c6286c24dd58b3c9a6b4f5ccbd0c6e6466cb7dd`.

- Chelsea FC: 38/38 matchday lineup records matched to explicitly dated fixtures with no duplicate/missing round.
- Arsenal FC: 38/38 matched.
- For each club, 36 previous-lineup-continuity observations had at least two earlier completed fixtures.
- The 38 actual lineups are retrospective records, **not** information known before the same match. Importer never permits current-match XI as a pre-match feature.
- Real-data integration GitHub Actions: https://github.com/aurelian2483-cmd/value-watch-lab/actions/runs/43634019594

## Stage 8E: first actual-outcome player-related experiment

**Input feature:** The proportion of overlapping starters in a team's **two preceding, fully completed matches** (consecutive team matches by calendar date), home minus away. Only previous completed matches are included; all same-calendar-day fixtures are withheld until predictions for that day are scored.

This is **past lineup stability**, not a causal player contribution, confirmed availability or a model of expected starting XI. Its source is retrospective archival data, so historical publication cutoff cannot be independently authenticated.

Compared with: a research reconstruction of the original within-season Poisson home/away goal baseline with 5 league-average pseudo-matches and 0–11 goal convolution. New challenger adjusts the two Poisson means with opposing exponentials scaled by one global coefficient alpha. Coefficient options fixed to `[-0.20, -0.10, -0.05, 0, +0.05, +0.10, +0.20]`.

Data: **40** historic club-season archive files from `withqwerty/availability-data`; explicit `2023-24/en.1.json`, `2024-25/en.1.json` results from OpenFootball pinned to the stated commits. Cross-source data rights and independent factual correctness not yet established.

Calibration 2023/24: **314 eligible fixtures**. Baseline log loss **0.9823786227**, selected alpha **-0.10**, challenger log loss **0.9820996567**. Difference is tiny.

Later 2024/25 diagnostic: **320 eligible fixtures**, baseline log loss **1.0150126723**, challenger **1.0177752805** (**worse by 0.0027626082 mean LL**). Baseline mean Brier **0.6088065406**, challenger **0.6110161099** (**worse by 0.0022095693**).

Paired date-clustered resampling, 2,000 draws from 94 calendar-day groups: mean **challenger − baseline** LL **+0.0027626082**, exploratory 95% interval **[-0.0000318553, +0.0057978348]**. The interval includes zero. This is **not** a demonstrated beneficial or statistically definitive harmful effect.

**CAUTION: 2024/25 outcomes were already used in earlier Value Watch football research; this is reused diagnostic data, not an untouched holdout. No profitable edge, calibrated real player effect, or independent improvement is established.**

Runs:
- https://github.com/aurelian2483-cmd/value-watch-lab/actions/runs/43634271246 (first real-outcome diagnostic)
- https://github.com/aurelian2483-cmd/value-watch-lab/actions/runs/43634362134 (paired uncertainty and **69 passing tests**)

## Interpretation and decision
- The simple feature is **not supported for deployment**; retain alpha=0 in the live model.
- Historical lineup stability could correlate with form, injury, substitutions, strong/weak squads or managerial choices, and overlaps with existing baseline strength.
- Do not infer player identity, importance or causal missing-player penalty from stability alone.
- Stronger next hypothesis: individualized **pre-match** probabilistic availability plus prior-only performance indicators, with player importance shrunk toward zero where missing or confounded. This requires actual timestamped player identity and archived status sources; without them, only paper research or prospective data collection is defensible.
- No changes to live website, betting slips or production football probabilities.
