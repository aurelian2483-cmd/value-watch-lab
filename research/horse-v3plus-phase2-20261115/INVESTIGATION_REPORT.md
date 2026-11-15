# Value Watch V3+ mathematical investigation — Phase2

15 November2026. **Research status: UNVALIDATED; publication: BLOCKED; betting eligible: false.**

## Answer and model-selection decision

**No replacement is independently established. Retain the existing formula.** A precise, development-selected challenger is promising enough to freeze for prospective evaluation: remove distance, shorten the recency half-life from90 to45days, retain the neutral prior5, and increase inverse temperature from2 to4. Across76 already examined races its log loss is **2.11717707** versus **2.13943453** for the original; Brier **0.86059489** versus **0.86614837**; first-choice winners **16/76** versus **13/76**. The LL reduction is approximately **1.040%**. These are counterfactual exploratory scores, not independently issued or validated forecasts.

The candidate was selected using58 earlier races, not the later18 diagnostic results. However, **all76 outcomes had already been examined inPhase1**, so the later18 are not an untouched holdout. On those18, selected-candidate LL improves from1.90813624 to1.88373764, Brier from0.83247055 to0.82339569, but first-choice winners **fall from6 to5**. Its pointwise date-cluster LL-difference interval includes zero, and all21-candidate simultaneous exploratory LL intervals include zero. There are zero newly available matched untouched races. No predictive improvement is approved; no betting value or profit is established.

## 1. Which model supplies the V3+ label?

At inspected repository commit `69582ebc3d2196e2fb35276d8233c0e1f0d826bc`, the Hub's model probability route is `desk.js` -> `horse-predictions-data.json` -> `engine.js` -> `racecards-core.js` contextForecast. The accepted model ID is `CONTEXT_FORM_RESEARCH_V1`. `paper-lab/horse-v3plus.js` is an evidence/provenance badge; it does not calculate or combine probabilities. Broader Hub choices can also carry market/community evidence; this report concerns the explicit context probability route. A successful Pages workflow references this commit. A later main commit `8c3b4e2054cf55303f4a0c4ec64641f647193289` changed only research-status metadata, with no model/archive/result changes; its deployment was still running at inspection. Live served-byte and displayed runtime parity were not independently verified. See the identity audit for deployment evidence and limits.

- Original `FORM_PERCENTILE_SOFTMAX_RESEARCH_V1`: separate all-weather model with numeric prior Flat finishes.
- Context `CONTEXT_FORM_RESEARCH_V1`: similarity-weighted same-discipline history including known nonfinishers; this is the model behind the76-race experiment and the inspected Hub context probability route.
- Isolated `V3_FIXED_DISTANCE_SURFACE_RESEARCH`: additive `.15` distance and `.15` Standard-surface residuals; not the context pipeline. Zero live archived fixed-V3 forecasts were found at isolated commit `95b7d4137a11c25f84d669d759613fd581aff72b`.
- Ten-feature conditional-logit challenger and prior all-weather pilots are separate; their samples/results are not pooled into this analysis.

Therefore this Phase2 is correctly a test of **the inspected Hub context formula**, not a demonstration that originalV1 and fixedV3 have been successfully combined. Exact source paths, immutable Git blob IDs and full source copies are in `identity/`.

## 2. Data and chronological design

The fixed sample contains76 unique races,730 runner appearances,4038 history rows (3929 numeric finishes,109 known nonfinishers), dated4–15November2026. Race types are47 Flat,16 Hurdle,13 Chase. Primary scores weight each race equally; runner-weighted calibration is separately labelled.

Development is4–10November,58 races; later chronological diagnostic11–15November,18 races. Both were previously examined. Expanding-window diagnostics choose among14 fixed candidates using only earlier dates, with at least three earlier dates. No same-date or later results enter each fold's numerical selection, but the historical research contamination remains.

All112 context archive records were inspected for fresh labels;76 matched unique races are already inPhase1. The remaining36 records include revisions and ten extra race IDs without matching ledger outcomes. They are not36 rejected distinct races and are not a new validation sample. The17:48 repository prediction feed contains zero current forecasts. There are **0 untouched evaluation races** in the inspected snapshot. We did not backfill convenient new outcomes and call them independent.

The original16-mask experiment was **not repeated**. A0/A1 were reconstructed only as baseline/one-candidate checks, agreeing with their archived Phase1 rows to4.45e-16 in log loss; all other prior masks were reused as background evidence. The locked plan predates Phase2 scoring within this session; it is not an externally preregistered protocol. Its exact SHA is recorded in `results/run_receipt.json`.

## 3. Exact original mathematics and candidate definitions

For runner i, historic run h has finishing position k_h, historical field N_h, age a_h days and percentile y_h=(N_h-k_h)/(N_h-1). Known nonfinishers receive0. Histories are the latest3–6 resolved same-discipline runs within730days. Let r_h=2^(-a_h/H), or1 for equal weighting. Let

`c_h = 1 + d*s_distance + 1*s_going + 0.5*s_class + 0.5*s_course`

where d=1 or0, and missing similarity gives zero bonus. Distance similarity is `exp(-abs(log(past_distance/target_distance))/.25)`; going uses inverse1+ordinal broad-going difference within surface families; class uses inverse1+class difference; course is same-course indicator. Source implementation controls eligibility and exact label mapping.

`m_i = sum(r_h*c_h*y_h)/sum(r_h*c_h)`

`R_i = sum(r_h)`

`q_i = 0.5 + R_i/(R_i+K) * (m_i-0.5)`

`p_i = exp(beta*q_i)/sum_j exp(beta*q_j)`

The original values are H=90, K=5, beta=2, d=1. Softmax is implemented with maximum subtraction for numerical stability. No market prices enter this model.

### All21 distinct evaluated definitions

Defaults not changed in a row remain original. `E_` interactions all remove distance. Repeated original settings90/5/2 are aliases to A0, not extra tests. The centered-logit replaces the score, so beta is not applied a second time.

| ID | Distance | Half-life days | Prior | Inverse scale | Percentile/link |
| --- | --- | --- | --- | --- | --- |
| A0_FULL | on | 90 | 5 | 2 | original/linear |
| A1_NO_DISTANCE | off | 90 | 5 | 2 | original/linear |
| B_HALF_45 | on | 45 | 5 | 2 | original/linear |
| B_HALF_180 | on | 180 | 5 | 2 | original/linear |
| B_HALF_365 | on | 365 | 5 | 2 | original/linear |
| B_HALF_None | on | equal | 5 | 2 | original/linear |
| C_PRIOR_0 | on | 90 | 0 | 2 | original/linear |
| C_PRIOR_2 | on | 90 | 2 | 2 | original/linear |
| C_PRIOR_10 | on | 90 | 10 | 2 | original/linear |
| D_BETA_1 | on | 90 | 5 | 1 | original/linear |
| D_BETA_3 | on | 90 | 5 | 3 | original/linear |
| D_BETA_4 | on | 90 | 5 | 4 | original/linear |
| S1_MIDPOINT | on | 90 | 5 | 2 | midpoint/linear |
| S2_CENTERED_LOGIT | on | 90 | 5 | fixed .5 log-odds | original/centered_logit |
| E_NODIST_half_life | off | 45 | 5 | 2 | original/linear |
| E_NODIST_prior | off | 90 | 0 | 2 | original/linear |
| E_NODIST_inverse_temperature | off | 90 | 5 | 4 | original/linear |
| E_NODIST_half_life_prior | off | 45 | 0 | 2 | original/linear |
| E_NODIST_half_life_inverse_temperature | off | 45 | 5 | 4 | original/linear |
| E_NODIST_prior_inverse_temperature | off | 90 | 0 | 4 | original/linear |
| E_NODIST_half_life_prior_inverse_temperature | off | 45 | 0 | 4 | original/linear |

B/C/D settings selected on development only were H45, K0 and beta4 respectively. Only their three singles, three pairs and triple were combined with distance removal. Final research selection used development log loss across the resulting21 definitions; no thousands-parameter search or later-set tuning occurred.

### Structural replacements, fixed before scoring

S1 midpoint: numeric `y_mid=(N-k+0.5)/N`. Equivalently `y_mid=(1-1/N)*y+0.5/N`: it shrinks the historical rank score toward0.5 more strongly for smaller fields. Known nonfinishers remain0. The midpoint is a symmetric plotting-position convention and a modelling hypothesis, not a field-quality or opponent-strength estimator.

S2 centered-logit: retain original q, replace score2*q by `0.5*log(q/(1-q))`; probabilities remain a field softmax. Its derivative atq=.5 is2, matching original local scale. Defensive clipping to[1e-12,1-1e-12] is present; with prior5 every q is strictly interior here. The transformation is monotone, preserves ranking, and tests confidence curvature. It is not fitted Bradley–Terry or Plackett–Luce likelihood.

## 4. Complete main results

Lower log loss and Brier are better. All mean LL/Brier values use the same76 races. Development/later rows use their own common58/18 race sets; their raw scores must not be compared as if equally difficult samples.

| ID | All log loss | All Brier | Winners /76 | Development LL /58 | Later diagnostic LL /18 | All top ECE |
| --- | --- | --- | --- | --- | --- | --- |
| A0_FULL | 2.13943453 | 0.86614837 | 13 | 2.21121676 | 1.90813624 | 0.05062 |
| A1_NO_DISTANCE | 2.13801117 | 0.86574231 | 13 | 2.20983089 | 1.90659205 | 0.05050 |
| B_HALF_45 | 2.14025225 | 0.86593082 | 14 | 2.21053016 | 1.91380123 | 0.08652 |
| B_HALF_180 | 2.14023566 | 0.86673079 | 11 | 2.21327713 | 1.90487981 | 0.03292 |
| B_HALF_365 | 2.14069582 | 0.86711350 | 11 | 2.21404615 | 1.90434476 | 0.06473 |
| B_HALF_None | 2.14091808 | 0.86750785 | 11 | 2.21381454 | 1.90602946 | 0.03955 |
| C_PRIOR_0 | 2.10755437 | 0.86147527 | 14 | 2.19575554 | 1.82335059 | 0.04458 |
| C_PRIOR_2 | 2.12407356 | 0.86311701 | 13 | 2.19937012 | 1.88145129 | 0.03879 |
| C_PRIOR_10 | 2.15044354 | 0.86848711 | 12 | 2.22055527 | 1.92452797 | 0.03700 |
| D_BETA_1 | 2.15334919 | 0.86913047 | 13 | 2.22326909 | 1.92805173 | 0.05244 |
| D_BETA_3 | 2.12870776 | 0.86400985 | 13 | 2.20239738 | 1.89126341 | 0.04079 |
| D_BETA_4 | 2.12114587 | 0.86273472 | 13 | 2.19677167 | 1.87746273 | 0.03139 |
| S1_MIDPOINT | 2.14279109 | 0.86687469 | 12 | 2.21414938 | 1.91285885 | 0.03704 |
| S2_CENTERED_LOGIT | 2.13897042 | 0.86605785 | 13 | 2.21067653 | 1.90791739 | 0.05075 |
| E_NODIST_half_life | 2.13945349 | 0.86567629 | 16 | 2.20969083 | 1.91313320 | 0.08654 |
| E_NODIST_prior | 2.10483460 | 0.86076236 | 16 | 2.19327630 | 1.81985582 | 0.05273 |
| E_NODIST_inverse_temperature | 2.11853829 | 0.86192125 | 13 | 2.19415111 | 1.87489698 | 0.01021 |
| E_NODIST_half_life_prior | 2.10078082 | 0.86079292 | 14 | 2.19474698 | 1.79800097 | 0.06080 |
| E_NODIST_half_life_inverse_temperature | 2.11717707 | 0.86059489 | 16 | 2.18962379 | 1.88373764 | 0.06021 |
| E_NODIST_prior_inverse_temperature | 2.14726574 | 0.87706847 | 16 | 2.25370278 | 1.80430194 | 0.06175 |
| E_NODIST_half_life_prior_inverse_temperature | 2.16512419 | 0.88294903 | 14 | 2.28276020 | 1.78607484 | 0.09720 |

The same-race uniform reference gives LL **2.17046507**, Brier **0.87293573**. It is a diagnostic, not the production comparator or a betting benchmark. Current-field sizes vary3–23, making same-race comparison essential.

### A. Removing distance

A1 improves mean LL by0.00142336 and Brier by0.00040606;40 race log losses improve and36 worsen; first-choice count stays13. Its mean LL/Brier direction is favourable in Flat, Hurdle and Chase separately, but first-choice effects differ. Top-label ECE barely improves overall, while it worsens in the later diagnostic; thus consistent calibration improvement is not established. We reuse Phase1's eight paired-toggle direction without re-running those masks.

The new date-cluster pointwise interval can differ fromPhase1's race-bootstrap interval because it resamples different units and within-day effects can cancel. Neither should be chosen merely because it excludes zero. The family-adjusted interval and untouched-data absence prevent confirmation.

### B. Recency

H45 wins early-development selection by a small LL amount, but **all four replacements worsen full-sample LL versus H90**. H180/365/equal improve later LL while worsening later Brier; H45 does the reverse early/later in LL. There is no stable standalone recency replacement. Changing H simultaneously changes relative weighting and absolute R_i, hence shrinkage; it does not isolate a pure memory-length effect. Equal weighting removes the age discount within retained histories and increases evidence mass; it is a coupled diagnostic control, not evidence old results are always useful.

### C. Neutral-form prior

K0/2 improve all-sample LL; K10 worsens both all-sample scores. However K0 worsens development Brier and worsens Hurdle LL. At baseline, recency evidence mass ranges **0.02536–5.06610**, median **2.68511**, and99/730 runner appearances have less than one recency-weighted run equivalent. With K5 the median shrink factor is roughly0.349; with K0 it is1 even for nearly stale histories. Removal discards the model's evidence-volume safeguard and can magnify noisy or old form. The result is not a general recommendation to eliminate shrinkage.

### D. Probability scaling

Beta4 improves all LL/Brier, beta1 worsens them. Positive beta preserves ranking exactly: beta1/2/3/4 all identify13 first-choice winners. These score differences arise from confidence, not new horse-ordering information. Temperature makes one vector sharper/flatter; multiclass calibration is not proved by lower ECE in one small-bin sample. The baseline may be too flat on this selected sample, but an independently fitted calibration conclusion is unavailable.

### E. Limited interactions

The development-selected candidate is no-distance/H45/K5/beta4, not the all-sample winner. All-sample LL alone would choose no-distance/H45/K0/beta2 (2.10078082), but selecting it after viewing all outcomes would be additional tuning; it is not substituted for the locked development winner.

Combining every individually promising change is harmful: no-distance/H45/K0/beta4 has all LL2.16512419 and Brier0.88294903, both worse than baseline; development LL2.28276020 is worse than2.21121676. Its better later result cannot rescue its failed development selection or establish stability. Shrinkage and scaling interact strongly because both alter score separation.

## 5. Paired uncertainty, multiplicity and calibration

For each candidate and split, delta=candidate-baseline, so negative is favourable. Each bootstrap samples dates with replacement and keeps all races on the sampled dates, using total paired score difference divided by sampled race count.10000 shared draws, seed20261115; percentile quantiles use linear interpolation. There are only12 total,7 development and5 later dates. Date dependence, repeated horses and repeated historical races may remain. Ordinary resampling is not guaranteed valid with so few clusters.

| ID | Delta LL vs A0 | Improved/worse/tied | Pointwise day-bootstrap95% | Simultaneous family95% |
| --- | --- | --- | --- | --- |
| A0_FULL | +0.00000000 | 0/0/76 | [+0.000000, +0.000000] | [+0.000000, +0.000000] |
| A1_NO_DISTANCE | -0.00142336 | 40/36/0 | [-0.002442, -0.000319] | [-0.125822, +0.122975] |
| B_HALF_45 | +0.00081773 | 41/35/0 | [-0.005554, +0.006256] | [-0.123581, +0.125216] |
| B_HALF_180 | +0.00080114 | 35/41/0 | [-0.004024, +0.006465] | [-0.123597, +0.125199] |
| B_HALF_365 | +0.00126130 | 32/44/0 | [-0.006505, +0.010391] | [-0.123137, +0.125660] |
| B_HALF_None | +0.00148355 | 33/43/0 | [-0.009002, +0.014213] | [-0.122915, +0.125882] |
| C_PRIOR_0 | -0.03188016 | 44/32/0 | [-0.070023, +0.017057] | [-0.156278, +0.092518] |
| C_PRIOR_2 | -0.01536097 | 46/30/0 | [-0.024841, -0.002474] | [-0.139759, +0.109037] |
| C_PRIOR_10 | +0.01100901 | 28/48/0 | [+0.002869, +0.017057] | [-0.113389, +0.135407] |
| D_BETA_1 | +0.01391466 | 28/48/0 | [+0.003262, +0.021941] | [-0.110484, +0.138313] |
| D_BETA_3 | -0.01072677 | 47/29/0 | [-0.018554, -0.000527] | [-0.135125, +0.113671] |
| D_BETA_4 | -0.01828865 | 47/29/0 | [-0.033633, +0.001799] | [-0.142687, +0.106110] |
| S1_MIDPOINT | +0.00335657 | 31/45/0 | [+0.000665, +0.005014] | [-0.121042, +0.127755] |
| S2_CENTERED_LOGIT | -0.00046411 | 39/37/0 | [-0.000813, -0.000130] | [-0.124862, +0.123934] |
| E_NODIST_half_life | +0.00001897 | 40/36/0 | [-0.006788, +0.005896] | [-0.124379, +0.124417] |
| E_NODIST_prior | -0.03459992 | 42/34/0 | [-0.072488, +0.013522] | [-0.158998, +0.089798] |
| E_NODIST_inverse_temperature | -0.02089624 | 45/31/0 | [-0.036471, -0.001432] | [-0.145294, +0.103502] |
| E_NODIST_half_life_prior | -0.03865370 | 44/32/0 | [-0.089342, +0.029879] | [-0.163052, +0.085745] |
| E_NODIST_half_life_inverse_temperature | -0.02225746 | 41/35/0 | [-0.032583, -0.007529] | [-0.146656, +0.102141] |
| E_NODIST_prior_inverse_temperature | +0.00783121 | 40/36/0 | [-0.076627, +0.113174] | [-0.116567, +0.132229] |
| E_NODIST_half_life_prior_inverse_temperature | +0.02568966 | 38/38/0 | [-0.082138, +0.168463] | [-0.098709, +0.150088] |

The simultaneous column uses the95th percentile of the shared-bootstrap maximum absolute centered deviation across all20 nonbaseline candidates, within the LL metric. The same procedure is applied separately to Brier in the machine-readable results. It is deliberately broad, partly driven by unstable zero-prior/high-scaling combinations, and approximate; it does not retrospectively correct Phase1 or prior unenumerated searches, nor fully account for data-selected interactions. **Every LL family interval includes zero.** Do not call pointwise exclusions a validated discovery.

For the selected candidate, all-sample pointwise LL interval is [-0.032583, -0.007529]; later18 interval is [-0.036560, +0.015777]. The latter crosses zero. Leaving out each date keeps the selected candidate's all-sample LL difference negative, but this is an influence diagnostic, not a new holdout.

Calibration is reported for every candidate and split: top-choice confidence/frequency, fixed-bin top ECE, pooled-runner bins and ECE, plus race-balanced runner bins weighted1/fieldsize. Top bins[0,.1,.2,.3,.5,1]; pooled bins[0,.05,.1,.2,.3,.5,1]. Empty/sparse bins remain visible.730 runner appearances are not730 independent observations. These diagnostics do not assess all aspects of multiclass calibration and cannot certify it. On all76 the selected top ECE worsens from0.05062 to0.06021, despite better LL/Brier; selected later ECE improves but sample is tiny and reused. No consistent overall calibration superiority is established.

All per-candidate split metrics, Brier improvement/worsening counts, both uncertainty families and all bin data are in `results/metrics_and_uncertainty.json`; `summary.csv` is the flat view. `runner_predictions.jsonl` permits independent scoring, and `race_comparisons.csv` retains every paired race result.

## 6. Disciplines and forward-date diagnostics

| Race type | Races/runners | A0 LL | A1 delta LL | Selected delta LL | A0/selected winners |
| --- | --- | --- | --- | --- | --- |
| FLAT | 47/536 | 2.35437823 | -0.00192562 | -0.02527784 | 6/10 |
| HURDLE | 16/106 | 1.78480663 | -0.00055047 | -0.02133396 | 5/5 |
| CHASE | 13/88 | 1.79879547 | -0.00068182 | -0.01247423 | 2/1 |

Both A1 and the development-selected candidate have favourable mean LL/Brier direction in all three race types on the exploratory sample. Top-choice hits are not consistently favourable: selected Chase winners drop2→1 and Hurdle remains5. Zero-prior C_PRIOR_0 worsens Hurdle LL even while improving Flat/Chase. These subgroups are too small for discipline-specific tuning or a claim of consistent independent benefit.

| Next date | Earlier races | Selected fixed candidate | Scored races |
| --- | --- | --- | --- |
| 2026-11-07 | 35 | C_PRIOR_0 | 16 |
| 2026-11-08 | 51 | C_PRIOR_0 | 1 |
| 2026-11-09 | 52 | C_PRIOR_0 | 3 |
| 2026-11-10 | 55 | C_PRIOR_0 | 3 |
| 2026-11-11 | 58 | C_PRIOR_0 | 4 |
| 2026-11-12 | 62 | C_PRIOR_0 | 2 |
| 2026-11-13 | 64 | C_PRIOR_0 | 6 |
| 2026-11-14 | 70 | C_PRIOR_0 | 5 |
| 2026-11-15 | 75 | C_PRIOR_0 | 1 |

Across41 next-date races/362 runners, the expanding selection procedure picked K0 each time: LL2.01020287 versus same-race original2.03704230, Brier0.84852292 versus0.85129592, winners8 versus7. This evaluates the defined selection procedure, which differs from the final interaction candidate; no independent outcome-validation or valid final test is implied. Selecting among already-examined history cannot recreate genuinely unseen research.

## 7. Mathematical appropriateness review

- Finish percentile has a clear rank meaning: fraction of other field members beaten for a resolved numeric finish. It discards margins, opponent abilities and race strength. A high percentile is not a win probability. Nonfinishers at0 mix performance failure with censored outcomes; their policy matters especially in jumps.
- Dividing byN-1 makes fields comparable in rank scale, not in difficulty or statistical evidence. Midpoint shrinkage is a precise alternative but worsened this experiment. Historical race class/course similarities do not establish comparable opponent strength.
- Exponential recency is smooth and reproducible, but90days is heuristic and may vary by racing discipline. Absolute decay also controls reliability; longer half-life is not merely a change in relative memory.
- Five neutral prior equivalents stabilise sparse form, but fractional ranks and correlated histories are not independent Bernoulli observations; the formula is not a calibrated Bayesian posterior for winning. Zero prior can produce apparently good scores while eliminating protection for very old evidence.
- Context weighting cannot add independent observations; when every historic context bonus is equal, it cancels from m. Missing going/class similarity counts are1598 and977 of4038 records respectively. Missing information and true dissimilarity both give no bonus. Bonus-weight concentration changes effective history influence while shrinkage still uses only recency. Weight uncertainty and label granularity are unmodelled.
- Softmax produces positive probabilities summing to1; it neither proves calibration nor repairs weak features. A common logit offset cancels; positive temperature cannot change ranking. At original beta2 and strength in[0,1], maximum pairwise odds ratio is at mostexp(2), further constrained by shrinkage; this can impose flat probabilities. Greater sharpness can help or amplify wrong favourites.
- Effective sample size `(sum w)^2/sum(w^2)` is scale-invariant, so replacing recency mass by it alone loses staleness. It was reviewed and deferred instead of inventing a third post-result replacement. Proper conditional-logit/Plackett–Luce ability models need larger, chronologically controlled feature datasets; previous failed pilots are not silently replaced or combined here.

These are theoretical modelling limitations, not proofs that a particular replacement predicts better. The two structural candidates were fixed before scoring and include their negative results.

## 8. Data-quality, leakage and reliability audit

- All76 unique target IDs, single winners and runner identities reconcile; all predicted vectors normalise. Every recorded capture is at least5minutes before start, each history date precedes target date and is within730days, and forecasts link to immutable Git blobs and record SHA256s.
- Original archived probabilities reproduce within **1.39e-17**; original percentile and90-day recency reconstruct exactly from recovered positions/fields/dates.
- All predictions outside A0 are computed after results from frozen derived features; they are counterfactuals, not pre-off issued forecasts. No future target finish, bookmaker odds or post-event market data enters model features.
- Source capture dates and hashes are not independent first-availability attestations. Publisher corrections, final-field amendments/withdrawals and source selection are not independently reconstructed. No source HTML is asserted retained merely because a receipt hash exists.
- All outcome labels remain `SINGLE_SOURCE_PROVISIONAL`; independently verified outcomes=0. Twelve dates, selected archive coverage and mixed race types limit generalisation.
- Histories and runners are correlated. Day-cluster resampling partially addresses dependence; it is not a full horse/meeting/source hierarchical model.
- Internal independent implementation checks passed1596 race probability vectors (21×76), mean score discrepancy≤4.45e-16, development winner,9 forward selections and temperature/logit rank invariance. This is software/arithmetic checking, **not the user's external independent review or independent result verification**.
- No production code, original models, Betting Hub, recommendations, scheduled collectors, merges, or deployments changed. Research branch content is isolated documentation/data/code. No ROI/EV claims.

## 9. Selection decisions and genuinely prospective next step

| Candidate/family | Measured outcome | Decision |
| --- | --- | --- |
| A1 distance removal | LL -0.00142336; Brier -0.00040606; winners13 unchanged | Research secondary; retain original pending prospective evidence |
| B recency | 45d wins early-development selection;45/180/365/equal all worse all-sample LL than90d | No standalone recency replacement established |
| C shrinkage | Prior0/2 improve all LL;0 worsens development Brier and Hurdle LL;10 worsens both all scores | Do not remove protection on sparse histories |
| D scaling | Inverse4 improves all LL/Brier; same13 first winners; calibration mixed | Promising confidence setting only, not better ranking |
| S1 midpoint | LL +0.00335657; Brier +0.00072632; winners12 vs13 | Negative result; retain original percentile |
| S2 logit | LL -0.00046411; same13 first winners; later interval crosses0 | Tiny exploratory link-shape gain; no promotion |
| E_NODIST_half_life_inverse_temperature | Development-selected: distanceoff, half45, prior5, inverse4 | Freeze as primary prospective research challenger; not approved replacement |
| No distance + half45 + prior0 + inverse4 | All LL2.16512419 worse than2.13943453; development LL2.28276020 | Reject this combined candidate; adding improvements is not additive |
| Original A0 | No genuinely untouched evaluation available | Retain existing model; preserve UNVALIDATED/BLOCKED |

`PROSPECTIVE_PROTOCOL.md` freezes the precise primary challenger and eligibility/timing rules before new outcomes, with original A0 as comparator. No new collector or recurring automation was created. It requires independently resolved results, preserved source snapshots, complete eligible-field tracking, paired later races, a fixed endpoint and no parameter changes during evaluation. Interim data-quality checks must not become opportunistic model selection. Larger data are required; a target race count is a planning rule, not guaranteed statistical power.

**Final conclusion:** removal and limited adjustment can improve the measured exploratory scores, and some mathematically plausible changes clearly worsen them. Existing evidence does not establish a reliable replacement for the inspected context model or the separate fixedV3 pilot. Keep the original model and safeguards; independently review this package and collect genuinely new frozen, consistently eligible, independently verified forecasts/results before any promotion.

## 10. Reproduction and file guide

Requires Python3.10+ standard library; no network needed to reproduce from included inputs. From this directory run:

```text
python run_phase2.py --root . --bootstrap 10000
python methods/check_foundations.py
python methods/independent_review.py
python build_report.py
```

Review scripts were authored against this directory structure; command-line portability checks and exact run commands are in `VALIDATION.md`. Source inputs, Phase1 results, recovered historical finishes and race types are in `inputs/`. All machine-readable outputs are in `results/`; source identity audits are in `identity/`. Hashes in `results/run_receipt.json` establish exactly which plan, code and inputs were scored. `PACKAGE_MANIFEST.json` hashes every packaged file except itself. Generation timestamps change on rerun; metrics and deterministic bootstrap outputs are reproducible.

## 11. Supporting sources and scope

The general methods are supported by [Gneiting and Raftery2007, proper scoring rules](https://sites.stat.washington.edu/raftery/Research/PDF/Gneiting2007jasa.pdf); [Vaicenavicius et al.2019, calibration evaluation](https://proceedings.mlr.press/v89/vaicenavicius19a.html); [Guo et al.2017, temperature scaling](https://proceedings.mlr.press/v70/guo17a.html); and [Stata's statistical guidance on plotting positions](https://www.stata.com/support/faqs/statistics/percentile-ranks-and-plotting-positions/). These sources do not validate Value Watch's features, proposed link, candidate choice or betting edge. Few-cluster/ESS/multiplicity primary references and their precise boundaries are documented in `methods/REVIEW.md`. Model equations and numerical results above come from inspected repository source and the executed scripts, not those papers.
