# Stage 7 — Historical Lineup Dataset Feasibility and Integrity

**Status:** Historical dataset framework built; NOT validated for predictive player effects; live publication BLOCKED.

## Historical source candidates (not endorsements)
1. `withqwerty/availability-data`: retrospective Transfermarkt-derived per-club season data, with `starting`, `sub_in`, `bench`, `injured`, `suspended` and other matchday states. Source: https://github.com/withqwerty/availability-data . Repository documentation advertises 2015/16–2025/26 top-flight coverage for multiple countries. It does not demonstrate the exact time each injury or matchday status became publicly known.
2. `ethankaufman/PL-History-Dashboard`: match/player appearance data described as derived from Premier League public records for many seasons. Source: https://github.com/ethankaufman/PL-History-Dashboard . Verify records, extraction, terms and source integrity independently before use.

## Verified read-only sample audit, 2026-11-14
Dataset revision: `withqwerty/availability-data@5c6286c24dd58b3c9a6b4f5ccbd0c6e6466cb7dd`.
- `raw/GB1/2024/fc-chelsea.json`: Chelsea FC, GB1 player records **54**; 38 numerical rounds, **38 with exactly 11 starters**; 183 per-player round statuses recorded as `injured`. Dataset `scrapedAt`: `2026-03-27T22:06:40.101349+00:00`.
- `raw/GB1/2024/fc-arsenal.json`: Arsenal FC, GB1 player records **38**; 38 numerical rounds, **38 with exactly 11 starters**; 182 per-player round statuses recorded as `injured`. Dataset `scrapedAt`: `2026-03-27T22:07:33.126753+00:00`.
- **Interpretation:** These are *player-matchday counts*, not 183 or 182 distinct injuries, players, or confirmed pre-match absences. Structural XI counts are not independent validation of injury reasons or actual fixture identity. Dataset collection occurred after the 2024/25 matches; it therefore cannot establish pre-kickoff publication times.

## Code and tests
- `research/match-intelligence/historical-availability.js` validates club/season/competition identities, round numbers, statuses, player IDs and collisions. It reports XI count and suspicious squad counts, flags missing or duplicate statuses, and marks all derived records `retrospective_data_only:true`.
- `tests/test_match_intelligence_stage7.cjs` tests XI counts, missing starters, duplicate IDs, conflicting statuses, unsupported states and competition isolation.
- No player impact, lineup-based forecast, injury causal effect, win probability or trading recommendation is generated. `eligible_for_historical_training` remains `false` until fixture IDs are joined, content cross-verified and research use rights assessed.
- Actual availability at prediction cutoff is fundamentally different from retrospective availability after match kickoff. Historical **actual starting XI** may be used to train a descriptive outcome model only with rigorous leakage boundaries, but a pre-match forecaster needs *pre-cutoff known or predicted lineups* separately. The historical post-match XI may not be used as an input for a past pre-match forecast unless archived announcement time establishes availability before the forecast cutoff.
- Data ownership, redistribution permissions, sourcing completeness and independent source agreement are not certified.

## Next gates
1. Build a deterministic historical fixture match-key map (season, competition, club, opponent, kickoff date, match ID). The archive's round-only statuses do **not** identify individual fixtures.
2. Independently verify starter and missing-player statuses against original official match records.
3. Acquire archived injury/availability **announcement timestamps**, separate from retrospective results.
4. Pre-register a training/calibration/untouched test plan on **new, unexamined** seasons or competitions. 2024/25–2025/26 outcomes have already been used during earlier model research.
5. Fit player-impact effects with appropriate regularisation and confounding controls; report uncertainty and reject insufficiently supported effects.

No main-branch or live website modifications.
