# Sky 81-configuration horse-racing experiment

This research specification reconstructs the grid supplied for PR #114 on 20 November 2026. The 286-entry mathematical catalogue is a separate registry. The generated IDs identify exact coefficient vectors for this reconstruction.

## Formula and provenance

On one ordered active field of N runners, let Uᵢ = 1/N and Mᵢ = (1/dᵢ)/Σⱼ(1/dⱼ), where dᵢ is finite decimal bookmaker odds greater than 1. A and B are the frozen Phase 3 race-win probability vectors defined below.

```text
P_i = (1-m)[(1-r)U_i + r(aA_i + (1-a)B_i)] + mM_i
a = [0, 0.25, 0.5, 0.75, 1]
r = [0.25, 0.5, 0.75, 1]
m = [0, 0.25, 0.5, 0.75, 1]
```

The user supplied the formula and grids. Here a is the fraction allocated to A within the A/B pool, r is the fixed share of that pool within the nonmarket blend, and m is the fixed market share. The grid supplies r directly. The within-model history shrinkage below is computed separately for each runner. Original setting labels, order, and any rationale or fitting procedure for the three grids are unavailable.

The exact canonical coefficient vector in U, A, B, M order is ((1−m)(1−r), (1−m)ra, (1−m)r(1−a), m). Each coefficient has an integer numerator over 64. [The manifest](configurations.json) stores all four numerators, active inputs, and every original grid triple under its reconstructed ID. For m<1, recover m from its coefficient, r from the sum of the A and B coefficients divided by 1−m, and a from the fraction of A in their sum. That gives 80 distinct vectors. At m=1, all 20 triples give (0,0,0,1). Thus 100 grid settings yield 81 configurations. Equality on an individual field can arise from coincident input vectors or a single runner.

All coefficients are nonnegative and sum to one, so ΣᵢPᵢ=1 for normalized active inputs. At m=0 odds are unnecessary. At a=0 or a=1 the inactive base vector is unnecessary. At r=1 the uniform term vanishes. The grid contains pure A, pure B and pure market. A one-runner field gives probability 1.

## Frozen Model A and Model B

Both use the original Phase 3 source extractor. For each runner use the latest three to six resolved same-discipline runs in the preceding 730 days. The source cutoff is the earlier of the capture and race dates in Europe/London. The extractor excludes unresolved histories under its recorded policy and uses the original percentile y=(field size−place)/(field size−1) for numeric finishes and 0 for known nonfinishers. The archived 90-day weights and frozen similarity values supply the reproducible input representation. [Phase 3 protocol](https://github.com/aurelian2483-cmd/value-watch-lab/blob/1e7995219a38f4949557f56f123ef03dbfbd3c33/research/horse-ab-phase3-master-20261115/PHASE3_PROTOCOL.md) · [Archived context extractor](https://github.com/aurelian2483-cmd/value-watch-lab/blob/1e7995219a38f4949557f56f123ef03dbfbd3c33/research/horse-ab-phase3-master-20261115/audit/source/scripts/horse_context_pipeline.py)

For history row j, let tⱼ=2^(−ageⱼ/H). Use distance similarity exp(−|log(historical distance/current distance)|/0.25), going similarity 1/(1+absolute ordinal gap) when comparable in the source's going family, class similarity 1/(1+absolute class gap), and a case-folded, trimmed course-name match indicator. Omit terms with unavailable similarities. Going-family parsing and historical eligibility are fixed by the archived extractor.

```text
w_j = t_j (1 + d*s_distance,j + g*s_going,j + c*s_class,j + q*s_course,j)
historical_mean = Σ_j(w_j*y_j) / Σ_j(w_j)
R = Σ_j(t_j)
strength_i = 0.5 + R/(R+K) * (historical_mean - 0.5)
p_i = exp(β*strength_i - z_max) / Σ_l exp(β*strength_l - z_max)
z_max = max_l (β*strength_l)
```

| Frozen model | Phase 2 candidate | d | g | c | q | H (days) | K | β |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| A | `A0_FULL` | 1 | 1 | 0.5 | 0.5 | 90 | 5 | 2 |
| B | `E_NODIST_half_life_inverse_temperature` | 0 | 1 | 0.5 | 0.5 | 45 | 5 | 4 |

The archived 90-day weights are used directly for A and squared for B. R uses unbonused recency mass. The softmax is evaluated within the shared complete field. The provenance for the parameters is the pinned Phase 3 protocol and its development selection receipt. The package reports frozen model bundle SHA-256 `560ff45d28c097111bd9868ceca8bb7c556b1c86b3c61f2c2f6a3576e495ed58`. [Phase 2 selection receipt](https://github.com/aurelian2483-cmd/value-watch-lab/blob/1e7995219a38f4949557f56f123ef03dbfbd3c33/research/horse-ab-phase3-master-20261115/reproduction/phase2_snapshot/results/selection.json)

## Catalogue crosswalk

| Component or record | Classification | Catalogue relationship |
| --- | --- | --- |
| 78 nondegenerate reconstructed rows | Fixed parameter configurations of one ensemble | `weighted-ensemble` is the exact linear-pool mechanism; weights instantiate that mechanism |
| Pure A, pure B, pure market | Single-component boundary configurations | Boundary cases of `weighted-ensemble`; no exact separate catalogue ID for the frozen base specifications or proportional inverse-odds transform |
| A and B | Two frozen parameterizations of the same historical scoring pipeline | `exp-time-decay` describes its relative recency weighting; `softmax` is the exact within-field normalization |
| Uniform pull and within-model reliability pull | Shrinkage operations | `probability-shrinkage` is related; its specified reliability depends on Jensen–Shannon disagreement |
| Market probability | Proportional inverse-odds normalization | Same-field probability input to the pool; the `ev` decision record serves a different purpose |

Every generated row names its catalogue relationship. Generating, verifying and evaluating the grid are research procedures. The 81 rows add zero algorithm, ensemble or configuration records to the separately registered catalogue.

## Reproduction and archived evidence

From the repository root, with Node.js and a local copy of the pinned Phase 3 research package:

```text
node research/mathematical-library/sky81/experiment.mjs
node --test research/mathematical-library/sky81/experiment.test.mjs
node research/mathematical-library/sky81/reproduce-phase3.mjs /path/to/horse-ab-phase3-master-20261115
```

Use the pinned [raw forecast manifest](https://github.com/aurelian2483-cmd/value-watch-lab/blob/1e7995219a38f4949557f56f123ef03dbfbd3c33/research/horse-ab-phase3-master-20261115/audit/raw76_manifest.json), [raw forecast directory](https://github.com/aurelian2483-cmd/value-watch-lab/tree/1e7995219a38f4949557f56f123ef03dbfbd3c33/research/horse-ab-phase3-master-20261115/audit/raw76), [derived inputs and provisional labels](https://github.com/aurelian2483-cmd/value-watch-lab/blob/1e7995219a38f4949557f56f123ef03dbfbd3c33/research/horse-ab-phase3-master-20261115/reproduction/phase2_snapshot/inputs/derived_inputs.json), and [archived retrospective score rows](https://github.com/aurelian2483-cmd/value-watch-lab/blob/1e7995219a38f4949557f56f123ef03dbfbd3c33/research/horse-ab-phase3-master-20261115/analysis/robustness.json). The replay verifies all 76 forecast blobs, checks runner and winner identity, and reproduces the original A/B score rows from frozen history. See the [replay receipt](phase3-replay.json). The original Phase 3 archive also records canonical-record verification. [Archived integrity receipt](https://github.com/aurelian2483-cmd/value-watch-lab/blob/1e7995219a38f4949557f56f123ef03dbfbd3c33/research/horse-ab-phase3-master-20261115/audit/raw76_integrity.json)

All 76 races (730 runner appearances over 12 dates) were examined before this work. The earlier 58 and later 18 races are retrospective development and diagnostic samples. The labels are provisional single-source outcomes. The records do not establish historical first availability or prospective performance.

The recovered forecast records have null odds on all 76 races. Market-weighted rows require complete bookmaker quotes from a common source and snapshot aligned to the forecast cutoff and the exact same field. Missing, unmatched or post-cutoff quotes preclude those rows on that race. The archived older 32-race market benchmark concerns a separate V1 model. No matching quote archive for these 76 races or run receipt for the original 81-formula tournament was recovered. This work executed the Phase 3 A/B parity replay and synthetic grid checks. It scored zero reconstructed tournament configurations in a grid run.
