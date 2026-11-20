# Sky catalogue evidence audit

Audit recorded 2026-11-20 for [PR #114](https://github.com/aurelian2483-cmd/value-watch-lab/pull/114), branch `research/sky-mathematical-library-20261120`, at [reviewed commit `18b8d62`](https://github.com/aurelian2483-cmd/value-watch-lab/tree/18b8d625e8e2dd0cb130a27aa49737137b4b479f/research/mathematical-library/). The PR description reports 216 entries from its initial scope. The pinned manifest registers **286**, comprising 16 preserved legacy records and 270 records in batches 001–015.

**Disposition.** Preserve every registered ID, definition, source and classification in place. This report records corrections and cross-references for review. The registry count is a count of records. The number of independent mathematical mechanisms remains open. The 81-formula inventory is still unrecovered and outside the duplicate crosswalk. No new entry, experiment, replay, reserved holdout, data acquisition or production change was part of this audit.

## Coverage and evidence

- Reviewed definitions, variables, family relationships, citation locators and applicability at the specification level. Compared close mechanisms by equation, inputs, output and fitting procedure. The named overlap findings are supported by the supplied definitions. Exhaustive mathematical equivalence and implementation verification remain open. [Pinned equation reference](https://github.com/aurelian2483-cmd/value-watch-lab/tree/18b8d625e8e2dd0cb130a27aa49737137b4b479f/research/mathematical-library/REFERENCE.md)
- Checked all 286 IDs against the source ledger and all 16 legacy IDs against their original identity, name, family, status, implementation reference and sport tags. Found zero colliding IDs, normalized names or normalized definition strings. Relationship targets resolve, all nonlegacy sport tags fit their registered profiles, and sport counts match the progress report. No entry has recorded test evidence. These were static catalogue checks. [Manifest](https://github.com/aurelian2483-cmd/value-watch-lab/tree/18b8d625e8e2dd0cb130a27aa49737137b4b479f/research/mathematical-library/catalogue.v1.json) · [Ledger](https://github.com/aurelian2483-cmd/value-watch-lab/tree/18b8d625e8e2dd0cb130a27aa49737137b4b479f/research/mathematical-library/evidence-ledger.v1.json) · [Progress](https://github.com/aurelian2483-cmd/value-watch-lab/tree/18b8d625e8e2dd0cb130a27aa49737137b4b479f/research/mathematical-library/progress.v1.json)
- Source inventory has 281 literature labels, including three that describe derivations, plus four declared derivations and one repository reference. There are 51 DOI-prefixed citations. The entry table marks direct source checks, classifications to correct, derivations and outstanding literature verification. For batches 003–015 the earlier audit reports source review covering 70 records, with references that include author papers, lecture notes, NIST, LAPACK and maintainer documentation. This report credits that evidence separately from the author and reference texts independently checked here. A DOI or named book alone establishes a locator. [Prior review](https://github.com/aurelian2483-cmd/value-watch-lab/tree/18b8d625e8e2dd0cb130a27aa49737137b4b479f/research/mathematical-library/review-audit.v1.json)
- Sport coverage is conditional. The 1,559 sport tags comprise football 277, horse racing 244, tennis 258, rugby 270, NFL 262 and darts 248. Feed permissions, data availability at the decision cutoff and observed predictive usefulness remain unverified. Sports examples in sources from other domains support mathematical transfer only under the stated conditions. [Sport profiles](https://github.com/aurelian2483-cmd/value-watch-lab/tree/18b8d625e8e2dd0cb130a27aa49737137b4b479f/research/mathematical-library/sport-profiles.v1.json)

## Findings to resolve before relying on affected specifications

1. **Duplicate mechanism.** `prox-l1` and `ista` use the same soft-thresholded gradient step with `η=1/L` and a common penalty mask. An unpenalized intercept is a mask convention. Keep both registered IDs and use ISTA as the shared mechanism for future counting. FISTA adds an extrapolated iterate and therefore has distinct computation. [Beck and Teboulle, §§3–4](https://www.ceremade.dauphine.fr/~carlier/FISTA)
2. **Definitions and labels.** Correct the Skellam scope for a common additive Poisson component. It cancels in the score difference. Supply the Nelder–Mead acceptance branches, finite-normalizer domain for COM-Poisson and Greenwood boundary handling. Clarify the renewal strong-law label, single-event survival definition, first-order Sobol formula and OU transition/filter boundary. The GRU is valid under a complemented update-gate convention that should be explicit. [Cho et al., Eq. 7](https://aclanthology.org/D14-1179.pdf)
3. **Source precision.** Update the one-sample Cramér–von Mises locator. The record currently cites a two-sample paper for a statistic it derives. The EV, tennis game and population stability index records supply derivations under a literature label. For Glicko, retain the distinction between update expectations and a game expected score computed using both rating deviations. [Glicko author specification](https://www.glicko.net/glicko/glicko.pdf)
4. **Sport and timing.** `ipw` and `aipw` require historical outcomes even when treatment and confounders are fixed before the event. Treat target-event effect estimation as retrospective. For rugby and NFL, check which methods operate on counts and which require models for weighted totals. The rugby compound-Poisson example needs marked clusters and a definition of conversion dependence. The two scoring-rule models apply to tennis advantage games and double-out darts visits under their stated assumptions. [Registered sport profiles](https://github.com/aurelian2483-cmd/value-watch-lab/tree/18b8d625e8e2dd0cb130a27aa49737137b4b479f/research/mathematical-library/sport-profiles.v1.json)

## Sport applicability conditions

Each entry below links its tags to one of these conditions. A profile pass confirms a plausible research role given the required inputs and rules. It confers no empirical or data-access clearance.

| Profile | Condition |
| --- | --- |
| football | Use regulation-time association-football goals, venue/competition scope and data available by cutoff. Specify extra-time handling. |
| count | Use football goals or rugby tries, or another explicitly defined event count with exposure. Weighted rugby/NFL points require their own observation model. |
| paired | Prior same-format opponent results and stable identities. For football/rugby/NFL state draw handling. Tennis and darts require consistent match format. |
| series | Use a sport-specific prior sequence with calendar or exposure alignment. Candidate inputs include football chance creation, racing sectionals, tennis serve points, rugby tries, NFL drives and darts checkout attempts. |
| simulation | Conditional research tool. Specify rules, simulator inputs, objective, scenario law and downstream use for the sport. |
| forecast | Require archived as-issued probabilities or logits on a common event space and earlier settled labels where fitting is required. |
| binary | Define the binary endpoint and training label at event level. Document draws, scratches, pushes or rule exceptions where applicable. |
| success | Require comparable opportunities and a stable denominator. Check independence, heterogeneity or finite-population sampling as the definition requires. |
| choice | Horse racing needs complete as-of declared fields, runner covariates, scratch policy and winner/field linkage. |
| rank | Require observed and comparable finish orders with a stated dead-heat, nonfinisher and scratch policy. |
| positive | Require positive comparable racing or tennis durations with clock rules, censoring and explicit support. |
| assessment | Retrospective assessment only. Align settled labels, archived forecasts and event origins on permitted development records. |
| survival | Require risk-set entry, time origin, censoring and competing-event rules. Match the endpoint and timing to the competition. |
| resampling | Choose the sport's resampling unit and dependence structure. Repeated athletes, teams, meetings or seasons can invalidate row resampling. |
| continuous | Require a meaningful continuous target or residual, defined units and an earlier fit. Generic method transfer depends on support and observation design. |
| multifeature | Conditional on a sport-specific design, matrix, graph, objective or time series. Pure numerical algorithms are components of an analysis. |
| graph | Require a dated graph with defensible edge direction, weights and eligible competitors. |
| margin | Use comparable signed margins and competition scope with explicit treatment of schedule strength and blowouts. |
| assignment | Require an explicit permitted team or scheduling decision, feasible assignments, constraints and a meaningful cost. |
| market | Hypothetical decision math requires coherent settlement, probability and quote at the same cutoff, with costs and voids treated explicitly. |
| darts | Require double-out visit rules, remainder and darts in hand, plus historical target/impact records. |
| tennis | Require advantage scoring and comparable serve-point observations. Apply the formula at the game level. |
| timestamps | Require clock/exposure alignment and publication times. Use goals, tries or drive endpoints with explicit gap/reset assumptions. |
| causal | Retrospective effect estimation. Require historical outcomes, earlier covariates and design-specific identification. Explain treatment timing and interference. |
| categories | Require stable mutually exclusive states or outcomes and a declared transition clock when relevant. |
| composition | Require coherent parts with a common denominator and a declared zero policy. |
| tracking | Require legal tracking access, a shared coordinate system, timestamps and a motion model appropriate to the observed interval. |

## Entry evidence

“Screened” denotes a definition-level review without an additional finding recorded here. “Linked family” means the declared comparison was a starting point and no additional equivalence was recorded. “Locator only” means this pass did not independently compare the full text with the equation. Earlier batch-level evidence remains in the pinned prior review. Sport codes are F (football), H (horse racing), T (tennis), R (rugby), N (NFL) and D (darts).

### Legacy (16)

[Registered definitions and citations](https://github.com/aurelian2483-cmd/value-watch-lab/tree/18b8d625e8e2dd0cb130a27aa49737137b4b479f/research/mathematical-library/legacy-specifications.json)

| Entry | Definition | Source evidence | Semantic relationship | Sport applicability |
| --- | --- | --- | --- | --- |
| `poisson` | Screened. | Locator only. | Linked family: `bivariate-poisson`. | F, R · count. Rugby tag applies to tries under fixed comparable exposure. |
| `dixon-coles` | Screened. | Locator only. | Declared variant of `poisson`. | F · football |
| `bivariate-poisson` | Screened. | Locator only. | Linked family: `poisson`. | F · football |
| `negative-binomial` | Handle p=1 as a point mass at zero explicitly. | Locator only. | Linked family: `poisson`. | F, R · count. Rugby tag applies to event counts. A total weighted score requires a justified model. |
| `elo` | Screened. | Locator only. | Linked family: `bradley-terry`. | F, T, R, N, D · paired |
| `glicko` | Rating update matches the author under pre-period opponent RD snapshots. Separate game expected score, which uses both RDs, from the update term. | Author steps 1–2 checked. Use both RDs for game expectation, as distinct from the rating-update term. [Author specification](https://www.glicko.net/glicko/glicko.pdf) | Linked family: `elo`. | F, T, D · paired |
| `bradley-terry` | Screened. | Locator only. | Two-alternative conditional logit with paired identity contrasts; conditioning on two remaining choices reduces Plackett–Luce to this form. | F, T, D · paired |
| `ewma` | Screened. | Locator only. | Matches geometric weighting with its recursive initialization; finite renormalized decay treats the boundary differently. | F, H, T, N, D, R · series |
| `cusum` | Screened. | Locator only. | Linked family: `ewma`. | F, H, T, N, D, R · series |
| `kalman` | Screened. | Locator only. | Linked family: `changepoint`. | F, H, T, N, D, R · series |
| `bayesian-hierarchical` | Screened. | Locator only. | Linked family: `kalman`. | F, H, T, N, D, R · series |
| `monte-carlo` | Screened. | Locator only. | Linked family: `poisson`. | F, H, T, N, D, R · simulation |
| `weighted-ensemble` | Screened. | Locator only. | Common linear pooling operation used by stacking, BMA and shrinkage; weight construction distinguishes the records. | F, H, T, N, D, R · forecast |
| `isotonic` | Screened. | Locator only. | Linked family: `weighted-ensemble`. | F, H, T, N, D, R · forecast |
| `logistic` | Screened. | Locator only. | Binary softmax and two-alternative conditional-logit specialize to this link with the appropriate features. Platt adds score calibration and target smoothing. | F, H, T, N, D, R · binary |
| `changepoint` | Specify H as a duration-indexed hazard and resolve the shift against Algorithm 1 notation; document reset and normalization conventions. | Author recursion and reset checked. See hazard indexing qualification. [Algorithm 1](https://arxiv.org/pdf/0710.3742) | Linked family: `cusum`. | F, H, T, N, D, R · series |

### Batch 001 (100)

[Registered definitions and citations](https://github.com/aurelian2483-cmd/value-watch-lab/tree/18b8d625e8e2dd0cb130a27aa49737137b4b479f/research/mathematical-library/batch-001.json)

| Entry | Definition | Source evidence | Semantic relationship | Sport applicability |
| --- | --- | --- | --- | --- |
| `skellam` | Common additive Poisson shock cancels in X−Y. Restrict the warning to dependence that does not cancel. | Locator only. | Exact marginal of independent Poisson score difference and of a bivariate Poisson score difference with a common additive shock. | F · football |
| `beta-binomial` | Screened. | Locator only. | Predictive count from beta-Bernoulli mixture; single Bernoulli prediction is beta-bernoulli-update. | F, T, D, N, R · success |
| `zip` | Screened. | Locator only. | Declared variant of `poisson`. | F, R · count |
| `hurdle-poisson` | Screened. | Locator only. | Declared variant of `poisson`. | F, R · count |
| `com-poisson` | Make finite normalizer domain explicit: positive λ for ν>0; 0≤λ<1 if ν=0; λ=0 is degenerate with the usual zero-power convention. | Locator only. | Linked family: `poisson`. | F, R · count |
| `geometric` | Screened. | Locator only. | Linked family: `beta-binomial`. | F, T, D, N, R · success |
| `softmax` | Screened. | Locator only. | Shared simplex map for conditional-logit, multiclass calibration and choice stages; no fitting objective on its own. | H · choice |
| `plackett-luce` | Screened. | Locator only. | Sequential conditional choice likelihood on shrinking sets; first-place-only data give conditional logit. | H · rank |
| `davidson-ties` | Screened. | Locator only. | Declared variant of `bradley-terry`. | F, T, R, N, D · paired |
| `thurstone-case-v` | Screened. | Locator only. | Linked family: `bradley-terry`. | F, T, R, N, D · paired |
| `trueskill` | Screened. | Locator only. | Linked family: `glicko`. | F, T, R, N, D · paired |
| `conditional-logit` | Screened. | Locator only. | Softmax with learned utility and grouped likelihood. Two alternatives with contrast-coded features reduce to binary logistic. | H · choice |
| `bayes-rule` | Require H to be one hypothesis in the partition or aggregate the corresponding terms for a union. | Locator only. | Linked family: `bayesian-hierarchical`. | F, H, T, R, N, D · binary |
| `exp-time-decay` | Screened. | Locator only. | Close to ewma on a regular grid with α=1−exp(−λΔ); elapsed-time weights and finite normalization matter. | F, H, T, R, N, D · series |
| `z-score` | Screened. | Locator only. | Linked family: `ewma`. | F, H, T, R, N, D · series |
| `mad-score` | Screened. | Locator only. | Linked family: `z-score`. | F, H, T, R, N, D · series |
| `box-cox` | Screened. | Locator only. | Linked family: `z-score`. | H, T · positive |
| `first-difference` | Screened. | Locator only. | Linked family: `ewma`. | F, H, T, R, N, D · series |
| `rolling-median-shift` | Screened. | Catalogue derivation. | Linked family: `cusum`. | F, H, T, R, N, D · series |
| `ew-variance` | Screened. | Locator only. | Linked family: `ewma`. | F, H, T, R, N, D · series |
| `pettitt` | A past-window diagnostic can inform later work; retrospective within-window breakpoint localization cannot be backdated. | Locator only. | Linked family: `cusum`. | F, H, T, R, N, D · series. A past-window diagnostic can inform later work; retrospective within-window breakpoint localization cannot be backdated. |
| `pelt` | The stated strict pruning rule needs the given split inequality and delayed eligibility under minimum segment length. | Locator only. | Linked family: `pettitt`. | F, H, T, R, N, D · series |
| `hmm-forward` | Screened. | Locator only. | Linked family: `kalman`. | F, H, T, R, N, D · series |
| `viterbi` | Decoding uses the whole supplied prefix; historical states must use the prefix available at each historical prediction origin. | Locator only. | Linked family: `hmm-forward`. | F, H, T, R, N, D · series. Decoding uses the whole supplied prefix; historical states must use the prefix available at each historical prediction origin. |
| `particle-bootstrap` | Screened. | Locator only. | Linked family: `kalman`. | F, H, T, R, N, D · series |
| `simple-ar` | Screened. | Locator only. | Linked family: `first-difference`. | F, H, T, R, N, D · series |
| `moving-average-model` | Screened. | Locator only. | Linked family: `simple-ar`. | F, H, T, R, N, D · series |
| `arima` | Screened. | Locator only. | Declared variant of `simple-ar`. | F, H, T, R, N, D · series |
| `arch` | Screened. | Locator only. | Linked family: `ew-variance`. | F, H, T, R, N, D · series |
| `garch` | Screened. | Locator only. | Declared variant of `arch`. | F, H, T, R, N, D · series |
| `holt-trend` | Screened. | Locator only. | Declared variant of `ewma`. | F, H, T, R, N, D · series |
| `haar-wavelet` | Screened. | Locator only. | Linked family: `first-difference`. | F, H, T, R, N, D · series |
| `entropy` | Screened. | Locator only. | Linked family: `weighted-ensemble`. | F, H, T, R, N, D · forecast |
| `kl` | Screened. | Locator only. | Linked family: `entropy`. | F, H, T, R, N, D · forecast |
| `jensen-shannon` | Screened. | Locator only. | KL to the mixture, distinct from the symmetric KL sum used by PSI. | F, H, T, R, N, D · forecast |
| `brier` | The displayed unnormalized class sum is twice the scalar binary score. Keep conventions fixed across comparisons. | Locator only. | Linked family: `isotonic`. | F, H, T, R, N, D · assessment |
| `log-loss` | Screened. | Locator only. | Linked family: `brier`. | F, H, T, R, N, D · assessment |
| `rps` | Specify ordered outcome categories; an arbitrary order for runners or nominal winners does not give an interpretable RPS. | Locator only. | Linked family: `brier`. | F, H, T, R, N, D · assessment. Specify ordered outcome categories; an arbitrary order for runners or nominal winners does not give an interpretable RPS. |
| `pit` | Continuous PIT needs a continuous conditional CDF. Use randomized PIT for discrete or mixed predictive laws with atoms. | Locator only. | Linked family: `log-loss`. | F, H, T, R, N, D · assessment. Continuous PIT needs a continuous conditional CDF. Use randomized PIT for discrete or mixed predictive laws with atoms. |
| `randomized-pit` | Reduces to ordinary PIT at continuous points. Preserve forecast and outcome pairing with a documented independent randomization policy. | Locator only. | Declared variant of `pit`. | F, H, T, R, N, D · assessment |
| `log-pool` | Screened. | Locator only. | Linked family: `weighted-ensemble`. | F, H, T, R, N, D · forecast |
| `probability-shrinkage` | Screened. | Catalogue derivation. | Shared two-component linear pool with disagreement-dependent weights. | F, H, T, R, N, D · forecast |
| `stacking` | Screened. | Locator only. | Shared linear pool; out-of-sample log score supplies weights. | F, H, T, R, N, D · forecast |
| `bma` | Screened. | Locator only. | Shared linear pool; posterior model probabilities supply weights. | F, H, T, R, N, D · forecast |
| `temperature` | Screened. | Locator only. | Restriction of vector scaling with common positive multiplier and zero bias. | F, H, T, R, N, D · forecast |
| `platt` | Screened. | Locator only. | Linked family: `logistic`. | F, H, T, R, N, D · forecast |
| `beta-calibration` | Screened. | Locator only. | Linked family: `platt`. | F, H, T, R, N, D · forecast |
| `kaplan-meier` | Screened. | Locator only. | Linked family: `bayesian-hierarchical`. | H, T, F, R, N · survival |
| `nelson-aalen` | Screened. | Locator only. | Linked family: `kaplan-meier`. | H, T, F, R, N · survival |
| `cox-ph` | Screened. | Locator only. | Linked family: `nelson-aalen`. | H, T, F, R, N · survival |
| `weibull-aft` | State the treatment of zero-length observations and elapsed-time origin with censoring. | Locator only. | Linked family: `cox-ph`. | H, T, F, R, N · survival |
| `bootstrap-iid` | Screened. | Locator only. | Linked family: `monte-carlo`. | F, H, T, R, N, D · resampling |
| `moving-block-bootstrap` | Screened. | Locator only. | Declared variant of `bootstrap-iid`. | F, H, T, R, N, D · resampling |
| `jackknife` | Screened. | Locator only. | Linked family: `bootstrap-iid`. | F, H, T, R, N, D · resampling |
| `control-variate` | Screened. | Locator only. | Declared variant of `monte-carlo`. | F, H, T, R, N, D · simulation |
| `importance-sampling` | Screened. | Locator only. | Linked family: `monte-carlo`. | F, H, T, R, N, D · simulation |
| `antithetic` | Screened. | Locator only. | Declared variant of `monte-carlo`. | F, H, T, R, N, D · simulation |
| `ridge` | Screened. | Locator only. | Linked family: `logistic`. | F, H, T, R, N, D · continuous |
| `lasso` | Screened. | Locator only. | Linked family: `ridge`. | F, H, T, R, N, D · continuous |
| `elastic-net` | Screened. | Locator only. | Declared variant of `lasso`. | F, H, T, R, N, D · continuous |
| `huber-regression` | Screened. | Locator only. | Linked family: `ridge`. | F, H, T, R, N, D · continuous |
| `quantile-regression` | Screened. | Locator only. | Pinball loss plus a linear regression fitting problem. | F, H, T, R, N, D · continuous |
| `knn-regression` | Screened. | Locator only. | Linked family: `z-score`. | F, H, T, R, N, D · continuous |
| `nw-regression` | Screened. | Locator only. | Linked family: `knn-regression`. | F, H, T, R, N, D · continuous |
| `cart-regression` | Qualify as greedy squared-error tree growth; classical CART also includes cost-complexity pruning. | Locator only. | Linked family: `ridge`. | F, H, T, R, N, D · continuous |
| `random-forest` | Screened. | Locator only. | Linked family: `cart-regression`. | F, H, T, R, N, D · continuous |
| `gradient-boost` | Screened. | Locator only. | Linked family: `cart-regression`. | F, H, T, R, N, D · continuous |
| `pca` | Centers the historical design; any scaling is a separate fitted transformation. | Locator only. | Linked family: `z-score`. | F, H, T, R, N, D · multifeature |
| `kmeans` | Screened. | Locator only. | Linked family: `pca`. | F, H, T, R, N, D · multifeature |
| `pagerank` | Screened. | Locator only. | Linked family: `bradley-terry`. | F, T, R, N, D · graph |
| `elo-home` | Screened. | Catalogue derivation. | Declared variant of `elo`. | F, T, R, N, D · paired |
| `massey` | Screened. | Locator only. | Linked family: `elo`. | F, T, R, N, D · margin |
| `colley` | Screened. | Locator only. | Linked family: `massey`. | F, T, R, N, D · paired |
| `hungarian` | Screened. | Locator only. | Linked family: `massey`. | F, R, N · assignment |
| `ev` | Screened. | Citation gives an algebraic derivation. Classify citation as derivation at a future revision. | Linked family: `log-loss`. | F, H, T, R, N, D · market |
| `kelly` | Screened. | Locator only. | Linked family: `ev`. | F, H, T, R, N, D · market |
| `hoeffding` | Screened. | Locator only. | Linked family: `beta-binomial`. | F, T, D, N, R · success |
| `wilson` | Screened. | Locator only. | Linked family: `beta-binomial`. | F, T, D, N, R · success |
| `darts-finish-dp` | Visit-only probability; specify competition checkout and bust rules and the source for aim versus impact. | Catalogue derivation. | Exact finite-horizon Bellman policy evaluation with checkout and bust absorbing outcomes. | D · darts |
| `tennis-game` | Valid enumeration for fixed iid serve-point probability under advantage rules. Excludes no-ad games, tiebreaks and changing serve-point probabilities. | Citation gives an algebraic derivation. Classify citation as derivation at a future revision. | Geometric series appears only in the deuce subproblem. The full result is an absorption calculation; relationship to geometric is overly narrow. | T · tennis |
| `bellman-policy` | Screened. | Locator only. | Linked family: `monte-carlo`. | F, H, T, R, N, D · simulation |
| `kalman-ou` | OU transition is specified. An observation model and filtering equations are needed to define an OU Kalman filter. | Locator only. | OU dynamics can be supplied to Kalman; a transition law alone is a separate component. | F, H, T, R, N, D · series |
| `hawkes` | Screened. | Locator only. | Linked family: `poisson`. | F, R, N · timestamps |
| `prox-l1` | Screened. | Locator only. | Same soft-thresholded gradient update as ista; exempting the intercept changes the penalty mask. | F, H, T, R, N, D · continuous |
| `project-simplex` | Screened. | Locator only. | Linked family: `softmax`. | F, H, T, R, N, D · forecast |
| `minimax-robust` | Screened. | Locator only. | Linked family: `monte-carlo`. | F, H, T, R, N, D · simulation |
| `ipw` | Historical outcomes are required to estimate the effect; a pre-event treatment or pre-treatment covariate timestamp cannot make the target-event outcome available. | Locator only. | Linked family: `logistic`. | F, H, T, R, N, D · causal. Historical outcomes are required to estimate the effect; a pre-event treatment or pre-treatment covariate timestamp cannot make the target-event outcome available. |
| `aipw` | Historical outcomes are required. Separate nuisance fit and scoring by time or group where appropriate and document positivity and the causal estimand. | Locator only. | Declared variant of `ipw`. | F, H, T, R, N, D · causal. Historical outcomes are required. Separate nuisance fit and scoring by time or group where appropriate and document positivity and the causal estimand. |
| `yeo-johnson` | Screened. | Locator only. | Linked family: `box-cox`. | F, H, T, R, N, D · series |
| `dirichlet-multinomial` | Screened. | Locator only. | Predictive count law from dirichlet-update with multinomial sampling; two categories give beta-binomial. | F, R, N, D · categories |
| `clr` | Coordinates sum to zero. Unregularized full-coordinate covariance inverse is singular. | Locator only. | Linked family: `z-score`. | F, H, T, R, N, D · composition |
| `damped-holt` | Screened. | Locator only. | Declared variant of `holt-trend`. | F, H, T, R, N, D · series |
| `alpha-beta` | A fixed-gain position/velocity mechanism. Interpret via steady-state Kalman gains only under compatible dynamics, covariance and observation structure. | Locator only. | Declared variant of `kalman`. | H, F, R, N · tracking |
| `gillespie-direct` | Screened. | Locator only. | Linked family: `monte-carlo`. | F, H, T, R, N, D · simulation |
| `poisson-form-025` | Treat the pinned finite-grid model as a configuration. No replay was used as audit evidence. | Pinned repository config locator. | Declared variant of `poisson`. | F · football |
| `population-stability-index` | Screened. | Citation gives an algebraic derivation. Classify citation as derivation at a future revision. | Algebraically symmetric KL sum (Jeffreys divergence); retain the binned monitoring application without treating it as an independent divergence. | F, H, T, R, N, D · composition |
| `neyman-pearson` | Screened. | Locator only. | Linked family: `bayes-rule`. | F, H, T, R, N, D · binary |
| `death-process` | The equation is a single-event survival function. A general pure-death process needs state-dependent rates and multiple transitions. | Locator only. | Linked family: `kaplan-meier`. | H, T, F, R, N · survival |
| `cumulative-incidence` | Screened. | Locator only. | Continuous cause-specific hazard functional. Aalen–Johansen estimates its competing-risk analogue from observed transitions. | H, T, F, R, N · survival |
| `spsa` | Screened. | Locator only. | Linked family: `monte-carlo`. | F, H, T, R, N, D · simulation |

### Batch 002 (100)

[Registered definitions and citations](https://github.com/aurelian2483-cmd/value-watch-lab/tree/18b8d625e8e2dd0cb130a27aa49737137b4b479f/research/mathematical-library/batch-002.json)

| Entry | Definition | Source evidence | Semantic relationship | Sport applicability |
| --- | --- | --- | --- | --- |
| `poisson-regression` | Screened. | Locator only. | Intercept-only common exposure yields a common Poisson law. Attack/defence imposes a schedule-linked design and identifiability constraints. | F, R · count |
| `poisson-attack-defence` | Screened. | Locator only. | Declared variant of `poisson-regression`. | F · football |
| `gamma-poisson-update` | Screened. | Locator only. | Linked family: `poisson`. | F, R · count |
| `beta-bernoulli-update` | Screened. | Locator only. | Linked family: `beta-binomial`. | F, T, D, N, R · success |
| `dirichlet-update` | Screened. | Locator only. | Linked family: `dirichlet-multinomial`. | F, R, N, D · categories |
| `normal-normal-update` | Screened. | Locator only. | Linked family: `bayes-rule`. | F, H, T, R, N, D · continuous |
| `binomial-fixed-count` | Screened. | Locator only. | Linked family: `beta-binomial`. | F, T, D, N, R · success |
| `poisson-binomial` | Screened. | Locator only. | Linked family: `binomial-fixed-count`. | F, T, D, N, R · success |
| `hypergeometric` | Screened. | Locator only. | Linked family: `binomial-fixed-count`. | F, T, D, N, R · success |
| `multinomial-fixed` | Screened. | Locator only. | Linked family: `dirichlet-multinomial`. | F, R, N, D · categories |
| `categorical-markov` | Screened. | Locator only. | Linked family: `hmm-forward`. | F, R, N, D · categories |
| `fundamental-matrix` | Screened. | Locator only. | Linked family: `categorical-markov`. | F, H, T, R, N, D · simulation |
| `stationary-renewal` | The displayed limit is the renewal strong law. It neither implies a stationary initial delay nor estimates clustering. | Locator only. | Linked family: `hawkes`. | F, R, N · timestamps. The displayed limit is the renewal strong law. It neither implies a stationary initial delay nor estimates clustering. |
| `compound-poisson` | Rugby conversion points depend on tries. The model requires explicit independent marked clusters and observed event marks, which the generic goals/tries input list omits. | Locator only. | Linked family: `poisson`. | F, R · count. Rugby conversion points depend on tries. The model requires explicit independent marked clusters and observed event marks, which the generic goals/tries input list omits. |
| `lognormal-duration` | Screened. | Locator only. | Linked family: `box-cox`. | H, T · positive |
| `ex-gaussian-duration` | Support is the full real line. If duration support must be positive, explicitly model truncation or use a positive-support law. | Locator only. | Linked family: `lognormal-duration`. | H, T · positive. Support is the full real line. If duration support must be positive, explicitly model truncation or use a positive-support law. |
| `gev` | Screened. | Locator only. | Linked family: `lognormal-duration`. | F, H, T, R, N, D · continuous |
| `gpd` | Screened. | Locator only. | Linked family: `gev`. | F, H, T, R, N, D · continuous |
| `ecdf` | Screened. | Locator only. | Linked family: `lognormal-duration`. | F, H, T, R, N, D · continuous |
| `turnbull` | Screened. | Locator only. | Linked family: `kaplan-meier`. | H, T, F, R, N · survival |
| `logrank` | State zero-information handling for n_j≤1 or aggregate variance zero. | Locator only. | Linked family: `kaplan-meier`. | H, T, F, R, N · survival |
| `greenwood` | The written factorization is singular when d_j=n_j. Specify boundary handling at a last event that exhausts the risk set. | Locator only. | Linked family: `kaplan-meier`. | H, T, F, R, N · survival |
| `aalen-johansen` | Screened. | Locator only. | Linked family: `cumulative-incidence`. | H, T, F, R, N · survival |
| `restricted-mean-survival-time` | Screened. | Locator only. | Linked family: `kaplan-meier`. | H, T, F, R, N · survival |
| `poisson-deviance` | Applicable to a defined count with aligned positive fitted means; raw weighted score totals need a separate observation model. | Locator only. | Linked family: `poisson-regression`. | F, H, T, R, N, D · assessment. Applicable to a defined count with aligned positive fitted means; raw weighted score totals need a separate observation model. |
| `anderson-darling` | Screened. | Locator only. | Linked family: `ecdf`. | F, H, T, R, N, D · continuous |
| `ks-one-sample` | Screened. | Locator only. | Linked family: `ecdf`. | F, H, T, R, N, D · continuous |
| `cvm` | The cited Anderson paper treats two samples. Supply a direct one-sample reference for the displayed statistic. | Scope mismatch in cited paper. Add a direct one-sample source. | Linked family: `ks-one-sample`. | F, H, T, R, N, D · continuous |
| `mcnemar` | Screened. | Locator only. | Linked family: `binomial-fixed-count`. | F, H, T, R, N, D · assessment |
| `wilcoxon-signed-rank` | Screened. | Locator only. | Linked family: `mcnemar`. | F, H, T, R, N, D · assessment |
| `spearman` | Screened. | Locator only. | Linked family: `pca`. | F, H, T, R, N, D · multifeature |
| `kendall-tau-b` | Screened. | Locator only. | Linked family: `spearman`. | H · rank |
| `ljung-box` | Screened. | Locator only. | Linked family: `simple-ar`. | F, H, T, R, N, D · series |
| `variance-ratio` | Screened. | Locator only. | Linked family: `first-difference`. | F, H, T, R, N, D · series |
| `adf` | Screened. | Locator only. | Linked family: `simple-ar`. | F, H, T, R, N, D · series |
| `kpss` | Screened. | Locator only. | Linked family: `adf`. | F, H, T, R, N, D · series |
| `newey-west` | Screened. | Locator only. | Linked family: `kpss`. | F, H, T, R, N, D · series |
| `durbin-watson` | Screened. | Locator only. | Linked family: `ljung-box`. | F, H, T, R, N, D · series |
| `breusch-pagan` | Screened. | Locator only. | Linked family: `ridge`. | F, H, T, R, N, D · continuous |
| `cook-distance` | Screened. | Locator only. | Linked family: `ridge`. | F, H, T, R, N, D · continuous |
| `vif` | Screened. | Locator only. | Linked family: `pca`. | F, H, T, R, N, D · multifeature |
| `aic` | Screened. | Locator only. | Linked family: `log-loss`. | F, H, T, R, N, D · assessment |
| `bic` | Screened. | Locator only. | Linked family: `aic`. | F, H, T, R, N, D · assessment |
| `holm` | Screened. | Locator only. | Linked family: `mcnemar`. | F, H, T, R, N, D · assessment |
| `benjamini-hochberg` | Screened. | Locator only. | Linked family: `holm`. | F, H, T, R, N, D · assessment |
| `diebold-mariano` | Screened. | Locator only. | Linked family: `newey-west`. | F, H, T, R, N, D · assessment |
| `auc-roc` | Screened. | Locator only. | Linked family: `log-loss`. | F, H, T, R, N, D · assessment |
| `average-precision` | The implementation convention has a direct maintainer locator in the citation. Distinguish step area from trapezoidal PR area. | Locator only. | Linked family: `auc-roc`. | F, H, T, R, N, D · assessment |
| `ece` | Screened. | Locator only. | Linked family: `brier`. | F, H, T, R, N, D · assessment |
| `calibration-in-large` | Screened. | Locator only. | Linked family: `platt`. | F, H, T, R, N, D · forecast |
| `crps` | Screened. | Locator only. | Linked family: `rps`. | F, H, T, R, N, D · assessment |
| `pinball` | Screened. | Locator only. | Quantile regression fits a model by minimizing the same loss; this record scores a supplied quantile. | F, H, T, R, N, D · assessment |
| `interval-score` | Screened. | Locator only. | Linked family: `pinball`. | F, H, T, R, N, D · assessment |
| `split-conformal` | Chronological splitting protects cutoff order but alone gives no exchangeability-based coverage guarantee. | Locator only. | Linked family: `interval-score`. | F, H, T, R, N, D · continuous. Chronological splitting protects cutoff order but alone gives no exchangeability-based coverage guarantee. |
| `conformal-quantile` | Chronological splitting protects cutoff order but alone gives no exchangeability-based coverage guarantee. State how crossed quantiles or empty sets are handled. | Locator only. | Declared variant of `split-conformal`. | F, H, T, R, N, D · continuous. Chronological splitting protects cutoff order but alone gives no exchangeability-based coverage guarantee. State how crossed quantiles or empty sets are handled. |
| `vector-scaling` | Screened. | Locator only. | Class-specific generalization of temperature; diagonal slope and offsets, unlike full Dirichlet calibration on log probabilities. | F, H, T, R, N, D · forecast |
| `dirichlet-calibration` | Screened. | Locator only. | Linked family: `vector-scaling`. | F, H, T, R, N, D · forecast |
| `online-log-weights` | Screened. | Locator only. | Linked family: `weighted-ensemble`. | F, H, T, R, N, D · forecast |
| `fixed-share` | Screened. | Locator only. | Exponentiated online weights followed by redistribution; α=0 gives online-log-weights. | F, H, T, R, N, D · forecast |
| `bayes-regret` | Displayed rule minimizes posterior expected loss. Define a statewise regret baseline if needed for interpretation, although subtracting it leaves the same argmin. | Locator only. | Linked family: `bayes-rule`. | F, H, T, R, N, D · simulation |
| `cvar` | Screened. | Locator only. | Linked family: `bayes-regret`. | F, H, T, R, N, D · simulation |
| `minimax-regret` | Screened. | Locator only. | Linked family: `bayes-regret`. | F, H, T, R, N, D · simulation |
| `latin-hypercube` | Screened. | Locator only. | Linked family: `monte-carlo`. | F, H, T, R, N, D · simulation |
| `stratified-mc` | Screened. | Locator only. | Declared variant of `monte-carlo`. | F, H, T, R, N, D · simulation |
| `mcmc-metropolis` | Screened. | Locator only. | Linked family: `monte-carlo`. | F, H, T, R, N, D · simulation |
| `gibbs` | Screened. | Locator only. | Linked family: `mcmc-metropolis`. | F, H, T, R, N, D · simulation |
| `slice-sampling` | Screened. | Locator only. | Linked family: `mcmc-metropolis`. | F, H, T, R, N, D · simulation |
| `rank-sobol` | The expression is a first-order Sobol index on original variables. The ID alone implies a rank transform absent from the specification. | Locator only. | Linked family: `monte-carlo`. | F, H, T, R, N, D · simulation |
| `sobol-total` | Screened. | Locator only. | Linked family: `rank-sobol`. | F, H, T, R, N, D · simulation |
| `linear-program` | Screened. | Locator only. | Linked family: `hungarian`. | F, R, N · assignment |
| `branch-bound` | Screened. | Locator only. | Linked family: `linear-program`. | F, R, N · assignment |
| `pareto-front` | Screened. | Locator only. | Linked family: `bayes-regret`. | F, H, T, R, N, D · simulation |
| `nelder-mead` | Incomplete as an executable algorithm. Specify ordering of reflection, expansion and both contraction decisions, with shrink on failed contraction. | Locator only. | Linked family: `spsa`. | F, H, T, R, N, D · simulation |
| `golden-section` | Screened. | Locator only. | Linked family: `nelder-mead`. | F, H, T, R, N, D · simulation |
| `bisection` | Screened. | Locator only. | Linked family: `calibration-in-large`. | F, H, T, R, N, D · continuous |
| `newton-root` | Screened. | Locator only. | Linked family: `bisection`. | F, H, T, R, N, D · continuous |
| `conjugate-gradient` | Screened. | Locator only. | Linked family: `ridge`. | F, H, T, R, N, D · continuous |
| `differential-evolution` | Use a guaranteed mutant coordinate plus independent crossover on remaining coordinates and declare bounds handling as applicable. | Locator only. | Linked family: `pareto-front`. | F, H, T, R, N, D · simulation |
| `simulated-annealing` | Screened. | Locator only. | Linked family: `mcmc-metropolis`. | F, H, T, R, N, D · simulation |
| `cross-entropy-search` | Screened. | Locator only. | Linked family: `latin-hypercube`. | F, H, T, R, N, D · simulation |
| `bandit-ucb` | Screened. | Locator only. | Linked family: `hoeffding`. | F, H, T, R, N, D · simulation |
| `bandit-thompson` | Screened. | Locator only. | Linked family: `beta-bernoulli-update`. | F, H, T, R, N, D · simulation |
| `gaussian-process` | Screened. | Locator only. | Linked family: `ridge`. | F, H, T, R, N, D · continuous |
| `expected-improvement` | Screened. | Locator only. | Linked family: `gaussian-process`. | F, H, T, R, N, D · simulation |
| `svr` | Screened. | Locator only. | Linked family: `ridge`. | F, H, T, R, N, D · continuous |
| `gaussian-naive-bayes` | Screened. | Locator only. | Linked family: `bayes-rule`. | F, H, T, R, N, D · binary |
| `lda-classifier` | Screened. | Locator only. | Linked family: `gaussian-naive-bayes`. | F, H, T, R, N, D · binary |
| `qda-classifier` | Screened. | Locator only. | Declared variant of `lda-classifier`. | F, H, T, R, N, D · binary |
| `adaboost` | Declare stopping or limiting behavior for zero error and handling of weak learners at or above chance. | Locator only. | Linked family: `gradient-boost`. | F, H, T, R, N, D · binary |
| `elastic-weight-consolidation` | Screened. | Locator only. | Declared variant of `ridge`. | F, H, T, R, N, D · continuous |
| `lstm` | The displayed architecture is a forget-gate formulation without peepholes. Identify the exact equations for the adopted variant. | Locator only. | Linked family: `simple-ar`. | F, H, T, R, N, D · series |
| `gru` | Valid complemented gate convention. Cho Eq. 7 uses z on the old state; map z_catalogue=1−z_Cho and negate the update-gate affine map for parameter parity. | Author equations checked. Update gate uses the complementary convention. [Cho et al., Eqs. 5–8](https://aclanthology.org/D14-1179.pdf) | Linked family: `lstm`. | F, H, T, R, N, D · series |
| `causal-attention` | Screened. | Locator only. | Linked family: `softmax`. | F, H, T, R, N, D · series |
| `causal-dilated-conv` | Screened. | Locator only. | Linked family: `haar-wavelet`. | F, H, T, R, N, D · series |
| `adam` | Screened. | Locator only. | Linked family: `spsa`. | F, H, T, R, N, D · continuous |
| `diff-in-diff` | Screened. | Locator only. | Linked family: `ipw`. | F, H, T, R, N, D · causal |
| `synthetic-control` | Screened. | Locator only. | Linked family: `diff-in-diff`. | F, H, T, R, N, D · causal |
| `rd-local-linear` | Screened. | Locator only. | Linked family: `nw-regression`. | F, H, T, R, N, D · causal |
| `wald-iv` | Screened. | Locator only. | Linked family: `ipw`. | F, H, T, R, N, D · causal |
| `rosenbaum-bounds` | Screened. | Locator only. | Linked family: `wilcoxon-signed-rank`. | F, H, T, R, N, D · causal |

### Batch 003 (13)

[Registered definitions and citations](https://github.com/aurelian2483-cmd/value-watch-lab/tree/18b8d625e8e2dd0cb130a27aa49737137b4b479f/research/mathematical-library/batch-003.json)

| Entry | Definition | Source evidence | Semantic relationship | Sport applicability |
| --- | --- | --- | --- | --- |
| `householder-qr` | Screened. | Earlier batch review recorded. | Linked family: `pca`. | F, H, T, R, N, D · multifeature |
| `pivoted-qr` | Screened. | Earlier batch review recorded. | Linked family: `householder-qr`. | F, H, T, R, N, D · multifeature |
| `complete-orthogonal-factorization` | Screened. | Earlier batch review recorded. | Shares the minimum-norm least-squares result with SVD for aligned rank decisions, with different factors. | F, H, T, R, N, D · multifeature |
| `pivoted-lu` | Screened. | Earlier batch review recorded. | Linked family: `conjugate-gradient`. | F, H, T, R, N, D · multifeature |
| `cholesky-solve` | Screened. | Earlier batch review recorded. | Linked family: `ridge`. | F, H, T, R, N, D · multifeature |
| `pivoted-ldlt` | Screened. | Earlier batch review recorded. | Linked family: `pivoted-lu`. | F, H, T, R, N, D · multifeature |
| `svd-least-squares` | Screened. | Earlier batch review recorded. | Shares minimum-norm solution with complete orthogonal factorization under compatible rank decisions; truncation can change the design. | F, H, T, R, N, D · multifeature |
| `symmetric-tridiagonal-reduction` | Screened. | Earlier batch review recorded. | Linked family: `householder-qr`. | F, H, T, R, N, D · multifeature |
| `hessenberg-reduction` | Screened. | Earlier batch review recorded. | Linked family: `symmetric-tridiagonal-reduction`. | F, H, T, R, N, D · multifeature |
| `svd-bidiagonal-reduction` | Screened. | Earlier batch review recorded. | Linked family: `svd-least-squares`. | F, H, T, R, N, D · multifeature |
| `symmetric-definite-eigen` | Screened. | Earlier batch review recorded. | Linked family: `cholesky-solve`. | F, H, T, R, N, D · multifeature |
| `generalized-schur` | Screened. | Earlier batch review recorded. | Linked family: `hessenberg-reduction`. | F, H, T, R, N, D · multifeature |
| `linear-solve-backward-error` | Screened. | Earlier batch review recorded. | Linked family: `pivoted-lu`. | F, H, T, R, N, D · multifeature |

### Batch 004 (10)

[Registered definitions and citations](https://github.com/aurelian2483-cmd/value-watch-lab/tree/18b8d625e8e2dd0cb130a27aa49737137b4b479f/research/mathematical-library/batch-004.json)

| Entry | Definition | Source evidence | Semantic relationship | Sport applicability |
| --- | --- | --- | --- | --- |
| `laplace` | Screened. | Earlier batch review recorded. | Linked family: `quantile-regression`. | F, H, T, R, N, D · continuous |
| `logistic-residual` | Screened. | Earlier batch review recorded. | Linked family: `logistic`. | F, H, T, R, N, D · continuous |
| `student-t-residual` | Screened. | Earlier batch review recorded. | Linked family: `huber-regression`. | F, H, T, R, N, D · continuous |
| `chi-square-law` | Screened. | Earlier batch review recorded. | Linked family: `breusch-pagan`. | F, H, T, R, N, D · continuous |
| `f-reference-law` | Screened. | Earlier batch review recorded. | Linked family: `chi-square-law`. | F, H, T, R, N, D · continuous |
| `triangular-law` | Screened. | Earlier batch review recorded. | Linked family: `latin-hypercube`. | F, H, T, R, N, D · continuous |
| `inverse-gaussian-duration` | Screened. | Earlier batch review recorded. | Linked family: `lognormal-duration`. | F, H, T, R, N, D · continuous |
| `burr-xii-duration` | Screened. | Earlier batch review recorded. | Linked family: `gpd`. | F, H, T, R, N, D · continuous |
| `von-mises-angle` | Screened. | Earlier batch review recorded. | Linked family: `kalman`. | F, H, T, R, N, D · multifeature |
| `loggamma-residual` | Screened. | Earlier batch review recorded. | Linked family: `lognormal-duration`. | F, H, T, R, N, D · continuous |

### Batch 005 (5)

[Registered definitions and citations](https://github.com/aurelian2483-cmd/value-watch-lab/tree/18b8d625e8e2dd0cb130a27aa49737137b4b479f/research/mathematical-library/batch-005.json)

| Entry | Definition | Source evidence | Semantic relationship | Sport applicability |
| --- | --- | --- | --- | --- |
| `gradient-descent` | Screened. | Earlier batch review recorded. | ISTA with λ=0 reduces to gradient descent; smooth objective versus composite step. | F, H, T, R, N, D · multifeature |
| `ista` | Screened. | Author constant-step scheme checked. [Beck and Teboulle, §3](https://www.ceremade.dauphine.fr/~carlier/FISTA) | Same update as prox-l1 at η=1/L with matching penalized coordinates; canonical label ISTA, preserve both IDs. | F, H, T, R, N, D · multifeature |
| `fista` | Screened. | Author extrapolation checked. [Beck and Teboulle, §4](https://www.ceremade.dauphine.fr/~carlier/FISTA) | ISTA acceleration with extrapolation and extra state. | F, H, T, R, N, D · multifeature |
| `frank-wolfe` | Screened. | Earlier batch review recorded. | Linked family: `project-simplex`. | F, H, T, R, N, D · multifeature |
| `quadratic-penalty` | Screened. | Earlier batch review recorded. | Linked family: `linear-program`. | F, H, T, R, N, D · multifeature |

### Batch 006 (5)

[Registered definitions and citations](https://github.com/aurelian2483-cmd/value-watch-lab/tree/18b8d625e8e2dd0cb130a27aa49737137b4b479f/research/mathematical-library/batch-006.json)

| Entry | Definition | Source evidence | Semantic relationship | Sport applicability |
| --- | --- | --- | --- | --- |
| `composite-trapezoid` | Screened. | Composite rule checked. [NIST DLMF 3.5.2](https://dlmf.nist.gov/3.5.E2) | Base rule for Romberg; with an ODE-dependent integrand it gives the implicit trapezoidal step. | F, H, T, R, N, D · multifeature |
| `composite-simpson` | Screened. | Earlier batch review recorded. | Linked family: `composite-trapezoid`. | F, H, T, R, N, D · multifeature |
| `romberg-integration` | Screened. | Earlier batch review recorded. | Linked family: `composite-trapezoid`. | F, H, T, R, N, D · multifeature |
| `gaussian-quadrature` | Screened. | Earlier batch review recorded. | Linked family: `monte-carlo`. | F, H, T, R, N, D · multifeature |
| `golub-welsch` | Screened. | Earlier batch review recorded. | Constructs Gaussian quadrature nodes and weights for the same rule; distinct computation, common quadrature output. | F, H, T, R, N, D · multifeature |

### Batch 007 (4)

[Registered definitions and citations](https://github.com/aurelian2483-cmd/value-watch-lab/tree/18b8d625e8e2dd0cb130a27aa49737137b4b479f/research/mathematical-library/batch-007.json)

| Entry | Definition | Source evidence | Semantic relationship | Sport applicability |
| --- | --- | --- | --- | --- |
| `beta-continuous` | Screened. | Earlier batch review recorded. | Linked family: `beta-bernoulli-update`. | F, H, T, R, N, D · continuous |
| `generalized-normal` | Screened. | Earlier batch review recorded. | Linked family: `laplace`. | F, H, T, R, N, D · continuous |
| `skew-normal` | Screened. | Earlier batch review recorded. | Linked family: `student-t-residual`. | F, H, T, R, N, D · continuous |
| `normal-inverse-gaussian` | Screened. | Earlier batch review recorded. | Linked family: `inverse-gaussian-duration`. | F, H, T, R, N, D · continuous |

### Batch 008 (3)

[Registered definitions and citations](https://github.com/aurelian2483-cmd/value-watch-lab/tree/18b8d625e8e2dd0cb130a27aa49737137b4b479f/research/mathematical-library/batch-008.json)

| Entry | Definition | Source evidence | Semantic relationship | Sport applicability |
| --- | --- | --- | --- | --- |
| `secant-root` | Screened. | Earlier batch review recorded. | Linked family: `newton-root`. | F, H, T, R, N, D · multifeature |
| `halley-root` | Screened. | Earlier batch review recorded. | Linked family: `newton-root`. | F, H, T, R, N, D · multifeature |
| `steffensen-fixed-point` | Screened. | Earlier batch review recorded. | Linked family: `secant-root`. | F, H, T, R, N, D · multifeature |

### Batch 009 (3)

[Registered definitions and citations](https://github.com/aurelian2483-cmd/value-watch-lab/tree/18b8d625e8e2dd0cb130a27aa49737137b4b479f/research/mathematical-library/batch-009.json)

| Entry | Definition | Source evidence | Semantic relationship | Sport applicability |
| --- | --- | --- | --- | --- |
| `barycentric-polynomial-interpolation` | Screened. | Earlier batch review recorded. | Linked family: `gaussian-quadrature`. | F, H, T, R, N, D · multifeature |
| `natural-cubic-spline` | Screened. | Earlier batch review recorded. | Linked family: `barycentric-polynomial-interpolation`. | F, H, T, R, N, D · multifeature |
| `pchip-interpolation` | Screened. | Earlier batch review recorded. | Linked family: `isotonic`. | F, H, T, R, N, D · multifeature |

### Batch 010 (6)

[Registered definitions and citations](https://github.com/aurelian2483-cmd/value-watch-lab/tree/18b8d625e8e2dd0cb130a27aa49737137b4b479f/research/mathematical-library/batch-010.json)

| Entry | Definition | Source evidence | Semantic relationship | Sport applicability |
| --- | --- | --- | --- | --- |
| `forward-euler-ode` | Screened. | Earlier batch review recorded. | Linked family: `kalman-ou`. | F, H, T, R, N, D · multifeature |
| `backward-euler-ode` | Screened. | Earlier batch review recorded. | Linked family: `forward-euler-ode`. | F, H, T, R, N, D · multifeature |
| `implicit-trapezoidal-ode` | Screened. | Earlier batch review recorded. | Linked family: `backward-euler-ode`. | F, H, T, R, N, D · multifeature |
| `classical-rk4` | Screened. | Earlier batch review recorded. | Linked family: `forward-euler-ode`. | F, H, T, R, N, D · multifeature |
| `bogacki-shampine-rk23` | Screened. | Earlier batch review recorded. | Linked family: `classical-rk4`. | F, H, T, R, N, D · multifeature |
| `velocity-verlet` | Screened. | Earlier batch review recorded. | Linked family: `classical-rk4`. | F, H, T, R, N, D · multifeature |

### Batch 011 (5)

[Registered definitions and citations](https://github.com/aurelian2483-cmd/value-watch-lab/tree/18b8d625e8e2dd0cb130a27aa49737137b4b479f/research/mathematical-library/batch-011.json)

| Entry | Definition | Source evidence | Semantic relationship | Sport applicability |
| --- | --- | --- | --- | --- |
| `dijkstra-shortest-path` | Screened. | Earlier batch review recorded. | Linked family: `pagerank`. | F, H, T, R, N, D · multifeature |
| `bellman-ford-shortest-path` | Screened. | Earlier batch review recorded. | Linked family: `dijkstra-shortest-path`. | F, H, T, R, N, D · multifeature |
| `floyd-warshall` | Screened. | Earlier batch review recorded. | Linked family: `bellman-ford-shortest-path`. | F, H, T, R, N, D · multifeature |
| `kruskal-spanning-forest` | Screened. | Earlier batch review recorded. | Linked family: `dijkstra-shortest-path`. | F, H, T, R, N, D · multifeature |
| `hits-hub-authority` | Screened. | Earlier batch review recorded. | Linked family: `pagerank`. | F, H, T, R, N, D · multifeature |

### Batch 012 (4)

[Registered definitions and citations](https://github.com/aurelian2483-cmd/value-watch-lab/tree/18b8d625e8e2dd0cb130a27aa49737137b4b479f/research/mathematical-library/batch-012.json)

| Entry | Definition | Source evidence | Semantic relationship | Sport applicability |
| --- | --- | --- | --- | --- |
| `kruskal-wallis` | Screened. | Earlier batch review recorded. | Linked family: `wilcoxon-signed-rank`. | F, H, T, R, N, D · assessment |
| `friedman-rank-test` | Screened. | Earlier batch review recorded. | Linked family: `kruskal-wallis`. | F, H, T, R, N, D · assessment |
| `fligner-killeen` | Screened. | Earlier batch review recorded. | Linked family: `kruskal-wallis`. | F, H, T, R, N, D · assessment |
| `ansari-bradley` | Screened. | Earlier batch review recorded. | Linked family: `fligner-killeen`. | F, H, T, R, N, D · assessment |

### Batch 013 (4)

[Registered definitions and citations](https://github.com/aurelian2483-cmd/value-watch-lab/tree/18b8d625e8e2dd0cb130a27aa49737137b4b479f/research/mathematical-library/batch-013.json)

| Entry | Definition | Source evidence | Semantic relationship | Sport applicability |
| --- | --- | --- | --- | --- |
| `jacobi-linear-solve` | Screened. | Earlier batch review recorded. | Linked family: `pivoted-lu`. | F, H, T, R, N, D · multifeature |
| `gauss-seidel-linear-solve` | Screened. | Earlier batch review recorded. | Linked family: `jacobi-linear-solve`. | F, H, T, R, N, D · multifeature |
| `gmres-linear-solve` | Screened. | Earlier batch review recorded. | Residual minimization over a Krylov space. MINRES exploits symmetry via Lanczos and short recurrences. | F, H, T, R, N, D · multifeature |
| `minres-linear-solve` | Screened. | Earlier batch review recorded. | Same Krylov residual objective as unrestarted GMRES under symmetry; distinct basis and computation. | F, H, T, R, N, D · multifeature |

### Batch 014 (4)

[Registered definitions and citations](https://github.com/aurelian2483-cmd/value-watch-lab/tree/18b8d625e8e2dd0cb130a27aa49737137b4b479f/research/mathematical-library/batch-014.json)

| Entry | Definition | Source evidence | Semantic relationship | Sport applicability |
| --- | --- | --- | --- | --- |
| `theil-sen-simple` | Screened. | Earlier batch review recorded. | Linked family: `huber-regression`. | F, H, T, R, N, D · multifeature |
| `siegel-repeated-median` | Screened. | Earlier batch review recorded. | Linked family: `theil-sen-simple`. | F, H, T, R, N, D · multifeature |
| `ransac-consensus-regression` | Screened. | Earlier batch review recorded. | Linked family: `huber-regression`. | F, H, T, R, N, D · multifeature |
| `raw-minimum-covariance-determinant` | Screened. | Earlier batch review recorded. | Linked family: `pca`. | F, H, T, R, N, D · multifeature |

### Batch 015 (4)

[Registered definitions and citations](https://github.com/aurelian2483-cmd/value-watch-lab/tree/18b8d625e8e2dd0cb130a27aa49737137b4b479f/research/mathematical-library/batch-015.json)

| Entry | Definition | Source evidence | Semantic relationship | Sport applicability |
| --- | --- | --- | --- | --- |
| `vector-autoregression` | Screened. | Earlier batch review recorded. | VECM reparameterizes a cointegrated VAR with explicit reduced rank; usual stable VAR and cointegrated levels VAR differ in root structure. | F, H, T, R, N, D · multifeature |
| `vector-error-correction` | Screened. | Earlier batch review recorded. | Reduced-rank error-correction reparameterization of a cointegrated VAR; explicit rank restriction changes fitted model class. | F, H, T, R, N, D · multifeature |
| `markov-switching-ar` | Screened. | Earlier batch review recorded. | Linked family: `hmm-forward`. | F, H, T, R, N, D · multifeature |
| `dynamic-factor-model` | Screened. | Maintainer documentation checked for factor VAR order and white observation errors. Arbitrary R uses the unstructured covariance option. [statsmodels](https://www.statsmodels.org/stable/generated/statsmodels.tsa.statespace.dynamic_factor.DynamicFactor.html) | Linked family: `kalman`. | F, H, T, R, N, D · multifeature |


## Follow-up work recorded after the initial audit

- Initial independent primary-source spot-check: [PRIMARY-SOURCE-VERIFICATION-2026-11-20.md](./PRIMARY-SOURCE-VERIFICATION-2026-11-20.md). This verifies selected high-risk definitions (renewal strong law, ISTA/FISTA, IPW timing, CMP normalizer domain, Nelder–Mead branches and Skellam common-component cancellation). It is **not** full source verification of all 286 entries. One nuance: Gallager states the finite-mean form of Theorem 4.3.1 and also notes the infinite-mean extension by truncation; the limiting renewal rate is zero when the mean inter-renewal interval is infinite.
- Recovery boundary for the original 81-formula inventory: [81-FORMULA-RECOVERY-STATUS.md](./81-FORMULA-RECOVERY-STATUS.md). The repository's `experiment81-third-source` workflow is a third-source fixture feasibility probe, not the 81-formula inventory. The item-level 81 rows remain unrecovered; no crosswalk has been fabricated.
- Added [mathematical-library-validation.yml](../../.github/workflows/mathematical-library-validation.yml) so the preserved legacy validator and versioned 19-test suite can run automatically on changes to this research branch. A workflow definition is not itself a test pass; inspect the resulting run before claiming CI validation.
- Corrected the stale `journal.js?v=2` assertion to `journal.js?v=3`. The full research regression subsequently passed on the branch; this only resolves the stale asset-revision assertion and does not establish browser QA or predictive-model validity.
