# Sky football — reproducible baseline V1 (research only)
This is a **new, independently reconstructed** Poisson baseline. It is **not** the original Sky/Value Watch replay (the original PR #46 added only a summary markdown report, not the script or individual forecasts).

## Run
From the repository root, on Node 18+:
```sh
node research/football-baseline-v1/replay.mjs /tmp/football-baseline-v1-results.json
```
The program downloads only the pinned public-domain openfootball/football.json commit `e6744429ee395bc86f247348c6184bb08d4eb361` and generates **608** individual home/draw/away probability vectors for each of two variants, plus retrospective outcomes and scores. No bookmaker odds are used. Neither raw provider odds nor credentials are stored. Files are chronological within each season; same-calendar-date fixtures do not see one another's results.

### Assumptions (explicit because report was underspecified)
- Eligibility: >=30 previous league matches; host >=3 earlier HOME appearances; visitor >=3 earlier AWAY appearances; both sides >=3 earlier overall appearances.
- Same-season league average home and away goals calculated on earlier dates only.
- Home attack / defence and away attack / defence each shrunk by five pseudo-matches toward same-season league venue scoring average.
- Expected home goals = shrunk home scoring rate * shrunk away conceded rate / league away goals; expected away goals = shrunk away scoring rate * shrunk home conceded rate / league home goals, denominator floored at 0.01. Rates clamped to [0.15, 4] **before** the optional form adjustment.
- Recent-form variant: difference between home and away clubs' last-five prior match goal differences. Multiply home and away rates by exp(+/-0.025*delta), respectively. This is an approximation, not authenticated original implementation.
- Poisson 0–11 goals score grid; normalize all 1X2 probabilities; fixed ordered outcomes `home, draw, away`.
- Event IDs include season, match date, exact full team names.

## Evidence gates
Expected: 2024–25: 320 / 380 completed fixtures; 2025–26: 288 / 353 completed fixtures. All predictions are retrospective reconstructed forecasts, **not timestamp-attested original Sky predictions**. No out-of-sample claim. Compare to historical bookmaker closing odds **only after** full event-level provenance/rights checks. The published Sky report's 1.01981 is not replicated by this model and must not be silently relabelled.
`research_only=true`; publication and betting blocked. Do not promote to the live prediction system.
