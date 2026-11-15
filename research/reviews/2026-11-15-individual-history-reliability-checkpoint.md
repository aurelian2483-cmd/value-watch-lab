# Individual-history reliability formula — executable pilot checkpoint (2026-11-15)

**Research-only. No production changes and no horse-racing predictive-performance claim.**

## Model
Dedicated library: [horse_v3_history_reliability.cjs](../../scripts/horse_v3_history_reliability.cjs). Read-only, takes supplied previous-run histories. No current-race class, field size, course or new race-level adjustment; target distance and going are used only to decide which previous-run observations are comparable.

For eligible historical run k of horse i, `w_ik = 2^(-age_days/90)`, `F_ik=(past_field_size-past_finish_position)/(past_field_size-1)`.

Each context subset c (distance within 20% of target; previous Standard-labelled surface when target Standard):
- `W_ic = sum_k w_ik`;
- `n_eff,ic = W_ic^2 / sum_k w_ik^2` (zero when empty);
- `R_ic = n_eff,ic / (n_eff,ic + 5)`;
- `C_ic = sum_k w_ik * (F_ik-0.5) / (5 + W_ic)`;
- `alpha_ic = 0.15 * R_ic`;
- `delta_i = 2 * (alpha_i,distance * C_i,distance + alpha_i,surface * C_i,surface)`.

The resulting delta is an individual-horse **logit adjustment** to be applied to a *frozen full-field V1 vector* followed by renormalization. It is **not** a standalone race probability. It only uses at most six prior Flat results, minimum three overall, maximum 730-day age and excludes same-day/future results and duplicate race IDs.

These constants are **fixed research hypotheses**, not learned/calibrated optimal values. Requiring Standard on both historical and target fields intentionally narrows this first test; other going types are not yet modeled.

## Executed mathematical/invariant check
Retrieved the actual committed library file from the research branch (blob `4d637cdcf4b93066cf1a2277249c7f4b14fb0c85`) and executed it in a V8 test harness against **synthetic fixture inputs**, not the Node CLI. All **nine** independent checks returned true:
1. Eligible prior-run history accepted.
2. Fewer than three runs rejected.
3. Individual adaptive weights positive and capped below 0.15.
4. Nonmatching history yields zero distance and surface weights.
5. Nonmatching history yields zero context delta.
6. Future runs excluded.
7. Duplicate historical race IDs excluded.
8. Good historical finishing form produces positive logit adjustment.
9. Poor historical finishing form produces negative logit adjustment.

The specific positive fixture produced `n_eff=2.973882`, `R=0.372953`, `adaptiveWeight=0.055943` for each matching context; these are synthetic examples, **not race results**. Also committed [test source](../../tests/test_horse_v3_history_reliability.cjs) for a local `node` regression run. **GitHub CI / Node test execution has not been verified**, so the V8 checks must not be mislabeled as an Actions pass.

## Real-data coverage and blocker
- The 58-race frozen challenger feature matrix contains race-centred aggregated features, but **not prior-run distances/going, individual recency weights and relevant run IDs**, so this exact history-based formula cannot be evaluated faithfully from it. Earlier 58-race signal-adaptive proxy results are a *different* experiment.
- The isolated V3 2025 archive recovery report identifies **117 races with 0 full-field V1-eligible as originally stored**. Ten-race pilot: 10 races/94 runners; 55 with zero stored previous rows; 66 runners with fewer than three usable previous Flat finishes. Historical missingness cannot be interpreted as never-raced.
- Single-race retrospective recovery is not an independently attested pre-race cohort.
- **Therefore no real historical paired V1 vs exact reliability-adaptive V3 predictive-performance test was completed here.** Any such claim would invent missing data. A valid comparison requires a complete, provenance-checked, full-runner field with timestamped relevant past finishes for each of the same races. Preserve the old archives and inspect newly recovered history separately.

## Decision status
- User agreed to test **individual-horse reliability before any additional race-characteristics adaptation**.
- The individual reliability *calculation and synthetic invariants* are implemented and exercised.
- Exact model-level historical or prospective accuracy testing is **BLOCKED ON SOURCE COVERAGE**, not passed/failed.
- No subsequent race-level model change is approved.
- Existing V1, fixed V3, experimental 58-race proxy, website, collectors and publication gates remain unchanged; `UNVALIDATED` / `BLOCKED`.
