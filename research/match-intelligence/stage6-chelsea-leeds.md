# Stage 6 — Chelsea vs Leeds Player-Availability Snapshot

**Snapshot research date:** 2026-11-14. **Target fixture:** Chelsea vs Leeds United, Saturday 2026-11-21 15:00 GMT at Stamford Bridge. **Status:** research-only; model UNVALIDATED; publication BLOCKED.

## Evidence and provenance
Official fixture evidence:
- https://www.premierleague.com/en/news/4725574
- https://www.chelseafc.com/en/matches/mens-fixtures-and-results?tab=%E7%A7%AF%E5%88%86%E6%A6%9C

Nine documented **prior-fixture or training-status** claims are preserved in `chelsea-leeds-2026-11-21-snapshot.json`. All source publication times are **date-only**, with exact first-known timestamps not verified. No 21 November player absence, lineup, minutes restriction, or lineup effectiveness has been confirmed.

Dated source material:
- Chelsea manager's Sunderland news (published 6 Nov): https://www.chelseafc.com/en/news/article/xabi-alonso-confirms-chelsea-team-news-for-sunderland
- Leeds pre-Tottenham injury update (5 Nov): https://www.leedsunited.com/en/news/team-news-injury-updates-on-calvert-lewin-okafor-and-stach
- Leeds update after Tottenham on Okafor's minutes (7 Nov): https://www.leedsunited.com/en/news/leeds-united-risk-reward-as-boss-explains-noah-okafor-medical-situation-before-spurs-winner
- Leeds confirmed Tottenham starting XI/substitutes (7 Nov): https://www.leedsunited.com/en/news/two-changes-and-pair-return-from-injury-as-farke-reveals-xi-to-face-tottenham-hotspur

Source content was manually reviewed at research time and reduced to dated claims. The code deliberately records historical context and **cannot elevate it** into confirmed target-match availability.

## Engine added
`availability-snapshot.js` requires:
- fixture identity and kickoff;
- an explicit pre-kickoff snapshot cutoff;
- team, player, source title and HTTPS source URL;
- publication date, optional exact publication time, and a match-context scope;
- explicit distinction between `OUT_FOR_PRIOR_FIXTURE`, `DOUBTFUL_FOR_PRIOR_FIXTURE`, `RETURNED_FOR_PRIOR_FIXTURE`, `TRAINING_ONLY`, `INTERNATIONAL_DUTY` and target-match status.

The engine excludes future publications and returns `confirmed_target_absences: []`, `injury_impact: null`, `estimated_lineup: null`, `probability_adjustment: null`. These empty and null values mean **unverified**, not that everyone is fit.

## CI checks
- Five new Stage 6 regression tests.
- Total **32/32** unit tests passed on research branch, GitHub Actions https://github.com/aurelian2483-cmd/value-watch-lab/actions/runs/43630546752
- The six-season Stage 3 replay is an existing diagnostic, not fresh prediction validation.

## Limitations and next work
- Official reports refer to earlier fixtures; target availability remains unknown.
- No independently attested exact publication timestamps; exact pre-cutoff times are not fabricated.
- Provider content rights, update frequency, archival completeness and contradiction reconciliation are unresolved.
- No historic causal player-impact estimates or fresh out-of-sample performance study.
- Next: obtain actual target-match official team news when published, resolve discrepancies, and build a timestamped historical dataset of confirmed lineups and availability before fitting coefficients.

**No live Value Watch model changes or wager publishing.**
