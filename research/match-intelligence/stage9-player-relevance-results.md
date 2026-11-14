# Stage 9 — Player Relevance Filtering and Uncertainty

**Recorded:** 2026-11-14. **Research only, UNVALIDATED, publication BLOCKED.**

## Motivation
Past experiments demonstrated:
- Some controlled synthetic signed player effects are mathematically recoverable, but **not validated** in real football.
- Simple historical starting-XI stability slightly worsened 2024/25 prediction log loss on reused historical data (baseline 1.0150126723 vs 1.0177752805, n=320, selected alpha -0.10); retain that negative result and do not deploy the feature.
- An individual player's role can be positive, negative, neutral, changing with playing time, opponent and form, but no real named player coefficients have been independently fitted with correct pre-match source timestamps.

## Implemented
`research/match-intelligence/player-relevance-gate.js` accepts candidates with signed effect estimate and interval, source metadata, observed and first-known timestamps, playing-time difference, training-match count, form and matchup modifiers.

It then rejects candidates with any of:
- missing exact pre-match cutoff compliance;
- missing HTTPS source URL (a source URL is not proof of actual content);
- missing expected minutes;
- too few training matches (configurable research default 15, **not calibrated**);
- signed-effect interval including zero, including either bound;
- an uncertainty interval wider than a configurable research default (0.4 on log effect scale, **not calibrated**);
- hypothetical-only evidence, which is never eligible as empirical evidence.

A candidate surviving these heuristic screens is labeled `EXPLORATORY_RELEVANCE_CANDIDATE` only. It **does not** become a validated model feature, numerical live forecast or guaranteed important player. The gate calculates a signed **scenario** shift under the unchanged Stage 8B minutes/form/matchup/reliability formula, with default shrinkage denominator `n/(n+20)`. This is for inspection, not causal inference. The actual dynamic-player-impact model remains separate and unapproved for deployment.

## Verification
- New isolated regression tests: `tests/test_match_intelligence_player_relevance.cjs` (9 cases: positive, zero crossing, weak sample, wide uncertainty, after-cutoff, missing minutes, hypothetical source, signed negative contribution, duplicates/mismatched IDs).
- GitHub Actions run https://github.com/aurelian2483-cmd/value-watch-lab/actions/runs/43636902342: **78 total tests passed, zero failed** in isolated unit test job.
- No fresh real-world outcome experiment has been executed at Stage 9, and these tests cannot establish that the heuristic thresholds are optimal or that the estimated intervals are calibrated.

## Next empirical gate
Acquire genuinely archived pre-match player-availability sources and verify fixture IDs, team/player identity, actual original publication timestamps and licensed reuse. On chronological training data, estimate regularized player effects with opponent, position, manager, team-mate and fixture controls. Evaluate a frozen model on fresh untouched outcomes, using paired log loss/Brier plus uncertainty and bookmaker-market benchmarking before any possibility of deployment.

**No production website, wager, odds or existing match probability modified.**
