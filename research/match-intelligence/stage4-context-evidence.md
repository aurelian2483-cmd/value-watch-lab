# Stage 4 — Pre-match Squad and Context Evidence

**Status:** implementation of evidence controls, not a predictive improvement. Research-only, UNVALIDATED, publication BLOCKED.

## Built and committed
- `research/match-intelligence/squad-context.js`: audits fixture-specific, date-stamped `LINEUP`, `INJURY`, `SUSPENSION`, `TRANSFER`, `MANAGER`, and `REST` evidence for both teams.
- `tests/test_match_intelligence_stage4.cjs`: six regression tests covering missing context, doubtful vs confirmed absences, source requirements, pre-snapshot chronology, non-certified lineup, duplicates and malformed entries.
- GitHub Actions workflow runs Stage 4 tests together with Stage 1–3 tests.

## Data availability and integrity
The existing repo contains goal results, league-level Poisson predictions, H2H and recent W/D/L form. There is **no verified/current injury, confirmed XI, tactical, licensed xG, or player-impact training feed integrated in this Stage 4 engine**.

For every record require a unique ID, exact team, source type, HTTPS link, first-known timestamp, observed timestamp, subject and a known availability status. Evidence known after the frozen snapshot is rejected. A doubtful player is never a confirmed absence. Even if one lineup record exists, XI completeness is not inferred.

## Explicitly not implemented
- Live feeds or independently verified Chelsea/Arsenal facts.
- A method of verifying authenticity or content of external websites; source URL is *provenance metadata*, not proof the statement is true.
- Calculated player-strength deltas or manager effects; all remain `null`.
- Tactical compatibility features, source licensing validation, or prediction score changes.
- Match-specific odds, probabilities, expected value or betting publications.

## Proposed next evidence audit
1. Choose a **verified actual fixture** and freeze one pre-match timestamp.
2. Collect original match and injury/suspension announcements from club, league, and reliable providers; inspect actual contents; archive source timestamp and extraction method. Record contradictory reports.
3. Build historical player-availability and lineups dataset with a stable team/player ID scheme and source rights assessment.
4. Only after covering enough past matches, preregister a model and evaluate incremental out-of-sample log loss, Brier and calibration.
5. Hold the historical Poisson probabilities as unchanged baseline while data quality is insufficient.

**Safety:** Do not infer player impact from status alone or merge this evidence layer into live prediction code.
