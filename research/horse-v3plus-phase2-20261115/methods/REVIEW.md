# Independent formula and inference review

15 November 2026. Scope: 76 already examined, provisionally scored races; 12 dates, 730 runner appearances, 724 unique horses (six appear twice), current field size 3–23. All recommendations are exploratory research. This archive is not a fresh holdout.

## Foundations and limitations

1. Historical finish percentile is a rank summary, not an estimated chance of winning the current race. It gives the winner score 1 and last place 0, discards winning margin and opponent ability, and treats different historic race fields as comparable. A percentile 1 from a small weak field is not the same evidence as winning a large strong field. The initial derived inputs omitted original historic field sizes and nonfinisher flags; these have now been separately recovered in identity/history_outcomes.json. Join by race, runner and ordered history identities and verify against the original percentile before testing a field-size replacement. Never infer field sizes from rounded percentiles.
2. Original context weighting is a heuristic similarity-weighted average. A context bonus constant across all past runs cancels from that mean. Existing shrinkage uses recency mass, not bonus-inflated mass; that avoids treating matching context as additional observations, but ignores concentration changes between past runs. Missing similarity currently contributes zero bonus, which differs from known dissimilarity conceptually even though numerically identical here. Missingness diagnostics are required.
3. Neutral prior five and half-life 90 days are heuristic choices. Three to six historic runs are sparse. Neither fitting these parameters on all 76 races nor choosing the best of many variants creates independent validation.
4. Softmax normalizes strengths within a race but does not establish calibration. Positive inverse temperature preserves ordering, so tuning temperature alone cannot change top-one accuracy for fixed strengths. Temperature changes proper scores/confidence. Equal probability 1/N is a necessary race-matched reference.

## Precisely two fixed structural candidates

Notation for one runner: historic percentile f_h, recency a_h, context bonus factor b_h=1+sum(c_k*s_hk), w_h=a_h*b_h, R=sum(a_h), m=sum(w_h*f_h)/sum(w_h). Original q=.5+R/(R+5)*(m-.5), z=2*q; race probability softmax(z).

### S2: centered-logit score, preserving central slope

Keep original q unchanged. Replace z=2*q with z=.5*log(q/(1-q)). Softmax is unchanged by common additive shifts. At q=.5, the new derivative is 2, matching original; this reduces central-scale confounding compared with using an unscaled logit. Numerical clipping q into [1e-12,1-1e-12] is only a safeguard and must be reported if triggered. With finite R and prior five, q is interior already.

Motivation: allow differences near the percentile extremes to carry more score separation than a linear score. This is a proposed link transformation of a rank proxy, not a fitted Bradley–Terry or Plackett–Luce ability model, and no cited literature validates it for these races. It may worsen overconfidence. Evaluate at the original inverse-scale convention; do not search extra transformation multipliers.

### S1: field-size midpoint percentile

Use recovered historical field size N and numeric finish position r. Replace historical f=(N-r)/(N-1) with f_mid=(N-r+.5)/N for NUMERIC_FINISH records. Keep known nonfinishers at zero, matching original policy; disclose that this policy treats incomplete races differently from numeric last-place finishers. Preserve recency, context, shrinkage and original z=2*q. No free offset tuning and no combining with S2.

The numeric midpoint ranges from .5/N for last to 1-.5/N for first; symmetric across ranks and less extreme in small fields. Its across-position mean remains .5. It is equivalent to reversing the empirical plotting position (r-.5)/N. This is an endpoint regularisation convention, not an inferred win probability, correction for opponent strength, or established racing improvement. It deliberately assumes a small-field win provides less extreme evidence than a large-field win; that modeling assumption must be tested and can be wrong.

### Deferred ESS issue: mathematical review only

E(v)=(sum v)^2/sum(v^2) is invariant to multiplying every weight by a constant. Therefore using E(recency) alone as evidence strength loses uniform staleness, unlike R=sum(recency). One plausible future heuristic is I=R*min(1,E(context-weighted recency)/E(recency)), preserving staleness and penalising extra concentration; it is not evaluated in this two-replacement family. Racing recency weights are not importance sampling weights, and neither that proposed I nor raw E is a validated variance estimate for correlated form. Context bonus mass must not be described as additional independent observations.

## Calibration protocol

- Primary metric: race-averaged negative log winner probability. Secondary: race-averaged multiclass Brier sum, top-one hit count with deterministic predeclared tie rule, and difference from uniform 1/N. Do not compare different race subsets.
- Fixed calibration summaries: top-choice confidence and actual win fraction; pooled runner probabilities binned at [0,.05,.10,.20,.40,1]. For pooled runners, provide both raw counts and race-equal weights 1/N so large fields do not dominate silently. Keep every empty or sparse bin visible. The 730 rows represent 76 outcome vectors, not 730 independent trials.
- Report race counts, runner counts, date counts, prediction range, sum predicted wins, observed wins, and mean predicted-vs-observed event frequency per bin. Sparse-bin diagrams are descriptive, not proof of calibration; top-label calibration is weaker than full probabilistic calibration.
- If temperature is fitted, use an explicitly retrospective forward-date evaluation: start after at least four earlier dates, fit solely on earlier dates, freeze, then score the next date. Record candidate family and all fitted values. The last eight dates contain only 25 races under this minimum; this is a sensitivity analysis of chronology, not a newly untouched test. Do not choose minimum training length after seeing scores.
- Do not fit isotonic regression, per-bin corrections, class/discipline-specific temperatures, or high-dimensional calibrators on this sample.

## Day-cluster uncertainty and multiplicity

- Use shared resampling of the 12 dates, sampling 12 dates with replacement and retaining every race of each selected date (including multiplicity). For each resample calculate race-weighted paired metric differences, i.e. sum race differences / total sampled races. Preserve the paired identities for all candidate methods. Use at least 20000 draws, fixed seed and stated quantile convention.
- Report ordinary day-cluster percentile intervals explicitly as exploratory. Twelve unequal-sized date clusters are few: ordinary race bootstrap is overconfident if races share date effects; date bootstrap still assumes independence between days and does not remove dependence from repeat horses/shared history. Six horses repeat here, but common historical races/meetings can add further dependence.
- For a finite candidate family inspected together, compute common-resample centered maximum absolute deviations: M_b=max_j|delta*_jb-delta_j| over ALL j, including ablation, tuning and structural candidates. Use its 95th percentile c to form simultaneous exploratory intervals delta_j +/- c (same metric units). This avoids only reporting the selected winner's unadjusted interval. It is a bootstrap approximation, not finite-sample guaranteed coverage with 12 clusters or a correction for unknown previous searches. Keep LL/Brier families separate and LL primary.
- Include leave-one-date-out mean differences and worst/best date effects. If one date reverses the apparent conclusion, mark instability. Do not interpret nominal bootstrap exclusion of zero as production readiness.
- If p-values are produced, provide the exact tested null/assumptions and use Holm over the declared full family. Holm adjusts valid marginal p-values; it cannot repair invalid few-cluster p-values, unidentified prior searches, or tuning on the same outcomes. Prefer effect sizes and cautious intervals here.
- No promotion: every current race has already informed research choices; freeze candidate definition now and use future independently validated observations for actual confirmation. Provisional outcomes and unavailable executable prices also preclude ROI/EV conclusions.

## Verified primary sources and boundaries

- Gneiting, T. and Raftery, A.E. (2007), *Strictly Proper Scoring Rules, Prediction, and Estimation*, JASA 102, 359–378, DOI 10.1198/016214506000001437. https://sites.stat.washington.edu/raftery/Research/PDF/Gneiting2007jasa.pdf — supports proper probabilistic scoring; does not validate these features.
- Cameron, A.C. and Miller, D.L. (2015), *A Practitioner's Guide to Cluster-Robust Inference*, JHR 50, 317–372. https://facultysites.dss.ucdavis.edu/research/Cameron_Miller_JHR_2015_February.pdf and https://escholarship.org/uc/item/1jq5d0pq — within-cluster correlation and few-cluster limitations. Their regression discussion motivates dependence-aware caution; the specific proposed 12-day score bootstrap is our design, not a racing method established by that paper.
- Martino, L., Elvira, V. and Louzada, F. (2017), *Effective sample size for importance sampling based on discrepancy measures*, Signal Processing 131, 386–401, DOI 10.1016/j.sigpro.2016.08.025. https://arxiv.org/abs/1602.03572 — normalized-weight concentration/ESS interpretation. Racing recency weights are not importance-sampling weights, and ESS scale invariance is algebraic, not an empirical calibration guarantee.
- Vaicenavicius, J. et al. (2019), *Evaluating model calibration in classification*, AISTATS/PMLR 89, 3459–3467. https://proceedings.mlr.press/v89/vaicenavicius19a.html — calibration is richer than a single reliability summary; motivates caution about reducing multiclass calibration.
- Guo, C. et al. (2017), *On Calibration of Modern Neural Networks*, ICML/PMLR 70, 1321–1330. https://proceedings.mlr.press/v70/guo17a.html — single-parameter temperature scaling as a calibration method. Its neural-network results are not evidence of calibration improvement for this horse model.
- Holm, S. (1979), *A Simple Sequentially Rejective Multiple Test Procedure*, Scandinavian Journal of Statistics 6, 65–70. https://www.jstor.org/stable/4615733 and scanned primary paper https://www.ime.usp.br/~abe/lista/pdf4R8xPVzCnX.pdf — familywise adjustment assuming valid component tests.

Sources verified using search on 15 November 2026. Specific formula replacements, bin boundaries, minimum four training dates, and the proposed simultaneous bootstrap are explicitly analyst choices, not findings of the cited papers.

- R Core Team, stats::ppoints documentation: https://www.stat.ethz.ch/R-manual/R-devel/library/stats/html/ppoints.html � symmetric plotting position family, with a=.5 yielding (i-.5)/N. Stata primary statistical software guidance https://www.stata.com/support/faqs/statistics/percentile-ranks-and-plotting-positions/ explicitly explains the midpoint choice. These support the arithmetic convention, not its predictive suitability for racing.

## Locked implementation plan reconciliation

The director subsequently locked ANALYSIS_PLAN.md before Phase2 candidate scores. That plan uses at least three earlier dates for its expanding-window sensitivity, 10000 shared date bootstrap draws, and its own fixed listed bin edges. Those supersede the recommended four dates/20000 draws/bin edges above for the actual experiment, without creating a fresh holdout or removing few-cluster limitations. No threshold should now be changed after seeing Phase2 scores. S1 is midpoint and S2 is centered-logit to match that plan.

## Executed independent implementation review

Reviewed run_phase2.py against locked ANALYSIS_PLAN.md. No blocking implementation discrepancy found. The 14 fixed definitions and at most seven deduplicated no-distance interactions use development-only selection. Walk-forward selection excludes the entire target date. Bootstrap resamples shared whole dates and uses a sampled race-count denominator; simultaneous deviations cover all 20 nonbaseline candidates within each reported split/metric. Structural formulas and race-balanced calibration bins match the plan.

Executed independent_review.py: all 1596 candidate-race vectors normalized and matched one-hot outcomes; recomputed every candidate/split mean log loss, Brier, top-one count and CSV race score from saved probabilities (maximum mean difference 4.44e-16). Independently verified development winner and all nine walk-forward selections. Positive-temperature variants and centered logit preserved baseline top-one ranking, as required. This confirms implementation consistency, not source accuracy or predictive validity.

Leave-one-date-out analysis: development-selected E_NODIST_half_life_inverse_temperature all-race log-loss delta -0.0222574574; omitting any one date keeps delta negative (range -0.0267387420 to -0.0182863050). Midpoint replacement worsens full loss by +0.0033565669 and remains worse under each date omission. Centered-logit improves loss only -0.0004641081 and remains slightly lower under each date omission. These are exploratory stability checks; they do not repair prior outcome inspection or dependence between dates. Full receipts retained in foundation_checks.json, independent_review_receipt.json and leave_one_date_out.json.
