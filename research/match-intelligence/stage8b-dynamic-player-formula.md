# Stage 8B — Dynamic, signed, context-sensitive player effect (scenario engine)

**Implementation**: `research/match-intelligence/dynamic-player-impact.js`. **Status:** scenario-only, UNVALIDATED, betting publication BLOCKED.

## Why the formula is different from a fixed player rating

A player's contribution is signed and match dependent. Many players have zero effective adjustment, and an apparently important player's contribution may be positive or negative depending on current information. Avoid a forced ranking or a blanket assumption that a missing player always harms win probability.

For each player `p`, define (all values must be estimated from **prior-only data** before any real forecast):
- `u_attack,p`, `u_defence,p`: **signed** log expected-goals impact per full 90-minute difference, each between -1 and +1 as a scenario-input safety bound;
- `e_p`: expected minutes in the forecast (unknown is null);
- `b_p`: minutes already represented in the historical Poisson baseline;
- `F_p`: form multiplier, `[0,2]`;
- `C_p`: matchup multiplier, `[0,2]`;
- `n_p`: eligible historical training matches (not total raw appearances);
- `k`: positive shrinkage pseudo-sample size (scenario default `20`; not calibrated).

Reliability: `r_p = n_p / (n_p+k)`. Relative minutes: `d_p=(e_p-b_p)/90`.

Signed attack and defence changes:

```
attack_change_p  = d_p * u_attack,p  * F_p * C_p * r_p
defence_change_p = d_p * u_defence,p * F_p * C_p * r_p

lambda_H,new = clamp(lambda_H,baseline * exp(SUM(home.attack_change)
                                             - SUM(away.defence_change)), .15, 4)
lambda_A,new = clamp(lambda_A,baseline * exp(SUM(away.attack_change)
                                             - SUM(home.defence_change)), .15, 4)
```

Finally recompute normalized independent-Poisson 1X2 probabilities over goals 0–11. All changes are relative to a supplied baseline, preventing the simplistic error of applying the full player's performance twice.

### Interpretation
- `u_attack = 0`: no attacking effect (with any number of minutes).
- `e_p = b_p`: no *incremental* change, even for a valuable player.
- `e_p < b_p` with `u_attack > 0`: lowers expected attacking goals.
- `e_p > b_p` with `u_attack < 0`: lowers expected attacking goals.
- `u_defence > 0`: stronger protective defence, reducing opponent expected goals.
- `n_p = 0`: reliability is zero; model shrinks estimated effect to zero.
- **Unknown expected minutes:** produce `INSUFFICIENT_EVIDENCE`, not a made-up adjustment.

This is an **experimental sensitivity simulator**, not evidence that the above additive log-goal structure is calibrated, or that player effects are identifiable. The scenario parameter ranges and reliability rule are provisional assumptions. Missing player and opponent interaction terms, confounding, positional flexibility, team chemistry and substitution effects mean that signs and sizes cannot currently be interpreted as causal.

## Operational constraints
- Input `attack_effect`, `defence_effect`, form, matchup, reference minutes and training counts have not been fitted to real eligible historical player data. Do **not** label example coefficients factual or attach them to real named players.
- A real prediction should derive every input from legitimately obtained, independently verified evidence timestamped before the chosen kickoff cutoff, with an auditable sample, calibration and fresh holdout.
- The existing fixture mapping preflight remains independent, and no verified output from it is automatically treated as player impact.
- No market odds, EV, live deployment, or production model modifications.
- Quantitative success must ultimately be measured against the unchanged baseline and a newer untouched historical/prospective sample, not against the previously reused 2024–2026 holdout.

## Next scientific experiment
Fit regularized positive/negative effects from date-joined, pre-cutoff historical player/lineup availability, comparing: baseline, global squad strength, selected player effects, and selected player × opponent interactions. Preselect feature counts and shrinkage on calibration only; report score differences and uncertainty, with explicit PASS if the effects are not supported.
