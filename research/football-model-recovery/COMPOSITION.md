# Football implementation paths

| Path | Order and boundaries |
| --- | --- |
| Dashboard producer | Prior-season venue aggregates → direct Poisson rates → clamp [.15,4] → goals 0–11 → normalize home/draw/away. Unknown or thin prior-season teams can use the separately labelled current-season shrinkage fallback. The fallback applies a five-match league prior before the same grid. No recent-form or market adjustment in this producer. |
| Expanded producer | League-scoped home/away totals → five pseudo-match shrinkage → venue-factor lambda → clamp and Poisson grid → experimental row. Current-season comparison calls the same calculator with the fallback basis. Match Centre reads H2H and total league form independently. Neither modifies these probabilities. |
| Baseline replay | Earlier calendar dates within one season → five pseudo-match venue rates → baseline clamp → alpha .025 prior-five goal-difference shift on a separate branch → normalize grid. Same-day results enter history only after forecasting the whole day. It divides the home lambda by the league away mean and the away lambda by the league home mean. The expanded and Stage 2 baseline paths use same-venue denominators. Its form-adjusted rates are not reclamped in this replay. Stage 2 research clamps after the shift, so the implementations cannot be silently equated. |
| International | Prior captured national-team regulation scores → last ten per team, minimum five → mean of own scoring and opponent conceding → Poisson 0–60 normalized. No domestic league, stadium, venue-strength, squad or market adjustment. |
| Frozen-market display | `desk-compact-20261116.js:renderFrozenCandidate` requires the separately named frozen alpha .025 input plus fresh, complete same-source quotes. It calls `experimental.js:marketCandidate` for inverse prices, proportional de-vig and 50/50 mix. Its final price/EV filter belongs to the existing research display. |
| Hybrid display | `hybrid.js:evaluate` checks current-season model identity, timing, venue sample and exact event market. It de-vigs the independent benchmark, blends 50/50, then checks a separate observed Sky Bet price. This is an alternative display path. It does not call the frozen-market branch or a player model. |
| Isolated match-intelligence | Stage 2 estimates opponent PPG from earlier results and changes goal-difference form. Stage 3 uses earlier venue defensive rates to adjust observed attacking goals. Player stages run separately, after explicit baseline, evidence and lineage review. Later market/selection and calibration studies take their own inputs. No tested composition connects them to the shipped dashboard or assembles a numbered V1–V6 chain. |

Team venue splits and venue-specific H2H are implemented. They are not
stadium effects. Squad and transfer observations can be catalogued with
cutoffs; effect coefficients remain unavailable. Dynamic player scenarios
can consume signed hypothetical coefficients and substitute no value for
missing expected minutes. There is no code-backed handoff from reviewed
availability into authenticated runtime coefficients. Fixture lifecycle,
coverage and stale-evidence checks are gates and diagnostics, not model terms.
The proposed V6 residual shrinkage is distinct from Poisson priors, player
reliability and the isolated optimism-correction study.
