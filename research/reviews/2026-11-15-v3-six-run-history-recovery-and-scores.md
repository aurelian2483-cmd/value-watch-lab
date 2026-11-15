# V3 complete available-history recovery and paired formula replay — 15 November 2026

**STATUS: RESEARCH ONLY / RETROSPECTIVE / POST-HOC / UNVALIDATED / PUBLICATION BLOCKED.** No model promotion, market claim or production changes.

## Recovery executed
Recovered 36 more dated prior Flat run records from Sporting Life horse profiles and linked historical result pages for the 13 runners in:
- Newcastle race 890908, 24 November 2025, 8 published finishers, historic winner Electric Avenue (horse 1105875).
- Wolverhampton race 894962, 22 December 2025, 5 published finishers, historic winner U S S Charleston (horse 1184423).

New raw research overlay: [additional-36-prior-flat-runs-profile-linked-2026-11-15.json](../horse-v3/additional-36-prior-flat-runs-profile-linked-2026-11-15.json). Also preserves earlier 7+11+21 records and two earlier Electric Avenue published result entries from the older six-entry overlay. All 13 target runner IDs matched, zero duplicate race-ID triples in the assembled histories.

The source is publisher historical profile and result pages accessed **after** event outcomes. Horse race 800734 for Angel Of Rain (2024-06-03) appears in the horse profile and its link resolves, but the linked page is robots-blocked during this access; that run is **profile-supported only**, not result-page-checked. Separate sensitivity excludes it. Source first availability pre-event was **not attested**, and there is no independently verified official pre-off runner field. Do not classify these as prospective inputs.

## History coverage
**12 of 13 runners now have six distinct earlier Flat runs recovered; Camzara has five available in its public pre-event profile.** Maximum six previous races is a CAP, not a requirement to find exactly six. Minimum three historical runs fulfilled by every reconstructed runner. Some recovered races were considerably older but within the original 730-day lookback. All originally missing data and source-availability caveats remain auditable.

## Replayed formulas
Exact re-computation from the new assembled histories via [research_horse_v3_full_available_history_replay.cjs](../../scripts/research_horse_v3_full_available_history_replay.cjs) and `scripts/horse_v3_history_reliability.cjs`:
- `reconstructed_v1`: `softmax(2 * formStrength)` with up to six most recent prior runs;
- `reconstructed_fixed_v3`: `softmax(2 * (formStrength + .15 * (D_signal+G_signal)))`;
- `reconstructed_individual_adaptive_v3`: `softmax(2 * formStrength + deltaLogit)`, where delta uses each horse's effective prior-run sample reliability.

**These are new manually reconstructed historical formula inputs, not the original frozen pre-event V1 snapshots or the prior V3 branch's exact fixed-ablation input records.** Historical outcomes known, test races selected for source recovery, and coefficients hypothesised rather than tuned on a true independent set. Results MUST NOT be presented as validation.

### Reconstructed full-available-history scores (lower log loss/Brier is better)

| Target | Formula | Winner heuristic weight | Winner rank | Log loss | Brier |
| --- | --- | ---: | ---: | ---: | ---: |
| Newcastle 890908 | V1 form | 0.132355 | 4 / 8 | 2.022266 | 0.863199 |
| Newcastle 890908 | V3 fixed | **0.135607** | **3 / 8** | **1.997991** | **0.858531** |
| Newcastle 890908 | V3 individual adaptive | 0.133872 | **3 / 8** | 2.010871 | 0.860935 |
| Wolverhampton 894962 | V1 form | **0.187081** | 4 / 5 | **1.676213** | **0.831271** |
| Wolverhampton 894962 | V3 fixed | 0.183351 | 4 / 5 | 1.696350 | 0.842348 |
| Wolverhampton 894962 | V3 individual adaptive | 0.184853 | 4 / 5 | 1.688192 | 0.837311 |

**Interpretation:** Both context approaches helped the winner's probability in Newcastle, both hurt it in Wolverhampton. Fixed coefficients scored best in Newcastle; original V1 scored best in Wolverhampton. Adaptive mitigated the Wolverhampton worsening relative to fixed, but did not win in either race. The tiny sample is not evidence of reliable predictive improvement or betting EV.

## Sensitivity check for inaccessible result-page row
Removing historical race 800734 (Angel Of Rain 2024-06-03; profile-only) has very little impact:
- Newcastle V1 log loss 2.022380, fixed 1.998102, adaptive 2.010983.
- Wolverhampton unchanged (no affected row).
This does **not** resolve the original source availability problem and is not a replacement for independent source verification.

## Limits and blockers
- Source pages are current retrospective views, not preserved captures before each historical target; cannot prove no later corrections. No raw page hash attestation.
- Full published finishers are used retrospectively, not the historically frozen exact pre-event starter field.
- Some originally recovered records contain surface labels `Standard / Slow`; the initial adaptive code treats **only target 'Standard' and previous string starting 'Standard'** as a surface match. That is a modelling assumption, not a tuned universal going classification.
- Original baseline validation rules and forecast gateway were **not** passed, and the exact V1 official forecast output was NOT recovered for these two 2025 races.
- Two selected races, with known winners, are wholly inadequate for independent validation.
- Results were computed in a JavaScript V8 harness on GitHub-fetched records. The committed CLI reproduction script was uploaded/read-back but was **not** run as GitHub Actions CI; do not claim CI success.

## Next gate
1. Independently verify race 800734 and any other page-result discrepancies, verify target final runner fields and historical time availability where possible.
2. Freeze preprocessing and re-run the same comparison through committed reproduction CLI.
3. Assemble much larger, genuinely future pre-event timestamped cohorts, identical full fields and auditable independent results.
4. Freeze coefficients before opening untouched evaluation sets; measure paired log loss, Brier, calibration, intervals and completeness. No promoting models or adapting to race characteristics yet.
