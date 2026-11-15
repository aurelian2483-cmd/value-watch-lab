# Horse V3 individual-only adaptive pilot — 15 November 2026

**Status: EXPLORATORY / POST-HOC / RESEARCH ONLY. NO MODEL PROMOTION.**

## User-agreed order
1. Examine individual-horse adaptive formula first (this experiment).
2. Consider a distinct race-characteristics adaptation **only after discussion of individual results**. No race-level adaptation was added.

## Input data and reproducibility
- Existing frozen `research/horse-challenger/features-v1.json`, dataset SHA-256 `303ba6e48be444373004173cad83c12b2b6cd43de50a9d806ce1d75d496d2b5e`.
- 58 retrospectively reconstructed GB all-weather handicap races: 14 pre-October training, 18 early October validation, 26 16–31 October later test, already used and observed in previous challenger experiments. First availability of data **not** attested. **Not a new untouched test**.
- Evaluated in JavaScript during this recovery on the fetched repository dataset. Reproduction script: [scripts/research_horse_individual_adaptive_pilot.cjs](../../scripts/research_horse_individual_adaptive_pilot.cjs). Run `node scripts/research_horse_individual_adaptive_pilot.cjs`.
- The script does **not** train, select coefficients, fetch remote odds or modify source archives. All experimental constants are illustrative and **not learned**.
- Note these are **race-centred historical feature columns** 4=surface_form, 5=distance_form, 2=shrunk_form from the challenger training matrix. They are NOT the direct raw contextual signals from the isolated V3 pilot. Thus this is a *proxy study*, not an exact V3 replay.
- Original V1 frozen racewise full-field baseline probability vector is the starting point for every variant. All adjustments enter **log probabilities**, then stable softmax re-normalization.

## Tested formulas (horse index i)
Let `p_i` denote original frozen V1 probability; `D_i` and `G_i` be race-centred distance and surface historical features in this dataset; `F_i` race-centred form feature.

For each alternative, compute `q_i = softmax(log(p_i) + delta_i)`.

- `baseline`: `delta_i = 0`.
- `fixed`: `delta_i = 2 * 0.15 * (D_i + G_i)`.
- `adaptive_signal`: `delta_i = 2 * 0.15 * [ D_i * abs(D_i)/(0.05+abs(D_i)) + G_i * abs(G_i)/(0.05+abs(G_i)) ]`.
- `adaptive_form`: `delta_i = 2 * 0.15 * (D_i + G_i) * clip(0.5 + F_i,0,1)`.

Adaptive variants differ between individual horses based solely on their own historical feature row, not target race class, track, field size or other **new** race-level adjustment. Note the race-centered nature of source features means individual transformations remain mathematically dependent on peer-centering; this is not a proof of independent horse-level reliability estimates. **Neither adaptive formula implements the originally proposed `n_eff/(n_eff+k)` reliability formula**, because individual relevant-run counts/effective weights are absent from the frozen feature matrix.

## Results (lower better)
| Formula | Train log loss (14) | Validation log loss (18) | Later 26-race log loss | Later Brier |
|---|---:|---:|---:|---:|
| Original V1 | 2.282858 | 2.157475 | **2.346384** | **0.903849** |
| Fixed context proxy | 2.273162 | 2.150473 | 2.346861 | 0.904191 |
| Adaptive signal proxy | 2.277280 | 2.153499 | **2.345782** | 0.903892 |
| Adaptive form proxy | 2.278480 | 2.153702 | 2.346604 | 0.904005 |

Difference of adaptive-signal vs V1 on 26 already-known later races: **-0.0006023** mean log loss (slightly lower), **+0.0000435** mean Brier (slightly higher). Mixed metrics, minimal effect; no meaningful demonstrated superiority. Earlier 'train'/'validation' labels describe data chronology only; these formulas were considered *after* outcomes were known, so all scores here are exploratory, not independent validation.

## Decision request
**No promotion or race-level adaptation yet.** To test the user's proposed evidence-count-based reliability formulation, first recover per-run records and their race-day first-availability timestamps; compute effective historic distance and surface sample sizes directly from prior eligible runs (not inferred from finished outcome). Freeze constants before a genuinely untouched future-period evaluation and compare original V1, fixed V3 and adaptive V3 on identical eligible race fields.

## Hard boundaries
- No changes to `main`, existing model parameters, model/forecast archives, collectors, paper slips, betting outputs or website.
- Preserve `UNVALIDATED` / `BLOCKED`. Do not claim calibration, positive EV, ROI, executable Sky Bet odds or a validated win probability improvement.
- The research branch contains only an independent reproduction script and this report.
