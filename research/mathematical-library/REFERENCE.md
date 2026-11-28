# Sky mathematical reference

## Poisson goal model (poisson)

> P(X=k)=exp(-λ)λ^k/k!

X goals, k nonnegative integer, λ expected goals per fixture.

Model goal or try counts at a fixed exposure

Assumptions — Fixed exposure and conditional equidispersion.

Limitations — Overdispersion or correlated scores.

Source — Cameron and Trivedi, Regression Analysis of Count Data, 2nd ed., 2013

## Dixon-Coles low-score adjustment (dixon-coles)

> P(x,y)=Pois(x;λ)Pois(y;μ)τ(x,y), with τ(0,0)=1−λμρ, τ(0,1)=1+λρ, τ(1,0)=1+μρ, τ(1,1)=1−ρ and τ=1 otherwise

x,y home and away goals, λ,μ positive fitted intensities, ρ fitted low-score dependence.

Estimate a football scoreline or goal differential

Assumptions — All four factors nonnegative and rate fit uses prior fixtures only.

Limitations — Low-score correction misses broader dependence.

Source — doi:10.1111/1467-9876.00065

## Bivariate Poisson score model (bivariate-poisson)

> X=A+C, Y=B+C with independent A~Pois(a), B~Pois(b), C~Pois(c), so joint mass at x,y is Σ[j=0..min(x,y)] Pois(x−j;a)Pois(y−j;b)Pois(j;c)

X,Y team goals, A,B team-specific and C shared counts, a,b,c nonnegative intensities.

Estimate a football scoreline or goal differential

Assumptions — Shared Poisson increment and nonnegative dependence.

Limitations — Negative conditional covariance cannot be represented.

Source — doi:10.1111/1467-9884.00366

## Negative binomial goal/score model (negative-binomial)

> P(X=k)=Γ(k+r)/(Γ(r)k!)·(1−p)^k p^r. For p=1 set P(X=0)=1 and P(X=k)=0 for k>0

X score count, k nonnegative integer, r>0 size, 0<p≤1 success parameter, Γ gamma function.

Model goal or try counts at a fixed exposure

Assumptions — Variance exceeds mean for 0<p<1.

Limitations — Underdispersion and structural zeros.

Source — Cameron and Trivedi, Regression Analysis of Count Data, 2nd ed., 2013

## Elo strength rating (elo)

> E_A=1/(1+10^((R_B−R_A)/400)), R_A←R_A+K(S_A−E_A), R_B←R_B−K(S_A−E_A), update after result publication

R ratings, E expected score, S_A=1 win, 0.5 draw, 0 loss, K positive step size.

Estimate relative strength from comparable opponent results

Assumptions — Common rating scale and comparable contest results.

Limitations — Draw share cannot be recovered from expected score alone.

Source — Arpad Elo, The Rating of Chessplayers, Past and Present, 1978

## Glicko rating system (glicko)

> Set q=ln(10)/400 and g(s)=(1+3q²s²/π²)^(-1/2). Inflate own RD to v=min(350,√(RD²+c²t)). For prior period opponents compute E_j=(1+10^(−g(RD_j)(r−r_j)/400))^(-1), I=q²Σg(RD_j)²E_j(1−E_j). Set RD_new=(v^(-2)+I)^(-1/2) and r_new=r+q RD_new²Σg(RD_j)(S_j−E_j). For game expected score use E=1/(1+10^(−g(√(RD_A²+RD_B²))(r_A−r_B)/400)) with both pre-period deviations. The E_j above is the rating-update term

r,r_j ratings, RD standard deviations, c process inflation, t elapsed periods, S_j assigned Elo score, j opponent index. RD_j is the opponent deviation after pre-period inflation. RD_A and RD_B are the two pre-period deviations for game expectation.

Track tennis or darts head-to-head strength and rating uncertainty, or football expected score under a declared draw convention.

Assumptions — Use simultaneous snapshots within a rating period.

Limitations — Sparse periods produce uncertain ratings and asymmetric expected scores.

Source — Mark Glickman, The Glicko System, glicko.net/glicko/glicko.pdf

## Bradley-Terry comparisons (bradley-terry)

> P(i beats j)=exp(θ_i)/(exp(θ_i)+exp(θ_j)), fit θ by binary likelihood with Σθ_i=0

i,j competitors, θ log strengths, draws excluded under conditional decisive-result interpretation.

Estimate relative strength from comparable opponent results

Assumptions — Connected comparison graph and time-stable strength for fit window.

Limitations — Complete separation yields infinite unpenalised estimates.

Mechanism — Two-alternative conditional logit with paired identity contrasts; conditioning on two remaining choices reduces Plackett–Luce to this form.

Source — doi:10.1093/biomet/39.3-4.324

## Exponentially weighted moving average (ewma)

> S_t=αX_t+(1−α)S_(t−1), S_1=X_1

X_t time-ordered metric, S_t smoothed value, 0<α≤1 smoothing weight, t observations.

Track changes in prior football chance-creation rates, horse sectionals, tennis serve rates, rugby try rates, NFL drive efficiency or darts checkout rates

Assumptions — Fixed observation-step interpretation of decay.

Limitations — Unequal gaps distort real-time decay.

Mechanism — Matches geometric weighting with its recursive initialization; finite renormalized decay treats the boundary differently.

Source — Hyndman and Athanasopoulos, Forecasting: Principles and Practice, 3rd ed., §8.1

## CUSUM change detection (cusum)

> C_t=max(0,C_(t−1)+X_t−μ_0−k), C_0=0, alarm when C_t≥h

X_t observed statistic, μ_0 in-control mean, k≥0 allowance, h>0 threshold.

Track changes in prior football chance-creation rates, horse sectionals, tennis serve rates, rugby try rates, NFL drive efficiency or darts checkout rates

Assumptions — Direction is upward and threshold is fixed before deployment.

Limitations — Autocorrelation raises false-alert rate under iid thresholds.

Source — doi:10.1093/biomet/41.1-2.100

## Kalman filter (kalman)

> Predict m⁻=Fm and P⁻=FPFᵀ+Q. Set K=P⁻Hᵀ(HP⁻Hᵀ+R)^(-1), m←m⁻+K(y−Hm⁻), P←(I−KH)P⁻(I−KH)ᵀ+KRKᵀ

m,P conditional state mean/covariance, y observation, F transition, H observation map, Q,R noise covariances, K gain, I identity.

Track changes in prior football chance-creation rates, horse sectionals, tennis serve rates, rugby try rates, NFL drive efficiency or darts checkout rates

Assumptions — Linear Gaussian system, independent noise, estimable covariance and invertible innovation covariance.

Limitations — Large structural break invalidates the state transition.

Source — doi:10.1115/1.3662552

## Hierarchical Bayesian modelling (bayesian-hierarchical)

> p(θ,η∣y)∝p(η)∏_j p(θ_j∣η)∏_i p(y_ji∣θ_j)

j subgroup, i within group, θ_j group parameter, η hyperparameter, y data.

Track changes in prior football chance-creation rates, horse sectionals, tennis serve rates, rugby try rates, NFL drive efficiency or darts checkout rates

Assumptions — Exchangeable groups conditional on η in this factorization.

Limitations — Over-pooling for nonexchangeable leagues.

Source — Gelman et al., Bayesian Data Analysis, 3rd ed., ch. 5

## Monte Carlo simulation (monte-carlo)

> Draw independent X_i~P and compute μ̂=N^(-1)Σ_i f(X_i), SE=s_f/√N for finite variance

P simulator law, f measured payoff or outcome indicator, s_f sample SD, N draws.

Summarize rule-consistent scoring or rank trajectories

Assumptions — Independent draws and finite second moment for standard error.

Limitations — Rare outcomes yield unstable estimates.

Source — Robert and Casella, Monte Carlo Statistical Methods, 2nd ed., 2004

## Weighted probability ensemble (weighted-ensemble)

> p(y)=Σ_j w_j p_j(y), w_j≥0 and Σ_j w_j=1

p_j aligned component distributions, w_j fixed or trained on earlier out-of-fold forecasts, y common outcome.

Combine aligned pre-event probabilities for the same outcome, such as horse-race winners across a declared field.

Assumptions — Identical target definitions and support.

Limitations — Correlated component errors provide little diversification.

Mechanism — Common linear pooling operation used by stacking, BMA and shrinkage; weight construction distinguishes the records.

Source — Genest and Zidek, Combining Probability Distributions: A Critique and an Annotated Bibliography, Statistical Science, 1986

## Isotonic probability calibration (isotonic)

> Sort calibration pairs by p_i, pool equal scores, then merge adjacent blocks whose label means decrease. Set calibrated q(p_i)=mean of y in its final block, extend as a right-continuous step function with endpoint clipping.

p_i pre-event probability, y_i observed 0/1, block means fitted calibrated probabilities.

Calibrate a fixed binary target, such as whether a named entrant wins, on older forecasts; fieldwise binary calibration may require a separate coherence step.

Assumptions — Chronologically separate calibration and assessment, reliability monotone in score.

Limitations — Small blocks produce extreme outputs.

Source — Barlow et al., Statistical Inference Under Order Restrictions, 1972

## Logistic regression (logistic)

> P(Y=1∣x)=1/(1+exp(−β_0−βᵀx)); fit coefficients by Bernoulli log likelihood

Y binary target, x pre-event feature vector, β_0 intercept, β coefficients.

Estimate or update a binary event such as a tennis service hold or a football clean sheet

Assumptions — Linear conditional log odds for specified features.

Limitations — Separation and nonlinear misspecification.

Mechanism — Binary softmax and two-alternative conditional-logit specialize to this link with the appropriate features. Platt adds score calibration and target smoothing.

Source — Hastie, Tibshirani and Friedman, The Elements of Statistical Learning, 2nd ed., §4.4

## Bayesian change-point detection (changepoint)

> Initialize J₀(0)=1. Let h(r)=P(D=r+1 ∣ D≥r+1) for positive integer segment duration D and previous run length r. Compute G_r=J_(t−1)(r)π_r(x_t), J_t(r+1)=G_r(1−h(r)), and J_t(0)=Σ_r G_r h(r). Normalize by Σ_s J_t(s)>0 for the run-length posterior. Initialize the reset state at the segment prior and extend growth states with x_t

r previous run length, J joint run-length and observation mass up to a common scale, D segment duration, h(r) duration hazard written on the previous-run index, π_r previous-run predictive density.

Track changes in prior football chance-creation rates, horse sectionals, tennis serve rates, rugby try rates, NFL drive efficiency or darts checkout rates

Assumptions — Segments have a probabilistic duration and tractable run predictive updates.

Limitations — Mis-specified hazard generates spurious resets.

Source — Adams and MacKay, Bayesian Online Changepoint Detection, arXiv:0710.3742

## Skellam distribution (skellam)

> P(D=k)=exp(−a−b)(a/b)^(k/2)I_abs(k)(2√(ab))

D goal difference, k integer, a,b positive Poisson rates, I_m modified Bessel function of first kind.

Model regulation-time association-football goal difference. The difference law alone does not identify a joint scoreline

Assumptions — Independent Poisson scores or scores with independent Poisson components X=A+C and Y=B+C, in which case a and b are the rates of A and B.

Limitations — Overdispersion or dependence beyond an additive common component that cancels in the difference.

Mechanism — Exact marginal of independent Poisson score difference and of a bivariate Poisson score difference with a common additive shock.

Source — doi:10.2307/2981372

## Beta-binomial distribution (beta-binomial)

> P(K=k)=C(n,k)B(k+a,n−k+b)/B(a,b)

K successes, n trials, k integer 0..n, a,b positive beta shapes, B beta function, C binomial coefficient.

Model tennis service points, darts checkout attempts or comparable bounded event rates

Assumptions — Trials exchangeable within group.

Limitations — Fatigue breaks exchangeability.

Mechanism — Predictive count from beta-Bernoulli mixture; single Bernoulli prediction is beta-bernoulli-update.

Source — Johnson, Kemp and Kotz, Univariate Discrete Distributions, 3rd ed., 2005

## Zero-inflated Poisson (zip)

> P(X=k)=π1[k=0]+(1−π)exp(−λ)λ^k/k!

X count, k nonnegative integer, π structural zero fraction, λ>0 active mean, 1 indicator.

Model goal or try counts at a fixed exposure

Assumptions — Two distinct zero mechanisms.

Limitations — Near-zero rates confound structural zeros.

Source — doi:10.1080/00401706.1992.10485228

## Poisson hurdle model (hurdle-poisson)

> P(X=0)=π, P(X=k>0)=(1−π)exp(−λ)λ^k/[k!(1−exp(−λ))]

X count, k positive integer, π zero probability, λ positive rate.

Model goal or try counts at a fixed exposure

Assumptions — Separate occurrence and positive count models.

Limitations — Sparse positives destabilize intensity.

Source — doi:10.1016/0304-4076(86)90002-3

## Conway–Maxwell–Poisson (com-poisson)

> P(X=k)=λ^k/[(k!)^ν Z], Z=Σ[j≥0] λ^j/(j!)^ν. Use λ>0 with ν>0, or 0<λ<1 with ν=0. For λ=0 and ν≥0 use a point mass at zero

X count, k,j nonnegative integers, λ and ν positive parameters.

Model goal or try counts at a fixed exposure

Assumptions — Use a finite normalizer and comparable exposures. The ν=0 case is geometric on nonnegative counts.

Limitations — Naive truncation biases likelihood.

Source — doi:10.1111/j.1467-9876.2005.00474.x

## Geometric waiting-count distribution (geometric)

> P(T=k)=(1−p)^(k−1)p

T attempts to first success, k≥1 integer, 0<p≤1 success chance.

Model tennis service points, darts checkout attempts or comparable bounded event rates

Assumptions — Independent attempts with constant p.

Limitations — Attempt dependence breaks memorylessness.

Source — Grimmett and Stirzaker, Probability and Random Processes, 3rd ed., 2001

## Softmax transformation (softmax)

> p_j=exp(z_j−m)/Σ_k exp(z_k−m), m=max_k z_k

z_j finite alternative score, m stability offset, p_j normalized mass.

Assign a mutually exclusive winner probability across a race field

Assumptions — Exhaustive choice set.

Limitations — Omitted runners distort mass.

Mechanism — Shared simplex map for conditional-logit, multiclass calibration and choice stages; no fitting objective on its own.

Source — Goodfellow, Bengio and Courville, Deep Learning, §6.2.2.3

## Plackett–Luce ranking (plackett-luce)

> P(π)=∏_j exp(θ_(π_j))/Σ_(k≥j) exp(θ_(π_k))

π entrant permutation, θ log worth, j,k rank indices.

Estimate probabilities of horse finishing orders

Assumptions — Sequential choice and ties excluded.

Limitations — Pace interactions violate independence of irrelevant alternatives.

Mechanism — Sequential conditional choice likelihood on shrinking sets; first-place-only data give conditional logit.

Source — doi:10.2307/2346567

## Davidson paired comparison with ties (davidson-ties)

> Set weights w_i=exp(θ_i), w_d=ν exp((θ_i+θ_j)/2), w_j=exp(θ_j); set p_k=w_k/(w_i+w_d+w_j) for k∈{i,d,j}.

θ log strengths, ν≥0 tie parameter, i,j competitors.

Estimate relative strength from comparable opponent results

Assumptions — Common tie mechanism in competition.

Limitations — Rule changes alter draw rate.

Source — doi:10.1080/01621459.1970.10481082

## Thurstone Case V comparison (thurstone-case-v)

> P(i wins)=Φ((μ_i−μ_j)/(√2σ))

μ competitor utility mean, σ>0 common SD, Φ standard normal CDF.

Estimate relative strength from comparable opponent results

Assumptions — Independent Gaussian utilities.

Limitations — Scale and position unidentified without constraints.

Source — doi:10.1037/h0070288

## TrueSkill skill model (trueskill)

> S_i~N(μ_i,σ_i²), P_i conditional on S_i~N(S_i,β²), T_g=Σ_(i∈g)P_i. Observe T_g−T_h>ε for g win or absolute difference≤ε for tie; approximate posterior by expectation propagation with truncated Gaussian moment matching.

S skill, P performance, T team total, μ,σ posterior moments, β>0 game variation, ε draw margin.

Estimate relative strength from comparable opponent results

Assumptions — Additive individual performance within teams.

Limitations — Rare compositions impede attribution.

Source — Herbrich, Minka and Graepel, TrueSkill: A Bayesian Skill Rating System, NeurIPS 2006

## Conditional logit choice model (conditional-logit)

> P(i chosen given C)=exp(βᵀx_i)/Σ_(j∈C)exp(βᵀx_j), fit grouped winner likelihood

C choice set, x_i entrant covariates, β common coefficients.

Assign a mutually exclusive winner probability across a race field

Assumptions — One winner and independence of irrelevant alternatives.

Limitations — Within-field dependence violates independent utility errors.

Mechanism — Softmax with learned utility and grouped likelihood. Two alternatives with contrast-coded features reduce to binary logistic.

Source — McFadden, Conditional Logit Analysis of Qualitative Choice Behavior, 1974

## Bayes posterior update (bayes-rule)

> P(H∣D)=P(D∣H)P(H)/Σ_j P(D∣H_j)P(H_j)

H hypothesis and H_j exhaustive exclusive hypotheses, D observed evidence.

Estimate or update a binary event such as a tennis service hold or a football clean sheet

Assumptions — Positive marginal evidence and coherent prior. H is an element of the stated exhaustive disjoint partition. For a union, sum the posterior masses of its elements.

Limitations — Correlated evidence can be counted twice.

Source — Gelman et al., Bayesian Data Analysis, 3rd ed., ch. 1

## Exponential elapsed-time weighting (exp-time-decay)

> w_i=exp(−λ(t−t_i)), μ̂=Σ_i w_i x_i/Σ_i w_i

x_i metric, t_i earlier availability time, t cutoff, λ>0 inverse time, μ̂ estimate.

Track changes in prior football chance-creation rates, horse sectionals, tennis serve rates, rugby try rates, NFL drive efficiency or darts checkout rates

Assumptions — One decay timescale.

Limitations — Smooth forgetting can hide an abrupt regime switch.

Mechanism — Close to ewma on a regular grid with α=1−exp(−λΔ); elapsed-time weights and finite normalization matter.

Source — Hyndman and Athanasopoulos, Forecasting: Principles and Practice, 3rd ed., §8.1, geometric weights extended to elapsed time

## Standard score (z-score)

> z=(x−μ)/σ

x raw metric, μ and σ>0 mean and SD fitted on preceding observations.

Track changes in prior football chance-creation rates, horse sectionals, tennis serve rates, rugby try rates, NFL drive efficiency or darts checkout rates

Assumptions — Comparable measurement regime.

Limitations — Outliers distort centering and scale.

Source — NIST/SEMATECH e-Handbook of Statistical Methods, Measures of Scale

## Median absolute deviation standardization (mad-score)

> z=(x−m)/(1.4826·median_i abs(x_i−m)), m=median_i x_i

x new metric, x_i past training data, m training median, factor gives asymptotic Gaussian consistency.

Track changes in prior football chance-creation rates, horse sectionals, tennis serve rates, rugby try rates, NFL drive efficiency or darts checkout rates

Assumptions — Positive MAD.

Limitations — Ties can make MAD zero.

Source — doi:10.1080/01621459.1993.10476408

## Box–Cox power transform (box-cox)

> g_λ(x)=(x^λ−1)/λ when λ≠0, ln(x) at λ=0

x positive metric, λ training-selected power.

Transform skewed duration predictors for model fitting

Assumptions — Strictly positive inputs.

Limitations — Back-transforming a mean introduces Jensen bias.

Source — doi:10.1111/j.2517-6161.1964.tb00553.x

## First difference (first-difference)

> Δx_t=x_t−x_(t−1)

t consecutive observation index, x_t observed metric.

Track changes in prior football chance-creation rates, horse sectionals, tennis serve rates, rugby try rates, NFL drive efficiency or darts checkout rates

Assumptions — Comparable exposure across steps.

Limitations — Amplifies measurement noise.

Source — Hyndman and Athanasopoulos, Forecasting: Principles and Practice, 3rd ed., §9.1

## Rolling median level shift (rolling-median-shift)

> D_t=median{x_(t−w+1),…,x_t}−median{x_(t−2w+1),…,x_(t−w)}

x_t available metric, w integer observations per window, D_t level change.

Track changes in prior football chance-creation rates, horse sectionals, tennis serve rates, rugby try rates, NFL drive efficiency or darts checkout rates

Assumptions — Adjacent equal-size comparable windows.

Limitations — Schedule changes masquerade as regime shifts.

Source — original: difference of two explicitly disjoint trailing medians

## Exponentially weighted residual second moment (ew-variance)

> v_t=λv_(t−1)+(1−λ)e_(t−1)²

v_t predictive second moment, e earlier available residual, 0<λ<1, v_0≥0 fixed on training.

Track changes in prior football chance-creation rates, horse sectionals, tennis serve rates, rugby try rates, NFL drive efficiency or darts checkout rates

Assumptions — Zero conditional mean for variance interpretation.

Limitations — Biased mean inflates apparent volatility.

Source — J.P. Morgan and Reuters, RiskMetrics Technical Document, 4th ed., 1996

## Pettitt rank change-point test (pettitt)

> U_t=Σ_(i≤t)Σ_(j>t)sign(x_i−x_j), T=max_(1≤t<n)abs(U_t); calibrate by permutations under exchangeability

x observations, i,j sequence indices, t split, n window size, T statistic.

Track changes in prior football chance-creation rates, horse sectionals, tennis serve rates, rugby try rates, NFL drive efficiency or darts checkout rates

Assumptions — Exchangeability under null within past window.

Limitations — Serial dependence invalidates naive permutations.

Source — doi:10.2307/2346729

## Pruned exact linear time segmentation (pelt)

> Set F(0)=−β. With a positive minimum segment length m, compute F(t)=min[F(s)+C(s+1:t)+β] over reachable s≤t−m and backtrack the minimizing splits. If F(s)+C(s+1:t)+K>F(t), remove s for future endpoints u≥t+m.

C additive segment cost, m minimum integer segment length, β penalty, s,t,u endpoints, K satisfying C(a:b)+C(b+1:c)+K≤C(a:c) for admissible splits.

Track changes in prior football chance-creation rates, horse sectionals, tennis serve rates, rugby try rates, NFL drive efficiency or darts checkout rates

Assumptions — Use a proven cost inequality. Use the stated additive-cost split inequality. Keep a pruned candidate eligible until the first endpoint u≥t+m at which the replacement split at t can be used.

Limitations — Wrong K discards optimal splits.

Source — doi:10.1080/01621459.2012.737745

## Hidden Markov forward filter (hmm-forward)

> α_t(j)=b_j(y_t)Σ_i α_(t−1)(i)A_ij, α_1(j)=π_j b_j(y_1), normalize each step

A transition matrix, b emission densities, π initial state mass, α forward weights, y observations.

Track changes in prior football chance-creation rates, horse sectionals, tennis serve rates, rugby try rates, NFL drive efficiency or darts checkout rates

Assumptions — Finite first-order hidden chain with conditionally independent emissions.

Limitations — State labels and meanings can be unstable.

Source — doi:10.1109/5.18626

## Viterbi path decoding (viterbi)

> V_t(j)=ln b_j(y_t)+max_i[V_(t−1)(i)+ln A_ij], initialize V_1(j)=ln π_j+ln b_j(y_1); backtrack the argmax states

A,b,π transition, emission and initial probabilities, V log path weight, y observations.

Track changes in prior football chance-creation rates, horse sectionals, tennis serve rates, rugby try rates, NFL drive efficiency or darts checkout rates

Assumptions — Only decode history available at each cutoff.

Limitations — Full-season decoding leaks later observations into historical predictions.

Source — doi:10.1109/TIT.1967.1054010

## Bootstrap particle filter (particle-bootstrap)

> Resample prior particles using prior weights, propagate through f(x_t∣x_(t−1)), and set w_i=g(y_t∣x_t^(i))/Σ_j g(y_t∣x_t^(j)).

x state, y observation, f transition, g likelihood, N particle count.

Track changes in prior football chance-creation rates, horse sectionals, tennis serve rates, rugby try rates, NFL drive efficiency or darts checkout rates

Assumptions — Simulable transition and positive overall particle likelihood.

Limitations — Sample impoverishment in high dimension.

Source — doi:10.1049/ip-f-2.1993.0015

## Autoregression (simple-ar)

> x_t=c+Σ_(j=1)^p φ_j x_(t−j)+ε_t; fit by least squares on lagged rows

x metric, c intercept, p lag order, φ lag coefficients, ε white noise.

Track changes in prior football chance-creation rates, horse sectionals, tennis serve rates, rugby try rates, NFL drive efficiency or darts checkout rates

Assumptions — Roots outside unit circle for stable mean.

Limitations — Regime shifts invalidate lag effects.

Source — Box et al., Time Series Analysis: Forecasting and Control, 5th ed., 2015

## Moving-average stochastic model (moving-average-model)

> x_t=μ+ε_t+Σ_(j=1)^q θ_j ε_(t−j); fit Gaussian innovation likelihood

x metric, μ mean, ε white noise, q order, θ coefficients.

Track changes in prior football chance-creation rates, horse sectionals, tennis serve rates, rugby try rates, NFL drive efficiency or darts checkout rates

Assumptions — Invertible parameterization for unique innovations.

Limitations — Using observed lags changes the model.

Source — Box et al., Time Series Analysis: Forecasting and Control, 5th ed., 2015

## ARIMA model (arima)

> φ(B)(1−B)^d x_t=c+θ(B)ε_t

B backward shift, d integer difference order, φ and θ lag polynomials, x metric, ε innovations, c constant.

Track changes in prior football chance-creation rates, horse sectionals, tennis serve rates, rugby try rates, NFL drive efficiency or darts checkout rates

Assumptions — Stationary invertible differenced series specification.

Limitations — Over-differencing inflates noise.

Source — Box et al., Time Series Analysis: Forecasting and Control, 5th ed., 2015

## ARCH variance model (arch)

> ε_t=√h_t z_t, h_t=ω+Σ_(j=1)^q α_j ε_(t−j)²

ε residual, z iid mean zero unit variance innovations, h variance, ω>0, α_j≥0, q order.

Track changes in prior football chance-creation rates, horse sectionals, tennis serve rates, rugby try rates, NFL drive efficiency or darts checkout rates

Assumptions — Correct mean model and Σα_j<1 for stationary second moment.

Limitations — Large q overfits sparse histories.

Source — doi:10.2307/1912773

## GARCH(1,1) variance recursion (garch)

> h_t=ω+αε_(t−1)²+βh_(t−1), ε_t=√h_t z_t

h variance, ε residual, z standardized innovation, ω>0, α,β≥0.

Track changes in prior football chance-creation rates, horse sectionals, tennis serve rates, rugby try rates, NFL drive efficiency or darts checkout rates

Assumptions — α+β<1 for finite stationary variance.

Limitations — One outlier has persistent effect.

Source — doi:10.1016/0304-4076(86)90063-1

## Holt linear trend smoothing (holt-trend)

> ℓ_t=αx_t+(1−α)(ℓ_(t−1)+b_(t−1)), b_t=β(ℓ_t−ℓ_(t−1))+(1−β)b_(t−1), forecast ℓ_t+hb_t

ℓ level, b trend, α,β∈[0,1], h forecast steps, x metric.

Track changes in prior football chance-creation rates, horse sectionals, tennis serve rates, rugby try rates, NFL drive efficiency or darts checkout rates

Assumptions — Comparable time steps, initial states fitted on history.

Limitations — Linear extrapolation can leave feasible bounds.

Source — Hyndman and Athanasopoulos, Forecasting: Principles and Practice, 3rd ed., §8.2

## Haar wavelet details (haar-wavelet)

> a'_j=(a_(2j)+a_(2j+1))/√2, d_j=(a_(2j)−a_(2j+1))/√2; recurse on a'

a sequence or coarser averages, j pair index, d details.

Track changes in prior football chance-creation rates, horse sectionals, tennis serve rates, rugby try rates, NFL drive efficiency or darts checkout rates

Assumptions — Power-of-two trailing window with comparable steps.

Limitations — One-step shifts move details across scales.

Source — Mallat, A Wavelet Tour of Signal Processing, 3rd ed., 2008

## Shannon entropy (entropy)

> H(p)=−Σ_j p_j ln p_j with 0 ln 0=0

p categorical forecast, j possible outcome.

Combine, calibrate or compare forecasts for the same sporting event target

Assumptions — Common exhaustive support and natural log scale.

Limitations — Diffuse probabilities need not be calibrated.

Source — doi:10.1002/j.1538-7305.1948.tb01338.x

## Kullback–Leibler divergence (kl)

> D(p∥q)=Σ_(j:p_j>0) p_j ln(p_j/q_j), infinity when a corresponding q_j=0

p and q aligned distributions, j outcome.

Combine, calibrate or compare forecasts for the same sporting event target

Assumptions — Same outcome semantics.

Limitations — Divergence is asymmetric and can be infinite.

Source — doi:10.1214/aoms/1177729694

## Jensen–Shannon divergence (jensen-shannon)

> J(p,q)=[D(p∥m)+D(q∥m)]/2, m=(p+q)/2

p,q aligned distributions, D KL divergence, m mixture.

Combine, calibrate or compare forecasts for the same sporting event target

Assumptions — Equal mixture weighting.

Limitations — Aggregate disagreement does not identify superior component.

Mechanism — KL to the mixture, distinct from the symmetric KL sum used by PSI.

Source — doi:10.1109/18.61115

## Multiclass Brier score (brier)

> BS=N^(-1)Σ_iΣ_j(p_ij−1[y_i=j])². For two classes this unscaled sum equals twice the scalar binary Brier score

p_ij archived probability, y_i adjudicated result, N forecasts, j class.

Assess calibration or forecast quality in a permitted historical assessment sample

Assumptions — Aligned exclusive classes and event set.

Limitations — Incomparable target definitions or averaging conventions.

Source — doi:10.1175/1520-0493(1950)078%3C0001:VOFEIT%3E2.0.CO;2

## Categorical logarithmic score (log-loss)

> LL=−N^(-1)Σ_i ln p_(i,y_i)

N archived forecasts, y_i adjudicated label, p_(i,y_i) its probability.

Assess calibration or forecast quality in a permitted historical assessment sample

Assumptions — Same event set for comparisons and documented treatment of zeros.

Limitations — Zero mass for observed outcome implies infinite loss.

Source — doi:10.1198/016214506000001437

## Ranked probability score (rps)

> RPS=N^(-1)Σ_iΣ_(k=1)^(K−1)(Σ_(j≤k)p_ij−1[y_i≤k])²

N forecasts, p probabilities, y labels, k,j ordered class indices.

Assess calibration or forecast quality in a permitted historical assessment sample

Assumptions — Genuinely ordered categories.

Limitations — Arbitrary order changes scoring meaning.

Source — doi:10.1175/1520-0450(1969)008%3C0985:ASSFPF%3E2.0.CO;2

## Probability integral transform (pit)

> u_i=F_i(y_i)

F_i archived continuous predictive CDF, y_i final measurement, u_i probability-transformed observation.

Assess calibration or forecast quality in a permitted historical assessment sample

Assumptions — Correct conditional continuous CDF implies uniform marginal PIT. The ordinary PIT is for a continuous conditional CDF. Use randomized PIT for predictive laws with atoms.

Limitations — Uniform PIT alone does not establish sharpness or independence.

Source — Diebold, Gunther and Tay, Evaluating Density Forecasts with Applications to Financial Risk Management, International Economic Review, 1998

## Randomized PIT for discrete observations (randomized-pit)

> u_i=F_i(y_i⁻)+v_i[F_i(y_i)−F_i(y_i⁻)]. If F_i is continuous at y_i then the jump is zero and u_i=F_i(y_i)

F_i archived discrete CDF, y_i outcome, v_i independent Uniform(0,1), y_i⁻ left limit argument.

Assess calibration or forecast quality in a permitted historical assessment sample

Assumptions — Randomize independently with recorded seed.

Limitations — Unrecorded seed prevents exact reproduction.

Source — Dunn and Smyth, Randomized Quantile Residuals, Journal of Computational and Graphical Statistics, 1996

## Logarithmic probability pool (log-pool)

> p_j=exp(Σ_m w_m ln p_mj)/Σ_k exp(Σ_m w_m ln p_mk)

p_mj component probability for outcome j, w_m positive weights summing to 1.

Combine, calibrate or compare forecasts for the same sporting event target

Assumptions — Common support and at least one outcome strictly positive for every included member.

Limitations — Disjoint supports leave no normalizing mass.

Source — Genest and Zidek, Combining Probability Distributions, Statistical Science, 1986

## Reliability shrinkage toward baseline (probability-shrinkage)

> p=p_0+r(p_1−p_0), r=exp(−γD_JS(p_0,p_1)), γ>0 fixed using earlier data

p_0 baseline and p_1 candidate forecasts, D_JS defined in jensen-shannon, r agreement gate, γ sensitivity.

Combine, calibrate or compare forecasts for the same sporting event target

Assumptions — Gate fitted on earlier forecasts and then frozen.

Limitations — Shared bias can produce high agreement and excessive candidate weight.

Mechanism — Shared two-component linear pool with disagreement-dependent weights.

Source — original: use bounded Jensen–Shannon disagreement in the FB-06 convex shrinkage equation; exp(−γD_JS) preserves simplex closure

## Predictive-density stacking (stacking)

> w*=argmax_(w≥0,Σw=1) Σ_i ln(Σ_j w_j p_j^(-i)(y_i)), use earlier-origin predictions for p_j^(-i)

w blend weights, j component, i calibration record, y_i observed result held out from component fit.

Combine, calibrate or compare forecasts for the same sporting event target

Assumptions — Chronological adaptation of predictive stacking with matched target probabilities.

Limitations — Adjacent fold dependence and collinear components destabilize weights.

Mechanism — Shared linear pool; out-of-sample log score supplies weights.

Source — doi:10.1214/17-BA1091

## Bayesian model averaging (bma)

> p(y∣D)=Σ_j p(y∣D,M_j)w_j, w_j=p(D∣M_j)p(M_j)/Σ_k p(D∣M_k)p(M_k)

D history, M_j candidate model, w_j posterior model mass, y future event.

Combine, calibrate or compare forecasts for the same sporting event target

Assumptions — Comparable evidence on same observed data.

Limitations — Diffuse priors distort marginal likelihood.

Mechanism — Shared linear pool; posterior model probabilities supply weights.

Source — doi:10.1214/ss/1009212519

## Temperature scaling (temperature)

> p_j(T)=softmax(z/T)_j, fit T>0 by minimizing earlier calibration log loss

z class logits, T global temperature, p output probabilities.

Combine, calibrate or compare forecasts for the same sporting event target

Assumptions — Valid logits and common held-out target mapping.

Limitations — Argmax unchanged and class bias remains.

Mechanism — Restriction of vector scaling with common positive multiplier and zero bias.

Source — Guo et al., On Calibration of Modern Neural Networks, ICML 2017

## Platt sigmoid calibration (platt)

> p(s)=1/(1+exp(−a s−b)), fit binary cross entropy on earlier calibration scores with Platt-smoothed positive and negative targets (N_++1)/(N_++2) and 1/(N_-+2)

s scalar classifier margin, a slope, b intercept, N_± calibration class counts.

Combine, calibrate or compare forecasts for the same sporting event target

Assumptions — Within-domain calibration scores.

Limitations — Single sigmoid cannot correct nonmonotone reliability.

Source — Platt, Probabilistic Outputs for Support Vector Machines and Comparisons to Regularized Likelihood Methods, 1999

## Beta calibration (beta-calibration)

> q(p)=sigmoid(a ln p−b ln(1−p)+c), fit binary log loss with a,b≥0 for monotonicity

p input probability strictly between 0 and 1, a,b shape coefficients, c intercept.

Combine, calibrate or compare forecasts for the same sporting event target

Assumptions — Same target and independent earlier calibration data.

Limitations — Endpoint probabilities require a documented clipping policy.

Source — Kull, Silva Filho and Flach, Beta Calibration, AISTATS 2017

## Kaplan–Meier survival curve (kaplan-meier)

> Ŝ(t)=∏_(τ_j≤t)(1−d_j/n_j)

τ_j distinct event time, d_j failures, n_j risk set before time, t horizon.

Estimate time to a future withdrawal or return in records with defensible risk sets

Assumptions — Independent right censoring and event observed before censoring at exact ties.

Limitations — Informative retirement or missing follow-up biases curve.

Source — doi:10.1080/01621459.1958.10501452

## Nelson–Aalen cumulative hazard (nelson-aalen)

> Ĥ(t)=Σ_(τ_j≤t)d_j/n_j

τ_j event times, d_j failures, n_j at risk immediately before time.

Estimate time to a future withdrawal or return in records with defensible risk sets

Assumptions — Independent right censoring.

Limitations — Small tail risk sets give large uncertain increments.

Source — doi:10.1214/aos/1176344247

## Cox proportional hazards regression (cox-ph)

> h(t∣x)=h_0(t)exp(βᵀx), partial likelihood ∏_i exp(βᵀx_i)/Σ_(j∈R_i)exp(βᵀx_j) over untied failures i

t follow-up, h_0 baseline hazard, x covariates, β effects, R_i risk set.

Estimate time to a future withdrawal or return in records with defensible risk sets

Assumptions — Proportional effects, independent right censoring, no tied failures for stated likelihood.

Limitations — Schedule or recovery effects can vary with follow-up time.

Source — doi:10.1111/j.2517-6161.1972.tb00899.x

## Weibull accelerated failure-time model (weibull-aft)

> S(t∣x)=exp(−[t/exp(βᵀx)]^k), maximize product of f(t∣x) for failures and S(t∣x) for right censored rows with f=−∂S/∂t

S survival, t positive follow-up, β regression coefficients including intercept, k>0 shape.

Estimate time to a future withdrawal or return in records with defensible risk sets

Assumptions — Independent censoring and monotone Weibull hazard.

Limitations — Mixtures of recurrence mechanisms can produce nonmonotone hazard.

Source — Kalbfleisch and Prentice, The Statistical Analysis of Failure Time Data, 2nd ed., 2002

## IID nonparametric bootstrap (bootstrap-iid)

> For b=1..B, sample n historical units with replacement and compute statistic θ_b=θ(X_b); use empirical quantiles of θ_b for percentile intervals

n units, B replicates, θ fitted statistic, X_b replicate sample.

Estimate uncertainty of a statistic such as average football scoring error

Assumptions — Exchangeable independent units and sufficiently regular statistic.

Limitations — Resampling correlated matches understates uncertainty.

Source — doi:10.1214/aos/1176344552

## Moving-block bootstrap (moving-block-bootstrap)

> For b=1,…,B sample uniformly with replacement among n−ℓ+1 contiguous length-ℓ blocks, concatenate to length at least n, truncate to n, and recompute target statistic.

n ordered units, ℓ block size, B replicate count.

Estimate uncertainty of a statistic such as average football scoring error

Assumptions — Approximate stationarity with short-range dependence.

Limitations — A fixed block size can miss season-length dependence.

Source — Künsch, The Jackknife and the Bootstrap for General Stationary Observations, Annals of Statistics, 1989

## Delete-one jackknife variance (jackknife)

> V=(n−1)/n Σ_i(θ_(-i)−mean_j θ_(-j))²

n independent units, θ_(-i) statistic refit after omitting i, V variance estimate.

Estimate uncertainty of a statistic such as average football scoring error

Assumptions — Smooth statistic and interchangeable units.

Limitations — Median and extreme quantile behavior can be unstable.

Source — Efron and Tibshirani, An Introduction to the Bootstrap, 1993

## Monte Carlo control variates (control-variate)

> μ̂=mean_i[f(X_i)−b(g(X_i)−μ_g)], b=Cov(f,g)/Var(g) estimated on an independent pilot

X draws, f target, g control with known mean μ_g, b coefficient.

Summarize rule-consistent scoring or rank trajectories

Assumptions — Independent main draws and finite second moments.

Limitations — Poor correlation yields little variance gain.

Source — Robert and Casella, Monte Carlo Statistical Methods, 2nd ed., 2004

## Importance sampling (importance-sampling)

> μ̂=N^(-1)Σ_i f(X_i)p(X_i)/q(X_i), X_i iid from q

p target density, q proposal density, f integrand, N draws.

Summarize rule-consistent scoring or rank trajectories

Assumptions — q positive wherever f·p nonzero.

Limitations — Heavy weights destabilize finite samples.

Source — Robert and Casella, Monte Carlo Statistical Methods, 2nd ed., 2004

## Antithetic variates (antithetic)

> μ̂=N^(-1)Σ_i[f(U_i)+f(1−U_i)]/2, U_i iid uniform on unit cube

f simulator output as deterministic function of uniform vector, N pair count.

Summarize rule-consistent scoring or rank trajectories

Assumptions — Reflection preserves input distribution.

Limitations — Positive paired correlation can increase variance versus independent draws.

Source — Robert and Casella, Monte Carlo Statistical Methods, 2nd ed., 2004

## Ridge regression (ridge)

> β̂=argmin_b Σ_i(y_i−bᵀx_i)²+λΣ_(j≥1)b_j²

x predictors with first component intercept, y continuous target, b coefficients, λ>0 penalty.

Predict a continuous sport target like race time or score differential

Assumptions — Squared loss and comparable scales for penalized features.

Limitations — Dominant inappropriate scale hides relevant variables.

Source — doi:10.1080/00401706.1970.10488634

## Lasso linear regression (lasso)

> β̂=argmin_b (1/2)Σ_i(y_i−bᵀx_i)²+λΣ_(j≥1)abs(b_j)

x predictors including intercept, y real target, b coefficients, λ>0 penalty.

Predict a continuous sport target like race time or score differential

Assumptions — Sparse linear signal is plausible.

Limitations — Correlated inputs induce selection instability.

Source — doi:10.1111/j.2517-6161.1996.tb02080.x

## Elastic net regression (elastic-net)

> β̂=argmin_b (1/2)Σ_i(y_i−bᵀx_i)²+λΣ_(j≥1)[α abs(b_j)+(1−α)b_j²/2]

x predictors including intercept, y target, b coefficients, λ>0, α∈(0,1).

Predict a continuous sport target like race time or score differential

Assumptions — Sparse signal with correlated covariates.

Limitations — Two tuning dimensions increase selection bias.

Source — doi:10.1111/j.1467-9868.2005.00503.x

## Huber M regression (huber-regression)

> β̂=argmin_b Σ_i L_δ(y_i−bᵀx_i), L_δ(r)=r²/2 for abs(r)≤δ else δ(abs(r)−δ/2)

r residual, δ>0 transition in target units, b coefficients, x covariates, y target.

Predict a continuous sport target like race time or score differential

Assumptions — Robustness to outcome outliers matters.

Limitations — High-leverage covariates can still dominate.

Source — doi:10.1214/aoms/1177703732

## Linear quantile regression (quantile-regression)

> β̂_τ=argmin_b Σ_i(y_i−bᵀx_i)[τ−1[y_i<bᵀx_i]]

τ∈(0,1) quantile, x covariates, y continuous target, b coefficients.

Predict a continuous sport target like race time or score differential

Assumptions — Conditional quantile linear at chosen level.

Limitations — Separate quantiles may cross.

Mechanism — Pinball loss plus a linear regression fitting problem.

Source — doi:10.2307/1913643

## Nearest-neighbour regression (knn-regression)

> ŷ(x)=k^(-1)Σ_(i∈N_k(x)) y_i

x query, N_k k training neighbours by Euclidean distance on standardized features, y historical target.

Predict a continuous sport target like race time or score differential

Assumptions — Local similarity carries predictive signal.

Limitations — High dimensions and metric drift make neighbours uninformative.

Source — Hastie, Tibshirani and Friedman, The Elements of Statistical Learning, 2nd ed., §2.3

## Nadaraya–Watson kernel regression (nw-regression)

> m̂(x)=Σ_i K((x−x_i)/h)y_i/Σ_i K((x−x_i)/h)

K nonnegative kernel, h>0 bandwidth, x query, x_i training features, y_i historical response.

Predict a continuous sport target like race time or score differential

Assumptions — Positive denominator and plausible local smoothness.

Limitations — Sparse boundary regions yield bias or zero denominator.

Source — Nadaraya, On Estimating Regression, Theory of Probability and Its Applications, 1964

## CART regression split (cart-regression)

> At each node choose feature j and threshold s minimizing Σ_(i:x_ij≤s)(y_i−ȳ_L)²+Σ_(i:x_ij>s)(y_i−ȳ_R)²; recurse until preset size or depth limit and predict terminal mean.

j covariate index, s threshold, y response, ȳ_L/R child means.

Predict a continuous sport target like race time or score differential

Assumptions — Pre-fixed regularization and nonempty children.

Limitations — Sparse leaves and repeated splits overfit. This is the greedy least-squares growth stage with size/depth stopping. Classical CART also supports cost-complexity pruning.

Source — Breiman et al., Classification and Regression Trees, 1984

## Random forest regression (random-forest)

> Grow B bootstrap CART trees with m uniformly drawn eligible features per node, predict f̂(x)=B^(-1)Σ_b T_b(x)

B trees, T_b fitted tree, m feature subsample count, x query.

Predict a continuous sport target like race time or score differential

Assumptions — Historical features sampled with chronology intact at split level.

Limitations — Correlated trees and distribution shifts limit gains.

Source — doi:10.1023/A:1010933404324

## Gradient boosting (gradient-boost)

> Initialize F_0=argmin_c Σ_i L(y_i,c); for stages m fit base h_m to r_i=−∂_F L(y_i,F_(m−1)(x_i)), select step γ_m by loss line search, set F_m=F_(m−1)+νγ_m h_m

F additive predictor, L differentiable loss, r pseudo-residual, h base, ν shrinkage.

Predict a continuous sport target like race time or score differential

Assumptions — Tune number of stages with chronological data.

Limitations — Repeated stages amplify leakage and overfit.

Source — doi:10.1214/aos/1013203451

## Principal component projection (pca)

> Compute centered training matrix X=UΣVᵀ and return V_kᵀ(x−μ) for new x

X n×d training table, U,V singular vectors, Σ singular values, μ training mean, V_k top k right vectors.

Summarize correlated form metrics or group similar historical performances

Assumptions — High variance directions are relevant and units comparable.

Limitations — Scale differences or low-variance signal undermine projection.

Source — Jolliffe, Principal Component Analysis, 2nd ed., 2002

## Lloyd k-means clustering (kmeans)

> Assign z_i=argmin_j squared_euclidean(x_i,μ_j), replace μ_j by mean of assigned rows, stop when assignments stabilize or iteration cap; restart empty clusters deterministically from farthest rows.

x_i features, z_i labels, μ_j centers, j cluster index.

Summarize correlated form metrics or group similar historical performances

Assumptions — Distance meaningful and k fixed by earlier fit.

Limitations — Local minima and arbitrary role boundaries.

Source — doi:10.1109/TIT.1982.1056489

## PageRank stationary centrality (pagerank)

> r=(1−α)v+αPᵀr, iterate from v; replace empty outgoing rows of P with vᵀ

P row-normalized graph, v positive teleport distribution, 0<α<1, r centrality vector.

Calculate schedule-aware opponent centrality

Assumptions — Edge orientation explicitly represents credit flow.

Limitations — Dense schedule or directed edges of wrong sign invert interpretation.

Source — Page et al., The PageRank Citation Ranking: Bringing Order to the Web, Stanford InfoLab, 1999

## Elo with venue offset (elo-home)

> E_A=1/(1+10^((R_B−R_A−h I_A)/400)), then use Elo update

R_A,R_B ratings, h venue offset, I_A=1 at A home and 0 at neutral, E_A expected score.

Estimate relative strength from comparable opponent results

Assumptions — A indexed as home or neutral first side; h fitted on prior contests.

Limitations — Venue effect drifts across competition and era.

Source — original: add a pre-event home offset to Elo rating difference; h=0 recovers Elo

## Massey least-squares ratings (massey)

> Minimize Σ_i(m_i−r_(a_i)+r_(b_i))² with Σ_j r_j=0

m_i historical score differential first minus second side, a_i,b_i competitors, r_j strength.

Fit margin-based strengths as inputs to a separate forecast model

Assumptions — Connected schedule and comparable points.

Limitations — Outlier margins dominate squared loss.

Source — Langville and Meyer, Who’s #1? The Science of Rating and Ranking, 2012

## Colley matrix ratings (colley)

> Solve Cr=b, C_ii=2+n_i, C_ij=−n_ij for i≠j, b_i=1+(w_i−l_i)/2

n_i historical games, n_ij head-to-head count, w_i,l_i wins and losses, r_i rating.

Estimate relative strength from comparable opponent results

Assumptions — Decisive results with opponent identity.

Limitations — Buries margin and timing information.

Source — Colley, Colley’s Bias Free College Football Ranking Method, 2002

## Hungarian assignment objective and reduction (hungarian)

> Minimize Σ_ij C_ij X_ij with X_ij∈{0,1}, all row and column sums = 1. Subtract row and column minima, find maximum zero matching; if deficient, find minimum vertex cover of zeros, subtract smallest uncovered value from uncovered entries and add it at doubly covered entries, then repeat.

C finite square cost matrix, X assignment indicators, i slots, j options.

Compare hypothetical role assignments to study lineup sensitivity

Assumptions — Additive assignment costs, feasible one-to-one matches.

Limitations — Pairwise effects violate additive costs.

Source — doi:10.1002/nav.3800020109

## Unit-return expected value (ev)

> EV=pO−1 from p(O−1)+(1−p)(−1)

p hypothetical success probability, O decimal payout including unit stake.

Compare abstract decision-theoretic quantities under fixed hypothetical quotes

Assumptions — Binary outcome, fixed quote, no costs.

Limitations — Misestimated p dominates expected return.

Source — original derivation: expectation of two possible unit returns as shown

## Binary logarithmic growth optimum (kelly)

> f*=(bp−q)/b solves ∂_f[p ln(1+bf)+q ln(1−f)]=0 for interior f, b=O−1 and q=1−p

p hypothetical success chance, O>1 decimal payout, f abstract wealth fraction, q failure probability.

Compare abstract decision-theoretic quantities under fixed hypothetical quotes

Assumptions — Idealized repeated independent trials, constant p and payoff, no transactions.

Limitations — Finite horizon and probability error invalidate growth interpretation.

Source — doi:10.1002/j.1538-7305.1956.tb03809.x

## Hoeffding bounded-mean deviation bound (hoeffding)

> P(abs(Ȳ−EȲ)≥ε)≤2exp(−2nε²/(b−a)²)

Ȳ average of n random observations bounded by a,b, ε positive tolerance.

Model tennis service points, darts checkout attempts or comparable bounded event rates

Assumptions — Independent observations with common bounds.

Limitations — Session-level dependence invalidates bound.

Source — doi:10.1080/01621459.1963.10500830

## Wilson binomial interval (wilson)

> Center=(p̂+z²/(2n))/(1+z²/n), halfwidth=z√(p̂(1−p̂)/n+z²/(4n²))/(1+z²/n)

n trials, p̂ empirical proportion, z standard-normal upper quantile at 1−α/2, α nominal error.

Model tennis service points, darts checkout attempts or comparable bounded event rates

Assumptions — Independent Bernoulli trials with fixed probability.

Limitations — Changes in ability or dependence defeat coverage approximation.

Source — doi:10.1080/01621459.1927.10502953

## Darts checkout state recursion (darts-finish-dp)

> V(s,d,s_0)=Σ_a π(a)Σ_h P(h∣a)[1[legal checkout]+1[legal continuation]V(s−score(h),d−1,s_0)], V(s,0,s_0)=0; bust contributes zero probability of finishing this visit

s remainder, d darts left in current visit, s_0 start remainder, a target, h actual segment, π aim policy, P target error law.

Estimate probability of finishing a visit at a given remainder

Assumptions — Double-out rules and past target/impact data.

Limitations — Attempt response differs by pressure or segment.

Mechanism — Exact finite-horizon Bellman policy evaluation with checkout and bust absorbing outcomes.

Source — original: finite-horizon law of total probability with checkout and bust absorbing outcomes

## Advantage tennis service-game probability (tennis-game)

> G(p)=p⁴[1+4(1−p)+10(1−p)²]+20p³(1−p)³·p²/[p²+(1−p)²]

p fixed iid probability server wins a point, G probability server wins game.

Map a service-point propensity to service-game probability

Assumptions — Advantage rules with win by two after 3–3.

Limitations — No-ad or pressure-dependent point strength invalidates recursion. Scope excludes no-ad games, tiebreaks and point probabilities that vary within the game.

Mechanism — Geometric series appears only in the deuce subproblem. The full result is an absorption calculation; relationship to geometric is overly narrow.

Source — original derivation: enumerate wins before deuce, then condition on first non-split two-point deuce cycle

## Finite-horizon Markov reward recursion (bellman-policy)

> V_t(s)=Σ_a π_t(a∣s)Σ_u P_t(u∣s,a)[r_t(s,a,u)+V_(t+1)(u)], V_T=g

s,u states, a action, π fixed policy, P transition, r step reward, g terminal value, T horizon.

Summarize rule-consistent scoring or rank trajectories

Assumptions — State contains all relevant score/time information.

Limitations — Aliased states produce invalid transition estimates.

Source — Puterman, Markov Decision Processes, 1994

## Exact sampled Ornstein–Uhlenbeck transition (kalman-ou)

> X_(t+Δ)∣X_t=x~N(μ+exp(−κΔ)(x−μ), σ²(1−exp(−2κΔ))/(2κ)). This defines the transition only. A Kalman implementation also needs a linear observation equation, observation noise and the prediction/update recursions of kalman

κ>0 reversion rate, μ level, σ diffusion scale, Δ time gap, X latent continuous state.

Track changes in prior football chance-creation rates, horse sectionals, tennis serve rates, rugby try rates, NFL drive efficiency or darts checkout rates

Assumptions — Continuous Gaussian mean reversion with constant coefficients.

Limitations — Permanent shifts misread as transitory.

Mechanism — OU dynamics can be supplied to Kalman; a transition law alone is a separate component.

Source — Uhlenbeck and Ornstein, On the Theory of the Brownian Motion, Physical Review, 1930

## Exponential Hawkes intensity (hawkes)

> λ(t)=μ+Σ_(t_i<t) α exp(−β(t−t_i)), fit log likelihood Σ_i ln λ(t_i)−∫λ(t)dt

t_i earlier event times, t current time, μ>0 baseline, α≥0 excitation, β>0 decay.

Summarize earlier matches’ within-game event timing for later fixtures, treating in-game transition forecasting as a separately specified cutoff.

Assumptions — Stationarity requires α/β<1 for the univariate process.

Limitations — Score effects or interruptions mistaken for self-excitation.

Source — doi:10.1093/biomet/58.1.83

## Proximal gradient for L1 regularization (prox-l1)

> b_new=S_(ηλ)(b−η∇f(b)), S_c(z)=sign(z)max(abs(z)−c,0) componentwise; leave intercept unthresholded. With η=1/L and the same penalty mask this is the ISTA update. On excluded coordinates use the ordinary gradient step

b coefficients, f smooth convex training objective, λ penalty, η≤1/L step for L-Lipschitz gradient.

Predict a continuous sport target like race time or score differential

Assumptions — Convex objective and proper step size.

Limitations — Bad scaling slows convergence.

Mechanism — Same soft-thresholded gradient update as ista; exempting the intercept changes the penalty mask.

Source — Parikh and Boyd, Proximal Algorithms, Foundations and Trends in Optimization, 2014; Beck and Teboulle, §3. https://www.ceremade.dauphine.fr/~carlier/FISTA

## Euclidean probability-simplex projection (project-simplex)

> Sort scores u_(1)≥…≥u_(K); ρ=max{j:u_(j)>(Σ_(i≤j)u_(i)−1)/j}, θ=(Σ_(i≤ρ)u_(i)−1)/ρ, p_i=max(u_i−θ,0)

u real input vector, p nonnegative probabilities summing to 1, K outcomes.

Combine, calibrate or compare forecasts for the same sporting event target

Assumptions — Coordinates aligned and Euclidean error appropriate.

Limitations — Produces exact zero mass for some possible outcomes.

Source — Wang and Carreira-Perpiñán, Projection onto the Probability Simplex, arXiv:1309.1541

## Finite-scenario minimax decision (minimax-robust)

> a*=argmin_(a∈A) max_(s∈S) L(a,s)

A feasible research decisions such as choosing simulator settings, S uncertainty scenarios, L stated loss.

Summarize rule-consistent scoring or rank trajectories

Assumptions — Finite covered scenarios and comparable loss units.

Limitations — Overly broad scenarios favor excessively conservative choices.

Source — Wald, Statistical Decision Functions, 1950

## Inverse probability weighted average treatment effect (ipw)

> τ̂=N^(-1)Σ_i[A_iY_i/e(X_i)−(1−A_i)Y_i/(1−e(X_i))]

A binary exposure, Y outcome, X earlier confounders, e propensity, N units, τ average causal effect.

Estimate a historical average treatment effect for a specified sport exposure and eligible population

Assumptions — Conditional exchangeability, positivity and consistency.

Limitations — Unmeasured ability or extreme propensities distort estimate.

Source — Hernán and Robins, Causal Inference: What If, 2020

## Augmented inverse probability weighting (aipw)

> τ̂=mean[m_1(X)−m_0(X)+A(Y−m_1(X))/e(X)−(1−A)(Y−m_0(X))/(1−e(X))]

A exposure, Y outcome, X confounders, e propensity, m_a conditional outcome regression for A=a.

Estimate a historical average treatment effect for a specified sport exposure and eligible population

Assumptions — Exchangeability, consistency and positivity; either nuisance model correct for double robustness.

Limitations — Poor overlap or both nuisance models biased.

Source — Bang and Robins, Doubly Robust Estimation in Missing Data and Causal Inference Models, Biometrics, 2005

## Yeo–Johnson transform (yeo-johnson)

> For x≥0 apply Box–Cox to 1+x with power λ; for x<0 return negative Box–Cox of 1−x with power 2−λ.

x real metric, λ training-fitted power.

Track changes in prior football chance-creation rates, horse sectionals, tennis serve rates, rugby try rates, NFL drive efficiency or darts checkout rates

Assumptions — Stable transform across regimes.

Limitations — Tails can be amplified.

Source — doi:10.1093/biomet/87.4.954

## Dirichlet-multinomial distribution (dirichlet-multinomial)

> P(X=x)=n!Γ(A)/Γ(A+n)∏_j Γ(a_j+x_j)/(x_j!Γ(a_j)), A=Σ_j a_j

x_j category count, n total count, a_j>0 concentration, Γ gamma function.

Model overdispersion of prior outcome-type frequencies

Assumptions — Conditional exchangeability of category labels.

Limitations — Restricted covariance structure.

Mechanism — Predictive count law from dirichlet-update with multinomial sampling; two categories give beta-binomial.

Source — doi:10.1093/biomet/49.1-2.65

## Centered log ratio (clr)

> z_j=ln x_j−K^(-1)Σ_i ln x_i

x positive K-part composition, z log-ratio coordinates.

Compare composition of scoring patterns or drift of historical feature bins

Assumptions — Common denominator and strictly positive parts.

Limitations — Zeros and singular output covariance. CLR coordinates sum to zero, so a full-coordinate unregularized sample covariance cannot be inverted.

Source — Aitchison, The Statistical Analysis of Compositional Data, 1986

## Damped Holt trend (damped-holt)

> ℓ_t=αx_t+(1−α)(ℓ_(t−1)+φb_(t−1)), b_t=β(ℓ_t−ℓ_(t−1))+(1−β)φb_(t−1); forecast ℓ_t+Σ_(j=1)^h φ^j b_t

x metric, ℓ level, b trend, h steps, α,β smoothing weights, 0<φ<1 damping.

Track changes in prior football chance-creation rates, horse sectionals, tennis serve rates, rugby try rates, NFL drive efficiency or darts checkout rates

Assumptions — Gradual nonpermanent trending changes.

Limitations — Sudden reversals produce lag.

Source — Hyndman and Athanasopoulos, Forecasting: Principles and Practice, 3rd ed., §8.2

## Alpha–beta kinematic tracking (alpha-beta)

> Predict x⁻=x+Δv, residual e=y−x⁻, update x←x⁻+αe, v←v+βe/Δ

x position, v velocity, y measured position, Δ fixed positive step, α,β gains.

Derive historical pace or speed features from past tracking

Assumptions — Constant velocity approximation over short intervals. A steady-state Kalman interpretation requires gains derived for the corresponding dynamics, sampling interval and noise model.

Limitations — Accelerations or variable sampling impair tracking.

Source — Bar-Shalom, Li and Kirubarajan, Estimation with Applications to Tracking and Navigation, 2001

## Gillespie direct stochastic simulation (gillespie-direct)

> At state x draw wait τ~Exp(A), A=Σ_j a_j(x); draw transition j with P(j)=a_j(x)/A and set x←x+ν_j. If A=0 stop.

a_j event propensity, ν_j state increment, τ simulated waiting time, A total rate.

Summarize rule-consistent scoring or rank trajectories

Assumptions — Time-homogeneous Markov jump process between events.

Limitations — Changing clock-dependent rates violate exponential waiting.

Source — doi:10.1021/j100540a008

## Frozen reconstructed football recent-form Poisson configuration (poisson-form-025)

> Use PR #112 V1 shrunk venue rates λ_H,λ_A, then λ'_H=λ_H exp(0.025δ), λ'_A=λ_A exp(−0.025δ); form normalized independent Poisson grid on 0..11 per side.

δ difference in means of goal differential across each team’s five latest eligible prior matches as defined by pinned replay; λ_H,λ_A V1 venue-adjusted base rates.

Estimate a football scoreline or goal differential

Assumptions — Identical eligibility and chronology to pinned replay; venue rates use five prior pseudo-matches, rate floor in ratios 0.01 and clamp [0.15,4] before form.

Limitations — Truncated mass and frozen coefficients may behave poorly at extreme rates. Treat the finite-grid specification as a pinned parameter configuration. No replay is part of the evidence for this correction.

Source — PR #112 at 1fbd53d94ca152f1d4246e784a3c86bb33146648, research/football-baseline-v1/replay.mjs and README.md

## Population stability divergence (population-stability-index)

> PSI=Σ_j (q_j−p_j) ln(q_j/p_j). This is D(q∥p)+D(p∥q), the Jeffreys divergence on the declared bins

p,q positive bin frequencies for reference and subsequent past window; j fixed bin.

Compare composition of scoring patterns or drift of historical feature bins

Assumptions — Common binning and positive bins.

Limitations — Sparse bins exaggerate drift; magnitude depends on binning.

Mechanism — Algebraically symmetric KL sum (Jeffreys divergence); retain the binned monitoring application without treating it as an independent divergence.

Source — original derivation: D(q∥p)+D(p∥q) expands to the stated symmetric expression

## Likelihood ratio rejection rule (neyman-pearson)

> Reject H_0 when p_1(x)/p_0(x)>k; if ratio=k, reject with probability γ to achieve type I level α.

x observed summary, p_0,p_1 simple-hypothesis densities, k threshold, γ boundary probability, α false-alarm budget.

Estimate or update a binary event such as a tennis service hold or a football clean sheet

Assumptions — Fully specified simple hypotheses and correctly calibrated null distribution.

Limitations — Nuisance parameters or adaptive threshold selection change type I rate.

Source — doi:10.1098/rsta.1933.0009

## Absorbing reliability survival model (death-process)

> S(t)=exp(−∫_0^t h(u)du), P(T≤t)=1−S(t); for h(u)=λ constant use S(t)=exp(−λt)

T time to terminal event, u elapsed time, h nonnegative hazard, λ constant hazard case.

Model time to one designated terminal event within a defined sport risk period

Assumptions — Nonrecurrent terminal event within defined risk period.

Limitations — This is a single-event survival model. A general pure-death chain requires state-dependent transitions and rates.

Source — Kalbfleisch and Prentice, The Statistical Analysis of Failure Time Data, 2nd ed., 2002

## Competing-risks cumulative incidence (cumulative-incidence)

> F_k(t)=∫_0^t S(u)h_k(u)du, S(u)=exp(−Σ_j∫_0^u h_j(v)dv)

F_k probability first failure by t has cause k, h_j cause-specific hazard, S event-free survival.

Estimate time to a future withdrawal or return in records with defensible risk sets

Assumptions — Mutually exclusive first causes and right censoring compatible with fit.

Limitations — Treating competing exits as independent censoring overstates incidence.

Mechanism — Continuous cause-specific hazard functional. Aalen–Johansen estimates its competing-risk analogue from observed transitions.

Source — Aalen et al., Survival and Event History Analysis, 2008

## Simultaneous perturbation stochastic approximation (spsa)

> Draw independent signs Δ_i=±1, estimate g_i=[L(θ+cΔ)−L(θ−cΔ)]/(2cΔ_i), update θ←θ−ag.

θ continuous simulation parameter vector, L noisy objective, c>0 perturbation, a>0 step, g stochastic gradient, Δ sign vector.

Summarize rule-consistent scoring or rank trajectories

Assumptions — Finite evaluations around θ and decreasing steps for convergence.

Limitations — High objective noise or discontinuities obscure gradients.

Source — doi:10.1109/9.119632

## Poisson log-link regression (poisson-regression)

> λ_i=exp(x_iᵀβ+ln e_i); maximize Σ_i[y_i ln λ_i−λ_i]

x features, β coefficients, e positive exposure, y count.

Model goal or try counts at a fixed exposure

Assumptions — Conditional count mean is log-linear and conditional dispersion is Poisson.

Limitations — Unrecorded exposure shifts bias rate estimates.

Mechanism — Intercept-only common exposure yields a common Poisson law. Attack/defence imposes a schedule-linked design and identifiability constraints.

Source — Cameron and Trivedi, Regression Analysis of Count Data, 2nd ed.

## Attack–defence log-linear goals (poisson-attack-defence)

> ln λ_H=μ+h+a_H−d_A; ln λ_A=μ+a_A−d_H; sum team attacks and defences separately to zero

μ league intercept, h venue increment, a attack, d defence, λ intensities.

Estimate a football scoreline or goal differential

Assumptions — Independent scores given features and connected schedule.

Limitations — Newly promoted teams cannot be estimated without prior matches or shrinkage.

Source — Maher, Modelling Association Football Scores, Statistica Neerlandica, 1982

## Gamma–Poisson conjugate rate update (gamma-poisson-update)

> λ∼Gamma(a,b) rate form, y_i∼Pois(e_iλ); λ∣y∼Gamma(a+Σy_i,b+Σe_i)

a prior shape, b prior rate, e exposures, y prior counts.

Model goal or try counts at a fixed exposure

Assumptions — Common latent rate and conditional independence.

Limitations — Regime shifts make accumulated posterior too confident.

Source — Gelman et al., Bayesian Data Analysis, 3rd ed., ch. 2

## Beta–Bernoulli conjugate update (beta-bernoulli-update)

> p∼Beta(a,b), posterior Beta(a+s,b+n−s), next success chance=(a+s)/(a+b+n)

s prior successes in n trials, a,b prior shapes.

Model tennis service points, darts checkout attempts or comparable bounded event rates

Assumptions — Conditionally independent Bernoulli trials with stable latent propensity.

Limitations — Opponent composition shifts lead to biased pooling.

Source — Gelman et al., Bayesian Data Analysis, 3rd ed., ch. 2

## Dirichlet categorical conjugacy (dirichlet-update)

> p∼Dir(a), p∣x∼Dir(a+x), P(next=j∣x)=(a_j+x_j)/Σ_k(a_k+x_k)

a positive prior concentration vector, x earlier category counts.

Model overdispersion of prior outcome-type frequencies

Assumptions — Exclusive categories and stable group composition.

Limitations — Category definitions change between seasons.

Source — Gelman et al., Bayesian Data Analysis, 3rd ed., ch. 3

## Normal conjugate mean update (normal-normal-update)

> V=(1/v₀+n/σ²)^(-1), m=V(m₀/v₀+Σx_i/σ²); posterior N(m,V)

m₀ prior mean, v₀ prior variance, σ² known observation variance, n prior observations.

Predict a continuous sport target like race time or score differential

Assumptions — Independent Gaussian measurements with known common variance.

Limitations — Covariate-driven heteroskedasticity distorts shrinkage.

Source — Gelman et al., Bayesian Data Analysis, 3rd ed., ch. 2

## Binomial count distribution (binomial-fixed-count)

> P(X=k)=C(n,k)p^k(1−p)^(n−k)

n fixed attempts, k successes, p constant success probability.

Model tennis service points, darts checkout attempts or comparable bounded event rates

Assumptions — Identically distributed independent attempts.

Limitations — Within-session dependence invalidates binomial variance.

Source — Grimmett and Stirzaker, Probability and Random Processes, 3rd ed.

## Poisson-binomial count recursion (poisson-binomial)

> A_i(k)=(1−p_i)A_(i−1)(k)+p_i A_(i−1)(k−1), A_0(k)=1[k=0]

p_i known attempt-specific Bernoulli probabilities, A_i mass after i trials, k successes.

Model tennis service points, darts checkout attempts or comparable bounded event rates

Assumptions — Independent trials with possibly different probabilities.

Limitations — Dependence between attempts gives wrong tail mass.

Source — Grimmett and Stirzaker, Probability and Random Processes, 3rd ed.; recursion follows by conditioning on last attempt

## Hypergeometric distribution (hypergeometric)

> P(X=k)=C(K,k)C(N−K,n−k)/C(N,n)

N finite population, K successes in it, n draws, k observed successes.

Model tennis service points, darts checkout attempts or comparable bounded event rates

Assumptions — Uniform sampling of subsets without replacement.

Limitations — Selected lineups or nonuniform sampling invalidate null.

Source — Johnson, Kemp and Kotz, Univariate Discrete Distributions, 3rd ed.

## Multinomial distribution (multinomial-fixed)

> P(X=x)=n!∏_j p_j^(x_j)/x_j!

n independent trials, x counts summing to n, p fixed category probabilities.

Model overdispersion of prior outcome-type frequencies

Assumptions — Mutually exclusive exhaustive outcomes and common category probabilities.

Limitations — Game clustering creates excess dispersion.

Source — Johnson, Kotz and Balakrishnan, Discrete Multivariate Distributions, 1997

## Finite Markov transition estimation (categorical-markov)

> P̂_ij=N_ij/Σ_k N_ik; h-step conditional law from row i of P̂^h

N prior transition counts, i,j states, h steps.

Model overdispersion of prior outcome-type frequencies

Assumptions — First-order time-homogeneous chain with observed states and nonempty rows.

Limitations — Sparse states produce spurious absorbing transitions.

Source — Norris, Markov Chains, Cambridge University Press, 1997

## Absorbing-chain expected duration (fundamental-matrix)

> t=(I−Q)^(-1)1 with Q transient-to-transient probabilities

Q substochastic transient block, t expected steps to absorption, 1 vector of ones.

Summarize rule-consistent scoring or rank trajectories

Assumptions — Absorption almost surely from stated transient states.

Limitations — Near-unit spectral radius makes duration very uncertain.

Source — Grinstead and Snell, Introduction to Probability, 2nd revised ed., absorption section

## Renewal strong law (stationary-renewal)

> N(t)/t→1/E[X] almost surely as t→∞ for iid positive inter-arrivals X with E[X]<∞

N(t) events by elapsed time t, X inter-arrival time, E[X] mean inter-arrival time.

Estimate long-run event frequency from comparable prior inter-event gaps

Assumptions — Independent gaps with a common distribution and finite positive mean. Align sport clocks and specify resets across competition intervals.

Limitations — The limit is the renewal strong law. It neither implies a stationary initial delay nor quantifies clustering.

Source — Ross, Stochastic Processes, 2nd ed., renewal theory; Gallager, Discrete Stochastic Processes, Theorem 4.3.1. https://ocw.mit.edu/courses/6-262-discrete-stochastic-processes-spring-2011/931ffa0940899c27f34b71ad64fd2bb0_MIT6_262S11_chap04.pdf

## Compound Poisson weighted scoring (compound-poisson)

> S=Σ_(i=1)^N Y_i, N∼Pois(λ); E[S]=λE[Y], Var(S)=λE[Y²]

N event count, Y points per event, S weighted total, λ expected count.

Approximate rugby scoring using marked clusters, for example a try with the conversion points that follow it. Treat football goals as unit marks if using the goal-count special case

Assumptions — Poisson cluster count and independent identically distributed cluster marks independent of that count. Model conversion conditional on the try inside its cluster.

Limitations — Conversion attempts depend on tries rather than forming independently marked event values. Additional scoring types need an explicitly specified aggregation model. The cluster assumptions are conditional research assumptions.

Source — Ross, Introduction to Probability Models, 12th ed., compound Poisson process

## Lognormal duration distribution (lognormal-duration)

> f(t)=exp(−(ln t−μ)²/(2σ²))/(tσ√(2π)) for t>0

t duration, μ log-duration mean, σ positive log-duration SD.

Transform skewed duration predictors for model fitting

Assumptions — Positive measurements and Gaussian logarithms.

Limitations — Hard time limits and right censoring distort naive estimates.

Source — Johnson, Kotz and Balakrishnan, Continuous Univariate Distributions, vol. 1, 2nd ed.

## Exponentially modified Gaussian distribution (ex-gaussian-duration)

> T=G+E where G∼N(μ,σ²), E∼Exp(λ) independent; density f_T(t)=∫_0^∞ λ exp(−λu)f_G(t−u)du

G baseline timing, E random delay, μ,σ normal parameters, λ rate.

Model signed timing residuals or approximate comparable race or tennis point durations when negative-time mass is negligible

Assumptions — Use only when implied negative-time mass is negligible or truncate with explicit normalization.

Limitations — The untruncated distribution has support on the real line. For strictly positive support use explicit renormalized truncation or a positive-support law.

Source — Ratcliff, Group Reaction Time Distributions and an Analysis of Distribution Statistics, Psychological Bulletin, 1979

## Generalized extreme-value distribution (gev)

> F(x)=exp(−[1+ξ(x−μ)/σ]^(-1/ξ)) on positive bracket; ξ=0 limit exp(−exp(−(x−μ)/σ))

μ location, σ>0 scale, ξ shape, x block maximum.

Predict a continuous sport target like race time or score differential

Assumptions — Comparable, approximately independent blocks; limits outside support by continuity.

Limitations — Too few blocks and changing competition formats.

Source — Coles, An Introduction to Statistical Modeling of Extreme Values, 2001

## Generalized Pareto exceedance (gpd)

> F(y)=1−(1+ξy/σ)^(-1/ξ), y≥0 on positive bracket; ξ=0 gives 1−exp(−y/σ)

y amount above chosen threshold, σ>0 scale, ξ tail shape.

Predict a continuous sport target like race time or score differential

Assumptions — Threshold sufficiently high, dependent exceedances declustered.

Limitations — Tail extrapolation sensitive to threshold.

Source — Coles, An Introduction to Statistical Modeling of Extreme Values, 2001

## Empirical cumulative distribution (ecdf)

> F̂(t)=n^(-1)Σ_i1[x_i≤t]

x_i authorized prior observations, t queried threshold, n history size.

Predict a continuous sport target like race time or score differential

Assumptions — Comparable target units and sufficiently stable distribution.

Limitations — Extreme thresholds beyond observed support get degenerate estimates.

Source — Wasserman, All of Statistics, 2004

## Turnbull interval-censored distribution fit (turnbull)

> On maximal intersections J_j form A_ij=1[J_j inside I_i]; iterate p_j←p_j n^(-1)Σ_i A_ij/(Σ_k A_ik p_k) from positive masses

I_i observed censoring intervals, J_j candidate support intervals, p mass.

Estimate time to a future withdrawal or return in records with defensible risk sets

Assumptions — Noninformative censoring and feasible intervals.

Limitations — Mass may not be uniquely localized inside support intervals.

Source — Turnbull, The Empirical Distribution Function with Arbitrarily Grouped, Censored and Truncated Data, JRSS B, 1976

## Log-rank test (logrank)

> U=Σ_j(d_1j−n_1j d_j/n_j); V=Σ_j n_1j(n_j−n_1j)d_j(n_j−d_j)/(n_j²(n_j−1)); use U²/V. Set the variance contribution to zero when n_j≤1. If V=0, report no test statistic

risk counts n, failures d by group and event time j; omit n_j≤1.

Estimate time to a future withdrawal or return in records with defensible risk sets

Assumptions — Independent censoring, independent units, fixed groups and positive V.

Limitations — Crossing hazards can cancel against each other.

Source — Kalbfleisch and Prentice, The Statistical Analysis of Failure Time Data, 2nd ed.

## Greenwood survival variance formula (greenwood)

> Var[Ŝ(t)]≈Ŝ(t)²Σ_(τ_j≤t) d_j/[n_j(n_j−d_j)]. Use the expression while all included n_j>d_j. At a terminal event with n_j=d_j, the Kaplan–Meier estimate is zero. Report the factored Greenwood estimate and interval as unavailable at and after that time

n_j risk set, d_j failures, τ_j time, Ŝ Kaplan–Meier estimate.

Estimate time to a future withdrawal or return in records with defensible risk sets

Assumptions — Independent censoring with n_j>d_j at included times.

Limitations — Unstable at tail of follow-up or all-at-risk failure. At complete depletion the factored expression has an indeterminate zero-times-infinity form. Do not treat this boundary as evidence of zero uncertainty.

Source — Kalbfleisch and Prentice, The Statistical Analysis of Failure Time Data, 2nd ed.

## Aalen–Johansen transition estimator (aalen-johansen)

> P̂(s,t)=∏_(s<u≤t)[I+ΔÂ(u)], with off-diagonal ΔÂ_ij=dN_ij(u)/Y_i(u), diagonal minus row sum

dN_ij transitions, Y_i at risk in source state, u event time, ordered product.

Estimate time to a future withdrawal or return in records with defensible risk sets

Assumptions — Consistent transition coding and censoring compatible with risk sets.

Limitations — Sparse transitions make matrix estimates unstable.

Source — Aalen et al., Survival and Event History Analysis, 2008

## Restricted mean survival time (restricted-mean-survival-time)

> μ̂(τ)=∫_0^τ Ŝ(t)dt, integrate Kaplan–Meier step function exactly on breakpoints

τ prespecified time horizon, Ŝ survival estimate.

Estimate time to a future withdrawal or return in records with defensible risk sets

Assumptions — Follow-up support covers τ.

Limitations — Choosing τ after looking at relative outcomes biases comparisons.

Source — Royston and Parmar, Restricted Mean Survival Time, BMC Medical Research Methodology, 2013

## Poisson deviance (poisson-deviance)

> D=2Σ_i[y_i ln(y_i/μ_i)−(y_i−μ_i)], term y_i ln expression set to zero when y_i=0

y observed counts, μ positive forecasts.

Assess fitted means for a defined event count at aligned exposure

Assumptions — Forecasts correspond to identical exposure and event set.

Limitations — Interpreting it as chi-square despite dispersion or dependence.

Source — McCullagh and Nelder, Generalized Linear Models, 2nd ed.

## Anderson–Darling goodness of fit (anderson-darling)

> A²=−n−(1/n)Σ_i(2i−1)[ln F(x_(i))+ln(1−F(x_(n+1−i)))]

F fully specified continuous CDF, x_(i) ascending observations.

Predict a continuous sport target like race time or score differential

Assumptions — Independent observations under null and use correct null calibration.

Limitations — Critical values for known parameters fail after fitted parameters are reused.

Source — Anderson and Darling, Asymptotic Theory of Certain Goodness of Fit Criteria, Annals of Mathematical Statistics, 1952

## One-sample Kolmogorov–Smirnov statistic (ks-one-sample)

> D_n=sup_t abs(F̂_n(t)−F_0(t)); compute both sides of empirical jumps

F_0 continuous reference CDF, F̂_n empirical CDF.

Predict a continuous sport target like race time or score differential

Assumptions — IID under fully specified continuous null for distribution-free calibration.

Limitations — Discrete data and in-sample model fitting change the null law.

Source — Wasserman, All of Statistics, 2004

## Cramér–von Mises goodness of fit (cvm)

> W²=1/(12n)+Σ_i[F_0(x_(i))−(2i−1)/(2n)]²

x_(i) ascending observations, F_0 fully specified CDF, n size.

Predict a continuous sport target like race time or score differential

Assumptions — IID continuous observations for conventional null. The usual one-sample null law requires a fully specified continuous F₀. Re-estimating parameters requires a separately justified calibration.

Limitations — Fitting F_0 on observations changes test distribution.

Source — Csörgő and Faraway, The Exact and Asymptotic Distributions of Cramér–von Mises Statistics, JRSS B, 1996, Eq. 1.1. See https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.cramervonmises.html

## Exact paired binary McNemar test (mcnemar)

> p=min(1,2 Pr[Binom(b+c,1/2)≤min(b,c)])

b,c opposite-direction disagreements on aligned prediction correctness.

Assess calibration or forecast quality in a permitted historical assessment sample

Assumptions — Independent event pairs and fixed binary correctness rule.

Limitations — Repeated teams induce dependence and correctness discards calibration.

Source — Agresti, Categorical Data Analysis, 3rd ed., matched pairs

## Wilcoxon signed-rank statistic (wilcoxon-signed-rank)

> W⁺=Σ_(d_i>0) rank(abs(d_i)); discard zero differences and average tied ranks

d_i paired loss differences, W⁺ positive rank sum.

Assess calibration or forecast quality in a permitted historical assessment sample

Assumptions — Independent symmetric paired differences for usual location null.

Limitations — Asymmetry and temporal dependence invalidate textbook p-values.

Source — Wilcoxon, Individual Comparisons by Ranking Methods, Biometrics Bulletin, 1945

## Spearman rank association (spearman)

> ρ_s=corr(rank(x),rank(y)), using average ranks for ties

x,y two paired feature arrays, corr Pearson correlation.

Summarize correlated form metrics or group similar historical performances

Assumptions — Meaningful ordered measurements and nonconstant ranks.

Limitations — Nonmonotonic associations can cancel.

Source — Spearman, The Proof and Measurement of Association Between Two Things, American Journal of Psychology, 1904

## Kendall tau-b rank association (kendall-tau-b)

> τ_b=(C−D)/√((C+D+T_x)(C+D+T_y))

C,D concordant and discordant pairs, T_x,T_y pairs tied only on each rank variable.

Estimate probabilities of horse finishing orders

Assumptions — Nonzero denominator and consistent matched runners.

Limitations — Consensus across fields of different sizes requires explicit aggregation.

Source — Kendall, A New Measure of Rank Correlation, Biometrika, 1938; tie correction in Kendall, Rank Correlation Methods

## Ljung–Box residual autocorrelation check (ljung-box)

> Q=n(n+2)Σ_(k=1)^m r_k²/(n−k)

r_k sample residual autocorrelation at lag k, n past sample size, m prespecified maximum lag.

Track changes in prior football chance-creation rates, horse sectionals, tennis serve rates, rugby try rates, NFL drive efficiency or darts checkout rates

Assumptions — Regular sampling and appropriate degrees-of-freedom adjustment after fitting.

Limitations — Season irregularity and variance shifts distort null.

Source — Ljung and Box, On a Measure of Lack of Fit in Time Series Models, Biometrika, 1978

## Lo–MacKinlay variance ratio (variance-ratio)

> Population VR(q)=Var(Σ_(j=0)^(q−1) r_(t−j))/(q Var(r_t)); diagnostic estimate uses earlier rolling sums

r_t increment, q horizon with q≥2, positive marginal variance.

Track changes in prior football chance-creation rates, horse sectionals, tennis serve rates, rugby try rates, NFL drive efficiency or darts checkout rates

Assumptions — Comparable increment intervals; iid uncorrelated increments give ratio one.

Limitations — Heteroskedasticity and overlapping windows change inference.

Source — Lo and MacKinlay, Stock Market Prices Do Not Follow Random Walks, Review of Financial Studies, 1988

## Augmented Dickey–Fuller unit-root regression (adf)

> Fit Δy_t=a+bt+γ y_(t−1)+Σ_(j=1)^p δ_jΔy_(t−j)+ε_t; use t statistic for γ=0 with matching unit-root critical values

y series, p lags, a,b deterministic terms, γ level effect.

Track changes in prior football chance-creation rates, horse sectionals, tennis serve rates, rugby try rates, NFL drive efficiency or darts checkout rates

Assumptions — Fixed deterministic specification and adequate innovation lags.

Limitations — Structural breaks mimic unit roots.

Source — Hamilton, Time Series Analysis, 1994, ch. 17

## KPSS stationarity diagnostic (kpss)

> η=Σ_t S_t²/(n²ω̂²), S_t=Σ_(j≤t)e_j from residuals after trend or mean regression

e residual, ω̂² HAC long-run variance, n length.

Track changes in prior football chance-creation rates, horse sectionals, tennis serve rates, rugby try rates, NFL drive efficiency or darts checkout rates

Assumptions — Positive consistent long-run variance; use critical values for chosen deterministic terms.

Limitations — Abrupt changes trigger rejection without identifying mechanism.

Source — Kwiatkowski et al., Testing the Null Hypothesis of Stationarity, Journal of Econometrics, 1992

## Newey–West long-run covariance (newey-west)

> Ω̂=Γ̂_0+Σ_(j=1)^L(1−j/(L+1))(Γ̂_j+Γ̂_jᵀ)

Γ̂_j lag covariance of centered ordered score vectors, L bandwidth.

Track changes in prior football chance-creation rates, horse sectionals, tennis serve rates, rugby try rates, NFL drive efficiency or darts checkout rates

Assumptions — Weak dependence and compatible bandwidth.

Limitations — Long-memory or irregular timing invalidates approximation.

Source — Newey and West, A Simple, Positive Semi-definite, Heteroskedasticity and Autocorrelation Consistent Covariance Matrix, Econometrica, 1987

## Durbin–Watson residual statistic (durbin-watson)

> DW=Σ_(t=2)^n(e_t−e_(t−1))²/Σ_(t=1)^n e_t²

e ordered regression residuals, n observations.

Track changes in prior football chance-creation rates, horse sectionals, tennis serve rates, rugby try rates, NFL drive efficiency or darts checkout rates

Assumptions — Nonzero residual variance; test applicability depends on regressors.

Limitations — Lagged dependent regressors invalidate standard bounds.

Source — Durbin and Watson, Testing for Serial Correlation in Least Squares Regression I, Biometrika, 1950

## Breusch–Pagan variance diagnostic (breusch-pagan)

> After OLS, regress g_i=e_i²/σ̂²−1 on variance covariates plus intercept; LM=ESS/2

e residuals, σ̂²=Σe²/n, ESS explained sum of squares, n data size.

Predict a continuous sport target like race time or score differential

Assumptions — Classical normal-error null and fixed covariates.

Limitations — Non-normal errors require alternate calibration.

Source — Breusch and Pagan, A Simple Test for Heteroscedasticity and Random Coefficient Variation, Econometrica, 1979

## Cook influence distance (cook-distance)

> D_i=e_i² h_i/[d MSE(1−h_i)²]

e OLS residual, h_i diagonal hat leverage, d parameter count, MSE residual mean square.

Predict a continuous sport target like race time or score differential

Assumptions — Full-rank OLS, n>d and h_i<1.

Limitations — Influential observations can mask one another.

Source — Cook, Detection of Influential Observation in Linear Regression, Technometrics, 1977

## Variance inflation factor (vif)

> VIF_j=1/(1−R_j²), where R_j² regresses x_j on the other centered covariates with intercept

x_j covariate, R_j² multiple correlation.

Summarize correlated form metrics or group similar historical performances

Assumptions — Nonconstant feature, common fit sample.

Limitations — High collinearity need not reduce predictive accuracy.

Source — Montgomery, Peck and Vining, Introduction to Linear Regression Analysis, 5th ed.

## Akaike information criterion (aic)

> AIC=2k−2ln L(θ̂)

k fitted free parameters, L maximized likelihood on same data.

Assess calibration or forecast quality in a permitted historical assessment sample

Assumptions — Comparable likelihoods on identical outcomes and regular estimation.

Limitations — Nonidentifiability defeats parameter-count penalty.

Source — Akaike, A New Look at the Statistical Model Identification, IEEE Transactions on Automatic Control, 1974

## Schwarz Bayesian information criterion (bic)

> BIC=k ln n−2ln L(θ̂)

k adjustable parameters, n independent sample units, L maximized likelihood.

Assess calibration or forecast quality in a permitted historical assessment sample

Assumptions — Regular parametric models and identical data likelihood.

Limitations — Weak identifiability and clustered sample size distort penalty.

Source — Schwarz, Estimating the Dimension of a Model, Annals of Statistics, 1978

## Holm sequential multiplicity control (holm)

> Order p_(i); reject sequentially while p_(i)≤α/(m−i+1), stop at first failure

m prespecified hypotheses, p marginal valid p-values, α family-wise error bound.

Assess calibration or forecast quality in a permitted historical assessment sample

Assumptions — P-values valid under each tested null, arbitrary dependence allowed.

Limitations — Undeclared exploratory tests undermine family definition.

Source — Holm, A Simple Sequentially Rejective Multiple Test Procedure, Scandinavian Journal of Statistics, 1979

## Benjamini–Hochberg FDR procedure (benjamini-hochberg)

> k=max{i:p_(i)≤iq/m}; reject ranks 1..k, or none if set empty

p ordered valid p-values, q target FDR, m hypotheses.

Assess calibration or forecast quality in a permitted historical assessment sample

Assumptions — Independent tests or qualifying positive dependence.

Limitations — Arbitrary dependent comparisons can break nominal bound.

Source — Benjamini and Hochberg, Controlling the False Discovery Rate, JRSS B, 1995

## Diebold–Mariano forecast loss comparison (diebold-mariano)

> DM=√n d̄/√Ω̂ with d_t=L_(1,t)−L_(2,t), Ω̂ HAC long-run variance

d paired loss differences, n ordered paired events.

Assess calibration or forecast quality in a permitted historical assessment sample

Assumptions — Weak stationarity of loss difference and positive Ω̂.

Limitations — Nested fitted models and small samples can invalidate asymptotic reference.

Source — Diebold and Mariano, Comparing Predictive Accuracy, Journal of Business and Economic Statistics, 1995

## ROC area via pair ordering (auc-roc)

> AUC=(1/(n₊n₋))Σ_(i positive,j negative)[1(s_i>s_j)+0.5·1(s_i=s_j)]

s archived score, n₊/n₋ positive and negative counts.

Assess calibration or forecast quality in a permitted historical assessment sample

Assumptions — Binary target and both classes present.

Limitations — Strong discrimination can coexist with poor probabilities.

Source — Hanley and McNeil, The Meaning and Use of the Area Under a Receiver Operating Characteristic Curve, Radiology, 1982

## Threshold-grouped average precision (average-precision)

> AP=Σ_j(R_j−R_(j−1))P_j, descending distinct score thresholds. The sum is a step-weighted average of precision over recall increments. Trapezoidal PR area is a different convention

P_j precision, R_j recall, R_0=0.

Assess calibration or forecast quality in a permitted historical assessment sample

Assumptions — Fixed binary target and positive counts, tied thresholds grouped.

Limitations — Prevalence shifts render AP comparisons misleading.

Source — Davis and Goadrich, The Relationship Between Precision-Recall and ROC Curves, ICML 2006; step-area convention documented in scikit-learn average_precision_score

## Fixed-bin expected calibration error (ece)

> ECE=Σ_b(n_b/n)abs(mean_(i∈b)y_i−mean_(i∈b)p_i)

b fixed binary probability bins, y labels, p predictions, n_b counts.

Assess calibration or forecast quality in a permitted historical assessment sample

Assumptions — Bins fixed independently of scored labels.

Limitations — Bin cancellation and small samples obscure miscalibration.

Source — Naeini, Cooper and Hauskrecht, Obtaining Well Calibrated Probabilities Using Bayesian Binning, AAAI 2015

## Calibration-in-the-large offset (calibration-in-large)

> q_i=sigmoid(a+logit(p_i)); choose a such that Σq_i=Σy_i on calibration data

p_i earlier probabilities strictly between zero and one, y_i labels, a intercept.

Combine, calibrate or compare forecasts for the same sporting event target

Assumptions — Only baseline odds shift with slope fixed at one and both classes present.

Limitations — Conditional subgroup bias remains.

Source — Steyerberg, Clinical Prediction Models, 2nd ed., calibration chapter

## Continuous ranked probability score (crps)

> CRPS(F,y)=∫_ℝ[F(z)−1(z≥y)]²dz

F archived CDF, y observed duration or margin, z integration variable.

Assess calibration or forecast quality in a permitted historical assessment sample

Assumptions — Forecast distribution has finite first moment.

Limitations — Unbounded integration from poorly specified heavy tails.

Source — Gneiting and Raftery, Strictly Proper Scoring Rules, JASA, 2007

## Pinball quantile forecast loss (pinball)

> L_τ(q,y)=(y−q)(τ−1[y<q])

q forecast τ-quantile, y realized margin or duration, τ∈(0,1).

Assess calibration or forecast quality in a permitted historical assessment sample

Assumptions — Common quantile level and units across forecasts.

Limitations — Comparing different quantile levels changes target.

Mechanism — Quantile regression fits a model by minimizing the same loss; this record scores a supplied quantile.

Source — Gneiting and Raftery, Strictly Proper Scoring Rules, JASA, 2007

## Central prediction interval score (interval-score)

> IS_α(l,u;y)=(u−l)+(2/α)(l−y)1[y<l]+(2/α)(y−u)1[y>u]

l,u lower and upper forecast endpoints, y outcome, 1−α nominal coverage.

Assess calibration or forecast quality in a permitted historical assessment sample

Assumptions — Identical interval level and target units.

Limitations — Apparent tightness without coverage leads to high penalties.

Source — Gneiting and Raftery, Strictly Proper Scoring Rules, JASA, 2007

## Split conformal residual interval (split-conformal)

> Compute calibration scores s_i=abs(y_i−m̂(x_i)); set r to rank ceil((n+1)(1−α)) of n scores plus infinity; return [m̂(x)−r,m̂(x)+r]

m̂ fitted on disjoint earlier data, n calibration rows, α miscoverage.

Predict a continuous sport target like race time or score differential

Assumptions — Exchangeability of calibration/test scores conditional on fitted predictor.

Limitations — Temporal drift breaks finite-sample coverage guarantee. Chronological splitting prevents training on later data. Marginal finite-sample coverage requires exchangeability or a separately justified guarantee.

Source — Lei et al., Distribution-Free Predictive Inference for Regression, JASA, 2018

## Conformalized quantile regression (conformal-quantile)

> Set s_i=max(l̂(x_i)−y_i,y_i−û(x_i)); use split conformal corrected score quantile r and return [l̂(x)−r,û(x)+r]

l̂,û fitted lower and upper quantile models; r corrected rank threshold, s calibration score.

Predict a continuous sport target like race time or score differential

Assumptions — Disjoint fitting and calibration, exchangeable scores.

Limitations — Drift and poor quantile fit degrade coverage or width. Chronological splitting prevents training on later data. Marginal finite-sample coverage requires exchangeability or a separately justified guarantee.

Source — Romano, Patterson and Candès, Conformalized Quantile Regression, NeurIPS 2019

## Vector scaling calibration (vector-scaling)

> q_j=softmax(a⊙z+b)_j; fit class-specific a,b on disjoint earlier calibration logits via cross entropy

z logits, a,b vectors, ⊙ componentwise product, q calibrated probabilities.

Combine, calibrate or compare forecasts for the same sporting event target

Assumptions — Adequate calibration examples in each class, offset identifiable up to common shift.

Limitations — More degrees of freedom overfit rare outcomes.

Mechanism — Class-specific generalization of temperature; diagonal slope and offsets, unlike full Dirichlet calibration on log probabilities.

Source — Guo et al., On Calibration of Modern Neural Networks, ICML 2017

## Dirichlet probability calibration (dirichlet-calibration)

> q=softmax(W ln p+b); fit W,b by regularized multiclass log loss on earlier calibration predictions

p positive simplex input, W coefficient matrix, b offsets, q calibrated simplex.

Combine, calibrate or compare forecasts for the same sporting event target

Assumptions — Stable support and sufficient calibration rows.

Limitations — Rare classes and endpoint clipping make fitted corrections unstable.

Source — Kull et al., Beyond Temperature Scaling: Obtaining Well-Calibrated Multiclass Probabilities with Dirichlet Calibration, NeurIPS 2019

## Exponentially weighted expert forecast updates (online-log-weights)

> w_(t+1,j)=w_tj exp(−ηℓ_tj)/Σ_k w_tk exp(−ηℓ_tk); predict with current weighted pool

η positive learning rate, ℓ_tj expert loss observed after prediction t, w normalized weight.

Combine, calibrate or compare forecasts for the same sporting event target

Assumptions — Loss versions become available before using updated weights.

Limitations — Delayed labels or unbounded shock losses can suppress useful experts.

Source — Cesa-Bianchi and Lugosi, Prediction, Learning, and Games, 2006, expert advice

## Fixed-share adaptive ensemble (fixed-share)

> Let v_j∝w_j exp(−ηℓ_j); set w'_j=(1−α)v_j+α/M

ℓ realized earlier expert loss, η learning rate, M experts, α share in [0,1].

Combine, calibrate or compare forecasts for the same sporting event target

Assumptions — Persistent expert switches plausible and losses synchronized.

Limitations — Large α dilutes a stable dominant expert.

Mechanism — Exponentiated online weights followed by redistribution; α=0 gives online-log-weights.

Source — Herbster and Warmuth, Tracking the Best Expert, Machine Learning, 1998

## Posterior expected-loss decision (bayes-regret)

> a*=argmin_(a∈A)Σ_θ L(a,θ)p(θ∣D). For statewise regret subtract min_b L(b,θ) inside the sum. This action-independent term leaves the same argmin

A finite research decisions, θ uncertain state, D prior archived observations, L declared loss.

Summarize rule-consistent scoring or rank trajectories

Assumptions — Specified posterior and meaningful loss scale.

Limitations — Misspecified loss can invert ranking.

Source — Berger, Statistical Decision Theory and Bayesian Analysis, 2nd ed.

## Conditional value at risk functional (cvar)

> CVaR_α(L)=min_z[z+E(max(L−z,0))/(1−α)]

L integrable simulator loss, α∈(0,1), z candidate quantile threshold.

Summarize rule-consistent scoring or rank trajectories

Assumptions — Tail scenarios represent relevant model errors.

Limitations — Scenario shortage gives unstable tail mean.

Source — Rockafellar and Uryasev, Optimization of Conditional Value-at-Risk, Journal of Risk, 2000

## Finite minimax regret selection (minimax-regret)

> Select a*=argmin_a max_s[L(a,s)−min_b L(b,s)]

a,b candidate research choices, s scenario, L common loss.

Summarize rule-consistent scoring or rank trajectories

Assumptions — All scenarios considered and comparable loss meanings.

Limitations — Scenario omissions hide worst regret.

Source — Savage, The Theory of Statistical Decision, JASA, 1951

## Latin hypercube input generation (latin-hypercube)

> Generate u_ij=(π_j(i)−1+v_ij)/N with independent random permutations π_j and iid uniform v_ij∈(0,1); use inverse marginal CDF for each column

N draws, d dimensions, i row, j dimension.

Summarize rule-consistent scoring or rank trajectories

Assumptions — Independent input marginals for direct inverse-CDF construction.

Limitations — Nonlinear interactions can still have poor coverage.

Source — McKay, Beckman and Conover, A Comparison of Three Methods for Selecting Values of Input Variables in the Analysis of Output from a Computer Code, Technometrics, 1979

## Stratified Monte Carlo estimator (stratified-mc)

> μ̂=Σ_h π_h n_h^(-1)Σ_i f(X_hi), X_hi sampled within stratum h

π_h known stratum probabilities, n_h≥1 replicates, f simulated result.

Summarize rule-consistent scoring or rank trajectories

Assumptions — Disjoint exhaustive strata with correctly known weights.

Limitations — Empty high-impact strata cause bias if omitted.

Source — Robert and Casella, Monte Carlo Statistical Methods, 2nd ed.

## Metropolis–Hastings posterior simulation (mcmc-metropolis)

> Propose y∼q(·∣x), accept with probability min(1,π(y)q(x∣y)/(π(x)q(y∣x))), otherwise retain x

π unnormalized target, q proposal density, x current state.

Summarize rule-consistent scoring or rank trajectories

Assumptions — Irreducible aperiodic chain for convergence, evaluate on support.

Limitations — Separated modes yield poor mixing.

Source — Hastings, Monte Carlo Sampling Methods Using Markov Chains and Their Applications, Biometrika, 1970

## Gibbs posterior sampling (gibbs)

> For each sweep draw θ_j∼p(θ_j∣θ_(-j),D) in order using latest coordinates

θ_j parameter blocks, D earlier observations, θ_(-j) remaining blocks.

Summarize rule-consistent scoring or rank trajectories

Assumptions — Correct conditional samplers and ergodic joint chain.

Limitations — Strong posterior correlation slows mixing.

Source — Gelfand and Smith, Sampling-Based Approaches to Calculating Marginal Densities, JASA, 1990

## Univariate stepping-out slice sampler (slice-sampling)

> Draw height u∼U(0,f(x)); choose randomly offset width-w interval around x, step outward until endpoints have f≤u; propose uniformly within interval and shrink rejected side about x until f(y)≥u

x current scalar, f unnormalized density, w positive step, y proposal.

Summarize rule-consistent scoring or rank trajectories

Assumptions — Proper density and finite stepping for sampled slices.

Limitations — Disconnected regions can mix slowly.

Source — Neal, Slice Sampling, Annals of Statistics, 2003

## First-order Sobol variance fraction (rank-sobol)

> S_j=Var(E[Y∣X_j])/Var(Y). The displayed first-order index uses original variables. The retained ID is historical and the formula includes no rank transform

Y=f(X) simulator output with positive finite variance, X_j independent input factor.

Summarize rule-consistent scoring or rank trajectories

Assumptions — Independent input factors for variance decomposition.

Limitations — Correlated inputs do not have same sensitivity interpretation.

Source — Sobol, Global Sensitivity Indices for Nonlinear Mathematical Models and Their Monte Carlo Estimates, Mathematics and Computers in Simulation, 2001

## Total-effect Sobol variance fraction (sobol-total)

> T_j=E[Var(Y∣X_(-j))]/Var(Y)

Y simulator output, X_(-j) all inputs except factor j.

Summarize rule-consistent scoring or rank trajectories

Assumptions — Independent inputs and positive finite variance.

Limitations — Sampling noise obscures small interaction effects.

Source — Homma and Saltelli, Importance Measures in Global Sensitivity Analysis of Nonlinear Models, Reliability Engineering and System Safety, 1996

## Linear programming model (linear-program)

> Minimize cᵀx subject to Ax≤b and x≥0

x divisible resource allocations, c forecast loss gradient, A resource constraint matrix, b limits.

Compare hypothetical role assignments to study lineup sensitivity

Assumptions — Resource and objective coefficients additive and decision divisible.

Limitations — Indivisible players require integer formulation.

Source — Bertsimas and Tsitsiklis, Introduction to Linear Optimization, 1997

## Binary branch and bound (branch-bound)

> Solve LP relaxation at node N with lower bound L_N; prune if infeasible or L_N≥ incumbent cost, otherwise split a fractional binary coordinate into x_j=0 and x_j=1; update incumbent on integral solutions

x binary choices, j branch index, N subproblem, L_N relaxation objective.

Compare hypothetical role assignments to study lineup sensitivity

Assumptions — Valid bound and feasible finite binary set.

Limitations — Weak relaxations can force enumeration.

Source — Land and Doig, An Automatic Method of Solving Discrete Programming Problems, Econometrica, 1960

## Finite Pareto dominance filter (pareto-front)

> Keep a when no b satisfies f_i(b)≤f_i(a) for every objective i with strict inequality for some i

f_i losses such as error, latency or resource cost; a,b research designs.

Summarize rule-consistent scoring or rank trajectories

Assumptions — All objectives oriented to minimization and evaluated on common cases.

Limitations — Noise creates spurious nondominated points.

Source — Deb, Multi-Objective Optimization Using Evolutionary Algorithms, Wiley, 2001

## Nelder–Mead direct search (nelder-mead)

> Order d+1 points by increasing f with a fixed tie convention. Let b, s and w be the best, second-worst and worst vertices, and c the centroid without w. Reflect r=2c−w. If f(r)<f(b), try e=c+2(r−c) and accept e if f(e)<f(r), otherwise r. If f(b)≤f(r)<f(s), accept r. If f(s)≤f(r)<f(w), try o=c+(r−c)/2 and accept when f(o)≤f(r). If f(r)≥f(w), try i=c+(w−c)/2 and accept when f(i)<f(w). If the applicable contraction fails, shrink each nonbest x to b+(x−b)/2

d dimensions, c centroid, x_w worst point, objective scalar; use standard outside/inside contraction 1/2 and shrink 1/2. b, s and w denote vertices, c centroid, r reflection, e expansion, o outside contraction and i inside contraction.

Fit parameters or solve a calibration objective using authorized training records or a sport simulator.

Assumptions — Continuous local search with scaled coordinates.

Limitations — Can stagnate at nonstationary points.

Source — Lagarias et al., Convergence Properties of the Nelder–Mead Simplex Method in Low Dimensions, SIAM Journal on Optimization, 1998, Algorithm NM. https://www.math.kent.edu/~reichel/courses/optimization/reading.material.2/nelder.mead.pdf

## Golden-section unimodal minimization (golden-section)

> Set c=b−g(b−a), d=a+g(b−a), g=(√5−1)/2; retain [a,d] if f(c)≤f(d), else [c,b]; repeat to width tolerance

a,b initial bounds, g retained-length fraction, f scalar loss.

Fit parameters or solve a calibration objective using authorized training records or a sport simulator.

Assumptions — Unimodality on bracket and stable evaluations.

Limitations — Noisy loss comparisons may discard optimum.

Source — Nocedal and Wright, Numerical Optimization, 2nd ed.

## Bracketed scalar root bisection (bisection)

> Set m=(a+b)/2; keep half with opposite signs of g at endpoints or return m if g(m)=0; stop at requested interval width

g continuous objective equation, a,b bracket, m midpoint.

Fit parameters or solve a calibration objective using authorized training records or a sport simulator.

Assumptions — Initial strict opposite signs and continuous evaluations.

Limitations — Discontinuities can mimic roots.

Source — Burden and Faires, Numerical Analysis, 9th ed.

## Newton scalar root iteration (newton-root)

> x_(k+1)=x_k−g(x_k)/g′(x_k)

g root function, g′ derivative, x current parameter, k iteration.

Fit parameters or solve a calibration objective using authorized training records or a sport simulator.

Assumptions — Differentiable near simple root with close start.

Limitations — Near-zero derivative or remote start can diverge.

Source — Burden and Faires, Numerical Analysis, 9th ed.

## Linear conjugate gradient (conjugate-gradient)

> Initialize r=b−Ax, p=r; set α=(rᵀr)/(pᵀAp), x←x+αp, r′=r−αAp, β=(r′ᵀr′)/(rᵀr), p←r′+βp, r←r′; stop on small residual

A symmetric system matrix, b right-hand side, x solution, r residual, p direction.

Fit parameters or solve a calibration objective using authorized training records or a sport simulator.

Assumptions — Positive definite A, monitor residual and stop on exact zero.

Limitations — Poor conditioning and roundoff slow convergence.

Source — Hestenes and Stiefel, Methods of Conjugate Gradients for Solving Linear Systems, Journal of Research of the NBS, 1952

## DE/rand/1/bin search (differential-evolution)

> For target i choose distinct indices a,b,c different from i and form v=x_a+F(x_b−x_c). Choose one coordinate J uniformly and set u_J=v_J. For each j≠J independently set u_j=v_j with probability CR and u_j=x_ij otherwise. Retain u when f(u)≤f(x_i)

x bounded candidate vector, F scale, CR crossover probability, use clipping to declared bounds. J forced coordinate and u trial vector. For bounded problems declare the feasibility or repair rule before evaluation.

Fit parameters or solve a calibration objective using authorized training records or a sport simulator.

Assumptions — Continuous objective and population of at least four.

Limitations — Diversity collapse and costly noisy loss evaluations.

Source — Storn and Price, Differential Evolution, Journal of Global Optimization, 1997

## Metropolis simulated annealing (simulated-annealing)

> With symmetric proposal y near x accept with P=min(1,exp(−[f(y)−f(x)]/T_k)), reduce T_k along prespecified schedule

f loss, x incumbent, y proposal, T_k positive temperature.

Fit parameters or solve a calibration objective using authorized training records or a sport simulator.

Assumptions — Proposal supports reachable feasible states; convergence depends on cooling schedule.

Limitations — Fast cooling freezes in local minimum.

Source — Kirkpatrick, Gelatt and Vecchi, Optimization by Simulated Annealing, Science, 1983

## Cross-entropy elite-sample optimizer (cross-entropy-search)

> Sample x_i∼p_θ; take lowest-loss fraction ρ as elite E; update θ←argmax_ϑ Σ_(i∈E) ln p_ϑ(x_i)

θ proposal parameters, ρ preset elite fraction, E elite index set.

Fit parameters or solve a calibration objective using authorized training records or a sport simulator.

Assumptions — Proposal family can cover useful candidate regions with stable elite size.

Limitations — Variance collapse traps at local solutions.

Source — Rubinstein and Kroese, The Cross-Entropy Method, Springer, 2004

## UCB1 exploration index (bandit-ucb)

> After one pull of each arm choose a_t=argmax_j[x̄_j+√(2 ln t/n_j)] using only rewards revealed before step t

x̄_j past mean reward in [0,1], n_j observed arm count, t decision index.

Summarize rule-consistent scoring or rank trajectories

Assumptions — Stationary independent bounded rewards per arm; research simulator only.

Limitations — Delayed feedback and nonstationary model quality distort bonus.

Source — Auer, Cesa-Bianchi and Fischer, Finite-time Analysis of the Multiarmed Bandit Problem, Machine Learning, 2002

## Beta–Bernoulli Thompson selection (bandit-thompson)

> At step t sample p_j∼Beta(a_j+s_j,b_j+f_j) independently and select a_t=argmax_j p_j

a_j,b_j prior shapes, s_j,f_j revealed successes/failures for arm j, p_j posterior draw.

Summarize rule-consistent scoring or rank trajectories

Assumptions — Stationary independent binary reward conditional on arm, research simulator only.

Limitations — Unknown reward lag or drift breaks stationary evidence accumulation.

Source — Thompson, On the Likelihood that One Unknown Probability Exceeds Another, Biometrika, 1933

## Gaussian process regression (gaussian-process)

> For residual vector y−m, predictive mean μ_*=m_*+k_*ᵀ(K+σ²I)^(-1)(y−m), latent variance v_*=k_**−k_*ᵀ(K+σ²I)^(-1)k_*

K train kernel matrix, k_* train-query covariance, k_** query variance, m prior mean, σ² noise.

Predict a continuous sport target like race time or score differential

Assumptions — Positive semidefinite kernel, Gaussian noise, earlier-only hyperparameter fit.

Limitations — Smooth kernel smears abrupt change and dense fits do not scale.

Source — Rasmussen and Williams, Gaussian Processes for Machine Learning, 2006, ch. 2

## Gaussian expected improvement acquisition (expected-improvement)

> EI(x)=(f_best−μ)Φ(z)+σφ(z), z=(f_best−μ)/σ; for σ=0 use max(f_best−μ,0)

μ,σ surrogate mean and SD, f_best known incumbent minimization value, Φ/φ normal CDF/density.

Fit parameters or solve a calibration objective using authorized training records or a sport simulator.

Assumptions — Gaussian predictive law and comparable objective values.

Limitations — Overconfident surrogate neglects promising regions.

Source — Jones, Schonlau and Welch, Efficient Global Optimization of Expensive Black-Box Functions, Journal of Global Optimization, 1998

## Epsilon-insensitive support-vector regression (svr)

> Minimize J(w,b)=0.5 squared_norm(w)+CΣ_i max(0,abs(y_i−wᵀφ(x_i)−b)−ε)

w weights in feature space, φ map, y response, b intercept, ε insensitivity, C positive loss weight.

Predict a continuous sport target like race time or score differential

Assumptions — Common response units and selected kernel positive semidefinite.

Limitations — Kernel and tube tuning can overfit or oversmooth.

Source — Smola and Schölkopf, A Tutorial on Support Vector Regression, Statistics and Computing, 2004

## Gaussian naive Bayes classifier (gaussian-naive-bayes)

> P(Y=c∣x)∝π_c ∏_j N(x_j;μ_cj,σ_cj²), normalize across classes

π_c prior class probabilities, x_j features, μ_cj and σ_cj² class-specific moments.

Estimate or update a binary event such as a tennis service hold or a football clean sheet

Assumptions — Conditional independence of features and positive variance.

Limitations — Correlated rolling features cause overconfidence.

Source — Hastie, Tibshirani and Friedman, The Elements of Statistical Learning, 2nd ed., §6.6

## Linear discriminant analysis (lda-classifier)

> δ_c(x)=xᵀΣ^(-1)μ_c−μ_cᵀΣ^(-1)μ_c/2+ln π_c; predict softmax(δ)_c

c outcome, μ_c means, Σ common within-class covariance, π_c class priors.

Estimate or update a binary event such as a tennis service hold or a football clean sheet

Assumptions — Shared nonsingular covariance and Gaussian class likelihoods.

Limitations — Different within-class dispersions curl decision boundary.

Source — Hastie, Tibshirani and Friedman, The Elements of Statistical Learning, 2nd ed., §4.3

## Quadratic discriminant analysis (qda-classifier)

> δ_c(x)=ln π_c−0.5 ln detΣ_c−0.5(x−μ_c)ᵀΣ_c^(-1)(x−μ_c); use softmax across c

class priors π, class means μ, class-specific covariance Σ_c.

Estimate or update a binary event such as a tennis service hold or a football clean sheet

Assumptions — Gaussian classes and nonsingular class covariances.

Limitations — Rare class covariance difficult to estimate.

Source — Hastie, Tibshirani and Friedman, The Elements of Statistical Learning, 2nd ed., §4.3

## AdaBoost binary reweighting (adaboost)

> For labels and classifier outputs ±1 set ε_m=Σ_i w_i1[y_i≠h_m(x_i)], α_m=0.5 ln((1−ε_m)/ε_m); update w_i∝w_i exp(−α_m y_i h_m(x_i)), aggregate sign(Σ_m α_m h_m). Apply the finite weight formula only for 0<ε_m<1/2. At ε_m=0 stop with the perfect training rule as the infinite-weight limit. For ε_m≥1/2 reject the weak rule and stop this specified procedure

w sample weights, h base weak learner, α coefficient; stop on zero error or no better than chance.

Estimate or update a binary event such as a tennis service hold or a football clean sheet

Assumptions — Weak learner improves on chance under current weights.

Limitations — Repeated mislabeled rows dominate later stages.

Source — Freund and Schapire, A Decision-Theoretic Generalization of On-Line Learning and an Application to Boosting, JCSS, 1997

## Elastic weight consolidation (elastic-weight-consolidation)

> Minimize J(θ)=L_new(θ)+(λ/2)Σ_i F_i(θ_i−θ_i_old)²

θ network weights, F_i diagonal Fisher estimate from earlier task, λ penalty, L_new new-task loss.

Use sequences of earlier match or session measurements to learn form features for later fixtures.

Assumptions — Old parameters carry useful stable task structure.

Limitations — Unreliable Fisher estimates lock obsolete features.

Source — Kirkpatrick et al., Overcoming Catastrophic Forgetting in Neural Networks, PNAS, 2017

## Long short-term memory recurrent cell (lstm)

> Compute i,f,o=sigmoid(W_g[x_t;h_prev]+b_g) with separate g weights; u=tanh(W_u[x_t;h_prev]+b_u); c_t=f⊙c_prev+i⊙u; h_t=o⊙tanh(c_t). This is the forget-gate architecture with no peephole terms. Each gate uses its own affine map of the input and previous hidden state

x observations, h output, c memory, i/f/o gates, u candidate, W,b fit coefficients.

Use sequences of earlier match or session measurements to learn form features for later fixtures.

Assumptions — Chronological input sequences with documented resets and causal training.

Limitations — Sparse teams and regime shifts make capacity hard to regularize.

Source — Gers, Schmidhuber and Cummins, Learning to Forget: Continual Prediction with LSTM, Neural Computation, 2000

## Gated recurrent unit (gru)

> r=σ(W_r x+U_r h), z=σ(W_z x+U_z h), u=tanh(W_u x+U_u(r⊙h)), h_new=(1−z)⊙h+z⊙u. Cho et al. Eq. 7 places its z on the old state. For equal outputs set z_here=1−z_Cho by negating the entire update-gate affine map

x current historical feature, h prior hidden state, r reset, z update, u candidate, W,U learned matrices.

Use sequences of earlier match or session measurements to learn form features for later fixtures.

Assumptions — Causal sequence and sufficient history for learned gates.

Limitations — Gate saturation and group composition shifts reduce generalization.

Source — Cho et al., Learning Phrase Representations using RNN Encoder–Decoder for Statistical Machine Translation, EMNLP 2014

## Causally masked scaled dot-product attention (causal-attention)

> A=softmax_rows(QKᵀ/√d+M)V, M_ij=0 if j≤i and −∞ otherwise

Q/K/V query, key and value matrices, d key width, i query time, j key time.

Use sequences of earlier match or session measurements to learn form features for later fixtures.

Assumptions — Sort by availability and use correct within-timestamp policy.

Limitations — Precomputed future-informed keys leak despite mask.

Source — Vaswani et al., Attention Is All You Need, NeurIPS 2017

## Causal dilated temporal convolution (causal-dilated-conv)

> y_t=Σ_(j=0)^(k−1) W_j x_(t−δj) with zero padding only to left

x earlier sequence, W_j filter weights, k kernel width, δ positive dilation.

Use sequences of earlier match or session measurements to learn form features for later fixtures.

Assumptions — Order and sampling meaningful and no right padding in features.

Limitations — Gridding effects miss events between sampled lags.

Source — Bai, Kolter and Koltun, An Empirical Evaluation of Generic Convolutional and Recurrent Networks for Sequence Modeling, arXiv:1803.01271

## Adam stochastic gradient optimizer (adam)

> m_t=β₁m_prev+(1−β₁)g_t, v_t=β₂v_prev+(1−β₂)g_t²; θ←θ−η[m_t/(1−β₁^t)]/[√(v_t/(1−β₂^t))+ε]

g_t stochastic gradient, componentwise squares, θ coefficients, β decays, η learning rate, ε stabilizer, m₀=v₀=0.

Fit parameters or solve a calibration objective using authorized training records or a sport simulator.

Assumptions — Differentiable losses and finite gradients; tune on earlier splits.

Limitations — Optimization convergence can fail under some gradient sequences.

Source — Kingma and Ba, Adam: A Method for Stochastic Optimization, ICLR 2015

## Two-group two-period difference in differences (diff-in-diff)

> τ̂=(Ȳ_1,post−Ȳ_1,pre)−(Ȳ_0,post−Ȳ_0,pre)

group 1 exposed, group 0 comparison, Y outcome and pre/post periods.

Retrospectively estimate or check the effect of a coaching, roster, scheduling or rule change before considering a feature for future forecasts.

Assumptions — Parallel untreated trends, no anticipation, no spillovers and stable groups.

Limitations — Concurrent rule changes confined to treated group confound effect.

Source — Angrist and Pischke, Mostly Harmless Econometrics, 2009

## Synthetic control counterfactual (synthetic-control)

> Fit w=argmin_(w≥0,Σw=1)squared_V_norm(X_1−X_0w) on pre-treatment histories; counterfactual Ŷ_1t=Σ_j w_j Y_jt

X treated/donor predictors, V positive semidefinite metric, w donor weights, Y subsequent outcomes for retrospective analysis.

Retrospectively estimate or check the effect of a coaching, roster, scheduling or rule change before considering a feature for future forecasts.

Assumptions — Unexposed donors and adequate pre-treatment fit.

Limitations — No comparable convex donor combination yields extrapolation bias.

Source — Abadie, Diamond and Hainmueller, Synthetic Control Methods for Comparative Case Studies, JASA, 2010

## Sharp regression discontinuity with local linear limits (rd-local-linear)

> Fit separate weighted lines Y=a_s+b_s(X−c) on each side s of c using nonnegative K((X−c)/h); τ̂=a_right−a_left

X running variable, c assignment cutoff, h bandwidth, K kernel, Y retrospective outcome.

Retrospectively estimate or check the effect of a coaching, roster, scheduling or rule change before considering a feature for future forecasts.

Assumptions — Continuity of potential outcome means and no sorting around cutoff.

Limitations — Other rules changing at c invalidate attribution.

Source — Imbens and Lemieux, Regression Discontinuity Designs: A Guide to Practice, Journal of Econometrics, 2008

## Binary-instrument Wald estimator (wald-iv)

> τ̂=(mean[Y∣Z=1]−mean[Y∣Z=0])/(mean[A∣Z=1]−mean[A∣Z=0])

Z proposed instrument, A treatment, Y historical outcome.

Retrospectively estimate or check the effect of a coaching, roster, scheduling or rule change before considering a feature for future forecasts.

Assumptions — Instrument independence, exclusion, relevance and monotonicity for local effect.

Limitations — Weak or directly outcome-relevant instrument destabilizes estimate.

Source — Angrist, Imbens and Rubin, Identification of Causal Effects Using Instrumental Variables, JASA, 1996

## Matched-pair treatment sensitivity model (rosenbaum-bounds)

> With within-pair treatment odds bounded by Γ, positive signs under sharp null have success chances 1/(1+Γ)≤p_i≤Γ/(1+Γ); bound upper tail for count using corresponding binomial laws

Γ≥1 hidden-bias odds bound, n matched independent pairs, sign of treated-minus-control outcome.

Retrospectively estimate or check the effect of a coaching, roster, scheduling or rule change before considering a feature for future forecasts.

Assumptions — One treated per matched pair and sharp no-effect null.

Limitations — Poor matching and correlated pairs defeat interpretation.

Source — Rosenbaum, Observational Studies, 2nd ed., Springer, 2002

## Householder QR factorization (householder-qr)

> For each trailing column x, choose α=−sign₊(x₁)‖x‖₂, v=x−αe₁ and apply H=I−2vvᵀ/(vᵀv) to the trailing block, skipping x=0. Accumulate Q in reflector order so A=QR.

x trailing subvector, e₁ first unit vector, sign₊(0)=1, R upper trapezoidal, Q orthogonal.

Fit a linear score-margin baseline from a historical feature design and inspect its residuals

Assumptions — Real m×n matrix, m≥n for the stated tall-design application.

Limitations — Triangular regression solve requires full column rank.

Source — Anderson et al., LAPACK Users’ Guide, 3rd ed., QR Factorization. https://www.netlib.org/lapack/lug/node40.html

## Column-pivoted QR for rank diagnosis (pivoted-qr)

> At step k pivot the remaining column with largest trailing 2-norm into position k, then eliminate the trailing entries with a Householder reflector to obtain AP=QR. Estimate rank by thresholding the leading triangular block at a declared scale.

A design, P column permutation, Q orthogonal, R upper trapezoidal, k pivot step.

Flag redundant historical team and venue indicators before fitting

Assumptions — Use a declared numerical rank tolerance and consistent feature units.

Limitations — Greedy pivoting does not guarantee strong rank revelation for every matrix.

Source — Anderson et al., LAPACK Users’ Guide, 3rd ed., QR Factorization with Column Pivoting. https://www.netlib.org/lapack/lug/node42.html

## Complete orthogonal minimum-norm solve (complete-orthogonal-factorization)

> Given AP=Q[R₁₁ R₁₂;0 0] with rank r, use a right orthogonal factor Z such that [R₁₁ R₁₂]=[T 0]Z. Set x=P Zᵀ[T⁻¹(Qᵀb)₁:r;0], or x=0 at rank zero.

A design, b response, Q and Z orthogonal, T nonsingular r×r upper triangular, P pivot permutation.

Fit a minimum-norm margin baseline when team indicator columns are exactly redundant

Assumptions — Rank known or resolved reliably and dense real design.

Limitations — A noisy near-null direction can change the solution substantially when the declared rank changes.

Mechanism — Shares the minimum-norm least-squares result with SVD for aligned rank decisions, with different factors.

Source — Anderson et al., LAPACK Users’ Guide, 3rd ed., Complete Orthogonal Factorization. https://www.netlib.org/lapack/lug/node43.html

## Partial-pivoting LU solve (pivoted-lu)

> At each elimination step swap in a remaining row maximizing absolute pivot-column entry, then update the Schur complement using the resulting multipliers. Solve Ly=Pb and Ux=y from PA=LU.

A square system, b right-hand side, P row permutation, L unit lower and U upper triangular.

Solve a nonsymmetric linear system arising from a synthetic sport transition model

Assumptions — Nonsingular real square A and nonzero pivots.

Limitations — Large element growth can amplify roundoff.

Source — Anderson et al., LAPACK Users’ Guide, 3rd ed., Factorizations for Solving Linear Equations. https://www.netlib.org/lapack/lug/node68.html

## Cholesky triangular solve (cholesky-solve)

> Factor A=LLᵀ with L lower triangular and positive diagonal, then solve Ly=b and Lᵀx=y by substitution.

A Gram or precision matrix, L Cholesky factor, b right-hand side.

Reuse a regularized historical feature Gram factor across score-margin target fits

Assumptions — Real symmetric positive definite matrix.

Limitations — Near singularity can defeat the factorization at working precision.

Source — Anderson et al., LAPACK Users’ Guide, 3rd ed., Linear Equations. https://www.netlib.org/lapack/lug/node38.html

## Symmetric-indefinite block LDLᵀ solve (pivoted-ldlt)

> Use symmetric row-and-column pivots with 1×1 or 2×2 pivot blocks to obtain PAPᵀ=LDLᵀ. Solve successively with L, block diagonal D and Lᵀ, and undo permutation P.

A symmetric matrix, L unit lower triangular, D symmetric block diagonal, P permutation.

Solve a saddle-point system for an equality-constrained historical rating fit

Assumptions — A nonsingular symmetric system with invertible selected pivot blocks.

Limitations — An unpivoted scalar scheme can fail even for the invertible matrix [0 1;1 0].

Source — Anderson et al., LAPACK Users’ Guide, 3rd ed., Linear Equations. https://www.netlib.org/lapack/lug/node38.html

## Rank-truncated SVD least squares (svd-least-squares)

> Factor A=UΣVᵀ and set x_τ=Σ_(σ_i>τ) v_i(u_iᵀb)/σ_i for τ≥0. This is the minimum-norm solution for the truncated design.

A design, b response, σ_i singular values, u_i and v_i singular vectors, τ rank threshold.

Stabilize a historical race-time fit with collinear features

Assumptions — Declare a threshold in design units using training data only.

Limitations — Substantial signal in a discarded direction biases the fitted margin.

Mechanism — Shares minimum-norm solution with complete orthogonal factorization under compatible rank decisions; truncation can change the design.

Source — Anderson et al., LAPACK Users’ Guide, 3rd ed., Singular Value Decomposition. https://www.netlib.org/lapack/lug/node53.html

## Orthogonal symmetric tridiagonal reduction (symmetric-tridiagonal-reduction)

> For k=1,…,n−2, choose a Householder reflector H fixing the first k coordinates and send the tail of column k to a multiple of its first unit vector. Replace A←HAHᵀ so the accumulated relation is T=QᵀA_original Q.

H embedded reflector, Q ordered product, T tridiagonal.

Prepare a historical covariance matrix for symmetric spectral analysis

Assumptions — Real symmetric input; a zero tail needs no reflector.

Limitations — A nonsymmetric matrix needs a different reduction.

Source — Anderson et al., LAPACK Users’ Guide, 3rd ed., Symmetric Eigenproblems. https://www.netlib.org/lapack/lug/node48.html

## Orthogonal upper Hessenberg reduction (hessenberg-reduction)

> For k=1,…,n−2, use an embedded Householder reflector H_k to eliminate column-k entries below the first subdiagonal by similarity. The result H=QᵀA Q satisfies H_ij=0 for i>j+1.

A real square matrix, Q orthogonal product, H upper Hessenberg.

Prepare a fitted nonsymmetric transition matrix for spectral analysis

Assumptions — Finite real matrix; skip a zero elimination tail.

Limitations — Nonnormal eigenvalues can remain sensitive after the reduction.

Source — Anderson et al., LAPACK Users’ Guide, 3rd ed., Eigenvalues, Eigenvectors and Schur Factorization. https://www.netlib.org/lapack/lug/node50.html

## Two-sided orthogonal bidiagonal reduction (svd-bidiagonal-reduction)

> Alternate left column reflectors and right row reflectors on the trailing block to obtain B=U₁ᵀAV₁ with B upper bidiagonal in its first n rows. Then σ_i(A)=σ_i(B).

A m×n matrix, B reduced matrix, U₁ and V₁ orthogonal factors, σ_i singular values.

Prepare a prior match-by-feature matrix for a singular-spectrum calculation

Assumptions — Real m≥n case with zero tails skipped.

Limitations — Bidiagonal reduction still requires a separate singular-value solver.

Source — Anderson et al., LAPACK Users’ Guide, 3rd ed., Singular Value Decomposition. https://www.netlib.org/lapack/lug/node53.html

## Cholesky reduction for symmetric-definite eigenproblems (symmetric-definite-eigen)

> With B=LLᵀ form C=L⁻¹AL⁻ᵀ via triangular solves. Solve Cy=λy and recover z=L⁻ᵀy so Az=λBz and zᵀBz=yᵀy.

A symmetric objective, B positive definite metric, L Cholesky factor, λ eigenvalue.

Find high between-team variation directions relative to a regularized within-team covariance

Assumptions — Real symmetric A and B with B strictly positive definite.

Limitations — Ill-conditioned B can amplify errors under the coordinate change.

Source — Anderson et al., LAPACK Users’ Guide, 3rd ed., Generalized Symmetric Definite Eigenproblems. https://www.netlib.org/lapack/lug/node54.html

## Generalized Schur decomposition (generalized-schur)

> Compute QᵀAZ=S and QᵀBZ=T with independent orthogonal Q,Z, S upper quasi-triangular and T upper triangular. Extract generalized eigenvalues blockwise from det(S_block−λT_block)=0, using homogeneous coordinates for infinite eigenvalues.

A,B real square pencil, Q,Z orthogonal factors, S,T Schur pair, λ generalized eigenvalue.

Analyze linearized modes of a constrained synthetic race-trajectory model

Assumptions — Regular pencil, so the determinant polynomial is not identically zero.

Limitations — A nearly singular pencil can make finite and infinite eigenvalues numerically hard to distinguish.

Source — Anderson et al., LAPACK Users’ Guide, 3rd ed., Eigenvalues, Eigenvectors and Generalized Schur Decomposition. https://www.netlib.org/lapack/lug/node56.html

## Componentwise linear-solve backward error (linear-solve-backward-error)

> Given residual r=b−Ax̂, compute η=max_i abs(r_i)/(abs(A) abs(x̂)+abs(b))_i using 0/0=0. This is the minimum common componentwise relative perturbation bound on A and b that makes x̂ solve the perturbed system.

A system matrix, b right-hand side, x̂ computed solution, absolute values entrywise.

Check solve accuracy for historical rating normal equations before interpreting coefficients

Assumptions — Unstructured componentwise perturbations and residual measured with sufficient precision.

Limitations — A small backward error can coexist with large forward error for ill-conditioned A.

Source — Anderson et al., LAPACK Users’ Guide, 3rd ed., Further Details: Error Bounds for Linear Equation Solving. https://www.netlib.org/lapack/lug/node81.html

## Laplace residual law (laplace)

> f(x)=exp(−abs(x−μ)/b)/(2b) for all real x

μ location, b>0 scale.

Model historical score-margin errors with a sharply peaked center and exponential tails

Assumptions — Additive symmetric residuals with a common scale.

Limitations — Asymmetric margin errors invalidate equal-tail intervals.

Source — SciPy reference, scipy.stats.laplace, Notes. https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.laplace.html

## Continuous logistic residual law (logistic-residual)

> F(x)=1/(1+exp(−(x−μ)/s)) for all real x

μ location, s>0 scale.

Summarize historical score-margin error quantiles under a continuous residual law

Assumptions — Continuous real-valued residual, with μ and s estimated before the cutoff.

Limitations — Extreme residuals may have heavier tails than the fitted exponential tails.

Source — SciPy reference, scipy.stats.logistic, Notes. https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.logistic.html

## Student t residual law (student-t-residual)

> For z=(x−μ)/s, f(x)=Γ((ν+1)/2)/(s√(νπ)Γ(ν/2))·(1+z²/ν)^(−(ν+1)/2) on the real line

μ location, s>0 scale, ν>0 degrees of freedom.

Estimate prediction intervals for score-margin errors with occasional large misses

Assumptions — Univariate symmetric errors with polynomial tails.

Limitations — Variance is infinite for 1<ν≤2 and the mean is undefined for ν≤1.

Source — SciPy reference, scipy.stats.t, Notes. https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.t.html

## Central chi-square reference law (chi-square-law)

> f(x)=x^(ν/2−1) exp(−x/2)/(2^(ν/2)Γ(ν/2)), x>0, and zero for x<0

ν>0 degrees of freedom, Γ gamma function, x test statistic.

Map a historical model diagnostic statistic to a tail probability under its reference distribution

Assumptions — Exact sum-of-squares law for an integer number of independent standard normals.

Limitations — Correlated or nonstandardized quadratic terms need a different reference law.

Source — SciPy reference, scipy.stats.chi2, Notes. https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.chi2.html

## Central F variance-ratio law (f-reference-law)

> X=(U/d₁)/(V/d₂) with independent U∼χ²(d₁) and V∼χ²(d₂)

d₁,d₂>0 numerator and denominator degrees of freedom, X>0 almost surely.

Calibrate a ratio of independent historical residual variance estimates under a common-variance hypothesis

Assumptions — Exact Gaussian variance-ratio use requires independent sums of squares.

Limitations — Equal coefficients or overlapping samples do not guarantee independent numerator and denominator.

Source — SciPy reference, scipy.stats.f, Notes. https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.f.html

## Triangular bounded scenario law (triangular-law)

> For x∈[0,1] and c∈(0,1), f(x)=2x/c for x≤c and 2(1−x)/(1−c) otherwise. The density is zero outside [0,1].

c modal fraction, x bounded scenario draw; use an affine transform for general finite bounds.

Simulate bounded pre-event pace assumptions with a stated mode for synthetic race scenarios

Assumptions — Known bounds and an interior mode, with linearly changing density on each side.

Limitations — Hard bounds produce zero density for a valid outcome outside the scenario range.

Source — SciPy reference, scipy.stats.triang, Notes. https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.triang.html

## Inverse Gaussian duration law (inverse-gaussian-duration)

> f(t)=√(λ/(2πt³)) exp(−λ(t−μ)²/(2μ²t)), t>0, and zero for t≤0

μ>0 mean duration, λ>0 shape, t elapsed time.

Represent positive historical split durations under a first-passage approximation

Assumptions — Positive duration with an independent drifting Brownian first-passage interpretation when used mechanistically.

Limitations — A single unimodal passage law misses mixed race regimes or stoppage masses.

Source — SciPy reference, scipy.stats.invgauss, Notes. https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.invgauss.html

## Burr XII positive duration law (burr-xii-duration)

> S(t)=[1+(t/s)^c]^(−d) for t≥0 and S(t)=1 for t<0

s>0 scale, c,d>0 shapes, t elapsed duration, S survival.

Model long delays before a recorded transition in prior sport event histories

Assumptions — Nonnegative continuous durations with heavy polynomial tails.

Limitations — The kth positive moment diverges for k≥cd.

Source — SciPy reference, scipy.stats.burr12, Notes. https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.burr12.html

## Von Mises directional law (von-mises-angle)

> f(θ)=exp(κ cos(θ−μ))/(2π I₀(κ)) for θ in any interval of length 2π, with periodic extension

θ event angle, μ mean direction modulo 2π, κ≥0 concentration, I₀ modified Bessel function.

Summarize historical shot or movement headings when angle tracking is available

Assumptions — Circular observations in radians and a single common concentration.

Limitations — Opposing directional modes can look nearly uniform under a single component.

Source — SciPy reference, scipy.stats.vonmises, Notes. https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.vonmises.html

## Log-gamma residual law (loggamma-residual)

> If G∼Gamma(c, rate 1) and X=log G, f(x)=exp(cx−exp(x))/Γ(c) on the real line

c>0 shape, x log-scale residual, Γ gamma function.

Represent asymmetric log-duration errors after removing historical course and distance effects

Assumptions — Continuous asymmetric log-scale variability.

Limitations — Tail asymmetry can misrepresent data with large right-tail residuals.

Source — SciPy reference, scipy.stats.loggamma, Notes. https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.loggamma.html

## Fixed-step gradient descent (gradient-descent)

> x_(k+1)=x_k−η∇f(x_k). If f is convex with L-Lipschitz gradient, an attained minimum and 0<η≤1/L, f(x_k)−f(x*)≤‖x₀−x*‖₂²/(2ηk) for k≥1.

f differentiable training loss, x coefficient vector, η step, L gradient Lipschitz constant, x* minimizer.

Fit a differentiable historical calibration or margin loss by full gradient updates

Assumptions — Euclidean gradient evaluated on a fixed smooth convex objective for the stated bound.

Limitations — A step larger than the smoothness bound can oscillate or diverge.

Mechanism — ISTA with λ=0 reduces to gradient descent; smooth objective versus composite step.

Source — Tibshirani, CMU 10-725 Optimization, Lecture 6, §6.1.1. https://www.stat.cmu.edu/~ryantibs/convexopt-F13/scribes/lec6.pdf

## Iterative shrinkage-thresholding (ista)

> For F(x)=f(x)+λ‖x‖₁, set u=x_k−∇f(x_k)/L and x_(k+1),j=sign(u_j)max(abs(u_j)−λ/L,0).. For an exempt intercept apply soft thresholding only on penalized coordinates. With the same mask and η=1/L, prox-l1 gives the same step

f smooth convex training loss, λ≥0 penalty, L>0 upper bound on the gradient Lipschitz constant, j feature index.

Fit sparse linear historical performance features without applying the L₁ term as an ordinary derivative

Assumptions — Fixed convex composite objective with a minimizer and valid smoothness bound.

Limitations — Poor curvature can slow progress and arbitrary feature scales change the L₁ fit.

Mechanism — Same update as prox-l1 at η=1/L with matching penalized coordinates; canonical label ISTA, preserve both IDs.

Source — Beck and Teboulle (2009), A Fast Iterative Shrinkage-Thresholding Algorithm for Linear Inverse Problems, §3. https://www.ceremade.dauphine.fr/~carlier/FISTA

## Accelerated iterative shrinkage-thresholding (fista)

> Initialize y₁=x₀ and t₁=1. With soft threshold S_a(u)_j=sign(u_j)max(abs(u_j)−a,0), set x_k=S_(λ/L)(y_k−∇f(y_k)/L), t_(k+1)=(1+√(1+4t_k²))/2, and y_(k+1)=x_k+[(t_k−1)/t_(k+1)](x_k−x_(k−1)).

f smooth convex loss, λ≥0 L₁ penalty, L>0 upper bound on the gradient Lipschitz constant, x fitted iterate, y extrapolated point, t acceleration scalar.

Fit a sparse historical margin model when the unaccelerated method requires many passes

Assumptions — Fixed convex composite objective with a minimizer and a valid smoothness bound.

Limitations — Acceleration can yield nonmonotone objective values at successive fitted iterates.

Mechanism — ISTA acceleration with extrapolation and extra state.

Source — Beck and Teboulle (2009), A Fast Iterative Shrinkage-Thresholding Algorithm for Linear Inverse Problems, §4. https://www.ceremade.dauphine.fr/~carlier/FISTA

## Frank–Wolfe conditional gradient (frank-wolfe)

> At k≥0 choose s_k∈argmin_(s∈C) ⟨s,∇f(x_k)⟩ and set x_(k+1)=(1−γ_k)x_k+γ_k s_k with γ_k=2/(k+2). The gap ⟨x_k−s_k,∇f(x_k)⟩ bounds suboptimality for convex f.

C compact convex feasible set, x₀∈C, s linear minimization oracle output, γ step, f differentiable loss.

Construct simplex-constrained historical ensemble weights by repeatedly adding an oracle-selected component

Assumptions — A reliable linear oracle and a smooth convex objective for standard rate guarantees.

Limitations — A costly linear oracle or near-face zigzagging can make iterations inefficient.

Source — Jaggi (2013), Revisiting Frank-Wolfe, Algorithm 1 and §2. https://proceedings.mlr.press/v28/jaggi13.pdf

## Quadratic equality-penalty continuation (quadratic-penalty)

> For equality constraints h(x)=0, solve x_c∈argmin_x [f(x)+(c/2)‖h(x)‖₂²] for increasing c→∞. With continuous f and h, feasible original problem and globally minimizing subproblems, finite accumulation points solve the original problem.

f historical fit objective, h equality residual vector, c>0 penalty weight, x_c penalized optimum.

Fit a historical team-rating model subject to a centering equality using a sequence of relaxed objectives

Assumptions — Subproblem minimizers exist and the iterates have an accumulation point for the limit claim.

Limitations — Large penalties can make the inner system ill-conditioned and finite-c solutions generally violate equality.

Source — Poczos and Tibshirani, CMU 10-725 Optimization, Lecture 16, Penalty Convergence Theorem. https://www.stat.cmu.edu/~ryantibs/convexopt-F13/scribes/lec16.pdf

## Composite trapezoidal quadrature (composite-trapezoid)

> For x_i=a+ih and h=(b−a)/n, Q=h[(f(a)+f(b))/2+Σ_(i=1)^(n−1) f(x_i)].

n positive panel count, Q approximation to ∫_a^b f(x)dx.

Integrate a fitted margin density across a finite score interval

Assumptions — Equal spacing and finite endpoint values; second-order error for C² integrands.

Limitations — An integrable endpoint singularity can make the rule undefined.

Mechanism — Base rule for Romberg; with an ODE-dependent integrand it gives the implicit trapezoidal step.

Source — NIST Digital Library of Mathematical Functions, §3.5(i). https://dlmf.nist.gov/3.5.i

## Composite Simpson quadrature (composite-simpson)

> For positive even n and h=(b−a)/n, Q=(h/3)[f(a)+f(b)+4Σ_(i odd) f(a+ih)+2Σ_(i even, 0<i<n) f(a+ih)].

Odd and even indices are interior grid points, Q estimates ∫_a^b f.

Integrate a smooth fitted race-time density over a finishing-time band

Assumptions — Equal spacing and C⁴ integrand for fourth-order error.

Limitations — Reduced smoothness can remove fourth-order convergence.

Source — NIST Digital Library of Mathematical Functions, §3.5(ii). https://dlmf.nist.gov/3.5.ii

## Romberg integration (romberg-integration)

> R_(k,0)=T(2^k); R_(k,j)=R_(k,j−1)+(R_(k,j−1)−R_(k−1,j−1))/(4^j−1) for 1≤j≤k. Return R_(k,k).

T(n) composite trapezoidal value on n panels, k grid refinement, j extrapolation level.

Integrate a smooth conditional scoring probability over a bounded latent-strength interval

Assumptions — Trapezoidal error has an even-power expansion to the extrapolated order.

Limitations — Endpoint singularities can invalidate the error expansion.

Source — NIST Digital Library of Mathematical Functions, §3.5(iii). https://dlmf.nist.gov/3.5.iii

## Gaussian quadrature (gaussian-quadrature)

> For a positive measure with finite moments through degree 2n, choose n nodes at the roots of its degree-n orthogonal polynomial and weights w_i=∫ℓ_i(x)dμ(x), where ℓ_i are their Lagrange cardinal polynomials. Q=Σ_i w_i f(x_i) is exact for deg f≤2n−1.

μ integration measure, x_i nodes, ℓ_i interpolation basis, n order.

Average a conditional win probability over a fitted latent distribution

Assumptions — Measure has at least n+1 support points; the model specifies the weight before quadrature.

Limitations — Localized peaks between the nodes can be poorly resolved.

Source — NIST Digital Library of Mathematical Functions, §3.5(v). https://dlmf.nist.gov/3.5.v

## Golub–Welsch quadrature construction (golub-welsch)

> For orthonormal polynomials p_j under μ, set J_ij=∫xp_i(x)p_j(x)dμ(x), 0≤i,j<n. For each normalized eigenpair Jv_k=x_kv_k, set w_k=μ(ℝ)(v_k)_0².

J symmetric tridiagonal Jacobi matrix, x_k Gaussian nodes, w_k weights.

Construct nodes and weights once for repeated latent-strength integration

Assumptions — Known recurrence coefficients and positive measure with at least n+1 support points and finite moments through degree 2n.

Limitations — Inaccurate recurrence coefficients perturb both nodes and weights.

Mechanism — Constructs Gaussian quadrature nodes and weights for the same rule; distinct computation, common quadrature output.

Source — NIST Digital Library of Mathematical Functions, §3.5(vi). https://dlmf.nist.gov/3.5.vi

## Continuous beta law (beta-continuous)

> f(x)=x^(a−1)(1−x)^(b−1)Γ(a+b)/(Γ(a)Γ(b)) for 0<x<1 and zero outside [0,1].

a,b>0 shape parameters; Γ gamma function; x continuous proportion.

Model uncertainty for a latent completion rate before an event

Assumptions — Support endpoints fixed and no point masses at 0 or 1.

Limitations — Exact-zero or exact-one proportions require an observation or boundary-mass model.

Source — SciPy maintainers’ reference, scipy.stats.beta, Notes. https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.beta.html

## Symmetric generalized normal residual law (generalized-normal)

> For z=(x−μ)/s, f(x)=p exp(−|z|^p)/(2sΓ(1/p)) on ℝ.

μ location, s>0 scale, p>0 shape, Γ gamma function.

Fit symmetric continuous margin errors with shape learned from earlier observations

Assumptions — Residuals are conditionally symmetric with a common shape.

Limitations — The law cannot represent one-sided heavy tails and p<1 gives a nonconvex location loss.

Source — SciPy maintainers’ reference, scipy.stats.gennorm, Notes. https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.gennorm.html

## Skew-normal residual law (skew-normal)

> For z=(x−μ)/s, f(x)=2φ(z)Φ(az)/s on ℝ.

φ and Φ standard normal density and CDF; μ location; s>0 scale; a real skew parameter.

Model asymmetric residuals in a pre-event continuous performance baseline

Assumptions — Residuals are continuous with a stable asymmetric shape.

Limitations — The shape parameter has limited attainable standardized skewness and retains light tails.

Source — SciPy maintainers’ reference, scipy.stats.skewnorm, Notes. https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.skewnorm.html

## Normal inverse Gaussian residual law (normal-inverse-gaussian)

> For z=(x−μ)/s and r=√(1+z²), f(x)=a K₁(ar) exp(√(a²−b²)+bz)/(πsr) on ℝ.

a>0, |b|<a; μ location; s>0 scale; K₁ modified Bessel function of the second kind of order one.

Fit continuous margin errors with asymmetric exponential tail rates

Assumptions — Residuals are continuous and a shared shape describes the fitting population.

Limitations — Small samples can leave shape weakly identified and the Bessel term needs scaled evaluation in the tails.

Source — SciPy maintainers’ reference, scipy.stats.norminvgauss, Notes. https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.norminvgauss.html

## Secant root iteration (secant-root)

> x_(k+1)=x_k−f(x_k)(x_k−x_(k−1))/(f(x_k)−f(x_(k−1))).

f scalar residual; x_k current estimate; x_(k−1) previous estimate.

Invert a monotone calibration map when derivative evaluation is unavailable

Assumptions — Two distinct starting points near a simple root and nonzero divided differences.

Limitations — No bracket is preserved and near-equal residuals destabilize the update.

Source — NIST DLMF §3.8(iii), Eq. 3.8.6 and Secant Method. https://dlmf.nist.gov/3.8.E6

## Halley root iteration (halley-root)

> x_(k+1)=x_k−2f(x_k)f′(x_k)/(2f′(x_k)²−f(x_k)f″(x_k)).

f scalar residual; f′ and f″ its derivatives; x_k current estimate.

Invert a smooth fitted quantile equation when both derivatives are cheap

Assumptions — Smooth f, simple root, nearby initialization and nonzero denominator.

Limitations — A small denominator or poor initialization can produce an arbitrarily large step.

Source — NIST DLMF §3.8(v), Eq. 3.8.12. https://dlmf.nist.gov/3.8.E12

## Steffensen fixed-point acceleration (steffensen-fixed-point)

> u=g(x_k), v=g(u), x_(k+1)=x_k−(u−x_k)²/(v−2u+x_k). Return x_k if u=x_k.

g scalar fixed-point map; u and v successive images of x_k.

Accelerate convergence of an iterated one-dimensional shrinkage equation

Assumptions — Locally smooth map, fixed point with g′≠1 and nonzero second difference away from convergence.

Limitations — Cancellation can dominate the denominator near a fixed point; a safeguard is needed when it vanishes.

Source — NIST DLMF §3.8(iii), Eq. 3.8.7. https://dlmf.nist.gov/3.8.E7

## Barycentric polynomial interpolation (barycentric-polynomial-interpolation)

> For distinct nodes x_i, set w_i=1/Π_(j≠i)(x_i−x_j), and P(x)=[Σ_i w_i y_i/(x−x_i)]/[Σ_i w_i/(x−x_i)]. Return y_i directly at x=x_i.

x_i input nodes, y_i ordinates, w_i barycentric weights, P degree at most n−1.

Interpolate a small table of model-based expected scoring probabilities across a prior-fit parameter grid

Assumptions — A low-degree polynomial gives a useful interpolant on the given interval.

Limitations — High degree on equispaced nodes can yield oscillations; extreme spacing can also make weights ill-conditioned.

Source — SciPy maintainers’ reference, BarycentricInterpolator, Notes and boundary conditions. https://docs.scipy.org/doc/scipy/reference/generated/scipy.interpolate.BarycentricInterpolator.html

## Natural cubic spline interpolation (natural-cubic-spline)

> Choose piecewise cubic S with S(x_i)=y_i and continuity of S′ and S″ at interior knots. Enforce S″(x_0)=S″(x_(n−1))=0. For two knots this reduces to linear interpolation.

S interpolant, x_i strictly increasing knots, y_i real ordinates.

Interpolate a smooth expected duration curve over a historical exposure grid

Assumptions — At least two knots and natural endpoint conditions appropriate for the intended interpolation.

Limitations — Zero curvature at endpoints may be a poor approximation and does not generally imply linear extrapolation.

Source — SciPy maintainers’ reference, CubicSpline, Notes and boundary conditions. https://docs.scipy.org/doc/scipy/reference/generated/scipy.interpolate.CubicSpline.html

## Monotonicity-preserving cubic Hermite interpolation (pchip-interpolation)

> Let h_i=x_(i+1)−x_i, d_i=(y_(i+1)−y_i)/h_i. At interior knot i set m_i=0 when d_(i−1)d_i≤0; otherwise set (w₁+w₂)/m_i=w₁/d_(i−1)+w₂/d_i with w₁=2h_i+h_(i−1), w₂=h_i+2h_(i−1). At the left endpoint use r=((2h₀+h₁)d₀−h₀d₁)/(h₀+h₁), returning 0 if sign(r)≠sign(d₀), or 3d₀ if sign(d₀)≠sign(d₁) and |r|>3|d₀|, and r otherwise. Apply the reflected rule on the right. Join values and slopes by cubic Hermite segments. For two knots use the secant at both ends.

x_i increasing knots, y_i sample ordinates, m_i knot derivative, d_i interval secant.

Interpolate an already monotone table of prior-fit cumulative probabilities without overshooting

Assumptions — At least two knots, support restricted to knot span for the shape guarantee.

Limitations — Second derivatives can jump and interpolating noisy knots preserves their noise.

Source — SciPy maintainers’ reference, PchipInterpolator, Notes and boundary conditions. https://docs.scipy.org/doc/scipy/reference/generated/scipy.interpolate.PchipInterpolator.html

## Forward Euler integration (forward-euler-ode)

> For y′=f(t,y), set y_(n+1)=y_n+h f(t_n,y_n) and t_(n+1)=t_n+h. On y′=λy the amplification is R(z)=1+z with z=hλ.

h>0 step, t_n time, y_n state, f drift, λ scalar test rate.

Simulate a short-horizon deterministic latent fatigue trajectory with weak mean reversion

Assumptions — Smooth nonstiff trajectory and sufficiently small h for first-order global accuracy.

Limitations — A decaying scalar mode grows numerically when |1+hλ|>1.

Source — MIT 18.330 numerical methods lecture notes, chapter 5, Methods for Ordinary Differential Equations. https://math.mit.edu/icg/resources/teaching/18.330/18.330-Mar21.pdf

## Backward Euler integration (backward-euler-ode)

> Solve y_(n+1)=y_n+h f(t_n+h,y_(n+1)). On y′=λy its amplification is R(z)=1/(1−z) with z=hλ.

h>0 step, t_n time, y_n state, f drift, λ scalar test rate.

Advance a stiff latent recovery model with fast decay and slower forcing

Assumptions — A consistent implicit solution is found at each step; smooth trajectory for first-order global accuracy.

Limitations — The nonlinear solve may fail, and large steps can erase transient behavior.

Source — MIT 18.330 numerical methods lecture notes, chapter 5, Methods for Ordinary Differential Equations. https://math.mit.edu/icg/resources/teaching/18.330/18.330-Mar21.pdf

## Implicit trapezoidal ODE integration (implicit-trapezoidal-ode)

> Solve y_(n+1)=y_n+(h/2)[f(t_n,y_n)+f(t_n+h,y_(n+1))]. On y′=λy, R(z)=(1+z/2)/(1−z/2) for z=hλ.

h>0 step, t_n time, y_n state, f drift, λ scalar test rate.

Propagate a smooth latent tempo state between event timestamps

Assumptions — Smooth drift and consistent solution of the implicit equation for second-order global accuracy.

Limitations — Very stiff modes can oscillate with amplification near −1.

Source — ETH Zürich Numerical Analysis II lecture notes, equation 4.38. https://people.math.ethz.ch/~grsam/SS26/NAII/resources/lecture_notes_2026.pdf

## Classical four-stage Runge–Kutta method (classical-rk4)

> Let k₁=f(t,y), k₂=f(t+h/2,y+hk₁/2), k₃=f(t+h/2,y+hk₂/2), k₄=f(t+h,y+hk₃). Set y_new=y+(h/6)(k₁+2k₂+2k₃+k₄).

h>0 step, t time, y state, k_i staged drifts.

Simulate a smooth coupled pace and stamina model at a declared time resolution

Assumptions — Sufficiently smooth nonstiff vector field for fourth-order global accuracy.

Limitations — No local error estimate from the four stages alone and stability limits the step on stiff systems.

Source — NIST DLMF §3.7(v), Eqs. 3.7.18–19. https://dlmf.nist.gov/3.7.E18

## Bogacki–Shampine embedded Runge–Kutta pair (bogacki-shampine-rk23)

> Set k₁=f(t,y), k₂=f(t+h/2,y+hk₁/2), k₃=f(t+3h/4,y+3hk₂/4), Y₃=y+h(2k₁/9+k₂/3+4k₃/9), k₄=f(t+h,Y₃), and Y₂=y+h(7k₁/24+k₂/4+k₃/3+k₄/8). Use Y₃ for advancement and Y₂−Y₃ for a local error estimate.

h>0 proposed step, f drift, k_i stages, Y₂ and Y₃ second- and third-order trial states.

Adapt resolution during simulation of a fitted change in movement intensity

Assumptions — Smooth nonstiff dynamics; declare an error norm and tolerance before adapting steps.

Limitations — The embedded difference can underestimate actual error near a discontinuity.

Source — SciPy maintainers’ RK23 reference and implementation. https://docs.scipy.org/doc/scipy/reference/generated/scipy.integrate.RK23.html

## Velocity Verlet integration (velocity-verlet)

> For q″=a(q), set v_(n+1/2)=v_n+(h/2)a(q_n), q_(n+1)=q_n+h v_(n+1/2), v_(n+1)=v_(n+1/2)+(h/2)a(q_(n+1)).

q position, v velocity, a position-only acceleration, h>0 fixed step.

Simulate a synthetic conservative trajectory as a baseline for tracking error analysis

Assumptions — Smooth position-only force; symplecticity applies to conservative forces in canonical variables with constant mass.

Limitations — Velocity-dependent drag lies outside this recurrence; the harmonic oscillator becomes unstable for hω>2.

Source — Hairer, Lubich and Wanner, Geometric numerical integration illustrated by the Störmer–Verlet method, §1.1. https://www.math.mcgill.ca/gantumur/docs/down/gniverlet.pdf

## Dijkstra shortest paths (dijkstra-shortest-path)

> Initialize d(s)=0 and all other labels =∞. Repeatedly finalize the unsettled vertex u with minimum d(u), then relax each outgoing edge by d(v)←min(d(v),d(u)+w(u,v)). Stop when all remaining distances are infinite.

s source, d tentative distance, w edge cost, u finalized vertex.

Find minimum-cost movement routes across a position graph assembled from earlier tracking data

Assumptions — Finite graph with nonnegative edge costs.

Limitations — A negative edge can invalidate the finalized label.

Source — SciPy maintainers’ csgraph shortest_path reference. https://docs.scipy.org/doc/scipy/reference/generated/scipy.sparse.csgraph.shortest_path.html

## Bellman–Ford shortest paths (bellman-ford-shortest-path)

> Set d₀(s)=0 and d₀(v)=∞ otherwise. For k=1,…,|V|−1, set d_k(v)=min(d_(k−1)(v), min_(u→v)(d_(k−1)(u)+w(u,v))). Further strict improvement at k=|V| detects a reachable negative cycle.

k edge budget, w directed edge cost, s source vertex, V vertex set.

Find a least-cost route in a historical tactical transition graph with signed adjustments

Assumptions — Finite weighted directed graph; shortest distances are finite only for reachable vertices unaffected by reachable negative cycles.

Limitations — A reachable negative cycle requires separate handling before returning affected distances.

Source — SciPy maintainers’ csgraph shortest_path reference. https://docs.scipy.org/doc/scipy/reference/generated/scipy.sparse.csgraph.shortest_path.html

## Floyd–Warshall all-pairs paths (floyd-warshall)

> Start D_ij=min costs of direct i→j edges, with ∞ for missing edges and the empty path of weight 0 on the diagonal. For each k set D_ij←min(D_ij,D_ik+D_kj) for all i,j. A negative D_ii signals a negative cycle.

D distance matrix, i,j endpoints, k newly allowed intermediate vertex.

Precompute minimum transition costs among a small set of tactical zones

Assumptions — Finite graph; no negative cycle for ordinary finite shortest-path interpretation.

Limitations — Dense working memory and cubic runtime are prohibitive on large sparse graphs.

Source — SciPy maintainers’ csgraph shortest_path reference. https://docs.scipy.org/doc/scipy/reference/generated/scipy.sparse.csgraph.shortest_path.html

## Kruskal minimum spanning forest (kruskal-spanning-forest)

> Start F=∅. Process undirected edges in nondecreasing cost order; set F←F∪{e} only when the endpoints of e belong to different components of F.

F set of accepted edges, e weighted undirected edge, components maintained by union–find.

Summarize a graph of distances among historical team playing styles

Assumptions — Finite undirected graph; use a stable tie-break if a reproducible forest is required.

Limitations — Ties can yield several optimal forests and the forest omits redundant edges relevant to robustness.

Source — SciPy maintainers’ minimum_spanning_tree reference. https://docs.scipy.org/doc/scipy/reference/generated/scipy.sparse.csgraph.minimum_spanning_tree.html

## HITS hub and authority scores (hits-hub-authority)

> For nonnegative adjacency A where rows are sources, seek a,h with a∝Aᵀh and h∝Aa and normalize to unit Euclidean norm. Take leading right and left singular vectors for a and h, with paired signs.

A weighted adjacency, a authority vector, h hub vector.

Identify complementary receiving and supplying roles in an earlier passing network

Assumptions — Nonzero graph; simple largest singular value for uniqueness up to joint sign.

Limitations — Disconnected dominant components can tie, and small spectral gaps make scores sensitive.

Source — NetworkX maintainers’ HITS reference and implementation. https://networkx.org/documentation/stable/reference/algorithms/generated/networkx.algorithms.link_analysis.hits_alg.hits.html

## Kruskal–Wallis independent-group rank test (kruskal-wallis)

> Pool N observations and assign midranks. For group i with size n_i and rank total R_i, H=[12Σ_i(R_i²/n_i)/(N(N+1))−3(N+1)]/C, where C=1−Σ_j(t_j³−t_j)/(N³−N). Compare H to χ² with g−1 degrees of freedom.

g groups, t_j sizes of pooled tie blocks, C tie correction.

Assess whether independent historical forecast-error samples differ across predeclared competitions

Assumptions — Independent samples, exchangeability under the common-distribution null, C>0, and sufficiently large groups for chi-square calibration.

Limitations — A rejection can reflect unequal distribution shapes, and small groups can require permutation calibration.

Source — SciPy maintainers’ reference and implementation, scipy.stats.kruskal. https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.kruskal.html

## Friedman complete-block rank test (friedman-rank-test)

> Rank g methods within each of b complete blocks using midranks. With rank totals R_i, Q=[12Σ_i R_i²/(bg(g+1))−3b(g+1)]/C, where C=1−Σ_jΣ_k(t_jk³−t_jk)/(b(g³−g)). Use an approximate χ²_(g−1) tail.

t_jk size of tie block k within observational block j, C tie correction.

Compare predeclared forecasting methods on the same earlier matched assessment blocks

Assumptions — Blocks are independent, all methods appear in each block, and ranks are exchangeable under the null; C>0.

Limitations — The chi-square approximation can be inaccurate with small b or g.

Source — SciPy maintainers’ reference and implementation, scipy.stats.friedmanchisquare. https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.friedmanchisquare.html

## Fligner–Killeen scale test (fligner-killeen)

> Center each group at its sample median and pool absolute deviations. Let r_j be the pooled midrank and a_j=Φ⁻¹(1/2+r_j/[2(N+1)]). Form Q=Σ_i n_i(ā_i−ā)²/s_a² with pooled sample variance s_a²; use χ²_(g−1) as a large-sample reference.

N pooled size, n_i group size, ā_i group score mean, ā pooled score mean, Φ normal CDF.

Assess stability of historical margin-error dispersion across independent competition samples

Assumptions — Independent groups, positive score variance, and common distribution shape for a pure scale interpretation.

Limitations — Different shapes can affect the statistic even when a chosen scale summary agrees.

Source — SciPy maintainers’ reference and implementation, scipy.stats.fligner. https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.fligner.html

## Ansari–Bradley two-sample scale test (ansari-bradley)

> Rank pooled observations from the outermost values toward the center using scores c(r)=min(r,N+1−r) for ordered positions r. Average these scores within any tied block. A=Σ_(observations in sample 1)c is compared to its fixed-group-size exchangeable distribution, or a tie-adjusted large-sample approximation.

N pooled size, r position in sorted sample, c center-weighted score, A observed statistic.

Compare dispersion of archived residuals from two comparable baselines with a common center

Assumptions — Independent samples with equal location under the scale comparison; shared continuous shape for scale interpretation.

Limitations — Location differences affect ranks, and standard no-tie exact calibration fails in tied samples.

Source — SciPy maintainers’ reference and implementation, scipy.stats.ansari. https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.ansari.html

## Jacobi stationary linear solver (jacobi-linear-solve)

> Split A=D+L+U into diagonal, strict lower, and strict upper parts. Iterate x_(k+1)=D⁻¹[b−(L+U)x_k]. Convergence for every initial vector holds when ρ(−D⁻¹(L+U))<1.

A coefficient matrix, b right-hand side, x iterate, ρ spectral radius.

Fit an earlier high-dimensional linear baseline with sparse and diagonally dominant normal equations

Assumptions — Nonzero diagonal and contraction of the iteration matrix in spectral radius.

Limitations — Convergence can be slow for weak diagonal dominance and can fail even for some positive definite systems.

Source — Barrett et al., Templates for the Solution of Linear Systems, Netlib. https://www.netlib.org/templates/templates.html

## Gauss–Seidel stationary linear solver (gauss-seidel-linear-solve)

> With A=D+L+U, solve (D+L)x_(k+1)=b−Ux_k in increasing component order. Equivalently each update uses the latest already-computed lower-index entries.

A coefficient matrix, D diagonal, L/U strict triangular parts, b right-hand side.

Solve an ordered sparse historical feature system by sequential coordinate updates

Assumptions — Nonzero diagonal; symmetric positive definite or strictly diagonally dominant A suffices for convergence.

Limitations — Ordering changes convergence and the triangular dependency limits naive parallelism.

Source — Barrett et al., Templates for the Solution of Linear Systems, Netlib. https://www.netlib.org/templates/templates.html

## GMRES minimum-residual solver (gmres-linear-solve)

> Set r₀=b−Ax₀ and K_k=span(r₀,Ar₀,…,A^(k−1)r₀). Compute x_k=argmin_(x∈x₀+K_k)‖b−Ax‖₂ using an Arnoldi orthonormal basis and its Hessenberg least-squares problem.

A real square matrix, x₀ initial estimate, b right-hand side, k Krylov dimension.

Fit a coupled sparse linear state system whose coefficient matrix is nonsymmetric

Assumptions — Nonsingular A for the general full-dimensional exact-arithmetic claim; stop immediately if r₀=0.

Limitations — Basis growth increases memory, and restarting can stall.

Mechanism — Residual minimization over a Krylov space. MINRES exploits symmetry via Lanczos and short recurrences.

Source — Barrett et al., Templates for the Solution of Linear Systems, Netlib. https://www.netlib.org/templates/templates.html

## MINRES symmetric minimum-residual solver (minres-linear-solve)

> For r₀=b−Ax₀ and β=‖r₀‖₂, build Lanczos basis V_k and tridiagonal extension T̄_k from A V_k=V_(k+1)T̄_k. Set x_k=x₀+V_k z where z minimizes ‖βe₁−T̄_k z‖₂, using sequential rotations and short recurrences.

A symmetric system, β initial residual norm, e₁ first coordinate, V_k orthonormal, z reduced coefficients.

Solve a symmetric indefinite optimality system for an equality-constrained historical fit

Assumptions — A real symmetric, possibly indefinite; stop immediately at β=0 and handle terminated Lanczos runs in their attained subspaces.

Limitations — Symmetry loss invalidates the short recurrence, and residual minimization alone does not guarantee a minimum-norm solution for singular problems.

Mechanism — Same Krylov residual objective as unrestarted GMRES under symmetry; distinct basis and computation.

Source — SciPy maintainers’ minres reference and Barrett et al., Templates, Symmetric Lanczos Methods. https://docs.scipy.org/doc/scipy/reference/generated/scipy.sparse.linalg.minres.html

## Univariate Theil–Sen regression (theil-sen-simple)

> For distinct predictor pairs, set β̂=median_((i,j):i<j,x_i≠x_j)[(y_j−y_i)/(x_j−x_i)] and α̂=median_i(y_i−β̂x_i). Predict ŷ=α̂+β̂x.

x continuous predictor, y response, α̂ joint-median intercept, β̂ slope.

Fit the historical relation between rest time and score margin with resistance to vertical outliers

Assumptions — At least two distinct x values and a meaningful single linear trend.

Limitations — Quadratic pair enumeration and weak identification when predictors are tightly clustered.

Source — SciPy maintainers’ reference, scipy.stats.theilslopes. https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.theilslopes.html

## Siegel repeated-median regression (siegel-repeated-median)

> For each i with an available nonvertical pair, set b_i=median_(j:x_j≠x_i)[(y_j−y_i)/(x_j−x_i)]. Then β̂=median_i b_i and α̂=median_i(y_i−β̂x_i).

x continuous predictor, y response, b_i local slope median, α̂ joint residual median.

Fit a baseline relationship between prior training load and an earlier continuous performance measurement

Assumptions — At least two distinct predictor values; robust simple linear trend is the target.

Limitations — Can be expensive for large tables, and duplicate predictor values reduce usable slopes.

Source — SciPy maintainers’ reference, scipy.stats.siegelslopes. https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.siegelslopes.html

## RANSAC consensus regression (ransac-consensus-regression)

> For T trials draw a small subset S, fit θ_S, then let I_S={i: ℓ(y_i,f(x_i;θ_S))≤τ}. Select the candidate with maximum |I_S|, break ties by the declared inlier fit criterion, and refit the model on its inliers.

x,y regression data, θ parameters, ℓ point loss, τ threshold, T trial budget, I_S inlier set.

Fit a historical tracking relation under sporadic measurement outliers

Assumptions — At least one nondegenerate all-inlier subset can be sampled with meaningful probability.

Limitations — Poor threshold or competing regimes can select a majority relation unrelated to the target.

Source — Scikit-learn maintainers’ linear models guide, RANSAC. https://scikit-learn.org/stable/modules/linear_model.html#ransac-random-sample-consensus

## Raw minimum covariance determinant estimator (raw-minimum-covariance-determinant)

> For a declared h, find H*=argmin_(H⊆{1,…,n}, |H|=h) det S_H, where S_H=h⁻¹Σ_(i∈H)(x_i−μ_H)(x_i−μ_H)ᵀ and μ_H=h⁻¹Σ_(i∈H)x_i. Return (μ_H*,S_H*) before consistency correction or reweighting.

x_i∈ℝ^d, n sample count, h support count, μ_H subset mean, S_H subset covariance.

Estimate robust feature scatter as a preprocessing input for a prior-fit multivariate model

Assumptions — d+1≤h≤n and data in general position for nonsingular support subsets.

Limitations — Near-singular clouds make determinant comparisons unstable, and a single robust ellipsoid poorly represents multiple clusters.

Source — Scikit-learn maintainers’ covariance guide, Minimum Covariance Determinant. https://scikit-learn.org/stable/modules/covariance.html#minimum-covariance-determinant

## Vector autoregression (vector-autoregression)

> Set y_t=c+Σ_(j=1)^p A_j y_(t−j)+ε_t. Under serially uncorrelated zero-mean innovations and stable companion matrix, the conditional one-step mean is c+Σ_j A_j y_(t−j).

y_t∈ℝ^d, c intercept, A_j d×d lag matrices, ε_t innovations, p lag order.

Forecast earlier aligned scoring rate and possession indicators jointly

Assumptions — Covariance stationarity requires companion eigenvalues strictly inside the unit disk with finite innovation covariance; unrestricted fitting requires full-rank lag design.

Limitations — Unmodeled integration or too many cross-lags can invalidate inference or destabilize estimates.

Mechanism — VECM reparameterizes a cointegrated VAR with explicit reduced rank; usual stable VAR and cointegrated levels VAR differ in root structure.

Source — statsmodels maintainers’ vector autoregressions guide. https://www.statsmodels.org/stable/vector_ar.html

## Reduced-rank vector error-correction model (vector-error-correction)

> Set Δy_t=αβᵀy_(t−1)+Σ_(j=1)^(p−1) Γ_j Δy_(t−j)+ε_t. Impose rank(αβᵀ)=r with 0<r<d for the stated cointegrated specification.

Δ first difference, y_t∈ℝ^d, α and β full-column-rank d×r matrices, Γ_j short-run coefficients, p order in levels.

Study whether co-moving prior performance indicators correct deviations from a long-run relation when integration assumptions are plausible

Assumptions — Components are I(1) with stationary βᵀy_t, rank r, no I(2) directions and stable transitory modes; this form omits deterministic terms.

Limitations — Cointegration rank and adjustment estimates can be sensitive to structural breaks and deterministic assumptions.

Mechanism — Reduced-rank error-correction reparameterization of a cointegrated VAR; explicit rank restriction changes fitted model class.

Source — statsmodels maintainers’ API reference, VECM. https://www.statsmodels.org/stable/generated/statsmodels.tsa.vector_ar.vecm.VECM.html

## Markov-switching autoregression (markov-switching-ar)

> Let S_t be a hidden first-order Markov chain with transition P. Set y_t−μ_(S_t)=Σ_(j=1)^p φ_(j,S_t)[y_(t−j)−μ_(S_(t−j))]+ε_t with ε_t conditionally independent N(0,σ²_(S_t)) given the state path.

S_t∈{1,…,K}, μ_s regime mean, φ_(j,s) lag effects, σ_s>0 regime noise, P transition law.

Model persistence and switching in an earlier timestamped series of performance residuals

Assumptions — Conditional distribution specified for initial observations and regimes; forecast uses filtered state probabilities.

Limitations — Regime labels are interchangeable, and augmented filtering grows rapidly with lag order.

Source — statsmodels maintainers’ API reference, MarkovAutoregression. https://www.statsmodels.org/stable/generated/statsmodels.tsa.regime_switching.markov_autoregression.MarkovAutoregression.html

## Linear Gaussian dynamic factor model (dynamic-factor-model)

> Set y_t=Λf_t+e_t, f_t=Σ_(j=1)^p A_j f_(t−j)+u_t, with independent centered Gaussian e_t∼N(0,R) and u_t∼N(0,I_r), also independent across time. Use a companion state to filter and forecast f_t.

y_t∈ℝ^d, f_t∈ℝ^r with r<d, Λ loading matrix, R observation noise covariance, A_j factor lag matrices.

Extract a shared prior-history performance factor from several noisy team indicators

Assumptions — Aligned series share latent factors; choose loading identification constraints if interpreting individual factors.

Limitations — Rotations preserve observational likelihood absent identifying constraints, and omitted correlated noise can mimic a factor.

Source — statsmodels maintainers’ API reference, DynamicFactor. https://www.statsmodels.org/stable/generated/statsmodels.tsa.statespace.dynamic_factor.DynamicFactor.html

## Benjamini–Yekutieli false discovery control (benjamini-yekutieli)

> For ordered valid p-values p_(1)≤…≤p_(m), let H_m=Σ_(j=1)^m 1/j and q∈(0,1). Set k=max({0}∪{i:p_(i)≤i q/(m H_m)}); reject the first k hypotheses.

m positive number of hypotheses; p_(i) sorted p-values; H_m harmonic sum; q target false discovery rate; k rejection count.

Audit multiplicity in a prespecified family of scientific comparisons on permitted development data

Assumptions — Prespecified family of valid super-uniform null p-values; arbitrary dependence allowed under the theorem.

Limitations — Conservative for large families; invalid or adaptively selected p-values can invalidate guarantees.

Mechanism — Harmonic adjustment changes the rejection threshold under arbitrary dependence; not an additional independent test of the same hypothesis.

Source — Benjamini and Yekutieli (2001), The control of the false discovery rate in multiple testing under dependency, Theorem 1.3; SciPy false_discovery_control documentation: https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.false_discovery_control.html

## One-dimensional energy distance (energy-distance-1d)

> D(P,Q)=[2E|X−Y|−E|X−X′|−E|Y−Y′|]^(1/2), where X,X′ independently follow P and Y,Y′ independently follow Q, with all four draws independent.

P,Q real-valued distributions; X,X′,Y,Y′ independent draws; D nonnegative distance.

Describe distribution changes between comparable historical measurements or residuals

Assumptions — Finite first absolute moments; comparable measurement units; empirical plug-in uses empirical product distributions.

Limitations — Magnitude depends on measurement scale; distance alone is not a significance test and does not establish causality.

Source — SciPy maintainers, energy_distance API, mathematical definition and references. https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.energy_distance.html

## Two-sample Cramér–von Mises test (cvm-two-sample)

> T=(nm/(n+m))∫[F_n(x)−G_m(x)]² dH_(n+m)(x), with H_(n+m)=(nF_n+mG_m)/(n+m), evaluated for continuous distributions without ties.

F_n,G_m empirical distribution functions, n,m positive sample sizes, H pooled empirical CDF, T discrepancy statistic.

Investigate whether comparable independent historical samples have the same distribution

Assumptions — Independent samples and independent observations within samples from continuous distributions under the usual null; the stated statistic assumes no ties.

Limitations — Dependent sequences require a separately justified test; discrete data and ties need an appropriate rank and null-distribution treatment.

Mechanism — Two empirical distributions are compared, unlike the one-sample test against a specified theoretical CDF.

Source — SciPy maintainers, cramervonmises_2samp API and references. https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.cramervonmises_2samp.html

## One-dimensional Wasserstein-1 distance (wasserstein-one-dimensional)

> W_1(P,Q)=∫_ℝ |F_P(x)−F_Q(x)| dx, equivalently the minimum expected absolute transport cost over couplings of P and Q.

P,Q real-valued probability distributions; F_P,F_Q cumulative distribution functions; W_1 nonnegative distance.

Describe shifts between distributions of comparable measurements in authorised historical samples.

Assumptions — Both distributions have finite first absolute moments and use the same measurement scale..

Limitations — Sensitive to the measurement scale; this distance alone is not a significance test..

Mechanism — Integrates absolute CDF difference rather than the squared CDF difference used in the one-dimensional energy distance identity.

Source — SciPy maintainers, wasserstein_distance API, definition and references. https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.wasserstein_distance.html

## Two-sample Kolmogorov–Smirnov test (ks-two-sample)

> D_(n,m)=sup_x |F_n(x)−G_m(x)| for the two-sided test of equality of continuous distributions.

F_n,G_m empirical cumulative distribution functions; n,m sample sizes; D statistic in [0,1].

Assess distribution differences between two comparable independent authorised historical samples.

Assumptions — Independent samples with independent observations within each sample; usual distribution-free reference assumes continuous null distribution..

Limitations — Dependent or discrete observations need a separately justified null reference; a small statistic does not prove equality..

Mechanism — Maximum empirical CDF separation, distinct from the integrated squared CDF discrepancy.

Source — SciPy maintainers, ks_2samp API, two-sided statistic and references. https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.ks_2samp.html

## Mann–Whitney U rank statistic and test (mann-whitney-u)

> U_X=Σ_i Σ_j [1(X_i>Y_j)+0.5·1(X_i=Y_j)]; under the equal-distribution independent-sample null E[U_X]=nm/2.

X_i and Y_j observations, n and m sample sizes, 1 indicator function; U_X pairwise rank statistic.

Compare distributions of independent, comparable measurements in permitted development samples.

Assumptions — Independent groups and independent observations; use a null reference appropriate to ties and sample size..

Limitations — Not generally a test of median equality; paired or serially dependent observations require a different design..

Mechanism — Distinct from signed-rank test for paired observations.

Source — SciPy maintainers, mannwhitneyu API and references. https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.mannwhitneyu.html

## Welch two-sample t-test (welch-two-sample-t)

> T=(mean_X−mean_Y)/√(s_X²/n+s_Y²/m); ν=(a+b)²/[a²/(n−1)+b²/(m−1)], a=s_X²/n, b=s_Y²/m.

n,m≥2 sample sizes; sample means mean_X,mean_Y; unbiased sample variances s_X²,s_Y²; ν approximate degrees of freedom.

Assess differences in mean comparable measurements across genuinely independent historical groups.

Assumptions — Independent observations and independent samples, positive combined standard error, normality or adequate large-sample approximation; equal population variances not required..

Limitations — Heavy tails and small skewed samples can impair approximation; not suited to paired forecast errors..

Source — SciPy maintainers, ttest_ind API, equal_var=False, and Welch reference. https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.ttest_ind.html

## Mean-centred Levene variance test (levene-mean-center)

> Let z_ij=|x_ij−mean_i(x)|. W=((N−k)/(k−1))·[Σ_i n_i(mean_i(z)−mean(z))²]/[Σ_iΣ_j(z_ij−mean_i(z))²].

k≥2 groups, n_i group sizes, N total size, z absolute deviations from group mean, W approximate F statistic.

Investigate variation differences between comparable independent development samples.

Assumptions — Independent groups and observations, nonzero within-group deviation sum of squares, N>k; mean-centred version appropriate mainly for symmetric moderately tailed samples..

Limitations — Approximate F reference can be poor under severe skew, heavy tails or small samples; no proof of equal variances from non-rejection..

Source — SciPy maintainers, levene API, center='mean', and Levene (1960). https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.levene.html

## Brunner–Munzel relative-effect test (brunner-munzel-test)

> Let h(x,y)=1(x<y)+0.5·1(x=y), p̂=Σ_iΣ_j h(X_i,Y_j)/(nm), A_i=Σ_j h(X_i,Y_j)/m, B_j=Σ_i h(X_i,Y_j)/n. W=(p̂−0.5)/√(s_A²/n+s_B²/m), with sample variances of A and B.

X,Y independent groups; n,m≥2; p̂ relative-effect estimate; s_A²,s_B² unbiased sample variances; W studentized statistic.

Compare relative ordering between comparable independent measurements in development samples.

Assumptions — Independent samples and independent observations within each group; nonzero estimated standard error; approximate reference distribution justified..

Limitations — Small samples and zero variance may make the approximation unreliable; tests relative effect, not general equality of distributions..

Mechanism — Studentizes a relative-effect estimate with separate group placement variances; unlike the equal-distribution Mann–Whitney null.

Source — SciPy maintainers, brunnermunzel API and references to Brunner and Munzel (2000). https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.brunnermunzel.html

## Bartlett homogeneity-of-variance test (bartlett-variance-test)

> Let v_i=n_i−1, V=Σ_i v_i, s_p²=Σ_i v_i s_i²/V. B=[V ln(s_p²)−Σ_i v_i ln(s_i²)]/[1+(Σ_i 1/v_i−1/V)/(3(k−1))].

k≥2 independent groups; n_i≥2 sizes; s_i² positive unbiased sample variances; B corrected likelihood-ratio statistic.

Assess variability across comparable independent groups when normality is defensible.

Assumptions — Independent normally distributed observations and groups; positive variances; chi-square approximation with k−1 degrees of freedom under equal variances..

Limitations — Sensitive to non-normality; does not prove equality when non-significant..

Source — SciPy maintainers, bartlett API and references. https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.bartlett.html

## Paired Student t-test (paired-student-t)

> For matched observations let d_i=x_i−y_i, T=mean(d)/(s_d/√n); under independent normally distributed differences with zero mean, T∼t_(n−1).

n≥2 matched pairs; d_i difference; s_d positive unbiased sample standard deviation; T statistic.

Assess mean differences on matched development observations when pairwise independence is defensible.

Assumptions — Pairs correctly matched; differences independent across pairs and normally distributed for exact reference, or an adequate asymptotic approximation..

Limitations — Serial or clustered differences require dependence-aware inference; extreme differences can dominate the mean..

Source — SciPy maintainers, ttest_rel API, statistic and degrees of freedom. https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.ttest_rel.html

## Exact paired sign test (paired-exact-sign-test)

> Discard exact zero differences under a prespecified policy. For n nonzero paired differences let K=Σ_i 1(d_i>0); under independent signs with probability 1/2, K∼Binomial(n,1/2).

d_i matched difference; n positive number of nonzero differences; K positive-sign count.

Assess directional differences between matched authorised development measurements.

Assumptions — Independent matched-pair differences; under the null, positive and negative signs equally probable conditional on being nonzero..

Limitations — Discards magnitude information; cannot infer equality of means; zero differences require transparent handling..

Source — NIST Dataplot reference, SIGN TEST; SciPy binomtest API for exact binomial reference. https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.binomtest.html

## Pearson chi-square test of independence (pearson-contingency-independence)

> For a contingency table with r rows, c columns and N total observations, E_ij=R_i C_j/N and X²=Σ_iΣ_j (O_ij−E_ij)²/E_ij.

O observed counts; R,C marginal counts; E expected counts under independence; N>0; r,c≥2.

Investigate association between comparable categorical variables in authorised development records.

Assumptions — Independent observational units, positive marginal totals, sufficient expected counts for the asymptotic chi-square reference with (r−1)(c−1) degrees of freedom..

Limitations — Sparse cells may invalidate approximation; dependence between repeated observations is not accounted for..

Source — SciPy maintainers, chi2_contingency API; Pearson statistic with correction=False and lambda_=None. https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.chi2_contingency.html

## Fisher exact test for 2×2 contingency tables (fisher-exact-two-by-two)

> Conditional on fixed margins, P(A=a)=C(R_1,a)C(R_2,C_1−a)/C(N,C_1). A two-sided probability-ordering p-value sums probabilities of feasible tables no more probable than the observed table.

A top-left count; R_1,R_2 row totals; C_1 first-column total; N=R_1+R_2; C binomial coefficient.

Assess association in small two-by-two tables of independent development observations.

Assumptions — Independent observational units and valid conditioning on margins under the null odds ratio of one..

Limitations — Discrete p-values can be conservative; two-sided conventions differ; does not estimate causal effects..

Source — SciPy maintainers, fisher_exact API and Notes for a 2×2 table. https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.fisher_exact.html

## Classical one-way fixed-effects ANOVA (one-way-fixed-effects-anova)

> For k groups, F=[Σ_i n_i(mean_i−grand_mean)²/(k−1)]/[Σ_iΣ_j(x_ij−mean_i)²/(N−k)].

k≥2 groups; n_i group sizes; N total observations; mean_i group means; grand_mean pooled mean.

Compare means of comparable independent groups of historical development measurements.

Assumptions — Independent normal observations within and across groups, common positive population variance, N>k; null equal group means..

Limitations — Sensitive to unequal variances in unbalanced samples; rejection does not identify which groups differ..

Source — SciPy maintainers, f_oneway API, equal_var=True, and references. https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.f_oneway.html

## Cochran Q test for matched binary measurements (cochran-q-matched-binary)

> For n independent blocks and k≥3 binary conditions, let C_j=Σ_i x_ij, R_i=Σ_j x_ij, T=Σ_j C_j. Q=(k−1)[kΣ_j C_j²−T²]/[kT−Σ_i R_i²].

x_ij∈{0,1}; n blocks; k conditions; C_j column totals; R_i row totals; T overall total.

Compare binary measurement rates across matched conditions on authorised development observations.

Assumptions — Correctly matched binary observations within blocks; independent blocks; nonzero denominator; exchangeable conditions under the classical null and adequate asymptotic reference..

Limitations — Approximate chi-square reference with k−1 degrees of freedom may be poor with few informative blocks; does not identify which conditions differ..

Source — Statsmodels maintainers, cochrans_q API and references. https://www.statsmodels.org/stable/generated/statsmodels.stats.contingency_tables.cochrans_q.html

## Jarque–Bera normality diagnostic (jarque-bera-normality)

> JB=n[g_1²/6+(g_2−3)²/24], where g_1=m_3/m_2^(3/2), g_2=m_4/m_2² and m_j=n^(−1)Σ_i(x_i−mean(x))^j.

n sample size; m_j empirical central moments; g_1 skewness; g_2 non-excess kurtosis.

Diagnose distributional assumptions of comparable residual measurements on authorised development data.

Assumptions — Independent observations, nonzero sample variance, sufficiently large sample for the asymptotic chi-square(2) reference under normality..

Limitations — Tests selected moment departures; non-rejection does not demonstrate normality. Small-sample asymptotics can be inaccurate..

Source — SciPy maintainers, jarque_bera API and references. https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.jarque_bera.html

## Wald–Wolfowitz binary runs diagnostic (binary-runs-randomness)

> For n_1,n_2 counts of two binary symbols, n=n_1+n_2, let R=1+Σ_(i=2)^n 1(s_i≠s_(i−1)), μ_R=1+2n_1n_2/n, σ_R²=2n_1n_2(2n_1n_2−n)/(n²(n−1)); Z=(R−μ_R)/σ_R.

Ordered binary sequence s; n_1,n_2 symbol counts; R run count; μ_R and σ_R² conditional null moments.

Assess order dependence in a prespecified binary encoding of historical residual measurements.

Assumptions — Null exchangeability of the ordering conditional on counts; both symbols observed, positive null variance, prespecified binary encoding..

Limitations — Normal approximation requires sufficient counts; use an exact conditional reference for small samples. Detects only some departures from randomness..

Source — NIST Engineering Statistics Handbook, Runs Test for Detecting Non-randomness. https://www.itl.nist.gov/div898/handbook/eda/section3/eda35d.htm

## Exact paired mean sign-flip permutation test (paired-mean-sign-permutation)

> For n paired differences d_i, T=Σ_i d_i/n. Under independent uniform sign flips conditional on magnitudes, p=2^(−n)Σ_(s∈{−1,+1}^n)1(|Σ_i s_i d_i/n|≥|T|).

n matched pairs; d_i difference; s sign vector; T mean difference; p two-sided exact tail probability.

Compare matched development measurements while retaining magnitudes under a justified sign-exchangeable null.

Assumptions — Joint null invariance under independent sign reversals (for example independent symmetric differences); correct matching and prespecified two-sided statistic..

Limitations — Exponential enumeration cost; does not test a zero mean under arbitrary asymmetric or dependent distributions..

Mechanism — Uses magnitudes in the test statistic rather than merely counting positive signs.

Source — SciPy maintainers, permutation_test API, permutation_type='samples' for a single paired-difference sample. https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.permutation_test.html

## Pearson product-moment correlation (pearson-linear-correlation)

> r=Σ_i(x_i−mean(x))(y_i−mean(y))/√[Σ_i(x_i−mean(x))² Σ_i(y_i−mean(y))²].

n matched observations of x and y; r sample linear correlation in [−1,1].

Describe linear association between comparable historical measurements.

Assumptions — Comparable aligned observations and positive centered sums of squares; classical inferential reference needs independent pairs and bivariate normality..

Limitations — Zero linear correlation does not establish independence; sensitive to outliers and nonlinear association..

Source — SciPy pearsonr API, definition and assumptions. https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.pearsonr.html

## Empirical discrete mutual information (discrete-empirical-mutual-information)

> I(X;Y)=Σ_(i,j:p_ij>0) p_ij ln[p_ij/(p_i·p_j)], using empirical joint and marginal category frequencies.

p_ij empirical joint proportions; p_i,p_j marginal proportions; I information in nats.

Describe categorical dependence in authorised development data.

Assumptions — Aligned finite categorical observations and nonempty sample; positive joint cells have positive marginals; categories defined consistently..

Limitations — Finite-sample upward bias, especially with sparse cells; no causal or inferential conclusion from the descriptive value alone..

Mechanism — KL divergence of the joint distribution from its product of marginals; a specific dependence functional, not a new independent source of evidence.

Source — Scikit-learn mutual_info_score API, mathematical definition. https://scikit-learn.org/stable/modules/generated/sklearn.metrics.mutual_info_score.html

## Cramér V categorical association (cramer-v-effect-size)

> V=√[X²/(N·min(r−1,c−1))], where X² is the uncorrected Pearson contingency statistic.

N sample size; r,c numbers of categories; X² Pearson statistic; V∈[0,1].

Summarize categorical association magnitude on aligned development observations.

Assumptions — Valid nonempty contingency table with at least two positive-margin categories on each axis..

Limitations — Unsigned descriptive association, potentially upward biased in sparse tables; not an independent significance test..

Mechanism — Deterministic normalization of Pearson X² given dimensions and sample size; descriptive effect size only.

Source — SciPy contingency.association API, method='cramer', correction=False. https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.contingency.association.html

## Double-centred sample distance correlation (biased-sample-distance-correlation)

> For paired vectors define A_ij=a_ij−mean_row_i(a)−mean_col_j(a)+mean(a), a_ij=||x_i−x_j||₂, and B similarly for y. V²_xy=n^(−2)Σ_ij A_ij B_ij; R²=V²_xy/√(V²_xx V²_yy) when denominator>0, otherwise 0.

n paired vectors; A,B doubly centered Euclidean distance matrices; V²_xy empirical squared distance covariance; R² empirical squared distance correlation.

Assess nonlinear dependence among aligned historical measurements on authorised development records.

Assumptions — Aligned finite observations; population interpretation needs finite first moments and suitable independent sampling; stated version is biased empirical statistic..

Limitations — Quadratic naive memory and time cost; finite sample dependence estimate not a standalone significance test; sensitive to feature scaling..

Source — dcor theory documentation and Székely, Rizzo and Bakirov (2007). https://dcor.readthedocs.io/en/latest/theory.html

## First-order partial correlation (partial-correlation-one-control)

> r_xy·z=(r_xy−r_xz r_yz)/√[(1−r_xz²)(1−r_yz²)], for sample Pearson correlations on a common set of observations.

r_xy,r_xz,r_yz sample Pearson correlations; z control variable; r_xy·z residual linear correlation.

Describe remaining linear association after accounting for a prespecified measured covariate in development data.

Assumptions — Aligned observations, nonconstant variables, nonsingular residual variances; inferential use requires a separately justified sampling model..

Limitations — Controls only linear association with the specified covariate; does not establish causal effects or general conditional independence..

Source — NIST Dataplot, Partial Correlation. https://www.itl.nist.gov/div898/software/dataplot/refman2/auxillar/partcorr.htm

## Bartlett correlation-matrix sphericity test (bartlett-sphericity)

> For p≥2 variables and n independent observations, B=−[n−1−(2p+5)/6] ln det(R), where R is the sample correlation matrix.

n sample size; p variable count; R positive-definite sample correlation matrix; B approximate chi-square statistic.

Assess global linear dependence structure in a prespecified set of development measurements.

Assumptions — Multivariate normal independent observations; n>p, positive definite R, adequately large sample; null population correlation matrix equals identity..

Limitations — Sensitive to departures from normality and large sample sizes; rejects global identity, not a specific association or factor model..

Source — Factor Analyzer documentation, calculate_bartlett_sphericity; Bartlett (1950). https://factor-analyzer.readthedocs.io/en/latest/factor_analyzer.html

## BFGS inverse-Hessian update (bfgs-inverse-hessian)

> Given s=x_(k+1)−x_k, y=∇f(x_(k+1))−∇f(x_k), ρ=1/(yᵀs), update H_(k+1)=(I−ρsyᵀ)H_k(I−ρysᵀ)+ρssᵀ; choose direction d_k=−H_k∇f(x_k).

f differentiable objective; H positive-definite inverse-Hessian approximation; s displacement; y gradient change; ρ reciprocal curvature.

General smooth numerical objective minimization in authorised development analyses.

Assumptions — Smooth objective, positive-definite starting approximation, positive curvature yᵀs>0; safeguarded line search for convergence..

Limitations — Dense storage and updates scale quadratically; noisy gradients or nonconvex curvature can invalidate the update..

Source — Nocedal and Wright, Numerical Optimization, 2nd ed., chapter 6; SciPy BFGS documentation. https://docs.scipy.org/doc/scipy/reference/optimize.minimize-bfgs.html

## Gauss–Newton nonlinear least squares (gauss-newton-least-squares)

> For f(x)=0.5||r(x)||₂² with residual Jacobian J, choose d_k=argmin_d ||J(x_k)d+r(x_k)||₂² and update x_(k+1)=x_k+α_k d_k.

r residual vector; J residual Jacobian; d linearized least-squares step; α step length.

General nonlinear least-squares fitting of authorised development measurements.

Assumptions — Differentiable residuals, a well-conditioned full-column-rank Jacobian for unique unregularized step, suitable initialization and globalization..

Limitations — Neglects residual-weighted second derivatives; large residuals or singular Jacobians can lead to unreliable steps..

Source — Nocedal and Wright, Numerical Optimization, 2nd ed., chapter 10, Gauss–Newton method.

## Levenberg–Marquardt damped least-squares step (levenberg-marquardt-damped-step)

> For f(x)=0.5||r(x)||₂² choose d solving (JᵀJ+λI)d=−Jᵀr, λ>0; update x only when a prespecified actual-versus-model reduction safeguard accepts the step.

r residual vector; J residual Jacobian; λ positive damping; d damped direction.

General regularized step for nonlinear residual fitting on authorised development records.

Assumptions — Differentiable residuals, finite quantities, adaptive damping and convergence criteria specified; positive λ makes the stated system positive definite in exact arithmetic..

Limitations — Damping and scaling affect convergence; may stall at poor local minima; stated isotropic damping is one convention..

Mechanism — Positive damping changes the linearized subproblem and step control, not just its solver.

Source — Nocedal and Wright, Numerical Optimization, 2nd ed., chapter 10; SciPy nonlinear least-squares documentation. https://docs.scipy.org/doc/scipy/reference/generated/scipy.optimize.least_squares.html

## Cyclic exact coordinate minimization (cyclic-exact-coordinate-minimization)

> For coordinate j_k=1+(k mod d), choose t_k∈argmin_t f(x_k+t e_(j_k)), then x_(k+1)=x_k+t_k e_(j_k).

f objective; d dimension; e_j coordinate unit vector; t exact scalar minimizer.

General coordinate-wise optimization of an authorised analysis objective.

Assumptions — Each coordinate subproblem has an attained minimizer; cyclic coverage; convergence requires additional objective regularity and boundedness conditions..

Limitations — May progress slowly along strongly coupled coordinates; nonconvex or nonsmooth objectives need specific convergence analysis..

Source — Wright, S. J. (2015), Coordinate descent algorithms, Mathematical Programming 151, 3–34. https://doi.org/10.1007/s10107-015-0892-3

## Trust-region dogleg step (trust-region-dogleg)

> For positive-definite B, g≠0 and radius Δ>0, let p_U=−(gᵀg)/(gᵀBg) g and p_B=−B^(−1)g. If ||p_B||≤Δ use p_B; if ||p_U||≥Δ use −Δg/||g||; otherwise choose p=p_U+τ(p_B−p_U), τ∈(0,1), ||p||=Δ.

g gradient; B positive-definite model Hessian; Δ radius; p_U unconstrained Cauchy-line minimizer; p_B Newton step.

General smooth optimization with a bounded local quadratic model.

Assumptions — Positive-definite quadratic model and positive trust radius; actual/predicted reduction acceptance and radius policy for iterative algorithm..

Limitations — Positive-definite model required for standard dogleg; approximate rather than exact general trust-region solution..

Source — Nocedal and Wright, Numerical Optimization, 2nd ed., chapter 4, dogleg method. https://docs.scipy.org/doc/scipy/reference/optimize.minimize-dogleg.html

## Armijo backtracking line search (armijo-backtracking)

> Given gᵀd<0, α_0>0, β∈(0,1), c∈(0,1), choose smallest j≥0 satisfying f(x+α_0β^j d)≤f(x)+c α_0β^j gᵀd; set α=α_0β^j.

f objective; x current point; g gradient; d descent direction; α trial length; β contraction; c sufficient-decrease constant.

General safeguarded step selection for smooth objective minimization.

Assumptions — Differentiability near x and strict descent direction for finite termination in exact arithmetic; finite feasible trial evaluations..

Limitations — Only sufficient decrease, not curvature control; very small accepted steps or numerical precision may impede progress..

Source — Nocedal and Wright, Numerical Optimization, 2nd ed., chapter 3, backtracking line search and sufficient decrease.

## Power iteration for a dominant eigenvector (power-iteration-eigenvector)

> For real symmetric A and nonzero x₀, iterate x_(k+1)=Ax_k/||Ax_k||₂; estimate λ_k=x_kᵀAx_k/(x_kᵀx_k).

A symmetric matrix; x_k iterate; λ_k Rayleigh quotient.

General numerical eigenvector approximation on a synthetic or authorised matrix.

Assumptions — Unique eigenvalue of strictly largest nonzero magnitude, nonzero initial projection onto its eigenspace, direction convergence up to sign..

Limitations — Slow for close eigenvalue magnitudes; does not determine the full spectrum..

Source — University of Illinois CS 357, Eigenvalues and Eigenvectors; power, shifted inverse and Rayleigh quotient iteration sections. https://cs357.cs.illinois.edu/textbook/notes/eigen.html

## Fixed-shift inverse iteration (shifted-inverse-iteration-eigenvector)

> For real symmetric A and fixed shift μ outside its spectrum, solve (A−μI)y_k=x_k and set x_(k+1)=y_k/||y_k||₂.

A symmetric matrix; μ fixed shift; x_k normalized iterate; y_k intermediate solve.

General approximate eigenvector computation near a shift.

Assumptions — Unique closest eigenvalue to μ, nonzero starting projection, stable shifted linear solve..

Limitations — Potentially ill-conditioned shifted system; direction may change sign..

Mechanism — Power iteration on the resolvent; review derivative/equivalence classification before admission.

Source — University of Illinois CS 357, Eigenvalues and Eigenvectors; power, shifted inverse and Rayleigh quotient iteration sections. https://cs357.cs.illinois.edu/textbook/notes/eigen.html

## Rayleigh quotient iteration (rayleigh-quotient-iteration)

> For unit x_k and real symmetric A, let μ_k=x_kᵀAx_k; solve (A−μ_k I)y_k=x_k and set x_(k+1)=y_k/||y_k||₂ unless an eigenpair residual stop condition holds.

A symmetric matrix; μ_k adaptive shift; y_k shifted solution; x_k normalized iterate.

General adaptive eigenpair refinement on synthetic or authorised matrices.

Assumptions — Local convergence near a simple eigenvector, nonsingular shifted system unless already converged..

Limitations — Repeated factorization; near singularity requires careful residual and solve handling; no guarantee of selecting prescribed eigenpair..

Mechanism — Adaptive shift instead of a fixed inverse operator; review overlap and classification before admission.

Source — University of Illinois CS 357, Eigenvalues and Eigenvectors; power, shifted inverse and Rayleigh quotient iteration sections. https://cs357.cs.illinois.edu/textbook/notes/eigen.html

## Arnoldi Krylov basis construction (arnoldi-orthogonalization)

> Start with unit q₁. For j=1,…,m form w=Aq_j, h_ij=q_i* w and w←w−h_ij q_i successively for i≤j; h_(j+1,j)=||w||₂, q_(j+1)=w/h_(j+1,j) if nonzero. In exact arithmetic A Q_m=Q_(m+1) H̄_m.

A square real or complex matrix; * adjoint; q_i orthonormal basis vectors; H̄ upper Hessenberg projection with one extra row.

Construct a reduced subspace for a general numerical matrix analysis.

Assumptions — Nonzero initial vector, consistent inner product; stop at exact invariant-subspace breakdown or use a documented finite-precision policy..

Limitations — Growing basis storage and loss of orthogonality; Ritz values are approximations, not necessarily certified eigenvalues..

Source — Bindel, D. (2025), Cornell CS 6210, Lanczos and Arnoldi, 17 November, Arnoldi section. https://www.cs.cornell.edu/courses/cs6210/2025fa/lec/2025-11-17.html

## Symmetric Lanczos three-term recurrence (symmetric-lanczos-krylov)

> For real symmetric A, q₀=0, β₀=0 and unit q₁, form w=Aq_j−β_(j−1)q_(j−1), α_j=q_jᵀw, w←w−α_j q_j, β_j=||w||₂, q_(j+1)=w/β_j when β_j>0.

A symmetric matrix; q_j basis vectors; α_j and β_j tridiagonal coefficients.

Build a compact projection of a symmetric numerical operator.

Assumptions — Symmetry, unit initial vector, exact-arithmetic orthogonality; finite precision requires a monitored reorthogonalization or restart policy..

Limitations — Loss of orthogonality can cause repeated spurious Ritz values; stop safely on breakdown..

Mechanism — Symmetric specialization of Arnoldi; three-term recurrence materially changes computational storage and operations, not independent mathematical evidence.

Source — Bindel, D. (2026), Cornell CS 4220, Krylov subspace iterations, 16 March, three-term recurrence. https://www.cs.cornell.edu/courses/cs4220/2026sp/lec/2026-03-16.html

## Unshifted QR eigenvalue iteration (unshifted-qr-eigeniteration)

> Factor A_k=Q_k R_k with orthogonal Q_k and triangular R_k; set A_(k+1)=R_k Q_k=Q_kᵀ A_k Q_k.

A_k real square matrix; Q_k orthogonal factor; R_k triangular factor.

General numerical study of orthogonal eigenvalue iteration.

Assumptions — Consistent QR factorization; convergence to diagonal form for real symmetric matrices requires appropriate spectral and initialization conditions; repeated or opposite equal magnitudes may stall..

Limitations — Unshifted convergence can be slow or fail to separate equal-magnitude eigenvalues; not a complete modern eigensolver..

Source — Bindel, D. (2026), Cornell CS 4220, From power methods to QR iteration, 6 March. https://www.cs.cornell.edu/courses/cs4220/2026sp/lec/2026-03-06.html

## Givens-rotation QR elimination (givens-qr-elimination)

> For a,b not both zero let r=√(a²+b²), c=a/r, s=b/r; G=[[c,s],[−s,c]] maps (a,b)ᵀ to (r,0)ᵀ. Apply embedded rotations to eliminate subdiagonal matrix entries.

a,b entries to rotate; c,s cosine and sine; G orthogonal plane rotation.

General sparse or incremental numerical factorization.

Assumptions — Finite real matrix, stable hypotenuse computation, identity or declared sign convention for zero pair..

Limitations — Dense matrices often favor Householder transformations; repeated updates require stable numerical implementation..

Mechanism — Local plane-rotation elimination instead of full-column reflections.

Source — Bindel, D. (2026), Cornell CS 4220, Least squares and QR, 23 February, Givens rotations section. https://www.cs.cornell.edu/courses/cs4220/2026sp/lec/2026-02-23.html

## Modified Gram–Schmidt QR factorization (modified-gram-schmidt-qr)

> For columns a_j set v_j=a_j. For i=1,…,n set r_ii=||v_i||₂, q_i=v_i/r_ii; for j>i set r_ij=q_iᵀv_j, v_j←v_j−r_ij q_i.

a_j input columns; v_j residuals; q_i orthonormal columns; R upper triangular.

General orthonormal basis construction for numerical linear algebra.

Assumptions — Real full-column-rank matrix; positive residual norms; finite-precision orthogonality monitored..

Limitations — Loss of orthogonality on ill-conditioned matrices; not rank-revealing by itself..

Source — Zhang, Z. (2023), QR and least square, 17 March, p. 2, Algorithm 2. https://www.math.cmu.edu/~zechengz/spring_2023_nla/0317.pdf

## Jacobi plane-rotation symmetric eigensolver (jacobi-symmetric-eigensolver)

> Initialize V=I and A=A₀. While the off-diagonal Frobenius norm exceeds tolerance, choose p≠q maximizing |A_pq| and orthogonal plane rotation G with (GᵀAG)_pq=0; set A←GᵀAG, V←VG. Return diag(A) and V only after convergence.

A real symmetric matrix; G plane rotation; V accumulated orthogonal transformations.

General symmetric matrix diagonalization for numerical analysis.

Assumptions — Real symmetric input; maximal off-diagonal pivot; stable rotation computation; bounded iterations and finite-precision residual checks..

Limitations — Repeated rotations can be costly for large dense matrices; clustered eigenvalues make individual eigenvectors nonunique or sensitive..

Mechanism — Repeated two-sided orthogonal similarity transforms differ from one-sided Givens QR elimination and the QR eigenvalue iteration.

Source — University of Texas at Austin, Advanced Linear Algebra: Foundations to Frontiers, §11.3.2 Jacobi's method for computing the Spectral Decomposition. https://www.cs.utexas.edu/~flame/laff/alaff/chapter11-Jacobi-method-spectral-decomposition.html

## Golub–Kahan bidiagonalization recurrence (bidiagonal-golub-kahan-recurrence)

> Start unit v₁, u₀=0, β₁=0. For j≥1 set w=Av_j−β_j u_(j−1), α_j=||w||₂; stop if α_j vanishes, otherwise u_j=w/α_j. Then z=Aᵀu_j−α_j v_j, β_(j+1)=||z||₂; stop if β_(j+1) vanishes, otherwise v_(j+1)=z/β_(j+1).

A real rectangular matrix; u,v left and right basis vectors; α,β bidiagonal coefficients.

General reduced numerical representation of rectangular linear operators.

Assumptions — Real rectangular operator with consistent transpose; unit starting vector; positive normalization factors until termination; finite-precision orthogonality monitored..

Limitations — Loss of orthogonality and near-zero norms require safeguards; projected singular values are approximations..

Mechanism — Alternating rectangular-operator and transpose Krylov recurrence, related to Lanczos on an augmented symmetric operator; differs computationally from dense two-sided Householder reduction. Not independent scientific evidence.

Source — Netlib, Templates for the Solution of Algebraic Eigenvalue Problems, Golub-Kahan-Lanczos Bidiagonalization Procedure, equations (112)–(116); beta indices shifted by one in this specification. https://www.netlib.org/utk/people/JackDongarra/etemplates/node198.html

## BiCGSTAB nonsymmetric linear-system iteration (bicgstab-linear-system)

> Initialize r=b−Ax; stop if converged. Fix r̂=r, p=v=0, ρ_old=α=ω=1. At each step set ρ=r̂ᵀr, β=(ρ/ρ_old)(α/ω), p=r+β(p−ωv), v=Ap, α=ρ/(r̂ᵀv), s=r−αv. If s meets tolerance, set x←x+αp and check true residual; otherwise t=As, ω=(tᵀs)/(tᵀt), x←x+αp+ωs, r←s−ωt, ρ_old←ρ. Check convergence before another step; guard all divisions.

A square matrix; b right side; x solution iterate; r,r̂ residual and shadow; α,β,ρ,ω scalars.

General iterative solution of a nonsymmetric numerical system.

Assumptions — Real nonsingular square system, identity preconditioner, fixed initial shadow residual, finite quantities, nonzero denominators, bounded iterations and a declared absolute/relative residual criterion..

Limitations — Irregular convergence and breakdown possible; residual alone may not imply small forward error..

Mechanism — Short stabilized biconjugate-gradient recurrence differs from Arnoldi-based GMRES and symmetric positive-definite CG; no convergence guarantee for every nonsingular system.

Source — Barrett et al., Templates for the Solution of Linear Systems (1993), Netlib BiCGSTAB reverse-communication routine, lines 249–385, specialized to the identity preconditioner. https://netlib.org/templates/double/BiCGSTABREVCOM.f

## Residual-based iterative refinement (linear-system-iterative-refinement)

> Given an approximate solution x to Ax=b, compute r=b−Ax, solve Aδ=r using the existing factorization, then update x←x+δ; repeat subject to residual and iteration limits.

A square matrix; b right side; x approximation; r residual; δ correction.

General numerical linear-system correction on authorised or synthetic matrices.

Assumptions — Nonsingular A; sufficiently accurate residual computation and correction solve; explicit stopping criteria..

Limitations — May stagnate or diverge for ill-conditioned systems or inaccurate solves; mixed precision requires separate assumptions..

Mechanism — Reuses a factorization for residual correction rather than repeating a direct factorization or using Jacobi/Gauss–Seidel coordinate updates. Exact correction would terminate in one step; finite-precision improvement is conditional.

Source — Nicholas J. Higham (2023), What Is Iterative Refinement?, basic algorithm and discussion of residual precision. https://nhigham.com/2023/03/13/what-is-iterative-refinement/

## Spectral condition number of a nonsingular matrix (matrix-two-norm-condition-number)

> For nonsingular real square A, κ₂(A)=||A||₂||A⁻¹||₂=σ_max(A)/σ_min(A).

A square matrix; σ_max and σ_min extreme singular values; κ₂ condition number.

General sensitivity diagnostic for a numerical linear system.

Assumptions — Nonsingular finite matrix and consistently defined spectral norm; handle singular matrices separately..

Limitations — Worst-case sensitivity, not an observed numerical error or a guarantee of actual error magnitude..

Mechanism — Sensitivity diagnostic derived from extreme singular values, not another SVD algorithm or measured backward error. A certified singular square matrix has infinite condition number.

Source — University of Illinois CS 357, Singular Value Decompositions, 2-Norm Condition Number. https://courses.physics.illinois.edu/cs357/sp2021/notes/ref-16-svd.html

## Successive overrelaxation stationary solver (sor-stationary-linear-solve)

> For A=D+L+U solve (D+ωL)x_(k+1)=ωb+[(1−ω)D−ωU]x_k with fixed relaxation ω.

D diagonal; L,U strict triangular parts; ω relaxation; x iterate.

General numerical solution of a linear system.

Assumptions — Nonzero diagonal; symmetric positive definite A and 0<ω<2 suffice for convergence in exact arithmetic..

Limitations — Ordering and relaxation affect convergence; ω=1 reduces to Gauss–Seidel..

Mechanism — A fixed relaxation of the ordered Gauss–Seidel sweep; ω=1 gives the parent iteration exactly. Counted as a variant, not a new distinct algorithm.

Source — Barrett et al., Templates for the Solution of Linear Systems, §2.2.3, equation (2.7) and Fig. 2.3; lower and upper parts here have opposite signs to the book's convention. https://netlib.org/templates/templates.html

## Symmetric successive relaxation sweep (ssor-symmetric-relaxation-sweep)

> For A=D+L+U, solve (D+ωL)y=ωb+[(1−ω)D−ωU]x_k, then (D+ωU)x_(k+1)=ωb+[(1−ω)D−ωL]y.

A symmetric matrix; D,L,U splitting; ω fixed relaxation; y forward sweep.

General numerical symmetric linear-system solution.

Assumptions — Real symmetric positive definite A, nonzero diagonal, 0<ω<2, fixed ordering, finite-precision residual checks and bounded iterations..

Limitations — Two sequential sweeps; not necessarily faster than forward SOR..

Mechanism — Forward SOR followed by a reverse-order SOR sweep changes the iteration operator and is a material SOR variant. It is not a new distinct algorithm or independent evidence.

Source — Barrett et al., Templates for the Solution of Linear Systems, §2.2.4, equation (2.9); signs translated to A=D+L+U. https://netlib.org/templates/templates.html

## Chebyshev polynomial linear iteration (chebyshev-polynomial-linear-iteration)

> For real SPD A with eigenvalues enclosed by [a,h], 0<a<h, set d=(a+h)/2, c=(h−a)/2, t=d/c, r_k=b−Ax_k. Set x₁=x₀+r₀/d and ρ₁=1/t. For k≥1 set ρ_(k+1)=1/(2t−ρ_k), α_k=2ρ_(k+1)/c, β_k=ρ_(k+1)ρ_k, x_(k+1)=x_k+α_k r_k+β_k(x_k−x_(k−1)). In exact arithmetic e_k=T_k((dI−A)/c)e₀/T_k(t).

a,h spectral bounds; b right-hand side; d,c interval center and half-width; ρ normalization ratio; e_k=x_k−x*; T_k first-kind Chebyshev polynomial.

General numerical SPD linear-system approximation.

Assumptions — Real SPD operator, valid finite positive enclosing spectral interval of nonzero width, safe scalar arithmetic, explicit residual tolerance and iteration bound..

Limitations — Poor bounds degrade convergence; no guarantee for general nonsymmetric matrices..

Mechanism — Spectral-bound-dependent varying coefficients yield a predetermined minimax error polynomial, unlike constant-step gradient descent, adaptive CG or FISTA extrapolation. Not independent empirical evidence.

Source — Eric Darve, Numerical Linear Algebra, The Chebyshev Iteration Method, normalized minimax polynomial and Chebyshev recurrence; ratio form obtained algebraically from the polynomial normalization. https://ericdarve.github.io/NLA/content/chebyshev_acceleration.html

## Sherman–Morrison rank-one linear-system update (sherman-morrison-rank-one-solve)

> Given invertible A and A+uvᵀ, solve Ay=b and Az=u; x=y−z(vᵀy)/(1+vᵀz).

A base matrix; u,v update vectors; b right side; y,z base solves.

General rank-one modified linear system.

Assumptions — Real nonsingular square A; conforming vectors; d=1+vᵀz nonzero; accurate base solves and finite arithmetic..

Limitations — Cancellation or small update denominator can amplify numerical error; reuse of a factorization is needed for the usual cost advantage..

Mechanism — The rank-one correction reuses base solves instead of factoring the modified matrix. In exact arithmetic, substituting the formula yields (A+uvᵀ)x=b whenever the denominator is nonzero.

Source — Nicholas J. Higham (2020), What Is the Sherman–Morrison–Woodbury Formula?, rank-one identity and factorization discussion. https://nhigham.com/2020/09/29/what-is-the-sherman-morrison-woodbury-formula/

## Block orthogonal eigeniteration (block-orthogonal-eigeniteration)

> For n by p orthonormal Q₀ and 1<p<n, compute Z=AQ_k and thin QR Z=Q_(k+1)R_(k+1). Set H_k=Q_kᵀAQ_k and monitor ||AQ_k−Q_kH_k||; return a basis for the target invariant subspace only after convergence checks.

A matrix; p block dimension; Q orthonormal basis; R triangular factor.

General dominant invariant-subspace approximation.

Assumptions — Real symmetric A; strict gap |λ_p|>|λ_(p+1)| in descending magnitude; nonsingular projection of Q₀ onto the leading p eigenvectors; rank-preserving QR and finite iteration limit..

Limitations — A small invariant-subspace residual alone cannot certify that the subspace is dominant; a narrow spectral gap slows convergence..

Mechanism — Block generalization of power iteration: spans are those of A^kQ₀ in exact arithmetic. p=1 is power iteration; full square orthogonal iteration is related to unshifted QR. Restrict to 1<p<n and count only as a variant.

Source — David Bindel (2025), Cornell CS 6210 Matrix Computations, Power method and subspace iteration, 27 October, section Subspaces and orthogonal iteration. https://www.cs.cornell.edu/courses/cs6210/2025fa/lec/2025-10-27.html

## Brent safeguarded scalar root solver (brent-bracketed-root-solver)

> Initialize a=left, b=right, c=a, d=e=b−a. Cache f(a), f(b), f(c). Maintain b,c of opposite signs unless f(b)=0; if |f(c)|<|f(b)|, assign (a,b,c)=(old b,old c,old b) with matching values. Let h=(c−b)/2 and τ=2ε|b|+tol/2. Stop if f(b)=0 or |h|≤τ. If |e|≥τ and |f(a)|>|f(b)|, set s=f(b)/f(a). For a=c set P=2hs, Q=1−s; otherwise set u=f(a)/f(c), v=f(b)/f(c), P=s[2hu(u−v)−(b−a)(v−1)], Q=(u−1)(v−1)(s−1). If P>0 negate Q, then P←|P|. Accept interpolation only when Q≠0, 2P<3hQ−|τQ| and P<|eQ/2|, setting e←d and d←P/Q; otherwise set d=e=h. Set a←b and b←b+d if |d|>τ, else b←b+sign(h)τ. Evaluate f(b); if f(b) and f(c) share a nonzero sign, reset c←a, d=e=b−a. Repeat with bounded evaluations.

a,b bracket endpoints; f scalar continuous function; interpolation history.

General scalar root solving.

Assumptions — Continuous real function on a finite sign-changing interval; check exact endpoint zeros before iteration, positive tol and finite arithmetic; ε is unit roundoff as measured by the cited implementation..

Limitations — A sign change does not identify a unique root; discontinuity breaks the existence argument. A small bracket is a location guarantee, not necessarily a small function residual. Floating-point stagnation requires an explicit termination status..

Mechanism — Uses the ZEROIN form of Brent’s hybrid, with interpolation-history acceptance tests; unlike the existing bisection and secant methods it combines inverse quadratic interpolation and safeguarded fallback. No empirical superiority claimed.

Source — Forsythe, Malcolm and Moler, Netlib FMM ZEROIN routine, adapted from Brent (1973), initialization, interpolation tests and bracket reset (lines 39–117). https://netlib.org/fmm/zeroin.f

## Ridders bracketed scalar root solver (ridder-bracketed-root-solver)

> Start with ordered endpoints a<b of opposite function signs; return any exact endpoint root. Set m=a+(b−a)/2 and return if f(m)=0. Let D=sqrt(f(m)^2−f(a)f(b)); propose x=m+(m−a)sign(f(a))f(m)/D. Evaluate f(x); if zero return x. From a,m,b choose the nearest point y with sign(f(y)) opposite sign(f(x)); replace (a,b) with sorted (x,y). Repeat until bracket width meets tolerance or budget is exhausted.

a,b bracket; m midpoint; x trial point; f continuous scalar function.

General scalar root solving.

Assumptions — Continuous real function, strict initial sign change after endpoint-zero checks, finite function values and positive tolerances. In exact arithmetic D>|f(m)|, so x lies strictly inside the original bracket..

Limitations — Even-multiplicity roots may lack a sign-changing bracket; finite precision may round a trial onto an existing endpoint. No uniform convergence-rate claim..

Mechanism — Exponential correction at a midpoint, rather than polynomial inverse interpolation or unguarded secant updates. Under exact arithmetic with opposite endpoint signs the correction magnitude is less than the half-width. The chosen opposite-sign partner retains a bracket no wider than the original half-width.

Source — Brown University, MATHEMATICA tutorial, Bracketing Methods, section III Ridders’ Method (exponential correction formula); MATLAB tutorial Part III, rebracketing rule. https://www.cfm.brown.edu/people/dobrush/am33/python/p3/bracket.html ; https://www.cfm.brown.edu/people/dobrush/am33/Matlab/ch3/bracket.html

## Classical false-position scalar root solver (regula-falsi-bracketed-root)

> Check endpoint zeros first. Given a<b and opposite signs f(a), f(b), compute x=(af(b)−bf(a))/(f(b)−f(a)). If f(x)=0 return x; otherwise replace the endpoint of matching sign with x and repeat. Return a bracket on width tolerance, or a residual-only approximate point explicitly labelled as such.

a,b ordered bracket endpoints; x interpolation trial; f real scalar function.

General scalar root solving.

Assumptions — Continuous real f, strict sign change after endpoint-zero checks, finite values, representable interior trials and bounded iterations.

Limitations — A bracket endpoint may remain fixed indefinitely; a small residual alone is not a certified error bound without further assumptions.

Mechanism — Same linear intercept as the existing secant method, but retains the opposite-sign endpoint rather than discarding by age. Bracket preservation is a material control-rule change; counted as a variant, not an independent algorithm.

Source — Vladimir Dobrushkin, Brown University, Mathematica tutorial, Part III Bracketing Methods, section II False Position Method. https://www.cfm.brown.edu/people/dobrush/am33/python/p3/bracket.html

## Clenshaw–Curtis quadrature (clenshaw-curtis-quadrature)

> For integer n≥1 and finite a<b set g(x)=f((a+b)/2+(b−a)x/2). At x_j=cos(jπ/n), j=0,…,n, interpolate g by p_n(x)=Σ_(k=0)^n c_k T_k(x), with unprimed full coefficients. Approximate ∫_a^b f(t)dt by (b−a)/2 Σ_(even k=0,…,n) 2c_k/(1−k²).

n polynomial degree; T_k first-kind Chebyshev polynomial; c_k full coefficients of the unique interpolant; a,b finite integration endpoints.

General numerical integration.

Assumptions — Finite endpoint and interior evaluations on a nondegenerate closed interval; integrable function; n≥1.

Limitations — Finite degree alone does not certify an error tolerance; nonsmooth integrands may converge slowly; endpoint singularities require other treatment.

Mechanism — Chebyshev extrema grid and exact polynomial integration rather than equally spaced Newton–Cotes or Gaussian optimal-degree nodes; integration functional rather than interpolation alone.

Source — Nick Trefethen, Chebfun, Gauss and Clenshaw-Curtis quadrature (2010), interpolation definition; coefficient integral derived via x=cos θ. https://www.chebfun.org/examples/quad/GaussClenCurt.html

## Adaptive Gauss–Kronrod quadrature (adaptive-gauss-kronrod-quadrature)

> On each finite subinterval I=[l,r], map a supplied validated nested Gauss m-point and Kronrod (2m+1)-point rule from [−1,1] by t=(l+r)/2+(r−l)x/2; multiply each weighted sum by (r−l)/2 to obtain G(I),K(I). Set E(I)=|K(I)−G(I)|. Start with I=[a,b]; while ΣE>max(ε_abs,ε_rel|ΣK|), bisect an interval of largest E and replace its two estimates, subject to budget and roundoff checks. Return ΣK with estimated error ΣE, or report failure.

I subinterval; m Gaussian order; G,K nested estimates; E local indicator; ε_abs,ε_rel tolerances.

General numerical integration.

Assumptions — Finite a<b, integrable function with finite sampled values; validated nested Gauss–Legendre/Kronrod nodes and weights; nonnegative tolerances with a positive absolute or relative tolerance; positive interval budget.

Limitations — Difference indicator is not a guaranteed upper error bound; singular or oscillatory integrands can defeat sampling.

Mechanism — Nested higher-order rule reuses Gauss evaluations and drives nonuniform bisection; conservative variant of Gaussian quadrature, not a separate independent algorithm count.

Source — GNU Scientific Library 2.8 Numerical Integration, Introduction and QAG adaptive integration; Netlib QUADPACK QAGE, local-rule choices and global interval subdivision (lines 249–327). https://www.gnu.org/software/gsl/doc/html/integration.html ; https://www.netlib.org/quadpack/qage.f

## Tanh–sinh quadrature (tanh-sinh-quadrature)

> For finite a<b, set c=(a+b)/2, d=(b−a)/2, x(t)=tanh((π/2)sinh t), w(t)=(π/2)cosh(t)/cosh²((π/2)sinh t). Set Q(h,N)=dh Σ_(k=−N)^N f(c+d x(kh))w(kh), approximating ∫_a^b f(s)ds.

a,b interval endpoints; h>0 mesh spacing; N nonnegative integer truncation; c midpoint; d half-width; w derivative of x.

General numerical integration.

Assumptions — Integrable f with finite interior samples and a sufficiently smooth, rapidly decaying transformed integrand for useful convergence; rapid double-exponential convergence is conditional.

Limitations — Endpoint rounding, overflow, cancellation and insufficient tail resolution can corrupt the result; refinement differences are indicators, not certified bounds.

Mechanism — Nonlinear transformation creates clustered nonuniform physical nodes and Jacobian weights; distinct from finite uniform-grid trapezoid, although it uses trapezoidal summation in transformed coordinates.

Source — Mori, M. (2005), Discovery of the Double Exponential Transformation and Its Developments, Publ. RIMS 41, 897–935, publisher abstract, https://ems.press/journals/prims/articles/2317 ; Boost.Math 1.71 tanh_sinh and 1.66 endpoint handling documentation, https://www.boost.org/doc/libs/1_71_0/libs/math/doc/html/math_toolkit/double_exponential/de_tanh_sinh.html ; https://www.boost.org/doc/libs/1_66_0/libs/math/doc/html/math_toolkit/double_exponential/de_tanh_sinh_2_arg.html

## Adaptive Simpson quadrature (adaptive-simpson-quadrature)

> S(l,r)=(r−l)[f(l)+4f((l+r)/2)+f(r)]/6; m=(l+r)/2; S₂=S(l,m)+S(m,r); E=|S₂−S(l,r)|/15. If E≤τ, accept S₂+(S₂−S(l,r))/15; otherwise recurse on both halves with local tolerance τ/2 and sum their accepted estimates.

l,r panel endpoints; S coarse estimate; S₂ two-panel estimate; E estimated error of S₂; τ positive local absolute tolerance.

General numerical integration.

Assumptions — Finite a<b and finite sampled values; sufficiently smooth integrand with locally stable fourth derivative for asymptotic error scaling; positive tolerance and finite recursion budget.

Limitations — Estimator can miss localized or oscillatory structure and is not a rigorous bound; correction relies on the same asymptotic scaling.

Mechanism — Adaptive subdivision and Richardson correction of composite Simpson; a variant, not an independent algorithm. Unlike Romberg, refinement is local; unlike Gauss–Kronrod, uses Simpson panels.

Source — Per-Olof Persson, UC Berkeley Math 128A, Numerical Differentiation and Integration, §4.6 Adaptive Quadrature Methods, https://persson.berkeley.edu/math128a/lecture_notes/math128a_lecture_notes_chapter_4.html ; signed Richardson correction derived from stated 1/16 error scaling.

## Complex-step first derivative (complex-step-first-derivative)

> For real x and nonzero real h, D_h f(x)=Im(f(x+ih))/h. If f is holomorphic near x and real on the real axis, D_h f(x)=f′(x)−h²f‴(x)/6+O(h⁴) as h→0 in exact arithmetic.

x real evaluation point; i imaginary unit; h real nonzero step; Im imaginary part; f′ and f‴ first and third derivatives.

General numerical differentiation.

Assumptions — A holomorphic extension on a neighborhood containing the perturbed point, real values on the real axis, and an evaluation that preserves the small imaginary perturbation without unrelated imaginary rounding noise.

Limitations — No subtraction of two nearly equal real outputs is needed, but underflow, imaginary noise, nonanalytic operations and complex-unsafe implementations can still invalidate the approximation.

Mechanism — Complex perturbation obtains the derivative from the imaginary component rather than differences of real outputs. Related to first difference, but a distinct derivative approximation.

Source — Higham, N. J. (2018), Differentiation With(out) a Difference, SIAM News 51(5), equation (1) and discussion of imaginary rounding, https://www.siam.org/publications/siam-news/articles/differentiation-without-a-difference ; signed Taylor correction independently derived.

## Finite-difference weights by moment matching (finite-difference-moment-weights)

> For n≥2 distinct real offsets s_j=h t_j with h>0 and integer 1≤m<n, solve Σ_(j=0)^(n−1) c_j t_j^k=m! δ_(km) for k=0,…,n−1. Set w_j=c_j/h^m and D_m f(x)=Σ_j w_j f(x+s_j). This is exact on polynomials of degree at most n−1.

n node count; m derivative order; h positive scale; t_j distinct dimensionless offsets; s_j physical offsets; c_j scaled weights; w_j derivative weights; δ Kronecker delta.

General numerical differentiation.

Assumptions — Distinct real nodes, finite samples, and sufficient smoothness on the interval containing x and all nodes; for fixed distinct t_j and f with bounded nth derivative the Taylor error is O(h^(n−m)) as h tends to zero.

Limitations — The Vandermonde moment system and weighted summation may be ill-conditioned; scaling does not guarantee stability; noise grows with derivative order and inverse step scale.

Mechanism — Derivative functional of the same unique interpolating polynomial rather than a new polynomial approximation family. A derivative-output variant of polynomial interpolation; direct moment solving is not Fornberg recursion and ordinary difference stencils are special cases.

Source — Driscoll, T. A. and Braun, R. J., Fundamentals of Numerical Computation, §5.4 Finite differences, https://tobydriscoll.net/fnc-julia/localapprox/finitediffs.html ; Persson, P.-O., UC Berkeley Math 128A, §4.1, https://persson.berkeley.edu/math128a/lecture_notes/math128a_lecture_notes_chapter_4.html ; arbitrary-node, arbitrary-order moment equations and error order independently derived from polynomial exactness and Taylor expansion.

## Constant-step BDF2 ODE integration (bdf2-constant-step-ode)

> For y′=f(t,y) and t_n=t_0+nh with constant h>0, solve (3y_(n+1)−4y_n+y_(n−1))/(2h)=f(t_(n+1),y_(n+1)) for n≥1. For y′=λy, with z=hλ, the characteristic equation is (3−2z)r²−4r+1=0.

h positive constant step; t_n grid time; y_n state; f right-hand side; λ scalar test rate; r characteristic root.

General numerical ODE integration.

Assumptions — Smooth initial-value problem with a locally Lipschitz right-hand side, bounded solution derivatives through order three, O(h²) accurate starting states and sufficiently accurate implicit solves on a fixed finite interval.

Limitations — Constant-step coefficients are not valid on arbitrary unequal grids; startup and implicit solves are required; second-order convergence and scalar linear stability do not imply accuracy for large steps or unconditional nonlinear solvability.

Mechanism — A two-step implicit backward derivative approximation with history and a distinct characteristic polynomial, rather than one-step backward Euler or endpoint quadrature. Zero-step-rate roots are 1 and 1/3. Taylor expansion at t_(n+1) gives a derivative defect of O(h²).

Source — Sun, L. (2016), Analysis of backward differentiation formula for nonlinear differential-algebraic equations with 2 delays, SpringerPlus 5, 1013, Eq. (18) for the ordinary differential equation, https://link.springer.com/article/10.1186/s40064-016-2422-z ; truncation and characteristic roots independently derived for the constant-step ODE only.

## Implicit midpoint ODE integration (implicit-midpoint-ode)

> For y′=f(t,y), solve y_(n+1)=y_n+h f(t_n+h/2,(y_n+y_(n+1))/2). For y′=λy, z=hλ gives amplification R(z)=(1+z/2)/(1−z/2).

h positive step; t_n time; y_n state; f right-hand side; λ scalar test rate; z scaled rate.

General numerical ODE integration.

Assumptions — Smooth right-hand side and solution with bounded derivatives through the order required for second-order convergence, locally Lipschitz dynamics and sufficiently accurate implicit solves on a fixed finite interval.

Limitations — Not L-stable since R(z) tends to −1 for large negative real z; scalar linear A-stability does not guarantee nonlinear solvability, physical invariants for arbitrary systems or accuracy at large steps.

Mechanism — One-stage implicit Runge–Kutta evaluates the vector field at the midpoint of time and state. It is generally different from averaging endpoint vector fields in trapezoidal integration, although the scalar autonomous linear amplification is identical. Distinct implicit stage mechanism from the existing explicit RK4 and RK23.

Source — LeMesurier, B., Introduction to Numerical Methods and Analysis with Julia (draft), §7.3, implicit midpoint equation and implicit trapezoid comparison, https://lemesurierb.people.charleston.edu/introduction-to-numerical-methods-and-analysis-julia/docs/ODE-IVP-2-Runge-Kutta.html ; order and scalar amplification independently derived. Idaho National Laboratory TMAP8 search result was not used as a verified source because the linked page returned 404.

## Constant-step two-step Adams–Bashforth ODE integration (adams-bashforth-two-step-ode)

> For y′=f(t,y), t_n=t_0+nh, h>0, let F_n=f(t_n,y_n). For n≥1 set y_(n+1)=y_n+h(3F_n−F_(n−1))/2. On y′=λy with z=hλ the characteristic equation is r²−(1+3z/2)r+z/2=0.

h constant positive step; t_n grid time; y_n state; F_n stored slope; λ scalar linear test rate; r characteristic root.

General numerical ODE integration.

Assumptions — Locally Lipschitz dynamics, sufficiently smooth solution with bounded derivatives through order three on a finite interval, and starting states accurate to O(h²) on a uniform grid.

Limitations — Second-order method; explicit stability restrictions apply, including negative-real scalar test interval −1≤z≤0; not a general stiff solver or a variable-step formula.

Mechanism — Integrates a linear extrapolation of two previous slopes; unlike forward Euler, it retains history, and unlike BDF2 it requires no implicit solve. At z=0 the roots are 0 and 1; the local exact-state defect is 5h³y‴(t_n)/12+O(h⁴) with the additional derivative regularity.

Source — LeMesurier, B., Numerical Methods and Analysis with Julia (draft), §6.8, Eq. (6.11), https://lemesurierb.people.charleston.edu/numerical-methods-and-analysis-julia/docs/ODE-IVP-7-multi-step-methods-Adams-Bashforth.html ; characteristic polynomial and real-axis interval independently derived.

## Constant-step two-step Adams–Moulton ODE integration (adams-moulton-two-step-ode)

> For y′=f(t,y), t_n=t_0+nh, h>0, let F_n=f(t_n,y_n). Solve y_(n+1)=y_n+h(5f(t_(n+1),y_(n+1))+8F_n−F_(n−1))/12. On y′=λy with z=hλ the characteristic equation is (1−5z/12)r²−(1+8z/12)r+z/12=0.

h constant positive step; t_n grid time; y_n state; F_n stored slope; λ scalar linear test rate; r characteristic root.

General numerical ODE integration.

Assumptions — Locally Lipschitz dynamics, solution derivatives bounded through order four on a finite interval, starting states accurate to O(h³), and sufficiently accurate locally consistent implicit solves on a uniform grid.

Limitations — Third-order constant-step method, not A-stable; negative-real scalar test interval −6≤z≤0. Implicit solves, startup and history are required; residual alone is not an error certificate.

Mechanism — Quadratic slope interpolation through one future and two past/current grid nodes generalizes the implicit trapezoidal rule; conservatively counted as a variant. At z=0 the characteristic roots are 0 and 1; the local exact-state defect is −h⁴y⁽⁴⁾(t_n)/24+O(h⁵) with additional derivative regularity.

Source — University of Bielefeld, Computational Physics SoSe 2026, Multi-Step Methods, Adams–Moulton table order 3 and implicit equation discussion, https://roesner.pages.ub.uni-bielefeld.de/lectures/computational-physics/semester/sose2026/lecture/07_ode/05_multistep_methods.html ; moments and characteristic polynomial independently derived.

## Single shooting for scalar second-order boundary value problems (single-shooting-boundary-value)

> For y″=g(t,y,y′), y(a)=A, y(b)=B, solve Y′=(v,g(t,y,v)), Y(a)=(A,s), with Y=(y,v). Define R(s)=y(b;s)−B and find a slope s* with R(s*)=0. If g is differentiable, R′(s)=w(b) where w″=g_y w+g_v w′ along the trajectory, w(a)=0, w′(a)=1.

a<b interval endpoints; A,B boundary values; s unknown initial slope; v derivative state; R endpoint residual; w slope sensitivity.

General numerical boundary value problems.

Assumptions — Well-posed IVPs on the whole interval for slopes considered, continuous dependence, and a root in the search domain; differentiable dynamics and nonzero R′ at a simple root for local sensitivity analysis.

Limitations — Repeated IVP solves may be expensive or unstable; near-zero endpoint sensitivity can amplify slope error and growing modes can amplify integration errors; multiple or absent roots are possible; small residual does not certify trajectory accuracy or uniqueness.

Mechanism — A global endpoint equation selects an unknown initial state; IVP integration and scalar root solvers are constituent procedures, not duplicate definitions of the BVP algorithm. Local slope perturbations scale as residual perturbation divided by R′(s*) when that derivative is nonzero.

Source — University of Bielefeld, Computational Physics SoSe 2026, Boundary Value Problems, https://roesner.pages.ub.uni-bielefeld.de/lectures/computational-physics/semester/sose2026/lecture/07_ode/08_boundary_value_problems.html; Shooting Method: Nonlinear Case; sensitivity equation independently differentiated.

## Centered finite differences for linear second-order boundary value problems (centered-finite-difference-linear-bvp)

> For −y″+c(t)y=g(t), y(a)=A, y(b)=B, let N≥2, h=(b−a)/N, t_i=a+ih, U_0=A, U_N=B. For i=1,…,N−1 solve (−U_(i−1)+2U_i−U_(i+1))/h²+c(t_i)U_i=g(t_i). The scaled matrix has diagonal 2+h²c(t_i) and neighbouring entries −1.

a<b endpoints; N integer subinterval count; h grid spacing; c,g given functions; U_i nodal approximation.

General numerical boundary value problems.

Assumptions — Uniform grid, exact Dirichlet boundary values, continuous c≥0 and g, and exact solution with bounded fourth derivative for second-order consistency and convergence.

Limitations — Second-order nodal discretization under the stated regularity; layers may require fine grids, negative c or other boundary types require separate analysis; linear solve and rounding errors are not included in the exact-arithmetic bound.

Mechanism — Unlike derivative weights alone, solves a coupled global boundary-constrained linear system. For zero-boundary vectors the scaled matrix quadratic form is Σ_(i=1)^N (v_i−v_(i−1))²+h²Σ_(i=1)^(N−1)c_i v_i²>0 for nonzero v. The discrete barrier q(t)=(t−a)(b−t)/2 gives max nodal error ≤(b−a)²h² max|y⁽⁴⁾|/96 in exact arithmetic.

Source — James M. Ortega, Numerical Analysis: A Second Course, §6.1, equations (6.1)–(6.2), https://doi.org/10.1137/1.9781611971323.ch6 (public abstract); University of Bielefeld, Computational Physics SoSe 2026, Boundary Value Problems, https://roesner.pages.ub.uni-bielefeld.de/lectures/computational-physics/semester/sose2026/lecture/07_ode/08_boundary_value_problems.html; finite-difference section. Energy and maximum-norm bound independently derived.

## Multiple shooting with continuity constraints (multiple-shooting-boundary-value)

> For Y′=F(t,Y) in R^d and boundary equation B(Y(a),Y(b))=0 in R^d, partition a=t₀<⋯<t_m=b. Introduce Z_j∈R^d for j=0,…,m and exact segment flow Φ_j from t_j to t_(j+1). Solve Φ_j(Z_j)−Z_(j+1)=0 for j=0,…,m−1 and B(Z₀,Z_m)=0. In computation replace exact flows with numerical integrations.

d state dimension; m segment count; t_j mesh points; Z_j nodal states; Φ_j flow map; B boundary map.

General numerical boundary value problems.

Assumptions — Increasing mesh, well-posed segment IVPs near a solution, compatible boundary conditions, differentiable flow and boundary maps for Newton iteration, nonsingular full matching Jacobian at a regular local root.

Limitations — Larger nonlinear system than single shooting; shorter intervals can reduce within-segment error amplification but cannot guarantee conditioning, uniqueness or convergence; integration errors remain.

Mechanism — There are (m+1)d unknowns, md continuity equations and d boundary equations. Exact continuity and unique local IVP solutions concatenate to an original BVP solution; elimination of intermediate states recovers the single-shooting equation. Counted as a shooting variant.

Source — Michael T. Heath, Scientific Computing: An Introductory Survey, chapter 10, Multiple Shooting, slide 19, University of Illinois, https://relate.cs.illinois.edu/course/cs450-s24/f/lectures/heath/chap10.pdf ; Morrison, Riley and Zancanaro (1962), https://doi.org/10.1145/355580.369128 (public abstract only); dimensions and Jacobian independently derived.

## Piecewise-linear Galerkin finite elements for scalar elliptic boundary value problems (piecewise-linear-galerkin-elliptic-bvp)

> For −u″+c u=g on (a,b), u(a)=u(b)=0, use continuous piecewise-linear trial and test functions vanishing at endpoints. Set U=Σ_j U_j φ_j in interior nodal hats and solve Σ_j A_ij U_j=b_i, A_ij=∫_a^b(φ_i′φ_j′+c φ_i φ_j)dt, b_i=∫_a^b g φ_i dt. For constant c on an element of length h_e, A_e=(1/h_e)[[1,−1],[−1,1]]+(c h_e/6)[[2,1],[1,2]].

a,b interval endpoints; c reaction coefficient; g forcing; h_e element length; φ_j nodal hats; U_j coefficients; A,b_i assembled matrix and load.

General numerical boundary value problems.

Assumptions — Finite interval, bounded c≥0 almost everywhere, square-integrable g, increasing conforming mesh and exact integration for variational claims; H² solution for first-order energy convergence.

Limitations — Underintegration changes the equations; nonsmooth solutions may reduce rates; mesh conditioning and quadrature affect solves; algebraic residual alone cannot certify discretization error.

Mechanism — Energy orthogonality gives best approximation in the bilinear-form norm; positivity follows from the derivative term and zero boundary conditions. Interpolation of an H² solution gives O(max h_e) energy error. Uniform mesh with c=0 and constant g gives the centered finite-difference equations after dividing interior rows by h; general consistent reaction and load integrals differ, so the methods are related rather than equivalent.

Source — Per-Olof Persson, The Finite Element Method – Lecture Notes, UC Berkeley, Introduction to FEM and assembly, https://persson.berkeley.edu/math228b/html/fem_notes.html ; reaction matrix, energy orthogonality and finite-difference comparison independently derived.

## Cell-centred finite volume for one-dimensional diffusion (cell-centered-finite-volume-diffusion-1d)

> For −(k u′)′=g on (a,b), u(a)=A, u(b)=B, divide into N cells [s_(i−1),s_i] with centres x_i and constant k_i>0 in each cell. Define T_i=1/[(s_i−x_i)/k_i+(x_(i+1)−s_i)/k_(i+1)] for i=1,…,N−1 and F_i=T_i(U_i−U_(i+1)); F_0=k_1(A−U_1)/(x_1−a), F_N=k_N(U_N−B)/(b−x_N). Solve F_i−F_(i−1)=∫_(s_(i−1))^(s_i) g(t)dt for i=1,…,N.

s_i cell faces; x_i cell centres; k_i cell diffusivity; T_i face transmissibility; F_i rightward flux; U_i centre value; A,B boundary values; g source.

General numerical boundary value problems.

Assumptions — Ordered positive-length cells with strictly interior centres, strictly positive finite piecewise-constant k, integrable g, prescribed Dirichlet endpoints, unit cross-section and a shared flux per face.

Limitations — Two-point flux is exact between centres for source-free piecewise-linear solutions with flux continuity, not for arbitrary forcing; source integration, boundary closure, grid and coefficient approximation affect accuracy; no universal convergence rate claimed.

Mechanism — Shared fluxes telescope to F_N−F_0=∫_a^b g. Eliminating the interface value from two one-sided constant-k flux equations gives the reciprocal sum of resistances. With homogeneous Dirichlet perturbations v, the quadratic form is Σ_i T_i(v_i−v_(i+1))² plus positive endpoint conductances times endpoint-cell squares, hence positive definite. Uniform constant k gives the centered second-difference interior stencil after division by cell length; the cell-centred boundary closure and variable-coefficient conservative balance differ from the existing nodal BVP scheme. Related rather than globally equivalent.

Source — DuMux 3.9 documentation, Cell-centered Finite Volume Methods, https://dumux.org/docs/doxygen/releases/3.9/group___c_c_discretization.html and Two-point flux approximation, https://dumux.org/docs/doxygen/releases/3.9/group___c_c_tpfa_discretization.html ; one-dimensional scalar specialization and boundary terms independently derived.

## Chebyshev spectral collocation for scalar boundary value problems (chebyshev-spectral-collocation-bvp)

> For −u″+c(t)u=g(t), u(a)=A, u(b)=B, take N≥2 and t_j=(a+b)/2+(b−a)cos(jπ/N)/2 for j=0,…,N. Let ℓ_j be the cardinal polynomial for these nodes, D_ij=ℓ_j′(t_i) and U_j approximate u(t_j). Set U_0=B and U_N=A; solve [−D²U]_i+c(t_i)U_i=g(t_i) for i=1,…,N−1. For i≠j, D_ij=w_j/[w_i(t_i−t_j)] with w_j=1/Π_(k≠j)(t_j−t_k); D_ii=−Σ_(j≠i)D_ij.

a,b interval endpoints; N polynomial degree; t_j nodes in descending order; ℓ_j cardinal polynomials; w_j barycentric weights; D physical-coordinate differentiation matrix; U nodal vector; c,g given functions.

General numerical boundary value problems.

Assumptions — Finite interval a<b, distinct mapped nodes, continuous coefficients and forcing, well-posed Dirichlet problem and nonsingular discrete interior system; rapid convergence requires sufficient solution regularity and stable discretization.

Limitations — Dense matrices and increasingly ill-conditioned differentiation can amplify roundoff; nonsmooth solutions or layers can prevent rapid convergence; residuals at collocation nodes alone do not certify accuracy.

Mechanism — Differentiating the unique degree-N interpolant gives the cardinal derivative entries, and differentiation stays in the same polynomial space, so the full D squared evaluates its second derivative. Mapping from [−1,1] multiplies the first derivative matrix by 2/(b−a) and the second by its square. The derivative mechanism overlaps polynomial interpolation and moment weights, but enforcing differential equations and boundary constraints through a dense global polynomial solve is not the local centered BVP stencil or a standalone differentiation operation. No unconditional spectral convergence or stability claim.

Source — Lloyd N. Trefethen, Spectral Methods in MATLAB, chapters 6 and 7, SIAM, https://doi.org/10.1137/1.9780898719598.ch6 and https://doi.org/10.1137/1.9780898719598.ch7 (public excerpts only); cardinal differentiation and affine mapping independently derived.

## Forward-time centred-space heat equation integration (heat-equation-ftcs)

> For u_t=κu_xx on [a,b] with zero Dirichlet endpoints, N≥2, h=(b−a)/N, x_i=a+ih, t_n=nΔt and r=κΔt/h², set U_i^0=f(x_i), U_0^n=U_N^n=0 and U_i^(n+1)=(1−2r)U_i^n+r(U_(i−1)^n+U_(i+1)^n) for i=1,…,N−1. Require 0<r≤1/2.

κ diffusivity; h spatial step; Δt time step; r diffusion number; f initial function; U nodal solution; N spatial intervals.

General numerical heat equation integration.

Assumptions — Constant κ>0, finite interval a<b, uniform mesh, positive time step, compatible homogeneous Dirichlet and initial data, sufficient bounded time and spatial derivatives for the stated error order.

Limitations — First order in time and second order in space for smooth solutions over a fixed time interval under the stated stability bound; explicit step size shrinks quadratically with mesh spacing; the sufficient uniform bound need not be the exact finite-grid spectral bound.

Mechanism — Forward Euler on the centred spatial difference is the existing time integrator applied to a semidiscrete system. For homogeneous endpoints the discrete sine eigenvalues of the unscaled difference are −4 sin²(jπ/(2N)); the update eigenvalues are 1−4r sin²(jπ/(2N)). The bound r≤1/2 also makes the stencil a convex average, giving maximum-norm nonexpansion. Taylor residual per unit time is O(Δt+h²); summing the stable one-step defects over a fixed interval yields the same global order for smooth compatible data. Retain as a PDE-specific variant, not a distinct integrator.

Source — University of British Columbia, MATH 316 Partial Differential Equations, Heat Equation, https://ubcmath.github.io/MATH316/heat.html ; University of Bielefeld, Computational Physics, Crank–Nicolson, https://roesner.pages.ub.uni-bielefeld.de/lectures/computational-physics/semester/sose2026/lecture/08_pde/02_crank_nicolson.html ; finite-grid stability and error independently derived.

## Crank–Nicolson centred-space heat equation integration (heat-equation-crank-nicolson)

> For u_t=κu_xx on [a,b] with homogeneous Dirichlet endpoints, N≥2, h=(b−a)/N, r=κΔt/h² and U^n=(U_1^n,…,U_(N−1)^n), let L=tridiag(1,−2,1) and I be the interior identity. Set U_i^0=f(a+ih), then solve (I−rL/2)U^(n+1)=(I+rL/2)U^n at each positive time step.

κ diffusivity; N spatial intervals; h spatial step; Δt time step; r diffusion number; L unscaled interior second difference; I identity; f initial function; U interior state.

General numerical heat equation integration.

Assumptions — Constant κ>0, finite interval a<b, uniform mesh, positive time step, homogeneous Dirichlet data, compatible smooth initial data and sufficiently accurate linear solves; bounded derivatives for the stated error order.

Limitations — Second order in time and space for sufficiently smooth compatible solutions over a fixed time interval; unconditional discrete Euclidean-norm stability is not unconditional accuracy or positivity; high-frequency modes can alternate sign and damp slowly when r is large.

Mechanism — This is implicit trapezoidal integration of the centred semidiscrete diffusion equation. The sine modes of L have eigenvalues −4 sin²(jπ/(2N)), so the amplification is (1−q)/(1+q), q=2r sin²(jπ/(2N))≥0. The left matrix has eigenvalues 1+q>0 and the amplification magnitude is at most one; as q grows it approaches −1, so stiff modes may oscillate. A sufficient smoothness Taylor residual is O(Δt²+h²); the inverse left matrix and update both have Euclidean operator norm at most one, implying the same global order in the grid-weighted Euclidean norm over fixed time. Retain as a variant, not another distinct time integrator.

Source — University of Bielefeld, Computational Physics, Crank–Nicolson, https://roesner.pages.ub.uni-bielefeld.de/lectures/computational-physics/semester/sose2026/lecture/08_pde/02_crank_nicolson.html ; homogeneous Dirichlet modal and convergence arguments independently derived.

## Lie–Trotter splitting for linear systems (lie-trotter-linear-splitting)

> For U′=(A+B)U, U(0)=U₀, with fixed square matrices A and B, define S_h=exp(hB)exp(hA), h=T/N>0, and U_(n+1)=S_h U_n for n=0,…,N−1.

A,B component matrices; h step; T final time; N positive integer step count; S_h split update; U_n state.

General numerical integration of split linear differential systems.

Assumptions — Finite-dimensional autonomous linear system with compatible matrix dimensions, fixed finite matrix norms, fixed final time and exact component exponentials for the order argument.

Limitations — Generally first-order global accuracy; noncommuting components introduce splitting error; inaccurate subflow evaluations can reduce order; arbitrary matrices need not generate contractive flows.

Mechanism — Writing [A,B]=AB−BA, direct Taylor multiplication gives S_h−exp(h(A+B))=−h²[A,B]/2+O(h³). In any induced matrix norm both exact and split step norms are at most exp(h(||A||+||B||)); telescoping the difference of their Nth powers yields O(h) error at fixed T. If A and B commute the product is exact in exact arithmetic. Composition of separate exact flows is not an Euler update; retain as a distinct general splitting procedure.

Source — Blanes, S., Casas, F. and Murua, A. (2024), Splitting methods for differential equations, Acta Numerica 33, 1–161, https://doi.org/10.1017/S0962492923000077 (publisher metadata and public formula excerpt); University of Bielefeld, Computational Physics, Operator Splitting, https://roesner.pages.ub.uni-bielefeld.de/lectures/computational-physics/semester/sose2026/lecture/08_pde/04_operator_splitting.html ; finite-dimensional error arguments independently derived.

## Strang symmetric splitting for linear systems (strang-linear-splitting)

> For U′=(A+B)U, U(0)=U₀, fixed square A,B and h=T/N>0, define S_h=exp(hA/2)exp(hB)exp(hA/2) and U_(n+1)=S_h U_n for n=0,…,N−1.

A,B component matrices; h step; T final time; N positive integer step count; S_h symmetric split update; U_n state.

General numerical integration of split linear differential systems.

Assumptions — Finite-dimensional autonomous linear system, compatible matrix dimensions, fixed finite matrix norms, fixed final time and exact component exponentials for the order argument.

Limitations — Generally second-order global accuracy; error constants depend on matrices and commutators; unbounded or time-dependent operators require separate analysis; symmetry alone does not guarantee contractivity or accuracy.

Mechanism — Multiplication through degree two gives I+h(A+B)+h²(A+B)²/2, so the exact one-step defect is O(h³). The same exponential norm bound and power telescoping as Lie–Trotter give O(h²) fixed-time error. S_(−h)=S_h^(-1); with P=exp(hA/2), S_h=P[exp(hB)exp(hA)]P^(-1), so it is a conjugate of the first-order step, not identical on the same initial state. Commuting components give exact evolution. Velocity Verlet shares the symmetric composition structure for suitable separable Hamiltonian flows. Count as a splitting variant, not another distinct mechanism.

Source — Blanes, S., Casas, F. and Murua, A. (2024), Splitting methods for differential equations, Acta Numerica 33, 1–161, https://doi.org/10.1017/S0962492923000077 (publisher metadata and public formula excerpt); University of Bielefeld, Computational Physics, Operator Splitting, https://roesner.pages.ub.uni-bielefeld.de/lectures/computational-physics/semester/sose2026/lecture/08_pde/04_operator_splitting.html ; finite-dimensional error arguments independently derived.

## Matrix exponential by Padé scaling and squaring (matrix-exponential-pade-scaling-squaring)

> For square A, choose integer s≥0 so B=2^(−s)A satisfies b=||B||≤1/2 in a submultiplicative induced norm. Set P=I+B/2+B²/10+B³/120, Q=I−B/2+B²/10−B³/120, solve QX₀=P and set X_(j+1)=X_j² for j=0,…,s−1; return X_s≈exp(A).

A input matrix; B scaled matrix; s squaring count; b induced norm of B; P,Q diagonal Padé numerator and denominator matrices; X_j intermediate approximation.

General numerical evaluation of a matrix exponential.

Assumptions — Finite real or complex square matrix, consistent induced norm, sufficiently accurate linear solve and matrix multiplications; fixed degree three is an educational specialization, not the optimized variable-degree algorithm.

Limitations — Overscaling can amplify roundoff and increase cost; dense matrix powers and repeated squaring may be expensive; the norm threshold only ensures denominator invertibility here and is not a universal accuracy guarantee.

Mechanism — Direct power series multiplication of Q exp(B) cancels P through degree six, giving local rational error O(||B||⁷). For b≤1/2, ||I−Q||≤b/2+b²/10+b³/120<1, so Q is invertible by the Neumann series. The exponential identity exp(A)=[exp(B)]^(2^s) justifies squaring. For fixed A in exact arithmetic the accumulated approximation error tends to zero as s increases (telescoping powers gives O(2^(−6s)) with an A-dependent bound); finite precision can reverse that benefit. This evaluates a full matrix function rather than composing different operators.

Source — Higham, N. J. (2005), The Scaling and Squaring Method for the Matrix Exponential Revisited, https://doi.org/10.1137/04061101X ; Al-Mohy and Higham (2009), A New Scaling and Squaring Algorithm for the Matrix Exponential, https://doi.org/10.1137/09074721X (public abstracts); fixed degree-three coefficients and denominator bound independently derived.

## Arnoldi Krylov approximation to a matrix exponential action (arnoldi-krylov-exponential-action)

> For square A, vector v≠0, t≥0 and 1≤m≤dim(A), set β=||v||₂ and build an orthonormal Arnoldi basis V_m starting at v/β, with H_m=V_m* A V_m. Approximate exp(tA)v by y_m(t)=β V_m exp(tH_m)e₁; return zero if v=0 and stop at exact invariant-subspace breakdown using the attained dimension.

A matrix; v starting vector; t evolution time; β Euclidean norm; V_m Arnoldi basis; H_m reduced upper Hessenberg matrix; e₁ first coordinate vector; * conjugate transpose.

General matrix exponential action and linear evolution without forming the full exponential.

Assumptions — Finite-dimensional square real or complex matrix, accurate matrix-vector products, controlled orthogonality and reduced exponential evaluation; exact arithmetic for the stated defect identity.

Limitations — Dimension needed depends on spectrum, nonnormality and time; an endpoint residual alone is not a global error certificate; basis storage and orthogonalization grow with m.

Mechanism — Galerkin projection of y′=Ay yields z′=H_m z, z(0)=βe₁. The Arnoldi relation AV_m=V_mH_m+h_(m+1,m)v_(m+1)e_m* gives defect y_m′−Ay_m=−βh_(m+1,m)v_(m+1)e_m*exp(tH_m)e₁. Variation of constants bounds the error by the integral of the defect norm times ||exp((t−τ)A)||; contractivity is an additional condition, not automatic. Exact breakdown means the Krylov subspace is invariant and the lifted solution is exact. Unlike basis construction alone, this specifies a reduced matrix-function computation and full-space reconstruction.

Source — Saad, Y. (1992), Analysis of Some Krylov Subspace Approximations to the Matrix Exponential Operator, https://doi.org/10.1137/0729014 (public abstract); Jawecki, Auzinger and Koch, Computable upper error bounds for Krylov approximations to matrix exponentials and associated phi-functions, https://arxiv.org/abs/1809.03369 (abstract); projection and defect identities independently derived from Arnoldi relation.

## Denman–Beavers matrix square root iteration (denman-beavers-matrix-square-root)

> For Hermitian positive definite A, set Y₀=A, Z₀=I and simultaneously update Y_(k+1)=(Y_k+Z_k^(-1))/2, Z_(k+1)=(Z_k+Y_k^(-1))/2; return Y≈A^(1/2), Z≈A^(−1/2).

A input matrix; Y,Z coupled iterates; I identity.

General numerical computation of a positive definite square root and its inverse.

Assumptions — Finite Hermitian positive definite matrix; accurate linear solves; exact arithmetic for the convergence proof; no extension to singular or indefinite inputs claimed.

Limitations — Two dense inverse actions per iteration; ill-conditioned inputs and finite precision may impair accuracy; small product residual alone does not establish the correct square-root branch.

Mechanism — Induction gives Y_k=AZ_k and both iterates are positive definite functions of A. For eigenvalue a>0, y_next=(y+a/y)/2 and y_next−√a=(y−√a)²/(2y), yielding positive iterates, monotone convergence after the first step and quadratic local convergence. Z follows by Z=A^(-1)Y. Applying Newton sign iteration to [[0,A],[I,0]] produces exactly the two coupled blocks; retain this useful structured variant, not a separate distinct algorithm. Cholesky factors generally do not square to A.

Source — Higham, N. J. (2006), Computing Matrix Functions by Iteration, University of Manchester, slide 19, https://www.maths.manchester.ac.uk/~higham/talks/lille06.pdf ; Higham (2020), What Is the Matrix Sign Function?, https://nhigham.com/2020/12/15/what-is-the-matrix-sign-function/ (block relation); positive-definite specialization independently derived.

## Newton iteration for a matrix polar factor (newton-matrix-polar-factor)

> For nonsingular square A, set X₀=A and X_(k+1)=(X_k+(X_k*)^(-1))/2; return U≈X_k and H≈U*A in the polar factorization A=UH.

A nonsingular square matrix; X iterate; U unitary factor; H positive definite Hermitian factor; * conjugate transpose.

General numerical computation of a square matrix polar factorization.

Assumptions — Finite real or complex nonsingular square matrix, accurate inverse actions; exact arithmetic for singular-value convergence; no rank-deficient or rectangular guarantee.

Limitations — Extreme singular values may slow initial progress; dense solves are costly; scaling and backward stability require separate analysis; near-unitarity alone is not a complete factorization certificate.

Mechanism — Write A=PΣQ* with all σ_i>0. The iterates preserve P,Q and update each positive singular value by σ_next=(σ+1/σ)/2, with σ_next−1=(σ−1)²/(2σ). Thus U=PQ* and H=QΣQ* in the limit, with local quadratic convergence. Newton sign iteration on [[0,A],[A*,0]] preserves the adjoint block structure and gives exactly this update. Count as a structured sign-iteration variant; it does not compute a least-squares solution.

Source — Higham, N. J. (1986), Computing the Polar Decomposition—with Applications, SIAM J. Sci. Stat. Comput. 7(4), 1160–1174, https://eprints.maths.manchester.ac.uk/694/ (abstract); Higham (2020), What Is the Polar Decomposition?, https://nhigham.com/2020/07/28/what-is-the-polar-decomposition/ (formula and SVD relation).

## Newton iteration for the matrix sign function (newton-matrix-sign-iteration)

> For square A with no eigenvalues on the imaginary axis, set X₀=A and X_(k+1)=(X_k+X_k^(-1))/2; the target S=sign(A) acts as +I on the right-half-plane generalized eigenspace and −I on the left-half-plane generalized eigenspace.

A input matrix; X iterate; S matrix sign; I identity.

General numerical spectral splitting and matrix-function evaluation.

Assumptions — Finite square matrix with spectrum disjoint from the imaginary axis; accurate inverse actions; exact arithmetic for the convergence proof.

Limitations — Potentially slow initial progress for extreme eigenvalue magnitudes; nonnormality and eigenvalues near the imaginary axis can amplify numerical error; ||X²−I|| alone cannot verify the chosen invariant subspaces.

Mechanism — S commutes with A and S²=I. Define G_k=(X_k−S)(X_k+S)^(-1). Direct substitution using commutation gives G_(k+1)=G_k². Each eigenvalue of G₀ is (λ−s)/(λ+s), with s=+1 or −1 chosen by the half-plane, so its modulus is less than one. Hence G₀^(2^k)→0 even for finite Jordan blocks, and X_k=(I−G_k)^(-1)(I+G_k)S→S. The identity X_next−S=X_k^(-1)(X_k−S)²/2 gives quadratic local convergence. Distinct matrix-function recurrence, not the scalar Newton root solver or the matrix exponential.

Source — Higham, N. J. (2020), What Is the Matrix Sign Function?, https://nhigham.com/2020/12/15/what-is-the-matrix-sign-function/ (definition, Newton recurrence and block identities); convergence argument independently derived.

## Radix-two Cooley–Tukey discrete Fourier transform (radix-two-cooley-tukey-fft)

> For N=2M=2^m (m≥1) and W_N=e^(−2πi/N), E_k=Σ_(n=0)^(M−1)x_(2n)W_M^(nk), O_k=Σ_(n=0)^(M−1)x_(2n+1)W_M^(nk); X_k=E_k+W_N^k O_k and X_(k+M)=E_k−W_N^k O_k for k=0,…,M−1, recursively to length 1.

N=2^m transform length; M=N/2; x_n complex input; k frequency index; W_q=e^(−2πi/q); E_k and O_k even- and odd-index length-M transforms..

Numerical preprocessing or frequency-domain analysis of suitable time-series measurements in sporting contexts. This is a transform algorithm, not a forecast model; no predictive value is claimed.

Assumptions — Positive power-of-two N, with N=1 the identity base case; finite complex input; negative-exponent forward DFT with no forward normalization. The source uses the opposite sign, related by conjugating input and output..

Limitations — This radix-two recurrence applies directly only when N is a power of two. Floating-point round-off, memory layout, bit-reversal order and speed depend on implementation and hardware; no sports forecasting benefit is established..

Mechanism — Split the direct DFT sum into even and odd input indices, use W_N²=W_M and W_N^M=−1. The two outputs share their length-M subtransforms. The recurrence T(N)=2T(N/2)+O(N) gives O(N log N). The original paper treats general sparse-factor FFTs and radix two; this is the canonical mechanism here, not a distinct algorithm for each radix.

Source — Cooley, J. W. and Tukey, J. W. (1965). An algorithm for the machine calculation of complex Fourier series. Mathematics of Computation, 19(90), 297–301. https://doi.org/10.1090/S0025-5718-1965-0178586-1

## Bluestein chirp convolution discrete Fourier transform (bluestein-chirp-dft)

> For X_k=Σ_(n=0)^(N−1)x_n e^(−2πink/N), use 2nk=n²+k²−(k−n)² to obtain X_k=e^(−πik²/N)Σ_(n=0)^(N−1)[x_n e^(−πin²/N)]e^(+πi(k−n)²/N), a chirp-weighted linear convolution.

N positive DFT length; n input index; k output index; x_n input; a_n=x_n e^(−πin²/N); b_r=e^(+πir²/N) for r=−(N−1),…,N−1..

Computing the DFT for arbitrary-length sequences through chirp convolution, including preprocessing or frequency-domain analysis of suitable sporting time series. This is a transform algorithm, not a forecast model; no predictive value is claimed.

Assumptions — N is a positive integer; finite complex input; negative-exponent unnormalized forward DFT. For L≥2N−1 use a length-L circular embedding: a[n]=0 beyond n=N−1, b[0]=1, b[r]=b[L−r]=e^(+πir²/N) for 1≤r≤N−1, and zero otherwise. Use inverse FFT normalization consistently..

Limitations — The convolution implementation requires correct negative-index embedding and padding. Floating-point error, memory use and speed depend on L and the selected FFT; this can cost more than a radix-two FFT when N already has favorable factors. No sports forecasting benefit is established..

Mechanism — The quadratic identity 2nk=n²+k²−(k−n)² directly gives the chirp factorization. The length-L embedding represents every required signed difference uniquely modulo L; the first N circular outputs therefore equal the needed linear-convolution values. The original IEEE abstract confirms chirp filtering and O(N log N) for arbitrary length; full paper was not inspected.

Source — Bluestein, L. I. (1970). A linear filtering approach to the computation of discrete Fourier transform. IEEE Transactions on Audio and Electroacoustics, 18(4), 451–455. https://doi.org/10.1109/TAU.1970.1162132

## Orthonormal discrete cosine transform type II (orthonormal-dct-ii)

> C_k=α_k Σ_(n=0)^(N−1)x_n cos(π(n+1/2)k/N), α_0=1/√N, α_k=√(2/N) for k>0; x_n=Σ_(k=0)^(N−1)α_k C_k cos(π(n+1/2)k/N).

N positive vector length; n input index; k coefficient index; x real vector; C cosine coefficients; α normalization.

General real-valued signal representation or compression; no forecast or predictive benefit is claimed.

Assumptions — Finite real vector with N≥1; all indices run from 0 to N−1; basis corresponds to an even extension about the half-sample boundaries.

Limitations — Full transform is invertible but truncating coefficients loses information. Energy compaction depends on the input; boundaries and sample ordering affect interpretation. No computational speedup or forecasting benefit is guaranteed.

Mechanism — Cosine product-to-sum and the finite sum of cos(π(n+1/2)m/N), which vanishes for integer m from 1 to 2N−1, give row norms N for k=0 and N/2 otherwise before scaling. Thus the matrix is orthogonal. This specifies a basis transformation, not a new FFT implementation.

Source — SciPy v1.11.4 Manual, Fourier Transforms, Discrete Cosine and Sine Transforms. https://docs.scipy.org/doc/scipy-1.11.4/tutorial/fft.html

## Orthonormal discrete sine transform type I (orthonormal-dst-i)

> S_k=√(2/(N+1)) Σ_(n=1)^N x_n sin(πnk/(N+1)), k=1,…,N; x_n=√(2/(N+1)) Σ_(k=1)^N S_k sin(πnk/(N+1)).

N number of interior samples; n and k are one-based indices; x real vector; S sine coefficients.

Represent finite real vectors or discretized functions with homogeneous endpoint conditions; no empirical application is asserted.

Assumptions — Finite real vector with N≥2 for compatibility with the cited implementation; zero boundary values at indices 0 and N+1 describe the odd extension.

Limitations — A nonzero physical boundary requires a suitable lifting or other basis if used for a boundary problem. Dropping coefficients loses information. No forecast benefit is claimed.

Mechanism — The sine product-to-sum identity and the finite roots-of-unity sum on 2(N+1) points give Σ_(n=1)^N sin(πnk/(N+1))sin(πnl/(N+1))=(N+1)δ_kl/2. The scaled matrix is symmetric orthogonal and self-inverse. This is a feature transformation with a different boundary basis, not a new FFT algorithm.

Source — SciPy v1.11.4 Manual, Fourier Transforms, Discrete Cosine and Sine Transforms. https://docs.scipy.org/doc/scipy-1.11.4/tutorial/fft.html

## Rader prime-length discrete Fourier transform (rader-prime-length-dft)

> For prime p, primitive root g modulo p and W=e^(−2πi/p), define a_j=x_(g^j mod p), b_l=W^(g^(−l) mod p); X_(g^(−m) mod p)=x_0+Σ_(j=0)^(p−2)a_j b_((m−j) mod (p−1)), X_0=Σ_(n=0)^(p−1)x_n.

p prime length; g primitive root; j,l,m indices modulo p−1; W primitive pth root of unity.

General prime-length Fourier transformation; no forecasting benefit claimed.

Assumptions — Prime p and verified primitive root g; finite complex vector; negative-exponent unnormalized DFT.

Limitations — Modular permutations and convolution length p−1 introduce overhead; cost depends on convolution implementation and factorization.

Mechanism — Multiplicative-group indexing converts a prime-length DFT to a cyclic convolution; the chirp identity is not required. Same DFT output as other DFT algorithms, but a distinct computational reduction. For p=2 the nonzero group has one element; use g=1 or compute directly.

Source — Rader, C. M. (1968). Discrete Fourier transforms when the number of data samples is prime. Proceedings of the IEEE 56(6), 1107–1108. https://doi.org/10.1109/PROC.1968.6477

## Good–Thomas coprime-factor discrete Fourier transform (good-thomas-prime-factor-dft)

> For N=ab with gcd(a,b)=1, u=b^(-1) mod a, v=a^(-1) mod b, n=(n_1bu+n_2av) mod N, k=(k_1b+k_2a) mod N, X_k=Σ_(n_1=0)^(a−1)Σ_(n_2=0)^(b−1)x_n exp(−2πi(n_1k_1/a+n_2k_2/b)).

a,b coprime integer factors; u,v modular inverses; n_1,k_1 indices modulo a; n_2,k_2 indices modulo b.

General composite-length Fourier transformation for coprime factors; no forecast benefit claimed.

Assumptions — a,b>1 and coprime; finite complex inputs; exact modular indexing; unnormalized negative-exponent transform.

Limitations — Only coprime factorization permits the stated twiddle-free mapping. Permutation overhead and subtransform cost depend on implementation.

Mechanism — CRT input and dual output indexing eliminate interstage twiddle factors. This is a distinct computational factorization from the radix-two Cooley–Tukey recurrence; coprimality is essential.

Source — Good, I. J. (1958). The interaction algorithm and practical Fourier analysis. JRSS B 20(2), 361–372. https://doi.org/10.1111/j.2517-6161.1958.tb00300.x

## Goertzel recurrence for an integer DFT bin (goertzel-integer-bin-dft)

> For ω=2πk/N, s_(−2)=s_(−1)=0, s_n=x_n+2cos(ω)s_(n−1)−s_(n−2) for n=0,…,N−1; X_k=e^(iω)s_(N−1)−s_(N−2).

N positive integer length; k integer with 0≤k<N; ω bin angular frequency; s recurrence state; i imaginary unit.

General selective Fourier coefficient evaluation; no forecasting benefit claimed.

Assumptions — Finite real or complex vector, exact integer bin and negative-exponent unnormalized DFT.

Limitations — O(N) operations per bin and constant state; repeated evaluation of many bins can be slower than FFT; cancellation and state growth can impair finite-precision accuracy.

Mechanism — Second-order recurrence evaluates one Fourier coefficient without a full transform. Integer-bin phase follows from e^(−iNω)=1; this is not an FFT butterfly factorization.

Source — MathWorks. goertzel: Discrete-Time Fourier transform with second-order Goertzel algorithm. https://www.mathworks.com/help/signal/ref/goertzel.html

## Orthonormal Walsh–Hadamard transform in natural order (orthonormal-walsh-hadamard-transform)

> For N=2^m, H_1=[1], H_(2r)=[[H_r,H_r],[H_r,−H_r]], y=H_N x/√N, x=H_N y/√N.

m nonnegative integer; N vector length; H_r Sylvester Hadamard matrix of order r; x,y input and output.

General orthogonal transform of finite vectors; no forecasting benefit claimed.

Assumptions — Finite real or complex vector of power-of-two length; natural Sylvester order and unitary normalization.

Limitations — Ordering and normalization differ among libraries; non-power-of-two lengths require a separately specified embedding; different basis from sinusoidal and localized wavelet bases.

Mechanism — A global binary-character basis, not the localized Haar wavelet or sinusoidal Fourier basis. H_N H_N^T=N I follows by block multiplication. Classified as a feature transformation, not an extra distinct FFT algorithm.

Source — MathWorks. fwht: Fast Walsh-Hadamard transform. https://www.mathworks.com/help/signal/ref/fwht.html

## Split-radix power-of-two Fourier transform (split-radix-power-two-fft)

> For N≥4 a power of two and W=e^(−2πi/N), let E_k, O_k, P_k be DFTs of x_(2n), x_(4n+1), x_(4n+3) respectively; X_k=E_(k mod (N/2))+W^k O_(k mod (N/4))+W^(3k) P_(k mod (N/4)), 0≤k<N.

N power-of-two length; k output index; E,O,P shorter unnormalized DFTs; W primitive root.

General power-of-two Fourier transformation; no forecasting benefit claimed.

Assumptions — Finite complex vector and consistent negative-exponent convention; direct base cases N=1,2.

Limitations — Irregular recursion and indexing; arithmetic reduction need not imply runtime improvement.

Mechanism — Mixed radix-two/radix-four decomposition of the same DFT; partition into even indices and the two odd residue classes gives the stated phase factors. A Cooley–Tukey variant, not a new distinct algorithm.

Source — Duhamel, P. and Hollmann, H. (1984). Split radix FFT algorithm. Electronics Letters 20(1), 14–16. https://doi.org/10.1049/el:19840012

## Chirp Z-transform on a geometric contour (chirp-z-geometric-contour-transform)

> For z_k=A W^(−k), X_k=Σ_(n=0)^(N−1)x_n A^(−n) W^(nk), 0≤k<M; W^(nk)=W^(n²/2) W^(k²/2) W^(−(k−n)²/2) with a consistent square root of W.

N,M positive lengths; A,W nonzero complex contour parameters; k output index.

General geometric-contour Z-transform evaluation; no forecasting benefit claimed.

Assumptions — Finite complex vector and consistent square-root convention; sufficient convolution embedding.

Limitations — Off-unit-circle powers may overflow or underflow; conditioning can deteriorate; not a general arbitrary-point transform.

Mechanism — Generalizes the Bluestein chirp convolution to geometric contours; A=1, M=N and W=e^(−2πi/N) recover the ordinary DFT. Classified as a variant of the existing convolution mechanism.

Source — Rabiner, L. R., Schafer, R. W. and Rader, C. M. (1969). The chirp z-transform algorithm and its application. Bell System Technical Journal 48(5), 1249–1292. https://doi.org/10.1002/j.1538-7305.1969.tb04268.x

## Orthonormal discrete Hartley transform (orthonormal-discrete-hartley-transform)

> H_k=N^(−1/2) Σ_(n=0)^(N−1) x_n [cos(2πkn/N)+sin(2πkn/N)]; x_n=N^(−1/2) Σ_(k=0)^(N−1) H_k [cos(2πkn/N)+sin(2πkn/N)].

N positive integer length; n,k indices; x real input and H real coefficients.

General real-valued orthogonal transformation; no forecasting benefit claimed.

Assumptions — Finite real vector and symmetric normalization.

Limitations — Equivalent information to the real-input DFT; direct evaluation is quadratic; not a claim of faster runtime.

Mechanism — With unitary negative-exponent DFT F, H_k=Re(F_k)−Im(F_k) for real x; F_k=(H_k+H_(−k))/2+i(H_(−k)−H_k)/2 with indices modulo N. The symmetric real kernel is orthogonal and involutory under the stated normalization. A feature transformation, not another distinct Fourier algorithm.

Source — FFTW 3.3.11 documentation, The Discrete Hartley Transform, section 2.5.3. https://ns.fftw.org/doc/The-Discrete-Hartley-Transform.html

## Prime-field number theoretic transform (prime-field-number-theoretic-transform)

> For prime p and N dividing p−1, choose ω of exact order N in F_p; X_k=Σ_(n=0)^(N−1)x_n ω^(nk) mod p; x_n=N^(−1) Σ_(k=0)^(N−1)X_k ω^(−nk) mod p.

p prime modulus; N positive integer length; ω primitive Nth root; N^(−1) modular inverse.

General finite-field transformation; no forecasting benefit claimed.

Assumptions — Finite-field inputs; N divides p−1; exact order N verified.

Limitations — Direct evaluation uses O(N²) field operations with precomputed powers; modular residues alone do not recover unrestricted integer coefficients; exact arithmetic and suitable modulus are required..

Mechanism — The prime-field multiplicative group is cyclic of order p−1. Summing ω^(k(n−m)) over k yields N for n=m and zero otherwise by the geometric-series identity in the field; N is invertible since N divides p−1. A finite-field Fourier analogue with different scalar domain, classified as a feature transformation rather than a new fast algorithm.

Source — Wolfram Function Repository. NumberTheoreticTransform. https://resources.wolframcloud.com/FunctionRepository/resources/NumberTheoreticTransform

## Horner nested polynomial evaluation (horner-polynomial-evaluation)

> For P(x)=Σ_(j=0)^d a_j x^j, set b_d=a_d and b_j=a_j+x b_(j+1) for j=d−1,…,0; P(x)=b_0.

d nonnegative degree; a_j coefficients; x scalar argument.

General polynomial evaluation; no forecasting benefit claimed.

Assumptions — Finite scalar coefficients and argument in a commutative field; standard monomial basis.

Limitations — Cancellation and overflow can affect floating-point results; not a stable relative-error guarantee near roots.

Mechanism — Induction gives b_j=Σ_(k=j)^d a_k x^(k−j), so b_0=P(x). This one-state monomial recurrence is not barycentric interpolation, a root solver, or a Chebyshev iterative linear-system solver.

Source — NIST Digital Library of Mathematical Functions §1.11(i), equations 1.11.1–1.11.4. https://dlmf.nist.gov/1.11.i

## Clenshaw Chebyshev series evaluation (clenshaw-chebyshev-series-evaluation)

> For S(x)=Σ_(j=0)^d a_j T_j(x), set b_(d+1)=b_(d+2)=0, b_j=a_j+2x b_(j+1)−b_(j+2) for j=d,…,1; S(x)=a_0+x b_1−b_2.

T_j first-kind Chebyshev polynomial; a_j full series coefficients; d nonnegative degree; x real argument.

General Chebyshev expansion evaluation; no forecasting benefit claimed.

Assumptions — Finite expansion with full constant coefficient and x in [−1,1].

Limitations — Roundoff and cancellation remain possible, especially near endpoints; extrapolation may amplify error.

Mechanism — The DLMF uses half-weighted c_0; set c_0=2a_0 and c_j=a_j for j>0. Substitution into its final (u_0−u_2)/2 gives the stated full-coefficient formula. This two-state recurrence is a generalization of Horner but uses a materially different recurrence for an orthogonal basis; neither Clenshaw–Curtis quadrature nor Chebyshev iteration evaluates this supplied expansion.

Source — NIST Digital Library of Mathematical Functions §3.11(ii), equations 3.11.11 and 3.11.15. https://dlmf.nist.gov/3.11.ii

## De Casteljau Bernstein polynomial evaluation (de-casteljau-bernstein-evaluation)

> For P(t)=Σ_(i=0)^d β_i C(d,i)t^i(1−t)^(d−i), set b_i^(0)=β_i and b_i^(r)=(1−t)b_i^(r−1)+t b_(i+1)^(r−1) for r=1,…,d and i=0,…,d−r; P(t)=b_0^(d).

d nonnegative degree; C(d,i) binomial coefficient; β_i real Bernstein coefficients; t scalar argument; b intermediate values.

General Bernstein polynomial evaluation; no forecasting benefit claimed.

Assumptions — Finite scalar Bernstein coefficients and t in [0,1]; exact arithmetic for the identity.

Limitations — Quadratic arithmetic cost; cancellation may still matter for mixed-sign coefficients; extrapolation loses convex combination property.

Mechanism — Induction using Pascal's identity yields b_i^(r)=Σ_(j=0)^r C(r,j)t^j(1−t)^(r−j)β_(i+j). Each level is a triangular array of convex combinations, distinct from the scalar backward Horner or Clenshaw recurrence.

Source — Eric W. Weisstein, MathWorld, de Casteljau Algorithm, equations (1)–(3). https://mathworld.wolfram.com/deCasteljauAlgorithm.html

## Newton divided difference polynomial interpolation (newton-divided-difference-interpolation)

> For distinct nodes x_0,…,x_d and ordinates y_i set D_(i,0)=y_i; D_(i,r)=(D_(i+1,r−1)−D_(i,r−1))/(x_(i+r)−x_i) for r=1,…,d and i=0,…,d−r. P(x)=Σ_(r=0)^d D_(0,r) Π_(j=0)^(r−1)(x−x_j), with empty product 1.

d nonnegative degree bound; x_i distinct nodes; y_i ordinates; D divided differences; x query.

General interpolation of finite numerical tables; no forecasting benefit claimed.

Assumptions — Finite distinct real nodes, finite ordinates and scalar query; no repeated-node derivative data.

Limitations — Same polynomial and possible high-degree oscillation as barycentric interpolation; close nodes can amplify rounding; order affects finite-precision results.

Mechanism — The Newton form is the same unique degree-at-most-d interpolant as the barycentric form, but uses a divided-difference table and nested product basis, allowing incremental addition of a node. Conservatively classified as a computational variant, not a new interpolant or independent algorithm count.

Source — NIST Digital Library of Mathematical Functions §3.3(iii)–(iv), equations 3.3.34–3.3.38. https://dlmf.nist.gov/3.3

## De Boor B-spline evaluation (de-boor-bspline-evaluation)

> For degree q≥1, nondecreasing knots u_0,…,u_(n+q+1), coefficients c_0,…,c_n and u_k<x<u_(k+1), q≤k≤n, set d_j^(0)=c_(k−q+j) for j=0,…,q; for r=1,…,q and j=r,…,q set α=(x−u_(k−q+j))/(u_(k+1+j−r)−u_(k−q+j)), d_j^(r)=(1−α)d_(j−1)^(r−1)+α d_j^(r−1); S(x)=d_q^(q).

q spline degree; n highest coefficient index; c spline coefficients; u knot sequence; k span index; x query.

General B-spline evaluation; no forecasting benefit claimed.

Assumptions — Finite real coefficients and nondecreasing finite knots with valid dimensions, n≥q and strictly interior query in a positive span; exact arithmetic for the identity.

Limitations — This specification excludes queries at knots and endpoints; knot multiplicities affect continuity; roundoff is not excluded.

Mechanism — Substitute i=k−q+j into the cited recurrence. At every permitted update the lower knot is at or below u_k and the upper knot is at or above u_(k+1), giving positive denominators and convex weights. For one clamped span all weights equal the normalized query, recovering de Casteljau. General knot-dependent weights and local support materially extend that triangular mechanism; conservatively count as a variant, not an independent algorithm.

Source — Ching-Kuang Shene, Michigan Technological University, De Boor’s Algorithm, non-knot case and recurrence. https://pages.mtu.edu/~shene/COURSES/cs3621/NOTES/spline/de-Boor.html

## Remez polynomial minimax exchange (remez-polynomial-exchange)

> For d≥0 and d+2 ordered distinct nodes t_i in [a,b], solve Σ_(j=0)^d a_j t_i^j+(−1)^i E=f(t_i), i=0,…,d+1. Set P(x)=Σ_(j=0)^d a_j x^j, e=f−P, M=max_[a,b]|e(x)|. If M−|E|≤ε stop; otherwise insert a maximizer η of |e| and exchange one old node so the retained nonzero errors alternate, then solve again.

d degree bound; a,b interval; t_i reference nodes; E signed reference error; P polynomial; M global maximum absolute residual; ε nonnegative absolute gap tolerance.

General uniform polynomial approximation; no forecasting benefit claimed.

Assumptions — Continuous real f on compact nondegenerate interval, distinct nodes, exact or certified global extremum search and a reliable linear solve; nonzero E for exchange; explicit iteration bound.

Limitations — Grid maxima alone do not certify the global error; ill-conditioning, near-ties and zero reference error need handling; finite iteration convergence is not guaranteed.

Mechanism — Alternation gives |E|≤optimal uniform error≤M: a strictly better polynomial would require its difference from P to alternate signs at d+2 nodes, forcing at least d+1 roots. On exchange, the order-(d+1) divided difference annihilates both degree-d polynomials; alternating residual signs align with the signs of the divided-difference weights. The new reference magnitude is a positive weighted average of the retained magnitudes |E| and the strictly larger M. This establishes a strict lower-bound increase in the stated nondegenerate exact case, not global finite convergence. Distinct from fitting least squares, evaluating a fixed polynomial or interpolating fixed ordinates.

Source — NIST DLMF §3.11(i), alternation condition and equations 3.11.1–3.11.5; Pachón and Trefethen (2009), BIT 49, 721–741, DOI 10.1007/s10543-009-0240-1 (Oxford publication abstract). One-point exchange rule and lower bound checked by derivation. https://dlmf.nist.gov/3.11.i

## Arithmetic-geometric mean iteration (arithmetic-geometric-mean-iteration)

> For a_0,b_0>0, set a_(k+1)=(a_k+b_k)/2 and b_(k+1)=√(a_k b_k); define AGM(a_0,b_0)=lim a_k=lim b_k.

a_k arithmetic iterate; b_k geometric iterate; k iteration index.

General numerical special-function computation; no forecasting benefit claimed.

Assumptions — Positive finite real inputs; exact arithmetic for interval and convergence claims; reliable scaled arithmetic and a declared positive absolute tolerance in original units.

Limitations — Extreme dynamic range can defeat scaling or geometric-mean evaluation; rounded endpoints are not certified enclosures without directed rounding or other error bounds.

Mechanism — After ordering a≥b>0, b≤√(ab)≤(a+b)/2≤a, so nested intervals enclose the common limit. The new gap is (√a−√b)²/2=(a−b)²/[2(√a+√b)²], proving convergence and a quadratic gap bound since b≥b_0. This two-state coupled mean is neither a scalar fixed-point acceleration nor the matrix square-root iteration with invariant Y=AZ. The enclosing interval is an exact-arithmetic claim.

Source — NIST DLMF §19.8(i), equations 19.8.1–19.8.4, common limit and quadratic convergence. https://dlmf.nist.gov/19.8.i

## Circular rotation CORDIC (cordic-circular-rotation)

> For a target angle z_0 in [−π/2,π/2], set x_0=1,y_0=0; for i=0,…,N−1 use σ_i=1 when z_i≥0 and −1 otherwise, x_(i+1)=x_i−σ_i 2^(−i)y_i, y_(i+1)=y_i+σ_i 2^(−i)x_i, z_(i+1)=z_i−σ_i arctan(2^(−i)). Scale (x_N,y_N) by Π_(i=0)^(N−1)(1+2^(−2i))^(−1/2).

z residual angle; x,y vector iterates; N rotation steps; σ direction.

General numerical rotation and trigonometric evaluation; no forecasting benefit claimed.

Assumptions — Finite target angle in radians in [−π/2,π/2]; positive integer N; simultaneous vector updates and correctly indexed angle table; exact arithmetic for residual and norm claims.

Limitations — Finite residual angle and finite-precision shift, angle-table and gain errors; wider angles need range reduction; no implementation-level error bound implied.

Mechanism — Each unscaled update equals √(1+2^(−2i)) times rotation by σ_i α_i, α_i=arctan(2^(−i)). Thus after correction the vector is (cos(z_0−z_N),sin(z_0−z_N)). Since |z_0|≤2α_0 and α_(i−1)≤2α_i by concavity of arctan on nonnegative arguments, induction gives |z_(i+1)|≤α_i. Euclidean vector error is at most |z_N| in exact arithmetic. Unlike Givens elimination or Jacobi diagonalization, signed shift-add microrotations approximate a supplied angle, not an elimination pivot.

Source — Ryan Robucci, University of Maryland Baltimore County, Lecture 20 – CORDIC, §§2–6 and 11; rotation equations and deferred gain correction. https://eclipse.umbc.edu/robucci/cmpeRSD/lectures/Lecture20__CORDIC/Lecture20__CORDIC.html

## Kahan compensated summation (kahan-compensated-summation)

> Set s=0,c=0; for each x_i compute y=fl(x_i−c), t=fl(s+y), c=fl(fl(t−s)−y), s=t; return s.

x_i terms; s running sum; c signed rounding compensation; t,y temporaries; fl operation-wise rounding; u unit roundoff.

General numerical summation; no forecasting benefit claimed.

Assumptions — Finite floating-point inputs; fixed working precision, round-to-nearest, standard relative rounding model with no overflow or underflow for the quoted bound; strict evaluation order.

Limitations — Not an exact accumulator or a guaranteed correctly rounded result; cancellation can still make relative error large; nonfinite intermediates and reassociation invalidate the analysis.

Mechanism — The sign convention c=−e maps the recurrence to Higham’s compensated sum. Under the stated rounding model its absolute forward error is bounded asymptotically by (2u+O(nu²))Σ|x_i|; this is not a certified numerical tolerance or relative error guarantee. The feedback state is different from Horner polynomial evaluation, which multiplies by a query at each step, and from a balanced addition tree.

Source — Higham (1993), The Accuracy of Floating Point Summation, SIAM J. Sci. Comput. 14(4), 783–799, p. 791, equations (3.10)–(3.11), DOI 10.1137/0914050. https://nhigham.com/wp-content/uploads/2023/10/high93s.pdf

## TwoSum error-free addition transform (knuth-two-sum-error-free-transform)

> For floating-point a,b set s=fl(a+b), z=fl(s−a), e=fl(fl(a−fl(s−z))+fl(b−z)); under suitable arithmetic conditions a+b=s+e exactly.

a,b input numbers; s rounded sum; z temporary; e residual; fl rounding operator.

General floating-point residual decomposition; no forecasting benefit claimed.

Assumptions — IEEE binary floating point with round-to-nearest ties-to-even, one working precision, gradual underflow, individually rounded operations and no overflow in any intermediate.

Limitations — Exactness concerns the unevaluated real sum s+e, not a second rounded addition; flush-to-zero, double rounding and reassociation can invalidate the identity.

Mechanism — The cited theorem supplies the exact identity even with gradual underflow because subnormal addition/subtraction is exact in this format. Unlike Kahan, this is an order-independent two-operand residual extraction in six operations, not a streaming approximate sum; it requires no magnitude ordering. For example, the binary64 pair 1 and 2^−53 yields s=1 and e=2^−53, whose real sum is exact but whose rounded sum is 1.

Source — Ogita, Rump and Oishi (2005), Accurate Sum and Dot Product, SIAM J. Sci. Comput. 26(6), 1955–1988, Algorithm 3.1 and Theorem 3.4, DOI 10.1137/030601818. https://ogilab.w.waseda.jp/ogita/math/doc/2005_OgRuOi.pdf

## Balanced pairwise floating-point summation (balanced-pairwise-summation)

> Let v^(0)=(x_1,…,x_n), n≥1. At each level replace adjacent pairs by v_j^(k+1)=fl(v_(2j−1)^(k)+v_(2j)^(k)); copy an unpaired last term unchanged. Stop at one value Ŝ.

n number of terms; k tree level; v intermediate terms; fl rounded addition; Ŝ computed sum; u unit roundoff; d=⌈log₂ n⌉.

General numerical reduction; no forecasting benefit claimed.

Assumptions — Finite inputs, fixed pairing and precision, round-to-nearest with standard relative rounding model; no overflow or underflow for the stated bound; du<1.

Limitations — Not guaranteed correctly rounded; cancellation and input order affect accuracy; different parallel reduction trees can yield different rounded answers.

Mechanism — A leaf undergoes at most d rounded additions, so its multiplicative perturbation differs from 1 by at most γ_d=du/(1−du) under the stated rounding model. Summing absolute leaf errors yields |Ŝ−Σx_i|≤γ_dΣ|x_i|; shorter paths are covered by padding with factors 1. This extends the cited power-of-two derivation to odd lengths. The balanced reduction tree, unlike the sequential feedback in Kahan, uses no compensation.

Source — Higham (1993), The Accuracy of Floating Point Summation, p. 788, equation (3.6), DOI 10.1137/0914050. https://nhigham.com/wp-content/uploads/2023/10/high93s.pdf

## Fused multiply-add product residual transform (two-product-fma-error-free-transform)

> For floating-point a,b form p=fl(a b) and e=fma(a,b,−p), where fma rounds the exact product-plus-addend only once. If the exact residual is representable then a b=p+e as real numbers.

a,b operands; p rounded product; e residual; fl rounding to working precision; fma single-rounding fused operation.

General numerical product decomposition; no forecasting benefit claimed.

Assumptions — Finite IEEE binary operands, round-to-nearest ties-to-even, correctly rounded FMA in the same precision, no overflow and representable exact residual; no underflow in the sense of the cited product decomposition is a sufficient condition.

Limitations — A tiny product residual may be unrepresentable even when the rounded product is normal; product decomposition must not be claimed exact in that case; not equivalent to a separate rounded multiplication and subtraction.

Mechanism — The real residual r=a b−p is the exact input to the final rounding; if r belongs to the format, that rounding is the identity and the pair preserves the product. For a subnormal residual below the minimum representable increment this argument fails. The multiplication residual and explicit fused operation differ from the six-addition TwoSum primitive; neither alone is a full compensated dot-product algorithm.

Source — Ogita, Rump and Oishi (2005), Accurate Sum and Dot Product, equation (2.3) and Algorithm 3.5, DOI 10.1137/030601818. https://ogilab.w.waseda.jp/ogita/math/doc/2005_OgRuOi.pdf

## Magnitude-ordered FastTwoSum (dekker-fast-two-sum)

> For |a|≥|b|, compute s=fl(a+b), z=fl(s−a), e=fl(b−z). Under the stated arithmetic assumptions, a+b=s+e as real numbers.

a,b floating-point operands; s rounded sum; z temporary; e residual; fl working-precision rounding.

General numerical residual extraction; no forecasting benefit claimed.

Assumptions — Finite binary IEEE floating-point values, fixed precision, round-to-nearest ties-to-even, gradual underflow, |a|≥|b| and no overflowing intermediate.

Limitations — Magnitude ordering is a sufficient, not necessary, restriction; the pair is exact in real arithmetic, not necessarily when rounded again; arbitrary operand order, flush-to-zero or reassociation can defeat exactness.

Mechanism — Magnitude ordering implies the sufficient exponent ordering in the binary format. For binary64, a=1 and b=2^−53 give s=1, z=0 and e=2^−53. A separate unordered counterexample is a=1, b=2^54: s=2^54, z=2^54 and e=0, although the real residual is 1. The halfway subtraction 2^54−1 rounds to 2^54 in ties-to-even. The three-operation ordered variant computes the same real pair identity as the existing general six-operation TwoSum; it is not a distinct statistical model.

Source — Lange and Oishi (2020), A note on Dekker’s FastTwoSum algorithm, Numerische Mathematik 145, 383–403, Theorem 1 and Lemma 1, DOI 10.1007/s00211-020-01114-2. https://link.springer.com/article/10.1007/s00211-020-01114-2

## Scaled sum-of-squares accumulation (scaled-sum-of-squares)

> Maintain m≥0 and q≥0 with Σx_i²=m²q in exact arithmetic. For each nonzero x let v=|x|; if v>m, update q←1+q(m/v)² and m←v; otherwise q←q+(v/m)². Return m√q.

m maximum magnitude so far; q scaled accumulator; x next term; v absolute value.

General numerical norm evaluation; no forecasting benefit claimed.

Assumptions — Finite real floating-point inputs, declared working precision and ordered evaluation; start m=q=0, skip zeros, and require finite scaled state and final norm.

Limitations — The invariant is exact only in real arithmetic; ratios and squares can round or underflow, accumulation can lose small contributions, and an unrepresentable final norm can overflow; this historical one-scale algorithm is not the current three-accumulator safe-scaling implementation.

Mechanism — When a new maximum v appears, v²[1+q(m/v)²]=v²+m²q; otherwise m²[q+(v/m)²]=m²q+v². The induction starts at zero, and the nonzero branch prevents division by zero. Ratios have magnitude at most one, avoiding direct squaring of a large input. This is a scale-changing norm reduction, not the unscaled pairwise or compensated sum of already rounded terms.

Source — LAPACK 3.1 (2006), DLASSQ auxiliary routine, Netlib source, purpose and executable recurrence. https://netlib.org/lapack/lapack-3.1.1/html/dlassq.f.html

## Dekker binary64 significand splitting (dekker-binary64-significand-split)

> With C=2^27+1 compute t=fl(Ca), h=fl(t−fl(t−a)), l=fl(a−h). Under the stated arithmetic conditions a=h+l exactly with nonoverlapping components.

a binary64 input; C splitting constant; t temporary; h high component; l low component; fl rounded arithmetic.

General floating-point decomposition into high and low components; no forecasting benefit claimed.

Assumptions — Finite binary64 input, round-to-nearest ties-to-even, each arithmetic operation rounded separately in binary64, no overflow or underflow in intermediate arithmetic for this restricted specification.

Limitations — The initial multiplication can overflow for large a; this specification does not include rescaling or claim exactness with flush-to-zero, reassociation or mixed precision.

Mechanism — The source establishes the nonoverlapping exact decomposition for its arithmetic model. For a=1+2^−52, the rounded product is C+2^−25, h=1 and l=2^−52. A single input is decomposed into two narrower components, unlike TwoSum on two inputs or FMA extraction of an existing product residual.

Source — Ogita, Rump and Oishi (2005), Accurate Sum and Dot Product, SIAM J. Sci. Comput. 26(6), 1955–1988, p. 1961, Algorithm 3.2, DOI 10.1137/030601818. https://ogilab.w.waseda.jp/ogita/math/doc/2005_OgRuOi.pdf

## TwoSum cascaded compensated summation (two-sum-cascaded-compensated-summation)

> For n≥1 let p_1=x_1 and c_1=0; for i=2,…,n set (p_i,r_i)=TwoSum(p_(i−1),x_i), c_i=fl(c_(i−1)+r_i); return fl(p_n+c_n).

x_i input terms; p_i running rounded sum; r_i exact local residual; c_i rounded residual accumulation; fl rounding.

General compensated summation of floating-point measurements; no forecasting benefit claimed.

Assumptions — Nonempty finite floating-point sequence, fixed binary working precision, round-to-nearest ties-to-even with gradual underflow, strict TwoSum semantics and no overflow in any intermediate.

Limitations — The residual accumulation and final addition still round; the result is not a guaranteed correctly rounded or exact sum; cancellation may make relative error large.

Mechanism — Successive exact local identities give Σx_i=p_n+Σ_(i=2)^n r_i in real arithmetic by telescoping; c_n approximates rather than exactly represents the latter sum. The correction is separately accumulated and appended once, unlike Kahan’s feedback into each incoming term. It is conservatively classified in the compensated-summation family, not as an additional distinct algorithm.

Source — Ogita, Rump and Oishi (2005), Accurate Sum and Dot Product, p. 1963, Algorithm 4.1 and equation (4.2), DOI 10.1137/030601818. https://ogilab.w.waseda.jp/ogita/math/doc/2005_OgRuOi.pdf

## Non-FMA split product residual (split-two-product-residual)

> For binary64 operands a,b, let (a_h,a_l)=Split(a), (b_h,b_l)=Split(b), p=fl(ab), d_1=fl(p−fl(a_h b_h)), d_2=fl(d_1−fl(a_l b_h)), d_3=fl(d_2−fl(a_h b_l)), e=fl(fl(a_l b_l)−d_3); ab=p+e in real arithmetic on the stated domain.

a,b operands; h and l high and low split components; p rounded product; d_j intermediate differences; e residual; fl rounds one operation.

General numerical product decomposition; no forecasting benefit claimed.

Assumptions — IEEE binary64 round-to-nearest ties-to-even; registered Dekker split with factor 2^27+1; all operations separately rounded, no overflow or underflow in any nonzero intermediate, no reassociation or implicit FMA.

Limitations — The split itself can overflow even if ab is finite; the exact identity is restricted to this conservative arithmetic domain; additional scaling is outside the specification.

Mechanism — Expanding (a_h+a_l)(b_h+b_l) shows the correction is ab−p; the paper establishes exactness of the ordered floating-point recurrence without underflow. Same output identity as the existing FMA transform, so classified as a variant rather than a new distinct algorithm.

Source — Ogita, Rump and Oishi (2005), Accurate Sum and Dot Product, p. 1961, Algorithm 3.3 and p. 1962, Theorem 3.4, DOI 10.1137/030601818. https://ogilab.w.waseda.jp/ogita/math/doc/2005_OgRuOi.pdf

## Error-residual compensated dot product (compensated-dot-product-dot2)

> For n≥1, initialize (p_1,c_1)=TwoProduct(x_1,y_1); for i=2,…,n set (h_i,r_i)=TwoProduct(x_i,y_i), (p_i,q_i)=TwoSum(p_(i−1),h_i), c_i=fl(c_(i−1)+fl(q_i+r_i)); D=fl(p_n+c_n).

x_i,y_i paired components; h_i rounded product; r_i multiplication residual; p_i running rounded sum; q_i addition residual; c_i rounded correction; D returned dot product.

General numerical inner-product computation; no forecasting benefit claimed.

Assumptions — Finite equal-length nonempty binary64 vectors; round-to-nearest ties-to-even, separate operations, no overflow or underflow in nonzero intermediates, and exact residual transforms on their declared domains; for the cited bound n u < 1 with unit roundoff u.

Limitations — Correction accumulation and final addition still round; cancellation may yield a large relative error; not guaranteed correctly rounded, exact, or superior on every input.

Mechanism — With exact local transforms, q_i+r_i=x_i y_i+p_(i−1)−p_i. Telescoping yields xᵀy=p_n+c_1+Σ_(i=2)^n(q_i+r_i) before rounding the correction. Unlike compensated summation of already-rounded values, this mechanism also accounts for multiplication error; classified as a distinct inner-product algorithm.

Source — Ogita, Rump and Oishi (2005), Accurate Sum and Dot Product, pp. 1972–1973, Algorithms 5.3–5.4, equation (5.1), Proposition 5.5, DOI 10.1137/030601818. https://ogilab.w.waseda.jp/ogita/math/doc/2005_OgRuOi.pdf

## Welford online central second moment (welford-online-central-second-moment)

> For a finite sequence initialize k=1, m_1=x_1, M_1=0; for k≥2 set δ=x_k−m_(k−1), m_k=m_(k−1)+δ/k, M_k=M_(k−1)+δ(x_k−m_k). Return M_k=Σ_(i=1)^k(x_i−m_k)² in exact arithmetic

k positive count; x_k observation; m_k running mean; M_k unnormalized second central moment.

General streaming numerical summary; no empirical benefit claimed.

Assumptions — Nonempty finite real observations with consistent units; exact count, valid arithmetic, and representable intermediates for a floating-point implementation; no independence assumption for descriptive moments.

Limitations — Rounded mean updates may stagnate and subtraction or products may overflow or underflow; results depend on order in floating point; unbiased sample variance additionally needs independent identically distributed observations of finite variance.

Mechanism — Recenter the first k−1 observations by m_(k−1)−m_k; the cross term vanishes because their old centered deviations sum to zero. Their correction plus the new squared deviation equals δ(x_k−m_k). This updates a centered second moment in constant state, unlike the registered summation, conditional-variance and raw scatter methods; not a guarantee of floating-point exactness.

Source — Pébay (2008), Formulas for Robust, One-Pass Parallel Computation of Covariances and Arbitrary-Order Statistical Moments, SAND2008-6212, pp. 7–8, eqs. (1.1)–(1.2), citing Welford (1962). DOI 10.2172/1028931. https://digital.library.unt.edu/ark:/67531/metadc837537/m2/1/high_res_d/1028931.pdf

## Chan pairwise central second moment merge (chan-parallel-central-second-moment)

> For nonempty disjoint blocks A,B set n=n_A+n_B, δ=m_B−m_A, m=m_A+δ n_B/n, M=M_A+M_B+δ² n_A n_B/n

n_A,n_B positive block counts; m_A,m_B block means; M_A,M_B block unnormalized second central moments; n,m,M combined state.

General parallel numerical summary; no empirical benefit claimed.

Assumptions — Disjoint observation-index blocks with finite values in common units and internally consistent moment states; counts exact and required intermediates representable; identities in real arithmetic.

Limitations — Merge order, large count imbalance, squared differences and finite precision can change rounded results or overflow; no universal accuracy guarantee or independence inference.

Mechanism — Within each block the deviations about its own mean sum to zero; shifting the block centers adds n_A(m_A−m)²+n_B(m_B−m)²=δ² n_A n_B/n. A singleton B gives the Welford correction. Arbitrary block merging adds parallel aggregation capability, but the shared recentering identity warrants variant classification.

Source — Pébay (2008), SAND2008-6212, p. 8, eqs. (1.3)–(1.4), attributing the block formula to Chan, Golub and LeVeque (1979). DOI 10.2172/1028931. https://digital.library.unt.edu/ark:/67531/metadc837537/m2/1/high_res_d/1028931.pdf

## Pébay pairwise centered cross moment merge (pebay-pairwise-central-cross-moment)

> For disjoint nonempty paired blocks G=A,B, C_G=Σ_(i∈G)(x_i−m_(x,G))(y_i−m_(y,G)); n=n_A+n_B, δ_x=m_(x,B)−m_(x,A), δ_y=m_(y,B)−m_(y,A); C=C_A+C_B+δ_xδ_y n_A n_B/n

C_G unnormalized centered cross moment; m_(x,G),m_(y,G) block coordinate means; n_G positive counts; C merged cross moment.

General numerical covariance summary; no empirical benefit claimed.

Assumptions — Disjoint observation identities with aligned finite real pairs, consistent block summaries, common coordinate units, exact counts and representable intermediates; identity in real arithmetic.

Limitations — Products and mean differences may overflow or underflow or suffer cancellation; merge order matters in floating point; covariance does not establish independence or causation.

Mechanism — Expanding each centered product about the combined means eliminates both first-order terms because within-block deviations sum to zero. Setting y=x recovers Chan's second-moment merge. This is its bivariate extension rather than a new distinct algorithm.

Source — Pébay (2008), Formulas for Robust, One-Pass Parallel Computation of Covariances and Arbitrary-Order Statistical Moments, SAND2008-6212, pp. 12–13, Proposition 3.1, eqs. (3.1)–(3.11). DOI 10.2172/1028931. https://digital.library.unt.edu/ark:/67531/metadc837537/m2/1/high_res_d/1028931.pdf

## Pébay arbitrary-order central moment merge (pebay-arbitrary-order-central-moment-merge)

> For integer p≥3 and disjoint nonempty blocks G=A,B, n=n_A+n_B, m=m_A+(m_B−m_A)n_B/n, M_(j,G)=Σ_(i∈G)(x_i−m_G)^j for j≥2; M_p=Σ_(j=0)^p binom(p,j)[M_(j,A)(m_A−m)^(p−j)+M_(j,B)(m_B−m)^(p−j)], with M_(0,G)=n_G, M_(1,G)=0 and exponent-zero factors equal to 1

p integer moment order; M_(j,G) unnormalized block central moment; m_G block mean; n_G positive count; m and M_p merged mean and moment.

General numerical higher-moment summary; no empirical benefit claimed.

Assumptions — Finite real observations, disjoint observation identities, consistent lower-order moment states, exact counts, and representable intermediate terms; identity in real arithmetic.

Limitations — Large powers and binomial coefficients may overflow or underflow; cancellation and merge order affect floating-point accuracy; high-order moments are sensitive to outliers and are not inherently robust.

Mechanism — Apply the binomial theorem to x_i−m=(x_i−m_G)+(m_G−m) and sum separately over the blocks. Re-indexing the exponent gives the stated form of (2.6); the first centered moment vanishes. At p=2 this reduces to Chan's merge, so arbitrary higher orders are a single variant, not separate entries per order.

Source — Pébay (2008), Formulas for Robust, One-Pass Parallel Computation of Covariances and Arbitrary-Order Statistical Moments, SAND2008-6212, p. 10, Proposition 2.1, particularly eq. (2.6). DOI 10.2172/1028931. https://digital.library.unt.edu/ark:/67531/metadc837537/m2/1/high_res_d/1028931.pdf

## P² streaming quantile marker estimator (jain-chlamtac-p2-quantile)

> For internal marker i with integer rank n_i and movement d=±1, q'_i=q_i+d/(n_(i+1)−n_(i−1))[(n_i−n_(i−1)+d)(q_(i+1)−q_i)/(n_(i+1)−n_i)+(n_(i+1)−n_i−d)(q_i−q_(i−1))/(n_i−n_(i−1))]

q marker heights; n marker positions; d signed one-step adjustment; N observation count; p requested quantile.

General streaming descriptive quantile estimation; no empirical benefit claimed.

Assumptions — Finite scalar stream with defined total order, 0<p<1, at least five observations before reporting, strictly increasing integer marker positions, nondecreasing heights and representable intermediates.

Limitations — Fixed-size heuristic, arrival-order sensitive, especially at small sample sizes or extreme quantiles; no uniform deterministic rank-error guarantee; rounded interpolation can lose accuracy.

Mechanism — Five movable quantile markers approximate a single fixed interior quantile via local quadratic interpolation and a monotonicity fallback. Unlike Welford and empirical CDF construction, it maintains estimated rank locations rather than exact moments or a full empirical distribution. Box 1's prose specifies increments from k+1; use that rather than the inconsistent printed loop lower index.

Source — Jain and Chlamtac (1985), The P² Algorithm for Dynamic Calculation of Quantiles and Histograms Without Storing Observations, Communications of the ACM 28(10), 1076–1085, pp. 1078–1079 and Box 1. https://www.cse.wustl.edu/~jain/papers/ftp/psqr.pdf

## Greenwald–Khanna deterministic quantile summary (greenwald-khanna-quantile-summary)

> Maintain ordered tuples (v_i,g_i,Δ_i), r_min(v_i)=Σ_(j≤i)g_j, r_max(v_i)=r_min(v_i)+Δ_i; Σ_i g_i=N; after exact startup enforce max_i(g_i+Δ_i)≤⌊2εN⌋; for r=⌈φN⌉ return a retained v_i with r−εN≤r_min(v_i)≤r_max(v_i)≤r+εN

v retained ordered observations; g positive rank increments; Δ nonnegative integer rank slack; ε rank tolerance; N count; φ query fraction; r target integer rank.

General approximate rank summaries of streams; no empirical benefit claimed.

Assumptions — Fixed 0<ε<1/2, totally ordered finite observations, exact integer rank arithmetic; ties consistently ordered by arrival identity; exact startup while floor(2εN)<1; 0<φ≤1 and N>0.

Limitations — Rank error does not bound value error; no fixed-size bound independent of stream length; original paper's asymptotic space theorem depends on its band compression algorithm, not arbitrary greedy variants; no merge or deletion guarantee asserted.

Mechanism — The rank interval of an inserted interior tuple lies between the predecessor lower rank plus one and the old successor upper rank. Moving a deleted tuple's g into its successor leaves all surviving rank bounds unchanged. Proposition 1 yields the query error from the maximum tuple width; exact startup avoids an impossible fractional bound for unit increments. This deterministic rank-bound mechanism differs from P²'s heuristic interpolation.

Source — Greenwald and Khanna (2001), Space-Efficient Online Computation of Quantile Summaries, SIGMOD, 58–66, Proposition 1, Corollary 1, sections 2.1–2.2 and Figures 2–3. DOI 10.1145/375663.375670. https://cs.emory.edu/~cheung/Courses/584/Syllabus/papers/Quantiles/2001-Greenwald-Quantile-paper.pdf

## Uniform reservoir sampling Algorithm R (vitter-reservoir-algorithm-r)

> For t>k choose J uniformly from {1,…,t}; if J≤k replace slot J; P(R_t=S)=1/C(t,k) for every k-subset S of the first t observation identities

t stream count; k reservoir capacity; J unbiased integer draw; R_t retained identity set; C(t,k) binomial coefficient.

General uniform sampling of a finite stream; no empirical benefit claimed.

Assumptions — Fixed positive integer capacity, finite stream independent of sampling draws, conditionally uniform independent integer draws, exact counters and distinct observation identities even when values repeat.

Limitations — O(N) sequential processing and O(k) stored records; samples are dependent without replacement, order of slots is not a random permutation guarantee, no stratification or temporal weighting.

Mechanism — For a subset S not containing t, the preceding subset must equal S and survive with probability (t−k)/t. If S contains t, there are t−k possible preceding subsets, each with a unique replacement of probability 1/t. Both cases yield 1/C(t,k) by induction from t=k. Distinct from simulation by repeated independent draws and from quantile summaries. Short streams retain every observed identity.

Source — Vitter (1985), Random Sampling with a Reservoir, ACM TOMS 11(1), 37–57, section 2, pp. 39–40; Algorithm R attributed there to Alan Waterman. DOI 10.1145/3147.3165. https://www.cs.umd.edu/~samir/498/vitter.pdf

## Boyer–Moore majority cancellation (boyer-moore-majority-vote)

> Start c=0; if c=0 set (m,c)=(x,1), else c←c+1 for x=m and c←c−1 otherwise; a strict majority satisfies count(m)>N/2

m current candidate; c uncancelled count; N total observations; x current observation.

General categorical stream majority detection; no empirical benefit claimed.

Assumptions — Finite replayable categorical stream or an externally guaranteed strict majority; stable equivalence relation for equality; exact integer counters.

Limitations — O(N) comparisons, O(1) candidate and counters; residual count is not frequency, mode is not necessarily a strict majority, a nonzero residual alone does not establish majority.

Mechanism — Each processed prefix partitions into c identical uncancelled observations and unequal pairs. Removing a pair cannot eliminate a strict majority, so a true majority must survive; c=0 rules one out. A nonmajority can survive (A,B,C leaves C), making verification essential unless the residual itself certifies it. Distinct from a full histogram or empirical distribution.

Source — Boyer and Moore (1991), MJRTY: A Fast Majority Vote Algorithm, in Automated Reasoning, pp. 105–117, sections 5.2–5.4 and Figure 5.1. https://www.cs.utexas.edu/~boyer/mjrty.pdf

## Misra–Gries bounded frequent-item counters (misra-gries-frequent-items)

> With at most k−1 counters, increment c_i←c_i+1 for a tracked arrival, insert c_i←1 if space remains, otherwise decrement all stored c_j←c_j−1, remove zeros and set D←D+1. Initially D=0. N=Σ_i c_i+kD and 0≤f_i−c_i≤D≤floor(N/k).

k threshold denominator; N stream length; c_i residual multiplicity (zero when absent); f_i actual multiplicity; D number of full cancellation steps.

General categorical stream frequency screening; no empirical benefit claimed.

Assumptions — Finite stream of unit arrivals, stable equality, fixed integer k≥2, exact integer counters; replay is required for exact threshold classification unless bounds decide it.

Limitations — Retained keys need not exceed the threshold; absent keys can tie the threshold; counts are lower bounds, not exact frequencies or a guaranteed top-k ranking. O(k) stored keys; O(N log k) time with an ordered balanced tree, including amortized full decrements.

Mechanism — A full miss discards one group of k distinct occurrences. The residual bag and D disjoint groups account for all arrivals, and a key loses at most one occurrence per group. Thus every key above N/k survives, whereas equality need not survive. For k=2 this reduces to unequal-pair cancellation; classify as a variant of the existing majority algorithm rather than an additional distinct algorithm.

Source — Misra and Gries (1982), Finding repeated elements, Science of Computer Programming 2(2), 143–152, sections 3–4, Theorem 1 and Algorithm (3), pp. 146–148. DOI 10.1016/0167-6423(82)90012-0. https://www.cs.utexas.edu/~misra/scannedPdf.dir/FindRepeatedElements.pdf

## Count–Min nonnegative frequency sketch (count-min-frequency-sketch)

> For 0<ε,δ<1 set W=ceil(e/ε), d=ceil(ln(1/δ)); C[j,h_j(x)]←C[j,h_j(x)]+u; f_hat(x)=min_j C[j,h_j(x)]. For fixed x, f_x≤f_hat(x) and Pr(f_hat(x)≤f_x+εF)≥1−δ.

ε additive relative-to-total error allowance; δ failure probability; W row width; d row count; e natural exponential base; C counter matrix; h_j row hash; u nonnegative increment; f_x true cumulative weight; F=Σ_x f_x total weight; f_hat estimate.

General nonnegative stream frequency estimation; no empirical benefit claimed.

Assumptions — Finite key universe, nonnegative updates, exact arithmetic or explicitly bounded numerical error; independent row hashes drawn from a family with collision probability at most 1/W for distinct keys; fixed query and data independent of hash selection.

Limitations — Collision overestimation is possible; the error is additive in total weight, not relative to the queried frequency. The stated probability is for one fixed query, not all adaptive queries. Uses Wd counters plus hash descriptions and O(d) hash evaluations per update or query.

Mechanism — Each addressed cell equals f_x plus nonnegative collision mass. Expected collision mass per row is at most F/W≤εF/e. For F>0 Markov bounds the chance of exceeding εF by 1/e; independence makes the probability that every row exceeds it at most e^(−d)≤δ. Unlike explicit candidate cancellation, this stores hashed aggregate counters and answers a supplied key query. No empirical benefit or implementation is claimed.

Source — Cormode and Muthukrishnan (2005), An improved data stream summary: The count-min sketch and its applications, Journal of Algorithms 55(1), 58–75, sections 3 and 4.1, Theorem 1, pp. 63–64. DOI 10.1016/j.jalgor.2003.12.001. https://cs.au.dk/~gerth/madalgo/old-madalgo.au.dk/img/SumSchoo2007_Lecture%20slides/Bibliography/p14_Cormode_JAl_05.pdf

## Bloom probabilistic membership filter (bloom-filter-membership)

> For an m-bit zero array B and k distinct addresses H(x), insertion sets B[i]←1 for i∈H(x); query Q(x)=∏_{i∈H(x)} B[i]. With T=Σ_i B[i], Pr(Q(x)=1 | B)=choose(T,k)/choose(m,k) for an independent uniform k-subset query of a nonmember

m bit capacity; k addresses per key; H(x) stable address subset; T occupied bit count; Q binary query result; choose binomial coefficient (zero if T<k).

General approximate set membership; no empirical benefit claimed.

Assumptions — Integers 1≤k≤m; insertion only, stable distinct address mapping, intact bit state and consistent key representation. Probability formula additionally requires the absent query key's address set to be uniform among k-subsets and independent of the constructed filter.

Limitations — Positive results can be false; negatives exclude previously inserted keys only under the stated intact insertion-only model. Saturation yields all positives. Probability is conditional on occupied state, not a guarantee for adaptive queries or arbitrary hashes. No deletion, exact count or exact membership recovery.

Mechanism — Inserted keys retain every addressed bit by monotonicity. Under independent uniform distinct query addresses, exactly choose(T,k) of choose(m,k) equally likely subsets lie wholly in the occupied set. This is conditional on the bit pattern and differs from the common independent-with-replacement approximation. Boolean set-membership screening differs from Count–Min numerical frequency estimation.

Source — Bloom (1970), Space/time trade-offs in hash coding with allowable errors, Communications of the ACM 13(7), 422–426, Method 2, p. 423. DOI 10.1145/362686.362692. https://crystal.uta.edu/~mcguigan/cse6350/papers/Bloom.pdf ; conditional occupancy ratio independently derived

## Count Sketch signed frequency estimator (count-sketch-signed-frequency)

> C[j,h_j(x)]←C[j,h_j(x)]+s_j(x)u; Z_j(x)=s_j(x)C[j,h_j(x)]; f_hat(x)=median_j Z_j(x). E[Z_j]=f_x; Var(Z_j)=Σ_{y≠x} f_y²/b. For odd d and V=Σ_{y≠x} f_y²/b>0, Pr(|f_hat−f_x|>2√V)≤exp(−d/8)

C signed counter matrix; b buckets per row; d odd row count; h_j bucket hash; s_j sign hash into {−1,+1}; u signed increment; f_y net frequency; Z_j row estimate; V row variance.

General signed streaming frequency estimation; no empirical benefit claimed.

Assumptions — Finite key universe, fixed update vector and query independent of hashes, exact arithmetic; b≥1 and odd d≥1. Pairwise independent uniform bucket hashes and pairwise independent unbiased signs, sign and bucket functions independent, rows mutually independent.

Limitations — Two-sided additive error depends on other keys' squared frequencies; median is not asserted unbiased. Bound is for a fixed query, not adaptive queries, and does not recover unknown keys or guarantee a top-k list. O(bd) counters and d hash evaluations per update or query plus median computation.

Mechanism — Expand Z_j−f_x as Σ_{y≠x} f_y s_j(x)s_j(y)1{h_j(y)=h_j(x)}. Independent unbiased pairwise signs cancel cross terms since s_j(x)²=1; uniform pairwise bucket hashes yield the stated variance. Chebyshev bounds a bad row by 1/4 and Hoeffding bounds a majority of bad independent rows by exp(−d/8). Signed collision cancellation and median estimation differ from nonnegative minimum estimation.

Source — Charikar, Chen and Farach-Colton (2002), Finding frequent items in data streams, ICALP, LNCS 2380, 693–703, sections 3.2, 4 and 4.2. DOI 10.1007/3-540-45465-9_59. https://www.cs.princeton.edu/courses/archive/spring04/cos598B/bib/CharikarCF.pdf ; fixed-query signed L2 bound independently derived

## HyperLogLog register cardinality estimator (hyperloglog-cardinality)

> For 32-bit hashes, m=2^b, 4≤b≤16, M[j]←max(M[j],ρ(w)), E=α_m m²/Σ_j 2^(−M[j]); V=#{j:M[j]=0}. Return m ln(m/V) if E≤2.5m and V>0; otherwise E if E≤2^32/30; otherwise −2^32 ln(1−E/2^32) for E<2^32.

b prefix length; m registers; j prefix integer plus one; w remaining 32−b bits; ρ first one position (all-zero suffix gives 33−b); M registers initialized to zero; V zero register count; E raw estimate; α_m normalization.

General distinct-key cardinality estimation; no empirical benefit claimed.

Assumptions — Insertion-only finite stream, stable 32-bit hash, independent uniformly distributed hash words across distinct keys for probabilistic interpretation; repeated keys map identically. Use m=16 to 65536, adequate register width and accurate arithmetic. The original asymptotic error analysis assumes an ideal infinite-bit hash model.

Limitations — Approximate only; finite hash collisions, small-range bias and saturation affect accuracy. Typical asymptotic relative standard error near 1.04/√m for large m in the ideal model is not a deterministic bound or an unconditional confidence interval. Original 32-bit correction is unsuitable once raw E reaches the hash range; no deletion.

Mechanism — Maxima make repeated identical hashes idempotent and ensure that componentwise maximum of compatible states equals the state obtained from their union. Under independent uniform hashes, each register is empty with probability (1−1/m)^n; the small-range logarithm approximates inversion of the resulting expected empty count. The finite-range logarithm analogously inverts expected hash occupancy approximately. Neither inversion is an exact unbiased estimate. The original practical program uses zero initialization, unlike the analytical presentation; corrections are interpreted as mutually exclusive to avoid overwriting the small-range result. This register-rank mechanism differs from Bloom bit membership.

Source — Flajolet, Fusy, Gandouet and Meunier (2007), HyperLogLog: the analysis of a near-optimal cardinality estimation algorithm, DMTCS proceedings AH, 137–156, section 1, equation (3), Theorem 1 and section 4, Figure 3. DOI 10.46298/dmtcs.3545. https://dmtcs.episciences.org/en/articles/3545/download

## AMS random-sign second frequency moment estimator (ams-second-frequency-moment)

> For f_x=Σ updates of key x and F₂=Σ_x f_x², Z_j←Z_j+s_j(x)u; X_j=Z_j²; E[X_j]=F₂; Var(X_j)=2(F₂²−Σ_x f_x⁴). Let A_i be independent averages of q=ceil(8/ε²) squares, and Y=median of odd d such averages with d≥8 ln(1/δ). Then Pr(|Y−F₂|>εF₂)≤δ.

f_x net frequency; F₂ second frequency moment; u signed increment; s_j stable random sign map; Z_j accumulator initialized to zero; X_j square; A_i block average; q block size; d odd block count; ε relative tolerance; δ failure probability.

General estimation of squared frequency norm; no empirical benefit claimed.

Assumptions — Finite key universe, fixed finite signed update sequence independent of random maps, exact arithmetic, unbiased four-wise independent signs within each map, mutually independent maps across and within blocks; 0<ε,δ<1. Signed increments follow by linearity from the original unit-insertion formulation.

Limitations — The mean of squares is unbiased but the median of block averages is not claimed unbiased. Requires bounded arithmetic and storage for sign seeds and accumulators. Fixed-stream probability guarantee does not cover adaptive updates or simultaneous unlimited queries. No recovery of individual frequencies.

Mechanism — Expand the second and fourth powers of a signed projection. Terms with odd sign multiplicity vanish by four-wise independence; the fourth moment is Σ f_x⁴+6Σ_{x<y} f_x²f_y². Subtract F₂² to obtain the variance. Chebyshev bounds a block failure by 1/4 with q≥8/ε²; Hoeffding bounds the probability of at least half bad independent blocks by exp(−d/8). Unlike Count Sketch per-key signed bucket queries, the square of a scalar projection estimates a global quadratic functional; the nonlinear aggregation and target differ.

Source — Alon, Matias and Szegedy (1999), The space complexity of approximating the frequency moments, Journal of Computer and System Sciences 58(1), 137–147, DOI 10.1006/jcss.1997.1545. Author-hosted 2002 manuscript section 2.2, Theorem 2.2, pp. 6–7: https://www.cs.tau.ac.il/~nogaa/PDFS/amsz4.pdf ; signed updates and explicit confidence parameters independently derived

## Bottom-k hash order-statistic cardinality estimator (kmv-bottom-k-cardinality)

> Maintain S of the k smallest distinct hashes seen; if |S|<k return n_hat=|S|, otherwise n_hat=(k−1)/max(S). For n≥k under ideal hashing, E[n_hat]=n and Var(n_hat)=n(n−k+1)/(k−2) for k>2.

S retained hash set, initially empty; n true distinct-key count; k integer capacity; max(S)=U_(k), kth order statistic; n_hat estimate.

General distinct-key count estimation; no empirical benefit claimed.

Assumptions — Insertion-only finite stream fixed independently of hash randomness; stable mapping from each distinct key to an independent continuous uniform value in (0,1), hence collisions have probability zero in the ideal model; k≥2 and accurate arithmetic.

Limitations — For k=2 the second moment is infinite in the ideal full-buffer case. Finite hashes can collide, quantize order statistics or create a zero denominator; exact small-count claims and moment identities are conditional on the ideal model. No deletion or exact recovery of unretained keys. A full buffer alone does not distinguish n=k from n>k; this specification uses the estimator in both cases.

Mechanism — The kth order statistic has Beta(k,n−k+1) law. Integrating inverse powers against its density gives E[U_(k)^−r]=B(k−r,n−k+1)/B(k,n−k+1) for 0≤r<k. This yields the stated mean and variance, including n=k. The source discusses an exact n≤k branch; without an extra overflow indicator only n<k is detectable from S alone. The bottom-k union identity follows because any omitted value already has k smaller values in its own set. This retains numerical hash order statistics rather than HyperLogLog register ranks or reservoir samples of arrival positions.

Source — Beyer, Gemulla, Haas, Reinwald and Sismanis (2009), Distinct-value synopses for multiset operations, Communications of the ACM 52(10), 87–95, Algorithm 1, sections 2 and 4.1, equation (2) and Theorem 2. DOI 10.1145/1562764.1562787. https://www.uni-mannheim.de/media/Einrichtungen/dws/Files_People/Profs/rgemulla/publications/beyer09distinct.pdf

## Morris exponential randomized counter (morris-randomized-counter)

> Initialize C=0; for each unit arrival increment C with conditional probability 2^(−C), else leave it unchanged; n_hat=2^C−1. After n arrivals, E[n_hat]=n and Var(n_hat)=n(n−1)/2.

C nonnegative integer random state; n fixed true number of unit arrivals; n_hat approximate arrival count.

General approximate event counting; no empirical benefit claimed.

Assumptions — Fixed finite number of unit insertions, independent fresh Bernoulli draws conditional on current state with the stated probability, exact arithmetic and an unsaturated integer state.

Limitations — A single base-two counter has large relative standard deviation approaching 1/√2; unbiasedness is not high-probability accuracy. State and decoded value can overflow finite storage; no distinct-key semantics, deletions or arbitrary weighted updates in this specification. No worst-case logarithmic-logarithmic space guarantee.

Mechanism — Let Z=2^C. Conditional on Z, the next Z equals 2Z with probability 1/Z and Z otherwise. Thus E[Z_next|Z]=Z+1 and E[Z_next²|Z]=Z²+3Z. From Z₀=1 obtain E[Z_n]=n+1 and Var(Z_n)=n(n−1)/2 by summing the recurrences. Unlike KMV, this counts every arrival through state-dependent random increments, not distinct hash values. No separate admission for merely changing the exponential base.

Source — Nelson and Yu (2022), Optimal Bounds for Approximate Counting, section 1.2, p. 3 of author-hosted manuscript dated March 30 2022; attributes base-two counter to Morris (1978), Counting large numbers of events in small registers, Communications of the ACM 21(10), 840–842. https://www.cs.princeton.edu/~hy2/files/approx_counting.pdf

## Exponential histogram sliding-window bit count (datar-exponential-histogram-window-count)

> At position t retain chronological buckets (b,u) with newest-one timestamp u>t−W and power-of-two size b. Cap each size at q+1 buckets. For total T=Σb and oldest size B, estimate C_hat=0 if empty, T if B=1, otherwise T−B/2. With integer q≥1, |C_hat−C|≤C/(q+1), where C=Σ x_i over max(1,t−W+1)≤i≤t.

W positive integer window width; q positive integer cap parameter; x_i bit at position i; b bucket cardinality; u newest constituent position; T retained mass; B oldest retained size; C true active count; C_hat estimate.

General bounded-memory sliding-window counting; no empirical benefit claimed.

Assumptions — One ordered bit per integer position, initially empty, fixed W and q, exact timestamps and arithmetic; use the partial prefix before W arrivals.

Limitations — Only the oldest bucket may straddle expiry; estimates may be fractional. The conservative relative bound stated here is independently derived for the declared cap and exact singleton rule, not an assertion of every constant in the source theorem. Storage is O((q+1) log(W+1)) buckets; actual memory depends on timestamp encoding. No arbitrary deletions, irregular clocks or weighted values in this specification.

Mechanism — The chronological groups contain consecutive arrivals of ones, so every retained bucket except the oldest lies wholly in the window. When B≥2 there are at least q buckets of each smaller power of two, since a merge leaves q of its size and expiration cannot reach smaller buckets while B remains. Thus C≥q(B−1)+1; absolute error ≤B/2 and B/[2(q(B−1)+1)]≤1/(q+1). A singleton oldest bucket is fully active. This uses deterministic age-aware coalescence, unlike Morris random increments. The source's printed invariant does not justify its sharper constant directly from the stated lower counts; this entry uses the weaker independently proved bound.

Source — Datar, Gionis, Indyk and Motwani (2002), Maintaining Stream Statistics over Sliding Windows, SIAM Journal on Computing 31(6), 1794–1813, section 2.1, Fact 1, Invariant 2 and Algorithm INSERT; DOI 10.1137/S0097539701398363. https://perso.ens-lyon.fr/bruno.salvy/INF431/Projet-hyperloglog/INF431_-_Projet_Informatique_files/DatarGionisIndykMotwani2002.pdf

## Monotone deque sliding-window maximum (monotone-deque-sliding-window-maximum)

> For t=1,2,…, remove front indices i≤t−W, then remove tail indices i with x_i≤x_t, then append (t,x_t). For t≥W return M_t=x_front=max{x_i:t−W+1≤i≤t}; ties choose the latest index.

W positive integer window width; t arrival position; x_t finite ordered value; deque stores increasing indices with strictly decreasing values; M_t maximum.

General exact sliding-window extrema; no empirical benefit claimed.

Assumptions — Fixed W≥1, initially empty deque, sequential arrivals, finite totally ordered values with a consistent equality rule; no output before a full window.

Limitations — Exact value only under the ordering assumptions; a single arrival may remove O(W) entries even though total deque operations are O(n) over n arrivals. Storage O(W). This is the single-sided deque, not Lemire's joint max-min comparison-optimized algorithm; no three-comparison joint claim.

Mechanism — If i<j and x_i≤x_j, every future trailing window that still contains i after j arrives also contains j. Thus i is dominated; equal values retain the more recent index. Expiry and dominance removal preserve the maximum at the front. This is an independently justified one-sided specialization of the wedge update; unlike the quantile marker estimator, it gives an exact extremum. No separate count for reversing comparisons to obtain a minimum.

Source — Lemire (2006), Streaming Maximum-Minimum Filter Using No More than Three Comparisons per Element, Nordic Journal of Computing 13(4), 328–339; author manuscript arXiv:cs/0610046v5 (2007), section 4, monotonic wedge update, pp. 5–6. https://arxiv.org/pdf/cs/0610046

## Fenwick binary indexed tree prefix sums (fenwick-binary-indexed-tree-prefix-sum)

> For 1≤i≤n, let b(i)=2^{v_2(i)} and T_i=Σ_{j=i−b(i)+1}^i x_j. Prefix P(k)=Σ_{j=1}^k x_j is obtained from sum=0 by adding T_i for i=k,k−b(k),… until i=0. For a point increment x_k←x_k+δ, add δ to T_i for i=k,k+b(k),… while i≤n.

n positive integer array length; i,k one-based indices except prefix k=0; v_2(i) exponent of the largest power of two dividing i; b(i) that power; T_i block sum; δ additive increment.

General mutable prefix sums; no empirical benefit claimed.

Assumptions — Fixed n≥1, exact commutative additive arithmetic with zero; prefix index 0≤k≤n and update index 1≤k≤n; enough integer width for indices and arithmetic; signed values and increments allowed for sums only.

Limitations — O(n) stored sums and O(1+log n) additions per query or point increment. Initialization by n updates costs O(n log(n+1)). Finite-precision addition may round or overflow. Prefix search by cumulative rank and arbitrary range updates are not part of this specification.

Mechanism — Subtracting the lowest set bit partitions the prefix into disjoint consecutive dyadic intervals; adding that bit enumerates precisely the stored intervals containing the changed index. The update increases the lowest set-bit size until leaving the array. This is the one-based positive-index form with no stored index-zero frequency, unlike the paper's special zero slot. Distinct mutable dyadic representation, not chronological bucket coalescence or static pairwise summation.

Source — Fenwick (1994), A new data structure for cumulative frequency tables, Software: Practice and Experience 24(3), 327–336, Principles and Figures 4–5, pp. 328–331; DOI 10.1002/spe.4380240306. https://www.plouffe.fr/OEIS/archive_in_pdf/spe884.pdf

## Segment tree associative range aggregate (segment-tree-associative-range-aggregate)

> For a nonempty array indexed 1,…,n, A(l,l)=x_l and A(l,r)=A(l,m)⊗A(m+1,r) for m=⌊(l+r)/2⌋ when l<r. Query Q(l,r;a,b)=e if [l,r]∩[a,b] is empty, A(l,r) if [l,r]⊆[a,b], otherwise Q(l,m;a,b)⊗Q(m+1,r;a,b).

n positive integer length; l,r inclusive node endpoints; m split; a,b inclusive query endpoints; ⊗ associative operation; e two-sided identity; A stored ordered aggregate; Q range query.

General mutable range aggregation; no empirical benefit claimed.

Assumptions — Fixed n≥1; values in a monoid (closed associative operation with two-sided identity); valid nonempty query 1≤a≤b≤n or explicitly empty query returning e; exact operation for mathematical equality.

Limitations — O(n) aggregate slots and build combines; O(1+log n) combines for a point replacement or contiguous range query. Time bounds assume constant-cost combine and storage per aggregate. Floating-point nonassociativity, overflow, or growing aggregate sizes can invalidate exact or constant-cost claims. No lazy range updates or dynamic resizing here.

Mechanism — Induction on interval splits proves every node stores the ordered fold, and disjoint query pieces concatenate in original order. Only the two boundary paths can contain partially intersecting nodes at each depth, yielding logarithmic combine count. Unlike Fenwick prefix differences, arbitrary monoid ranges require no inverse or commutativity. This is the independently derived unpadded inclusive formulation of the course's balanced half-open tree, not a new entry for each aggregate.

Source — Carnegie Mellon University, 15-451 Algorithm Design and Analysis, Fall 2024, Range query data structures, sections 2–3 and 5.1, pp. 3–7 and 8–9. https://www.cs.cmu.edu/~15451-f24/lectures/lecture06-range-queries.pdf

## Sparse table idempotent range query (sparse-table-idempotent-range-query)

> For x_1,…,x_n, S_{0,i}=x_i; S_{j,i}=S_{j−1,i}⊗S_{j−1,i+2^{j−1}} for 1≤i≤n−2^j+1 and j≥1. For 1≤a≤b≤n set j=⌊log₂(b−a+1)⌋ and Q(a,b)=S_{j,a}⊗S_{j,b−2^j+1}.

n positive length; i one-based start; j nonnegative level; ⊗ closed associative idempotent operation; a,b inclusive endpoints.

General static nonempty range aggregation; no empirical benefit claimed.

Assumptions — Static nonempty array; exact associative and idempotent operation (u⊗u=u for every value in its closed domain); preserve operand order; integer index arithmetic.

Limitations — O(n log(n+1)) aggregate slots and preprocessing combines; two table reads and one combine per nonempty query with constant-time integer logarithm or precomputed lengths. No empty interval identity required; changes invalidate stored aggregates. Time bounds assume constant-cost combines and indexing.

Mechanism — The two blocks cover the interval with contiguous overlap; the ordered product has form A⊗B⊗B⊗C, omitting empty outside pieces, and reduces to A⊗B⊗C by associativity and idempotence. Commutativity is not needed. The source treats minimum; this generalized ordered formulation is independently derived. Corrects the printed build loop upper endpoint to n−L+1. Distinct static overlapping-block lookup rather than disjoint mutable segment-tree traversal.

Source — Jeff Erickson (2025), Advanced Data Structures, Lecture 1: Range-Minimum Queries, section 1.1 Sparse Lookup Table, pp. 1–2 and footnote 2. https://jeffe.cs.illinois.edu/teaching/datastructures/notes/01-RMQ-LCA.pdf

## Disjoint set union with rank and path compression (disjoint-set-union-rank-path-compression)

> For 1≤i≤n initialize parent_i=i and rank_i=0. Find(i)=i if parent_i=i, otherwise parent_i←Find(parent_i), returning that root. For u=Find(a), v=Find(b), if u=v do nothing; otherwise exchange u,v if rank_u<rank_v, set parent_v←u, and if rank_u=rank_v set rank_u←rank_u+1.

n positive universe size; a,b,i valid item indices; parent_i parent pointer; rank_i nonnegative historical height bound; u,v representative roots.

General incremental maintenance of equivalence classes; no empirical benefit claimed.

Assumptions — Fixed finite universe of singleton sets; sequential operations; all indices valid; only merging and membership queries; deterministic tie rule chooses first root after rank ordering.

Limitations — O(n) space; O(log(n+1)) worst-case pointer traversal per find or union and O(m(1+α(n))) total amortized time for m operations including n singleton creations under standard union-find analysis. α is an inverse Ackermann function; not a constant worst-case guarantee. Compression does not support arbitrary splitting or deletion; representatives can change after union.

Mechanism — Each parent edge strictly increases rank, excluding nonroot cycles. A root of rank r represents at least 2^r elements by induction on equal-rank mergers; compression changes no membership. The resulting logarithmic depth bound is independent of the cited stronger amortized theorem. This maintains arbitrary partitions, whereas Kruskal uses connectivity as a subroutine in a weighted graph algorithm.

Source — Stajano and Sauerwald (2015), University of Cambridge Algorithms, 5.3 Disjoint Sets, slides 9–11; Tarjan (1975), Efficiency of a Good But Not Linear Set Union Algorithm, JACM 22(2), 215–225, DOI 10.1145/321879.321884 (bibliographic metadata and abstract checked). https://www.cl.cam.ac.uk/teaching/1415/Algorithms/disjointsets.pdf

## Cartesian tree monotone-stack construction (cartesian-tree-monotone-stack)

> For ordered keys K_i=(x_i,i) and indices 0≤i<n, initialize left_i=right_i=⊥ and stack S empty. For each i in increasing order set p=⊥; while S is nonempty and K_top>K_i set p=pop(S). Set left_i=p; if S remains nonempty set right_top=i; push i. The root is the bottom of S, or ⊥ if n=0.

n array length; i zero-based index; x_i comparable value; K_i lexicographic value/index key; left_i,right_i child pointers; S right-spine stack; p last removed node; ⊥ null sentinel.

General ordered-array tree construction and reduction of leftmost range minima to lowest common ancestor queries; no empirical benefit claimed.

Assumptions — Finite immutable indexed array; values admit a consistent total ordering; compare by value and then increasing index to resolve equal values; child pointers initially null; sequential construction.

Limitations — O(n) comparisons, pointer operations and auxiliary storage under constant-cost indexing and comparisons; a single insertion can cost O(n). Output may be highly unbalanced. Construction alone supplies neither constant-time range queries nor a dynamic update structure.

Mechanism — The stack holds the increasing-key right spine. Replacing its popped suffix by the new node with the displaced subtree on the left preserves in-order index order and strict lexicographic heap order. These properties uniquely determine the tree by its minimum root and recursive subarrays. Each node is pushed once and popped at most once. Unlike a sliding-window deque, this construction retains child topology for all indices; unlike a sparse table it constructs an ordered tree rather than storing overlapping aggregates. Deterministic leftmost tie resolution is a specified convention.

Source — Demaine (2012), MIT 6.851 Advanced Data Structures, Lecture 15, sections 2.1–2.1.1, pp. 2–4. https://ocw.mit.edu/courses/6-851-advanced-data-structures-spring-2012/99d1ee86e7c3488b9a47174160776405_MIT6_851S12_L15.pdf

## Binary lifting tree ancestor query (binary-lifting-tree-ancestor)

> For a rooted tree of n≥1 nodes let P(root)=⊥ and P(⊥)=⊥; J=max(1,ceil(log₂ n)). Set T_{0,v}=P(v), T_{j,v}=T_{j−1,T_{j−1,v}} for 1≤j<J and T_{j,⊥}=⊥. For valid node v and integer k≥0, return ⊥ if k≥n; otherwise start w=v and for each set bit j of k set w=T_{j,w}. Return w.

n tree size; v,w nodes; P immediate parent; ⊥ missing ancestor sentinel; J number of levels; T jump table; j bit position; k upward edge distance.

General static tree ancestor lookup by edge distance; no empirical benefit claimed.

Assumptions — Static connected rooted tree with a unique parent for every nonroot and no cycles; root has no parent; exact nonnegative integer distance and valid node indices; sentinel is outside node domain.

Limitations — O(n log(n+1)) preprocessing and storage and O(log(n+1)) query time under constant-cost indexing and bounded integer operations. If k exceeds depth, return missing ancestor, not the root. Structural changes or rerooting invalidate the table; no constant-time or optimal-space claim.

Mechanism — By induction T_{j,v}=P^{2^j}(v), extending P by an absorbing missing sentinel. Function composition adds iteration counts, so the binary expansion of k gives exactly P^k(v). Tree depth is at most n−1; the early large-distance check prevents missing levels. This is repeated parent-function composition, not overlapping range aggregation or union-find compression; it is not itself a lowest-common-ancestor algorithm. The source's section 4 height-difference notation is not used because height differences in branching trees need not equal edge distance.

Source — Demaine (2012), MIT 6.851 Advanced Data Structures, Lecture 15, sections 1.3 and 4.2 (Algorithm B), pp. 2 and 7, CSAIL scribed notes. https://courses.csail.mit.edu/6.851/fall17/scribe/lec15.pdf

## Knuth–Morris–Pratt prefix-function matching (knuth-morris-pratt-prefix-matching)

> For pattern p of length m≥1, π_i=max({0}∪{k:1≤k≤i and p[0:k]=p[i−k+1:i+1]}). Set π_0=0; for i=1,…,m−1 start q=π_{i−1}; while q>0 and p_q≠p_i set q←π_{q−1}; if p_q=p_i increment q; set π_i=q. For text t of length n≥0 start q=0; at each i=0,…,n−1 use the same fallback on p_q≠t_i, increment q on equality, and if q=m emit i−m+1 then reset q←π_{m−1}.

p pattern; t text; m,n lengths; π_i longest proper border length of pattern prefix ending at i; q matched prefix length; i zero-based index; slices exclude right endpoint.

General exact sequence matching, including overlapping occurrences; no empirical benefit claimed.

Assumptions — Finite pattern and text over a consistent equality relation, nonempty pattern, exact indices, no mutation during preprocessing or scanning; symbol comparisons and indexing have bounded constant cost.

Limitations — O(m+n) time and O(m) auxiliary storage excluding returned matches. Empty patterns are outside this specification; no approximate matching, wildcard or Unicode normalization semantics are implied.

Mechanism — Every shorter viable alignment is a border of the already matched prefix; iterating proper borders enumerates these in decreasing length. The scan maintains the longest viable matched prefix, except that after emission it retains the longest proper border. Each fallback strictly decreases q and increases are at most one per processed symbol, giving linear total work. Cornell's prefix array is indexed by prefix length j, equivalent to π_{j−1}; the all-occurrences reset is independently derived. Distinct from suffix sorting and from Boyer–Moore majority cancellation, which is not string matching.

Source — Knuth, Morris and Pratt (1977), Fast Pattern Matching in Strings, SIAM J. Comput. 6(2), 323–350, DOI 10.1137/0206024 (publisher abstract and metadata); Cornell CS 312 (2003), Lecture 27, KMP algorithm and prefix preprocessing. https://www.cs.cornell.edu/courses/cs312/2003sp/lectures/lec27.html

## Suffix array prefix-doubling construction (suffix-array-prefix-doubling)

> For sequence x of length n≥0, return [] if n=0. Otherwise set h=1 and assign dense nonnegative ranks r_i to symbols in ascending order; initialize SA by ascending r_i. While h<n and ranks are not unique, sort indices by K_i=(r_i,r_{i+h}) with r_{i+h}=−1 if i+h≥n. Assign dense new ranks starting at 0, equal exactly for equal pairs, indexed by original i; replace ranks simultaneously and set h←2h. Return SA in its final sorted order.

x finite sequence; n length; i zero-based suffix start; h prefix span; r_i current dense rank; K_i ordered pair; SA permutation of nonempty suffix starts; −1 missing-block sentinel.

General static sequence indexing by lexicographically sorted suffixes; no empirical benefit claimed.

Assumptions — Static sequence with a consistent total order on symbols, lexicographic comparison with shorter proper prefixes first, exact integer ranks and safe index arithmetic; rank pairs read from the preceding round only.

Limitations — Comparison sorting gives O(n log²(n+1)) time and O(n) auxiliary space with a linear-space sort; bounded-integer stable radix sorting of dense ranks can reduce doubling rounds to O(n log(n+1)) total time including initial comparison sorting. No linear-time construction or accelerated query guarantee is implied.

Mechanism — Inductively ranks encode lexicographic order and equality of prefixes truncated at span h. Concatenating two adjacent truncated blocks gives the next prefix order; a missing second block ranks before any nonempty block. Distinct truncated prefixes fix their full suffix order, so early unique ranks are sufficient. When h≥n all distinct nonempty suffixes have been distinguished. Unlike KMP, this creates an index by repeated pair sorting rather than scanning a single fixed pattern. The comparison-sort specification is not a claim to implement the original paper's optimized sorting procedure.

Source — Manber and Myers (1993), Suffix Arrays: A New Method for On-Line String Searches, SIAM J. Comput. 22(5), 935–948, DOI 10.1137/0222058 (bibliographic record and abstract); Kulcu, Advanced String Algorithms, §10.7.3 (pair-rank comparison-sort formulation). https://sercankulcu.github.io/files/algorithms/notes/Chapter_10_Advanced_String_Algorithms_Lecture_Notes.html

## Levenshtein unit edit distance dynamic programming (levenshtein-unit-edit-distance-dp)

> D_{i,0}=i, D_{0,j}=j; D_{i,j}=min(D_{i−1,j}+1,D_{i,j−1}+1,D_{i−1,j−1}+1[x_{i−1}≠y_{j−1}]); return D_{m,n}.

x,y input sequences; m,n lengths; i,j prefix lengths; D distance table.

General exact minimum unit edit count for two sequences; no empirical benefit claimed.

Assumptions — Finite immutable sequences over a consistent equality relation; insertion and deletion each cost one, unequal-symbol substitution costs one, equality costs zero; exact nonnegative integer arithmetic and constant-cost indexing/comparison.

Limitations — Full table uses O((m+1)(n+1)) time and space including empty inputs; two rows reduce value-only storage to O(min(m,n)+1). No transpositions, affine gap penalties, normalization or traceback is specified; raw distance depends on sequence lengths.

Mechanism — An optimal order-preserving alignment ends with a deletion, insertion or paired symbols. Under unit costs, repeated changes of one surviving symbol cannot beat direct substitution, and an inserted then deleted symbol can be omitted. Removing the final alignment operation leaves an optimal prefix subproblem; each predecessor also extends to a feasible alignment. Unlike exact pattern scanning and suffix ordering, this minimizes global edit cost.

Source — Wagner and Fischer (1974), The String-to-String Correction Problem, JACM 21(1), 168–173, DOI 10.1145/321796.321811 (bibliographic record and abstract); Cornell CS 4820 (2025), Dynamic Programming II: Edit Distance, and Dynamic Programming III: Analysis of Edit Distance (recurrence and boundaries). https://www.cs.cornell.edu/courses/cs4820/2025sp/notes/07-ED-Analysis.pdf

## Longest common subsequence length dynamic programming (longest-common-subsequence-length-dp)

> L_{i,0}=L_{0,j}=0; if x_{i−1}=y_{j−1}, L_{i,j}=1+L_{i−1,j−1}; otherwise L_{i,j}=max(L_{i−1,j},L_{i,j−1}); return L_{m,n}.

x,y input sequences; m,n lengths; i,j prefix lengths; L subsequence length table.

General maximum common order-preserving subsequence length; no empirical benefit claimed.

Assumptions — Finite immutable sequences, consistent symbol equality, exact integer lengths, constant-cost indexing and comparisons; subsequence preserves order without requiring adjacent positions.

Limitations — O((m+1)(n+1)) full-table time and space including empty inputs; two rows suffice for the length in O(min(m,n)+1) space. Does not reconstruct a unique subsequence, compute a contiguous substring or imply a normalized similarity.

Mechanism — If final symbols match an optimal common subsequence can be chosen to end at that pair; if unequal, at least one final position is unused. The score maximization is a material objective change within the same prefix-grid alignment family. With insertion/deletion cost one and unequal substitution cost two, D2(i,j)=i+j−2L(i,j); unequal substitution is replaceable by deletion plus insertion. This identity does not hold for unit substitutions (x=a,y=b gives D1=1, L=0). Conservatively count as a variant, not another distinct algorithm.

Source — MIT 6.006 (Spring 2020), Lecture 16: Dynamic Programming Subproblems, pp. 2–3, longest common subsequence suffix recurrence and complexity; prefix form follows by reversing both sequences. https://live.ocw.mit.edu/courses/6-006-introduction-to-algorithms-spring-2020/28461a74f81101874a13d9679a40584d_MIT6_006S20_lec16.pdf

## Longest increasing subsequence minimal tails (longest-increasing-subsequence-minimal-tails)

> Initially T=[]; for each x_i set j=min({k:T_k≥x_i}∪{len(T)}); append x_i if j=len(T), otherwise T_j←x_i; return len(T).

x finite sequence; T[k] least attainable final value for a strictly increasing subsequence of length k+1; j zero-based lower-bound index.

General exact strictly increasing subsequence length; no empirical benefit claimed.

Assumptions — Finite sequence over a total order, including repeated values; strict increase required; constant-cost comparisons, indexed array access and amortized append.

Limitations — O(n log(n+1)) time for n≥1 and O(L) tail storage for longest length L; empty input returns zero. Tail values need not themselves occur in subsequence order. Reconstruction requires additional predecessor information; no nondecreasing variant or tighter comparison-optimal bound asserted.

Mechanism — Inductively, the minimal tail for length k+1 is strictly greater than the minimal tail for length k: remove the last value of a witness for length k+1. If j is the first tail at least x_i, a length j subsequence can extend to x_i (or start a singleton), but no longer one can do so. Shorter minimal tails cannot improve and only the j-th tail may improve or be appended. Equality therefore replaces rather than extends. This one-sequence ordered frontier differs from two-sequence prefix-grid dynamic programming.

Source — Fredman (1975), On computing the length of longest increasing subsequences, Discrete Mathematics 11(1), 29–35, section 2, pp. 30–31, DOI 10.1016/0012-365X(75)90103-X; original distinct-input algorithm adapted to repeated values by lower-bound replacement. https://par.cse.nsysu.edu.tw/resource/paper/2014/140127/On%20computing%20the%20length%20of%20longest%20increasing%20subsequences.pdf

## Manacher odd palindrome radius scan (manacher-palindrome-radius)

> Initially l=0,r=−1; for i=0,…,n−1 set k=1 if i>r, otherwise k=min(d_{l+r−i},r−i+1); while i−k≥0 and i+k<n and x_{i−k}=x_{i+k}, increment k; d_i←k; if i+k−1>r set l←i−k+1,r←i+k−1; return d.

x finite sequence; n length; l,r inclusive endpoints of a previously processed maximal odd palindrome reaching farthest right; d_i radius including center, with odd length 2d_i−1.

General exact maximal odd palindrome radius at every sequence position; no empirical benefit claimed.

Assumptions — Finite immutable indexed sequence, consistent symbol equality, exact indices and constant-cost symbol comparisons; no separator or sentinel required.

Limitations — O(n) time and O(n) radius storage; empty input returns an empty array. Only odd contiguous palindromes are represented; explicit listing of all occurrences can require quadratic output. Does not detect even palindromes or palindromic subsequences.

Mechanism — Reflection in the known palindrome certifies the smaller of the reflected radius and r−i+1. If the reflected radius is strictly smaller, its stopping mismatch also reflects within the interval. Otherwise further successful comparisons extend the rightmost frontier; each advances a previously unverified right endpoint, and at most one unsuccessful comparison occurs per center. The inclusive zero-based formulation is independently derived from the exclusive-boundary invariant. Unlike exact pattern search or edit alignment, it reuses symmetry about changing centers.

Source — Manacher (1975), A New Linear-Time On-Line Algorithm for Finding the Smallest Initial Palindrome of a String, JACM 22(3), 346–351, DOI 10.1145/321892.321896 (metadata and abstract only); Princeton Algorithms, 4th ed., section 5.3 Manacher.java (transformed sequence mirror scan, indexed extract); Algorithms for Competitive Programming, Manacher's Algorithm (odd-radius explanation with exclusive endpoints). https://cp-algorithms.com/string/manacher.html

## Z-function prefix match length scan (z-function-prefix-match-length)

> For n=0 return []; otherwise z_0=0 and [l,r)=[0,0); for i=1,…,n−1 set z_i=min(r−i,z_{i−l}) if i<r else 0; while i+z_i<n and x_{z_i}=x_{i+z_i}, increment z_i; if i+z_i>r set l=i,r=i+z_i. Return z.

x finite indexed sequence; n length; z_i longest prefix matching the suffix starting at i for i>0; z_0=0 by convention; [l,r) rightmost established matching interval, possibly empty.

General sequence algorithm; no empirical benefit claimed.

Assumptions — Immutable finite sequence, consistent equality and constant-cost indexed comparisons; exact integer indices; zero-based half-open interval convention.

Limitations — O(n) time and O(n) returned array storage; z_0=0 is a convention rather than a full self-match length. No approximate matching or wildcard semantics.

Mechanism — Inside the established prefix-copy interval, the earlier z value certifies the minimum of that value and the remaining interval length. If strictly smaller, the mismatch lies inside the known interval; otherwise successful comparisons extend the frontier. Outside the interval successes also advance the frontier; at most one failed comparison per index. Unlike the KMP recurrence, this measures prefix matches starting at each position rather than borders ending there. Conservatively grouped as a prefix-matching variant rather than counting closely related preprocessing separately.

Source — Gusfield (1997), Algorithms on Strings, Trees, and Sequences, Cambridge University Press, sections 1.3–1.5, especially p. 9, Algorithm Z; adapted from one-based inclusive intervals to zero-based half-open intervals. https://dmice.ohsu.edu/bedricks/courses/cs655/pdf/readings/gusfield_chap_1_2.pdf

## Aho–Corasick multi-pattern failure automaton (aho-corasick-failure-automaton)

> Build a trie of distinct nonempty patterns. Let δ(root,a)=child(root,a) if present else root; f(root)=root and f(v)=root for root children. In breadth-first depth order, for each other edge u→v labeled a set f(v)=δ(f(u),a); for any nonroot state w set δ(w,a)=child(w,a) if present else δ(f(w),a). Set o(root)=null and o(v)=f(v) if f(v) is terminal else o(f(v)) for v≠root. Starting q=root, for each text symbol x_i set q←δ(q,x_i); report q if terminal and every terminal along the o-chain from q with ending index i.

Trie states, f longest proper suffix link, δ completed transition, o nearest terminal proper suffix link, q current state; S sum of pattern lengths, K fixed alphabet size, m text length, z number of reported occurrences.

General sequence algorithm; no empirical benefit claimed.

Assumptions — Finite fixed alphabet with constant-cost symbol indexing, finite static set of distinct nonempty patterns, exact equality, breadth-first processing and constant-cost terminal identifier emission.

Limitations — Dense transition table uses O((S+1)K) space and construction time; search O(m+z) with output links and constant-cost transitions. Large alphabets can make dense tables impractical; output volume can dominate. Walking all failure ancestors does not justify the same output-sensitive bound. Empty pattern set gives no matches; empty patterns excluded.

Mechanism — The current state represents the longest suffix of processed text that is a prefix of some pattern. Failure moves to shorter represented suffixes. All matching patterns are terminal suffixes of that state, enumerated by terminal-only output links. Dense construction processes K transitions per state; output traversal visits exactly one terminal per report. A single-pattern trie specializes to the KMP failure mechanism; branching states and multiple terminal suffixes give the general automaton a distinct capability.

Source — Aho and Corasick (1975), Efficient string matching: an aid to bibliographic search, Communications of the ACM 18(6), 333–340, DOI 10.1145/360825.360855 (metadata and abstract verified; original PDF retrieval failed). Stanford CS166, Tries and String Matching, sections Suffix Links, Constructing Output Links and The Complete Construction; dense transition bound independently derived. https://web.stanford.edu/class/archive/cs/cs166/cs166.1146/lectures/09/Small09.pdf

## Huffman greedy binary prefix code (huffman-greedy-prefix-code)

> For n≥2 positive weights, initialize one leaf per symbol. Repeatedly extract the two minimum-weight nodes u,v, form parent p with w(p)=w(u)+w(v), label its two edges 0 and 1, and reinsert p until one root remains. The code c_i is the root-to-leaf path; minimize C=Σ_i w_i |c_i| over binary prefix codes.

n symbol count, w_i positive finite weights, c_i binary word, C weighted code length.

General lossless coding specification; no empirical benefit claimed.

Assumptions — At least two distinct symbols; exact positive weights and comparisons, equal bit costs, unrestricted binary prefix-code lengths, known alphabet and codebook; deterministic tie order if reproducibility is required.

Limitations — O(n log n) heap operations and O(n) tree space; materializing codewords costs their total length. Not necessarily optimal with bounded lengths, unequal bit costs or codebook overhead. Empty and singleton alphabets excluded; a singleton needs an explicit count or nonempty code convention.

Mechanism — A positive-weight optimal full binary tree can place the two smallest weights at a deepest sibling pair by exchanges that do not increase cost. Contracting that pair gives a smaller prefix-code problem and adds exactly their weight sum to its cost. Induction yields greedy optimality for the stated objective. Entropy is an information measure, not this constructive tree algorithm.

Source — Huffman (1952), A Method for the Construction of Minimum-Redundancy Codes, Proceedings of the IRE 40(9), 1098–1101, Optimum Binary Code, pp. 1099–1100. https://cs.nyu.edu/home/people/in_memoriam/roweis/csc310-2006/extras/huffman_1952_minimum-redundancy-codes.pdf

## LZ78 incremental dictionary parsing (lz78-dictionary-parsing)

> Initialize D[0]=empty. At position i find the longest dictionary phrase D[k] matching a prefix of the unread suffix. If a following symbol a exists, emit tagged pair (k,a), append D[j]=D[k] concatenated with a at the next free index j and set i←i+|D[j]|. If the remaining nonempty suffix is exactly D[k], emit a tagged terminal reference k and stop without insertion. Empty unread suffix ends the stream.

Finite input x, n length, D dictionary of phrases, k prior index, j next index, i unread position, a next symbol.

General lossless sequence parsing specification; no empirical benefit claimed.

Assumptions — Finite declared alphabet and exact symbol equality; synchronized insertion order, distinguishable normal and terminal records, externally framed stream, no dictionary resets; initially empty phrase only.

Limitations — Trie parsing uses O(n) symbol transitions with constant-time child lookup and O(z) nodes for z new phrases; dense child arrays cost O((z+1) K) for alphabet size K. Bit encoding, tags, dictionary indices and output costs must be accounted for separately. No finite-input compression guarantee; memory grows with dictionary.

Mechanism — Prefix closure ensures that extending the longest matching phrase by the next symbol creates a new phrase. Each emitted normal token references an earlier dictionary entry, so decoder synchronization follows by induction; the terminal token handles a final already-known phrase. Unlike static multi-pattern matching, the dictionary grows from the input; unlike Huffman coding it adapts phrase boundaries and uses dictionary references.

Source — Ziv and Lempel (1978), Compression of individual sequences via variable-rate coding, IEEE Transactions on Information Theory 24(5), 530–536, DOI 10.1109/TIT.1978.1055934 (bibliographic metadata checked). Goemans (2015), MIT 18.310A Lempel-Ziv codes, section 1, pp. LZ-1–LZ-2; explicit tagged terminal record is a specified framing adaptation. https://math.mit.edu/~goemans/18310S15/lempel-ziv-notes.pdf

## Arithmetic coding interval refinement (arithmetic-coding-interval-refinement)

> For ordered symbols a_j with positive probabilities p_j and C_j=Σ_{h<j}p_h, C_K=1 (zero-based j), initialize [L,U)=[0,1). For symbol a_j simultaneously set L'=L+(U−L)C_j and U'=L+(U−L)C_{j+1}. After n symbols choose the least b≥0 admitting an integer m with L≤m/2^b<U; transmit m and b with external length n. Decode n symbols by choosing the unique containing subinterval and rescaling the point.

K alphabet size, p_j fixed positive probabilities, C_j cumulative masses, L,U interval endpoints, n symbol count, b dyadic denominator exponent, m dyadic numerator.

General exact lossless coding specification; no empirical benefit claimed.

Assumptions — Finite ordered nonempty alphabet, shared static normalized positive probabilities, exact rational arithmetic, known symbol count and externally framed dyadic point; both endpoints computed from the old interval.

Limitations — Interval width equals the product of symbol probabilities. The least b is at most ceil(log2(1/(U−L))); this excludes all framing and model costs. Exact arithmetic can grow in bit complexity; no fixed-precision renormalization or practical codec specified. Poor models may expand data.

Mechanism — At each step the subintervals partition the parent interval, and the selected width is the parent width times p_j. A dyadic grid with spacing no greater than the final width necessarily contains a point in that half-open interval. Known length resolves nested interval ambiguity. Unlike Huffman coding this assigns a joint sequence interval rather than independently concatenating symbol codewords.

Source — Howard and Vitter (1994), Arithmetic Coding for Data Compression, section II.A–B, manuscript p. 2, table 1 and figure 1. https://www.ittc.ku.edu/~jsv/Papers/HoV94.arithmetic_coding.pdf ; Witten, Neal and Cleary (1987), DOI 10.1145/214762.214771 (metadata and abstract checked). Least-grid exponent bound independently derived for explicitly framed points.

## LZW implicit dictionary parsing (lzw-implicit-dictionary-parsing)

> Initialize D[0..K−1] to the ordered single symbols. For the longest dictionary phrase w matching the unread suffix, emit its index; if followed by symbol a, append D[j]=wa at the next free index j and resume at a. If no following symbol exists, finish. In decoding let v be the previous phrase; for next code c, use s=D[c] if already defined, or s=v concatenated with first(v) if c=j (next free index); append D[j]=v concatenated with first(s), output s, and set v←s.

K alphabet size, D dictionary, w encoder phrase, a next symbol, j next free index, c emitted code, v previous decoded phrase, s current decoded phrase.

General lossless dictionary coding specification; no empirical benefit claimed.

Assumptions — Finite nonempty alphabet, exact symbol equality, identical single-symbol initialization and sequential indices, externally framed integer code list, no resets or capacity limit; first nonempty code must be an initial symbol.

Limitations — With prefix-code/symbol dictionary nodes and constant-time transition lookup, encoding takes O(n) symbol transitions; decoder expansion takes O(n) output-symbol operations for n decoded symbols and dictionary storage O(K+z) nodes for z insertions. Unbounded dictionary and variable-width index framing incur costs; naive full-phrase storage can cost more. Not a GIF or TIFF bitstream specification and no finite-input compression guarantee.

Mechanism — LZW retains LZ78-style longest-phrase dictionary growth but starts from the full singleton alphabet and transmits indices alone instead of index/symbol pairs. The decoder is one insertion behind; only the next free code may refer to the immediately pending phrase, whose first symbol must equal that of the previous phrase. This material change in representation and synchronization justifies a variant, not another distinct algorithm count.

Source — Welch (1984), A Technique for High-Performance Data Compression, Computer 17(6), 8–19, pp. 16–17, compression and decompression algorithms and special case. DOI 10.1109/MC.1984.1659158. https://courses.cs.duke.edu/spring03/cps296.5/papers/welch_1984_technique_for.pdf ; unbounded externally framed code list is a specified abstraction.

## Burrows–Wheeler sentinel transform (burrows-wheeler-sentinel-transform)

> Let S=x⊕$ with unique least sentinel $, N=|S|, and π(j) the starting index of the j-th lexicographically sorted cyclic rotation. Set B[j]=S[(π(j)−1) mod N]. Define C(c)=#{i:B[i]<c}, Occ(c,j)=#{i<j:B[i]=c}, and LF(j)=C(B[j])+Occ(B[j],j). Starting at the unique r with B[r]=$, fill S[N−1−k]=B[r] and update r←LF(r) for k=0,…,N−1; then remove the terminal sentinel.

x finite input sequence, $ reserved least symbol, S augmented sequence, N augmented length, π rotation order, B transformed column, C cumulative smaller-symbol count, Occ exclusive occurrence rank, LF last-to-first permutation, r current row.

General reversible sequence rearrangement; no empirical benefit claimed.

Assumptions — Finite totally ordered alphabet, sentinel absent from x and smaller than all input symbols, exact symbol comparisons, zero-based indexing, known block length and alphabet order; empty x is represented by the sentinel alone.

Limitations — Explicit rotation materialization uses O(N²) storage and O(N² log N) worst-case symbol comparisons; a suffix array of the sentinel-terminated sequence can supply the same order without materializing rotations. Inversion uses O(N+K) time and storage with preordered dense alphabet of size K and direct-index counts; arbitrary symbol sorting adds cost. Transformation preserves the symbol multiset plus sentinel and is not itself compression.

Mechanism — Right-rotation of rows ending in the same symbol preserves their relative lexicographic order, giving LF by stable occurrence rank. A unique sentinel distinguishes every rotation and identifies the original row, so LF traverses one cycle of length N. Unlike suffix-array construction, the output is a reversible symbol permutation rather than an index; suffix ordering is a reusable subroutine, not an equivalent transform.

Source — Burrows and Wheeler (1994), A Block-sorting Lossless Data Compression Algorithm, SRC Research Report 124, section 2, pp. 2–4 (rotation and occurrence-ranked inverse). https://www.cl.cam.ac.uk/teaching/2223/Bioinfo/papers/burrows_wheeler.pdf ; sentinel-only framing and single-cycle validity check independently derived from unique sentinel rotation order.

## Move-to-front rank transform (move-to-front-rank-transform)

> With shared initial permutation A of K distinct symbols, at input position t set r_t=index_A(x_t) and A←[x_t] concatenated with A after deleting x_t. For decoding set x_t=A[r_t] before applying the same update, requiring 0≤r_t<K.

A mutable ordered alphabet, K alphabet size, x_t input or recovered symbol at position t, r_t zero-based rank.

General reversible recency-rank transformation for finite symbol sequences; no empirical benefit claimed.

Assumptions — Finite nonempty shared alphabet with identical initial order, exact symbol equality, no insertion of new symbols, externally framed rank sequence; empty input produces empty output.

Limitations — Simple list representation uses O(nK) worst-case time and O(K) working storage for n symbols; integer ranks require separate coding to yield a bitstream. Locality may produce small ranks, but there is no finite-input compression guarantee and rank corruption can desynchronize subsequent state.

Mechanism — The state is an ordering of fixed symbols by recency, rather than an expanding phrase dictionary or a global rotation permutation. Rank emission plus deterministic list update is invertible with shared state, and can be composed with the Burrows–Wheeler transform without being equivalent to it.

Source — Bentley, Sleator, Tarjan and Wei (1986), A Locally Adaptive Data Compression Scheme, Communications of the ACM 29(4), 320–330, p. 321, sections 2–3. DOI 10.1145/5684.5688. https://www.cs.cmu.edu/~sleator/papers/adaptive-data-compression.pdf ; fixed shared alphabet and zero-based ranks are an explicit restricted convention, not the full new-word or integer coding scheme.

## Elias gamma positive integer code (elias-gamma-positive-integer-code)

> For positive integer n let L=bitlength(n)=⌊log₂ n⌋+1 and B(n) be its canonical binary digits. G(n)=0^(L−1)⊕B(n); |G(n)|=2L−1. If k leading zeros precede the first one, read k further bits of unsigned value v (zero if empty) and recover n=2^k+v.

n positive integer, L binary length, B canonical binary representation, ⊕ concatenation, k leading-zero count, v suffix value.

General integer code; no empirical benefit claimed.

Assumptions — Exact positive integers, leading-zero unary convention (zero bits followed by a one), known bitstream end or declared number of codewords, exact binary arithmetic; n=1 encodes as 1.

Limitations — O(L) emitted or consumed bits and O(L) output representation; arithmetic costs depend on integer implementation. Not necessarily optimal for a specified distribution, no error correction; byte padding is not part of the code and must be separately framed.

Mechanism — The unary header uniquely specifies the number of remaining binary bits, so different header lengths disagree before either can be a prefix, and equal header lengths imply equal total codeword length. Unlike a fitted Huffman tree, no symbol probability table or finite alphabet tree is needed.

Source — Elias (1975), Universal codeword sets and representations of the integers, IEEE Transactions on Information Theory 21(2), 194–203, DOI 10.1109/TIT.1975.1055349 (bibliographic metadata checked; original full text not reviewed). CMU 15-853 Algorithms in the Real World, Data compression continued, slide 43, https://www.cs.cmu.edu/~15853-f19/slides/compress3.pdf (uses opposite unary polarity; only the unary prefix is complemented here).

## Elias delta positive integer code (elias-delta-positive-integer-code)

> For n≥1 let L=bitlength(n), B(n) canonical binary digits, and G the registered leading-zero gamma code. D(n)=G(L)⊕B(n)[1:L]; |D(n)|=L+2⌊log₂ L⌋. Decode L from G, then read L−1 suffix bits of unsigned value v and recover n=2^(L−1)+v.

n positive integer, L binary length, G gamma code, B canonical binary digits, ⊕ concatenation, v suffix value; slice indices zero-based, end exclusive.

General integer code; no empirical benefit claimed.

Assumptions — Exact positive integers, shared leading-zero gamma convention, known bitstream end or declared codeword count, no implicit padding; n=1 encodes as 1.

Limitations — O(L+log L) emitted or consumed bits; integer arithmetic and storage depend on representation. Delta may be longer than gamma for small values; no universal finite-stream compression guarantee or error correction.

Mechanism — Gamma's unary length header is replaced by a gamma code for L, while the binary remainder is unchanged. Prefix-freeness follows from gamma header prefix-freeness and the fixed remaining length once L is decoded. This nested header is a material variant of gamma rather than an independent algorithm count.

Source — Elias (1975), Universal codeword sets and representations of the integers, IEEE Transactions on Information Theory 21(2), 194–203, DOI 10.1109/TIT.1975.1055349 (bibliographic metadata checked; original full text not reviewed). Mansouri (2022), University of Southern Maine, Introduction to Information Retrieval, Session 5, slide 35, https://cs.usm.maine.edu/~behrooz.mansouri/courses/Slides_IR_22/Introduction%20to%20Information%20Retrieval%20--%20Session%205%20-%20Indexing%20%26%20Ranking.pdf (gamma-coded length followed by binary remainder; here leading-zero gamma convention).

## Golomb truncated-binary code (golomb-truncated-binary-code)

> For integers n≥0 and m≥1 set q=⌊n/m⌋, r=n−qm. Emit q zero bits followed by one. If m=1 emit no remainder bits. Otherwise set b=bitlength(m−1), t=2^b−m; emit r in b−1 bits when r<t, or r+t in b bits otherwise. Decode q from the unary header; for m>1 read b−1 bits as u, use r=u if u<t, otherwise read bit v and set r=2u+v−t. Recover n=qm+r.

n nonnegative integer, m positive divisor, q quotient, r remainder, b binary width, t short-code count, u partial binary value, v extra bit.

General integer code; no empirical benefit claimed.

Assumptions — Exact integer arithmetic, fixed shared m, leading-zero unary convention, known end or declared codeword count, no implicit padding; m=1 is unary only.

Limitations — Output and bit processing cost O(q+1+b) with b=0 for m=1; integer operation costs depend on representation. Large n relative to m can yield impractically long unary headers. Optimality for arbitrary sources or arbitrary m is not claimed; no error correction.

Mechanism — The unary quotient identifies a disjoint block of m integers; truncated binary distinguishes residues using t short leaves and m−t long leaves. The remainder Kraft sum is t·2^(−(b−1))+(m−t)·2^(−b)=1 for m>1; the unary-only case is separate. This quotient/remainder construction is distinct from Elias length headers and fitted finite Huffman trees.

Source — Treib (2014), GPU-Based Compression for Large-Scale Visualization, TU München dissertation, §2.1.3, p. 15, https://mediatum.ub.tum.de/doc/1190931/939759.pdf (quotient and truncated-binary remainder; unary polarity complemented here). Kiely (2004), Selecting the Golomb Parameter in Rice Coding, JPL IPN Progress Report 42-159, p. 2, https://tda.jpl.nasa.gov/progress_report/42-159/159E.pdf (leading-zero convention and floor quotient). Golomb (1966), Run-Length Encodings, IEEE Transactions on Information Theory 12(3), 399–401, bibliographic citation checked via Kiely; original full paper not reviewed.

## Rice power-of-two Golomb code (rice-power-two-golomb-code)

> For integer n≥0 and integer k≥0 let m=2^k, q=⌊n/m⌋, r=n−qm. Encode q zeros followed by one and then the k-bit unsigned binary representation of r (empty when k=0). The code length is L=q+1+k. Decode the unary count and exactly k suffix bits, then reconstruct n=2^k q+r.

n nonnegative integer, k remainder width, m divisor, q quotient, r remainder.

General integer code; no empirical benefit claimed.

Assumptions — Exact nonnegative integers, fixed shared k, identical unary polarity, known stream end or declared codeword count, no implicit padding; k=0 is unary.

Limitations — O(q+1+k) bit processing and output; integer operation costs depend on representation. The power-of-two restriction may be less efficient than other divisors; adaptive block parameter selection and error correction are not specified.

Mechanism — When m=2^k and k>0, the Golomb threshold t=0 and b=k, so all residues have k bits; k=0 gives the same unary-only special case. This is a material restricted variant, not an additional distinct algorithm.

Source — Kiely (2004), Selecting the Golomb Parameter in Rice Coding, JPL IPN Progress Report 42-159, p. 2, https://tda.jpl.nasa.gov/progress_report/42-159/159E.pdf (GPO2 construction, floor quotient verified on page image). Treib (2014), §2.1.3, https://mediatum.ub.tum.de/doc/1190931/939759.pdf (power-of-two restriction). Rice (1979), Some Practical Universal Noiseless Coding Techniques, JPL 79-22, NASA document 19790014634 (metadata reviewed; original full report not reviewed).

## LZ77 sliding-window backreference (lz77-sliding-window-backreference)

> For input x[0..n−1], window W≥1, maximum length L≥2 and position i, define ℓ(d)=max{k: 0≤k≤min(L,n−i), x[i+j]=x[i+j−d] for all 0≤j<k}, for 1≤d≤min(W,i). Choose maximum ℓ(d), breaking ties by smallest d. If a match of length at least 2 exists, emit tagged pair (d,ℓ) and advance i by ℓ; otherwise emit tagged literal x[i] and advance by one. Decoder appends y[|y|−d] repeatedly ℓ times, recalculating the current output length each time.

x input, n length, i current position, W window bound, L length bound, d distance, ℓ match length, y decoded prefix.

General lossless sequence representation; no empirical benefit claimed.

Assumptions — Finite equality-comparable symbols; fixed shared integer W and L; empty initial dictionary; framed tagged tokens and exact expected output length; overlapping references permitted; empty input encodes as no tokens.

Limitations — Direct exhaustive matching takes O(nWL) symbol comparisons as a conservative bound; decoding takes O(n) symbol writes with O(W) history beyond output. Greedy longest matching is not necessarily bit-optimal; this specifies a simplified token parser, not original triple framing or the full DEFLATE format.

Mechanism — Each copied symbol references an already produced symbol because d≥1, including within overlapping copies; induction on decoded length proves lossless reconstruction. Unlike LZ78, no persistent phrase dictionary or phrase-index insertion is required; references are bounded relative positions. This is a distinct sliding-window mechanism.

Source — Deutsch (1996), RFC 1951, DEFLATE Compressed Data Format Specification, §§2 and 3.2.3, https://www.rfc-editor.org/rfc/rfc1951.html (literal and distance/length token model, overlapping copies; this specification generalizes bounds and uses its own greedy rule and framing). Ziv and Lempel (1977), A Universal Algorithm for Sequential Data Compression, IEEE Transactions on Information Theory 23(3), 337–343, DOI 10.1109/TIT.1977.1055714 (metadata and abstract reviewed; original full paper not reviewed).

## Run-length encoding symbol-count pairs (run-length-encoding-symbol-count)

> For a finite sequence x of length n, partition into maximal equal-symbol runs (s_i,c_i), c_i≥1, adjacent s_i≠s_(i+1), and Σ_i c_i=n. Encode the ordered pairs; decode x=s_1 repeated c_1 times followed by subsequent runs in order. Empty input has zero pairs.

s_i run symbol, c_i positive run length, n input length, r number of maximal runs.

General lossless sequence representation; no empirical benefit claimed.

Assumptions — Finite equality-comparable symbols with unambiguous representation; framed pairs and declared output length; exact bounded positive integer counts; adjacent equal-symbol pairs rejected under this canonical unsplit-run convention.

Limitations — Encoding and decoding require O(n) symbol operations and O(1) working words beyond input/output in a bounded-count word model; r≤n for nonempty input. Actual encoded size depends on count and symbol representation, and may expand; fixed-width split-run formats and PackBits are not specified.

Mechanism — Run boundaries occur exactly at unequal adjacent symbols; the unique maximal-run partition is recovered from its ordered symbols and lengths. This is not Golomb coding of integers, nor general LZ77 substring substitution; although long constant runs can be represented using distance-one LZ77 references, the canonical run partition is a different sequence representation.

Source — Kulcu, Algorithms Lecture Notes, Chapter 9: String Matching and Compression, §9.8.1, https://sercankulcu.github.io/files/algorithms/notes/Chapter_09_String_Matching_and_Compression_Lecture_Notes.html (maximal runs and count-symbol pairs). TIFF Image File Format Rev. 4.0, Appendix C, https://cool.culturalheritage.org/bytopic/imaging/std/tiff4.html (historical PackBits repeat packets; not the same wire format).

## Kahn indegree topological sort (kahn-topological-sort)

> For finite directed graph G=(V,E), set d(v)=|{(u,v) in E}|. Initialize queue Q with d(v)=0. Remove v from Q, append it to ordering L, and for each outgoing arc (v,w) set d(w)=d(w)−1; enqueue w exactly when d(w)=0. If |L|=|V| return L; otherwise report a directed cycle.

V vertices, E directed arcs, d remaining indegree, Q queue, L output order.

General graph computation on synthetic or authorised inputs; no empirical benefit claimed.

Assumptions — Finite fixed graph with valid endpoints; adjacency lists and one count per arc; self-loops are cycles; empty graph has empty ordering.

Limitations — O(|V|+|E|) time and O(|V|) auxiliary storage; multiple valid orderings possible; a cycle report does not identify all cyclic vertices.

Mechanism — Maintains indegree of the unprocessed induced graph. Every nonempty finite DAG has a source; each emitted vertex precedes all its unprocessed successors. If no source remains, following predecessors in the finite residual graph yields a cycle. Distinct from shortest-path and spanning-forest objectives.

Source — University of Pennsylvania, CIS 1210, Spring 2025, Recitation 7, Kahn’s algorithm, https://www.cis.upenn.edu/~cis1210/current/recitations/fa25_rec_7_sols.pdf (retrieved text; screenshot unavailable). Original Kahn (1962) DOI 10.1145/368996.369025 retained as unverified locator.

## Tarjan strongly connected components (tarjan-strongly-connected-components)

> For directed graph G=(V,E), assign discovery index i(v)=low(v)=next index on DFS entry; push v on active stack S. For each edge v→w, if w is undiscovered recurse then set low(v)=min(low(v),low(w)); else if w is on S set low(v)=min(low(v),i(w)); otherwise ignore. If low(v)=i(v), pop through v inclusive as one component. Start DFS at each still undiscovered vertex.

i discovery index, low DFS lowlink, S unassigned vertex stack, v,w vertices.

General graph computation on synthetic or authorised inputs; no empirical benefit claimed.

Assumptions — Finite fixed directed graph; valid endpoints; distinct discovery indices; active-stack membership tracked separately from DFS call stack.

Limitations — O(|V|+|E|) time, O(|V|) auxiliary storage; recursive depth may reach |V|; output component order depends on traversal choices, but partition does not.

Mechanism — The root condition identifies a maximal mutually reachable group; active-stack bookkeeping distinguishes completed components. Floyd–Warshall computes pairwise paths rather than this linear-time partition; Kahn orders the resulting condensation DAG, not the cyclic graph itself.

Source — Cornell CS 4120 (Spring 2023), Iterative solving, Tarjan’s algorithm, https://courses.cs.cornell.edu/cs4120/2023sp/notes/iterative/index.html. Original Tarjan (1972) DOI 10.1137/0201010 retained as unverified locator.

## Edmonds–Karp shortest augmenting path maximum flow (edmonds-karp-maximum-flow)

> For finite directed network G=(V,E), start residual capacities r(u,v)=c(u,v) (zero for absent arcs). BFS from source s to sink t using r>0 finds a minimum-edge path P. Set δ=min_{(u,v) in P} r(u,v), then r(u,v)=r(u,v)−δ and r(v,u)=r(v,u)+δ along P; accumulate F=F+δ from F=0. Stop when t is unreachable; F is maximum flow value.

c nonnegative capacity, r residual capacity, s,t distinct terminals, P shortest residual path, δ bottleneck, F net flow value.

General graph computation on synthetic or authorised inputs; no empirical benefit claimed.

Assumptions — Finite fixed directed graph, finite nonnegative capacities, exact arithmetic; aggregate parallel arcs by ordered endpoints, omit self-loops; residual representation permits antiparallel arcs.

Limitations — O(|V||E|²) time after excluding irrelevant isolated vertices, with O(|V|+|E|) initialization and storage using adjacency lists; finite-precision residual tolerances require separate numerical analysis.

Mechanism — Residual reverse arcs permit cancellation; shortest residual distances do not decrease and each critical arc can recur only O(|V|) times. Different objective and state updates from Dijkstra; the existing general linear-program specification is not this combinatorial procedure.

Source — MIT 6.854, Strongly Polynomial Flow Algorithms, Scribe Notes #7, §2, https://courses.csail.mit.edu/6.854/21/Scribe/s7-blockingFlows/unit-capacity.html. Edmonds and Karp (1972) DOI 10.1145/321694.321699 retained as unverified locator.

## Hopcroft–Karp bipartite maximum matching (hopcroft-karp-bipartite-matching)

> Given bipartite graph G=(L∪R,E) and matching M (initially empty), orient unmatched edges L→R and matched edges R→L. BFS from free L vertices finds shortest distance ℓ to a free R vertex. Select an inclusion-maximal collection of vertex-disjoint shortest augmenting paths P_1,...,P_k in the layered graph by DFS, and update M_new=M △ (E(P_1) ∪ ... ∪ E(P_k)). Stop when no free R vertex is reachable.

L,R disjoint vertex sets, E crossing edges, M matching, ℓ shortest augmenting path length, P_i paths, △ symmetric difference.

General graph computation on synthetic or authorised inputs; no empirical benefit claimed.

Assumptions — Finite unweighted bipartite graph, valid partition and endpoints, simple edges or deduplicated parallel edges; all paths in a phase selected relative to the same initial matching.

Limitations — O(|V|+|E|√|V|) time using linear-time layered DFS per phase and removal of isolated vertices; O(|V|+|E|) storage. Solves cardinality, not weighted assignment or nonbipartite matching..

Mechanism — Each phase increases matching cardinality by k; shortest augmenting distance strictly increases. This is a specialized disjoint-path phase algorithm, distinct from Edmonds–Karp single-path augmentation and Hungarian weighted assignment; related to unit-capacity blocking flow.

Source — Norbert Zeh, Dalhousie University, Algorithms II §7.4.4, https://web.cs.dal.ca/~nzeh/Teaching/4113/book/matching/bipartite_maximum_matching/hopcroft_karp.html. Original Hopcroft and Karp (1973) DOI 10.1137/0202019 retained as unverified locator.

## Kosaraju two-pass strongly connected components (kosaraju-two-pass-scc)

> For G=(V,E), define G^T=(V,{(v,u):(u,v)∈E}). Run a complete DFS forest on G, append each vertex on exit to list L, then scan L in reverse; start DFS in G^T at each still unvisited vertex, ignoring vertices assigned in earlier second-pass trees. Each resulting tree is one strongly connected component

V vertices, E directed arcs, G^T transpose, L increasing finishing order.

General graph computation on synthetic or authorised inputs; no empirical benefit claimed.

Assumptions — Finite directed graph with valid endpoints; both passes cover every vertex, with fresh visitation marks for the second pass; self-loops and parallel edges are harmless.

Limitations — O(|V|+|E|) time and storage including transpose; recursive DFS may exhaust the call stack on deep graphs; component labels and within-component order are not canonical.

Mechanism — Same component partition as Tarjan but uses finishing order and a transpose instead of low-link stack state; conservatively counted as a variant, not independent evidence.

Source — Cornell CS 4120 (Spring 2023), Iterative solving, Strongly-connected components, https://courses.cs.cornell.edu/cs4120/2023sp/notes/iterative/index.html

## Dinic layered blocking flow (dinic-blocking-flow)

> Initialize residual capacity r(u,v)=c(u,v), zero for absent arcs, and flow value F=0. BFS from s labels residual distances d. While t is reachable, keep edges with r(u,v)>0 and d(v)=d(u)+1. Repeatedly send δ=min residual capacity on a level-respecting s-to-t path; update r(u,v)=r(u,v)−δ, r(v,u)=r(v,u)+δ and F=F+δ until no such path remains. Rebuild BFS levels; terminate when t is unreachable

c capacity, r residual capacity, s and t distinct terminals, d BFS distance, δ augmentation amount, F net flow value.

General graph computation on synthetic or authorised inputs; no empirical benefit claimed.

Assumptions — Finite directed graph, finite nonnegative capacities, exact arithmetic; combine parallel arcs by ordered endpoints and ignore self-loops; antiparallel arcs allowed in aggregated residual representation.

Limitations — At most |V|−1 blocking phases since shortest residual path length increases. Standard current-arc implementation takes O(|V|²|E|) time after excluding irrelevant isolated vertices and O(|V|+|E|) storage; a naive path enumerator need not achieve this bound. Numerical tolerance requires separate analysis.

Mechanism — Shares residual-network objective with Edmonds–Karp but blocks all shortest paths per BFS phase rather than one path. Conservatively classified as variant; generic capacities, not just bipartite unit networks.

Source — MIT 6.854, Strongly Polynomial Flow Algorithms, Scribe Notes #7, §3, https://courses.csail.mit.edu/6.854/21/Scribe/s7-blockingFlows/unit-capacity.html (sink-oriented levels in source; equivalent source-oriented convention here).

## Prim minimum spanning tree (prim-minimum-spanning-tree)

> For connected undirected weighted G=(V,E), choose root r and initialize S={r}, T=∅. While S≠V, choose e=(u,v) of minimum weight among edges with u∈S and v∈V∖S; set T=T∪{e}, S=S∪{v}. Return T minimizing Σ_{e∈T}w(e)

S growing vertex set, T selected tree edges, w finite edge weight, r starting vertex.

General graph computation on synthetic or authorised inputs; no empirical benefit claimed.

Assumptions — Finite nonempty connected undirected graph with finite real edge weights; negative and tied weights allowed; ignore loops, choose least parallel edge or retain parallel edges with identities.

Limitations — O((|V|+|E|)log|V|) time using indexed binary heap for |V|≥2, O(|V|+|E|) storage; disconnected graph requires explicit forest extension or rejection; tied weights may give multiple optimal trees.

Mechanism — A connected frontier with one vertex added each step differs from Kruskal’s sorted global edge scan and component merges, although both exploit cut optimality. Dijkstra prioritizes cumulative path distance, not crossing edge weight.

Source — James S. Plank, University of Tennessee CS302, Minimum Spanning Tree, Prim’s Algorithm, https://web.eecs.utk.edu/~jplank/plank/classes/cs302/Notes/MST/; Duke COMPSCI 330 Lecture 14 (2019), cut property (parsed text; screenshot unavailable). Prim (1957) original paper locator not independently reviewed.

## Bellman–Held–Karp subset dynamic programming (bellman-held-karp-subset-dp)

> Fix root r in a complete directed graph with n≥2 vertices and finite costs c(i,j). For r∈S⊆V and j∈S∖{r}, D({r,j},j)=c(r,j), and D(S,j)=min_{i∈S∖{r,j}}[D(S∖{j},i)+c(i,j)] for |S|>2. The optimal rooted tour cost is min_{j∈V∖{r}}[D(V,j)+c(j,r)]

V vertex set, n size, r root, S visited subset, j terminal vertex, D minimum path cost for exactly S, c additive directed edge cost.

General graph computation on synthetic or authorised inputs; no empirical benefit claimed.

Assumptions — Complete finite directed cost matrix, fixed additive costs independent of history; exact arithmetic; negative and asymmetric costs allowed because each vertex visited exactly once before closing tour.

Limitations — O(n²2^n) time and O(n2^n) table storage with constant-time subset indexing and arithmetic; exponential resource requirements; not the Held–Karp relaxation or approximation.

Mechanism — Subset and endpoint state enforces visiting each vertex exactly once; distinct from general branch-and-bound pruning, Bellman–Ford walks and Floyd–Warshall allowed-intermediate-vertex recurrence.

Source — Carnegie Mellon University 15-451 (Fall 2023), Dynamic Programming II, §1, pp. 1–3, https://www.cs.cmu.edu/~15451-f23/lectures/lecture10-dp2.pdf. Held and Karp (1962) original publication locator not independently reviewed.

## Borůvka component minimum-edge spanning forest (boruvka-component-minimum-edge)

> Start F=∅ on V. For each component C of (V,F) select e_C=argmin_{e∈δ(C)}(w(e),id(e)) in lexicographic order if δ(C) is nonempty. Add selected edges only if their endpoints remain in different components; repeat until no crossing edge exists

V vertices, F forest edges, δ(C) edges crossing the cut of C, w finite edge weight, id fixed unique edge ordering.

General graph computation on synthetic or authorised inputs; no empirical benefit claimed.

Assumptions — Finite undirected loop-free graph, finite weights and consistent tie order; disconnected components and isolated vertices allowed.

Limitations — Returns minimum spanning forest, not shortest paths; ties can yield multiple optima; O((|V|+|E|) log(max(2,|V|))) for linear component labelling and edge scans each round.

Mechanism — Component-wide minimum selection differs from Prim's single frontier and Kruskal's global sorted scan; conservatively classified as spanning-forest variant.

Source — Jeff Erickson, Algorithms, §§7.1–7.3, pp. 257–262, https://jeffe.cs.illinois.edu/teaching/algorithms/book/07-mst.pdf. Book page image and text reviewed; disconnected stopping rule is a componentwise extension.

## Push–relabel preflow maximum flow (push-relabel-preflow)

> Use skew-symmetric net flow f(u,v)=−f(v,u), r(u,v)=c(u,v)−f(u,v), e(u)=Σ_v f(v,u). Initialize h(s)=|V|, h(v)=0 otherwise, saturate arcs from s. For active u≠s,t push δ=min(e(u),r(u,v)) when r(u,v)>0 and h(u)=h(v)+1; otherwise set h(u)=1+min_{v:r(u,v)>0}h(v). Stop when all internal excesses are zero

c directed capacity (zero if absent), f signed net flow, r residual, e excess, h integer height, s source, t sink.

General graph computation on synthetic or authorised inputs; no empirical benefit claimed.

Assumptions — Finite directed loop-free graph, distinct s,t, nonnegative finite capacities, exact arithmetic; parallel capacities may be aggregated.

Limitations — Intermediate preflow need not conserve flow; generic O(|V|²|E|) operation bound with appropriate adjacency and current-edge bookkeeping; finite-precision arithmetic requires separate invariant checks.

Mechanism — Local pushes relax conservation temporarily rather than augmenting complete paths; height labels rule out residual source-sink paths. Conservatively classified as maximum-flow variant.

Source — Carnegie Mellon 15-451/651, Lecture 14, October 10 2013, §§2–3, https://www.cs.cmu.edu/~avrim/451f13/lectures/lect1010.pdf. Page 3 image reviewed; signed net-flow convention equivalent. Original paper not reviewed.

## DFS low-link articulation point detection (dfs-articulation-points)

> For discovery index d(u), low(u)=min({d(u)}∪{d(w): uw is a back edge to an ancestor}∪{low(v): v is a DFS child}). Nonroot u is a cut vertex iff some child v has low(v)≥d(u); root iff it has at least two DFS children

d discovery index, low earliest ancestor reachable through descendants and at most one back edge, u vertex, v DFS child, w ancestor.

General graph computation on synthetic or authorised inputs; no empirical benefit claimed.

Assumptions — Finite simple undirected graph, full DFS forest, parent edge excluded from back edges.

Limitations — O(|V|+|E|) time and O(|V|) auxiliary state with adjacency lists; recursion can exhaust stack; multigraphs need edge-ID exclusion.

Mechanism — Detects component-count increase on vertex deletion, not directed mutual-reachability SCCs; low-link recurrence and root rule have different meanings.

Source — Victor Adamchik, Carnegie Mellon CS 15-451, Lecture 11, February 7 2014, p. 5, https://www.cs.cmu.edu/afs/cs/academic/class/15451-s14/www/LectureNotes/lecture11.pdf. Page image reviewed; componentwise extension to disconnected graphs.

## Hierholzer Eulerian circuit construction (hierholzer-eulerian-circuit)

> For an undirected graph with even degrees and connected positive-degree support, repeatedly consume unused incident edges to close trails and splice a new closed trail at any visited vertex with unused edges. Final vertex sequence satisfies v_0=v_m and m=|E| with every edge identity used exactly once

V vertices, E edge identities, m traversed edges, v_i ordered vertices, degree counts incident edge ends.

General graph computation on synthetic or authorised inputs; no empirical benefit claimed.

Assumptions — Finite simple undirected graph with at least one vertex, every degree even and all positive-degree vertices in one connected component; if E empty return a zero-edge circuit at any vertex.

Limitations — O(|V|+|E|) time with adjacency cursors, used-edge flags and stack, O(|V|+|E|) storage including output; does not solve Hamiltonian cycles or optimise route weights.

Mechanism — Constructs a closed edge-covering trail with repeated vertices permitted, unlike subset-DP Hamiltonian tours and topological sorting.

Source — T. M. Murali, Virginia Tech CS 4884, Introduction to Graphs, January 28 2020, Hierholzer algorithm and properties, https://bioinformatics.cs.vt.edu/~murali/teaching/2020-spring-cs4884/lectures/lecture-03-graphs.pdf. Parsed text reviewed; screenshot request failed due to PDF size.

## Johnson reweighted all-pairs shortest paths (johnson-reweighted-all-pairs)

> Add auxiliary source q with zero-weight arcs to every vertex; h(v)=d(q,v) by Bellman–Ford. Reject any negative cycle. Set c′(u,v)=c(u,v)+h(u)−h(v)≥0, run Dijkstra from every original source, and recover d(u,v)=d′(u,v)−h(u)+h(v), preserving unreachable distances as +∞

V vertices, E directed edges, c finite edge weight, q auxiliary source, h vertex potential, d and d′ original and reweighted shortest-path distances.

General graph computation on synthetic or authorised inputs; no empirical benefit claimed.

Assumptions — Finite directed graph with at least one vertex, finite real weights, no negative cycle anywhere; exact arithmetic or checked numerical bounds.

Limitations — O(|V|³) with array-based Dijkstra, or O(|V|(|E|+|V|) log(max(2,|V|))) with binary heaps, including auxiliary-source Bellman–Ford and output; O(|V|²) output storage; rejects negative cycles rather than returning partially defined distances.

Mechanism — Combines potential reweighting with repeated nonnegative shortest-path searches; same all-pairs objective as Floyd–Warshall but different mechanism; conservatively registered as variant.

Source — MIT OpenCourseWare 6.046J, Fall 2005, Lecture 19, Johnson algorithm transcript; https://mitocw.ups.edu.ec/courses/electrical-engineering-and-computer-science/6-046j-introduction-to-algorithms-sma-5503-fall-2005/video-lectures/lecture-19-shortest-paths-iii-all-pairs-shortest-paths-matrix-multiplication-floyd-warshall-johnson/ (MIT OCW mirror; transcript reviewed).

## Gale–Shapley deferred acceptance (gale-shapley-deferred-acceptance)

> For equal-size sets A and B with complete strict preferences, initialize M=∅. Each free proposer a offers to its next untried receiver b. If b is free or prefers a to its current holder, replace that holder; otherwise reject a. At termination M={(a,b): b holds a}; no unmatched pair mutually prefers each other to their assigned partners

A proposers, B receivers, n common size, M held pairs, rank orders of opposite-side participants, next untried position.

General graph computation on synthetic or authorised inputs; no empirical benefit claimed.

Assumptions — Finite equally sized disjoint sets, strict complete preference permutations on both sides, one-to-one matching, fixed proposer side.

Limitations — At most n² proposals and O(n²) time with inverse receiver ranks and queue; not a maximum-weight or fairness optimiser; outcome can depend on proposer side; ties, incomplete lists and capacities require separate treatment.

Mechanism — Ordinal blocking-pair stability, not maximum-cardinality matching; the proposal and rejection mechanism is distinct from augmenting paths.

Source — Alexander Hulpke, Colorado State University, Combinatorics (Fall 2025), chapter Connections, Stable Matchings, algorithm and Proof 2.4; https://www.math.colostate.edu/~hulpke/lectures/m501/notes.html (HTML reviewed).

## DFS low-link bridge detection (dfs-low-link-bridges)

> In a complete DFS forest of a simple undirected graph, low(u)=min({d(u)}∪{d(w): uw is a back edge to an ancestor}∪{low(v): v is a DFS child}). A DFS tree edge uv with parent u and child v is a bridge iff low(v)>d(u)

d discovery index, low earliest reachable ancestor discovery index via descendants and at most one back edge, u parent, v child, w ancestor.

General graph computation on synthetic or authorised inputs; no empirical benefit claimed.

Assumptions — Finite simple undirected graph, all components searched, reverse of parent edge excluded; isolated vertices permitted.

Limitations — O(|V|+|E|) time and O(|V|) auxiliary state with adjacency lists, excluding output; recursive implementation may overflow stack; multigraphs require parent-edge identity not parent vertex.

Mechanism — Shares low-link computation with articulation points but uses strict edge criterion rather than vertex-removal criterion; conservative variant classification.

Source — Dave Mount, University of Maryland CMSC 451 Lecture 4, Bridges and 2-Edge Connectivity, 7 September 2017, pp. 2–4; https://www.cs.umd.edu/class/fall2017/cmsc451-0101/Lects/lect04-edge-connectivity.pdf (parsed text reviewed; screenshot unavailable: HTTP 403).

## Floyd tortoise-and-hare cycle detection (floyd-tortoise-hare-cycle)

> For x_(i+1)=f(x_i), initialize slow=f(x_0), fast=f(f(x_0)); iterate slow←f(slow), fast←f(f(fast)) until equality. Reset slow=x_0 and advance both once per step until equality at x_μ. From that entry advance one pointer until it returns, counting λ≥1; x_(μ+λ)=x_μ

f deterministic transition on finite state set, x_0 start, μ first cycle-entry index, λ positive cycle period.

General graph computation on synthetic or authorised inputs; no empirical benefit claimed.

Assumptions — Finite nonempty state space, total deterministic transition, exact state equality, unchanged transition during run.

Limitations — O(μ+λ) transition evaluations and O(1) auxiliary state references (excluding transition representation); cannot guarantee termination for arbitrary infinite nonrepeating sequences; not a general graph cycle enumerator.

Mechanism — Detects eventual periodic orbit using two moving pointers, rather than general graph SCC traversal or tree-ancestor queries.

Source — John Burkardt, CYCLE_FLOYD, 18 June 2012, University of South Carolina mathematics-hosted reference implementation and description, https://people.math.sc.edu/Burkardt/cpp_src/cycle_floyd/cycle_floyd.cpp; Stanford CS355 Spring 2021 Lecture 5 cycle-finding slide parsed text corroborates meeting argument (screenshot unavailable due to size). Original historical attribution not reviewed.

## Andrew monotone-chain convex hull (andrew-monotone-chain-convex-hull)

> Sort unique points lexicographically; for each forward and reverse scan pop last b while turn(a,b,c)=(b_x−a_x)(c_y−a_y)−(b_y−a_y)(c_x−a_x)≤0, then push c. H=lower[:-1] concatenated with upper[:-1]; for at most one unique point return it directly

a,b,c consecutive planar points, H extreme vertices in counterclockwise order.

General mathematical computation on synthetic or authorised inputs; no empirical benefit claimed.

Assumptions — Finite real coordinate pairs, exact orientation and ordering, duplicate points removed.

Limitations — O(n log n) sorting and O(n) scanning and storage; excludes intermediate collinear boundary points; all-collinear input yields its two extremes.

Mechanism — Two directional convex-envelope stack scans, not merely a monotone stack query; no existing convex hull record found

Source — Laura Toma, Bowdoin College CS3250, Planar convex hulls (II), Fall 2021, Andrew monotone-chain lecture; slide image reviewed. Original 1979 article not reviewed; https://tildesites.bowdoin.edu/~ltoma/teaching/cs3250-CompGeom/fall21/Lectures/L4-hull2d/cg-convexHull2.pdf

## Planar closest pair divide and conquer (closest-pair-planar-divide-conquer)

> For indexed points split x-sorted sequence by rank; d²=min(d_L²,d_R²), with base cases of at most three points by direct pair comparison (empty pair set gives +∞). If d²=0 return zero. In strip (x−x_m)²<d² sorted by y, compare each point with at most seven following points while (y_j−y_i)²<d²; reduce d² to minimum of current value and squared distances

n point count, x_m median split coordinate, d_L and d_R within-half closest distances, d closest distance.

General mathematical computation on synthetic or authorised inputs; no empirical benefit claimed.

Assumptions — At least two finite indexed planar points, Euclidean metric, exact comparison, rank split even when x ties, retain original identities; duplicate coordinates yield zero.

Limitations — O(n log n) with presorted y lists partitioned by identity and linear merging; sorting each strip separately gives O(n log² n); returns any minimizing pair, not all ties.

Mechanism — Geometric strip packing and recursive minimization, not subset tour DP

Source — Sariel Har-Peled, University of Illinois CS473, Divide and Conquer, 2 Dec 2021, section 7.2, page 3 image reviewed. Rank-based splitting corrects coordinate-tie ambiguity; right-recursion typographical error in source not copied; https://courses.grainger.illinois.edu/cs473/fa2021/lec/notes/07_divide_conquer.pdf

## Rotating calipers convex polygon diameter (rotating-calipers-convex-diameter)

> For counterclockwise extreme vertices v_0,…,v_(h−1), define A_i(j)=cross(v_(i+1)−v_i,v_j−v_i), cyclic indices. Start j=1; for each edge i advance j while A_i(j+1)>A_i(j). Evaluate squared distances from both edge endpoints to v_j and, if A_i(j+1)=A_i(j), to v_(j+1). D²=max of evaluated distances

h hull vertex count, i edge index, j opposite support index, A_i signed doubled triangle area, D Euclidean diameter.

General mathematical computation on synthetic or authorised inputs; no empirical benefit claimed.

Assumptions — Convex counterclockwise extreme-vertex polygon without repeated or intermediate collinear vertices; exact predicates; handle h=1 with zero and h=2 by endpoint distance.

Limitations — O(h) after valid hull construction; O(n log n) including monotone-chain hull; no general guarantee for nonconvex or incorrectly ordered vertices; reject empty input.

Mechanism — Antipodal farthest-pair scan is a different objective and mechanism from closest-pair strip recursion and hull construction

Source — David Eppstein, UC Irvine, The Rotating Caliper Graph, support-pair characterization; RPI CSCI 4560/6560 Spring 2026 Lecture 23 parsed maximum diameter slide corroborates linear scan. Princeton FarthestPair page direct retrieval returned 403; original papers not reviewed; https://www-test.ics.uci.edu/~eppstein/junkyard/rcg.html

## Bentley–Ottmann segment-intersection sweep (bentley-ottmann-segment-intersections)

> Initialize event queue Q with left/right endpoints ordered by x and active segments T ordered by y at sweep x. At start insert segment and schedule future intersections with its immediate neighbors; at end delete and schedule new adjacent pair; at crossing report pair, swap its adjacent order and schedule newly adjacent pairs. For nonparallel segments a+t(b−a), c+u(d−c), t=cross(c−a,d−c)/cross(b−a,d−c), u=cross(c−a,b−a)/cross(b−a,d−c); proper intersection iff 0<t<1 and 0<u<1

a,b,c,d endpoints, t,u segment parameters, Q events, T active order, n segments, k proper intersections.

General mathematical computation on synthetic or authorised inputs; no empirical benefit claimed.

Assumptions — General position certified: finite nonvertical nonzero segments, no overlaps, endpoint contacts or triple crossings, all endpoint and crossing x coordinates distinct; exact predicates and event order.

Limitations — O((n+k) log n) event operations with balanced active structure and deduplicated priority queue; may use O(n+k) storage; quadratic worst-case output; prechecking general position by all pairs can cost O(n²) and is not included in sweep bound.

Mechanism — Output-sensitive event-driven neighbor maintenance for all proper intersections; not a closest-pair or graph traversal algorithm

Source — Laura Toma, Bowdoin College CS3250, Line segment intersection, Spring 2018, general-position assumptions and Bentley–Ottmann event invariants reviewed in parsed slides; introductory orthogonal sweep slide image inspected. Original 1979 article not reviewed; https://tildesites.bowdoin.edu/~ltoma/teaching/cs3250-CompGeom/spring18/Lectures/cg-bentleyottman.pdf

## Graham polar-angle convex hull (graham-polar-angle-convex-hull)

> Select pivot o with minimum (y,x); sort remaining distinct points by increasing polar direction about o, then increasing squared distance. For each c, while stack has at least two points a,b and turn(a,b,c)=(b_x−a_x)(c_y−a_y)−(b_y−a_y)(c_x−a_x)≤0, pop b; append c. Return stack in counterclockwise order; return empty or singleton directly

o extreme pivot; a,b stack tail; c candidate; turn signed orientation determinant.

General mathematical computation on synthetic or authorised inputs; no empirical benefit claimed.

Assumptions — Finite planar points, deduplicated, exact orientation and total polar order; pivot selection ensures directions lie in a half-plane.

Limitations — O(n log n) sorting and O(n) scan/storage; excludes intermediate collinear boundary points; collinear sets yield extreme endpoints.

Mechanism — Same extreme-vertex hull objective as Andrew monotone chain; polar sort rather than two lexicographic scans; conservatively classified as variant

Source — Sedgewick and Wayne, Princeton Algorithms 4e, Convex Hull, polar sorting and Andrew comparison; nondegenerate GrahamScan reference excerpt consulted; general implementation URL returned 403; tie policy derived from orientation stack; https://algs4.cs.princeton.edu/99hull/

## Polygon winding-number point classification (polygon-winding-number)

> For cyclic ordered vertices a,b and query q, let D=cross(b−a,q−a). Return boundary first if D=0 and q lies in the closed edge bounding box. Otherwise w=Σ_i [1(a_y≤q_y<b_y and D>0)−1(b_y≤q_y<a_y and D<0)]; classify by w≠0 for the nonzero winding rule

a,b directed edge endpoints; q query; D signed orientation; w integer winding number; 1 indicator.

General mathematical computation on synthetic or authorised inputs; no empirical benefit claimed.

Assumptions — Finite planar closed walk with at least three vertices and exact predicates; edges implicit from successive vertices and last to first; repeated vertices allowed.

Limitations — O(n) time and O(1) extra space per query; winding is undefined on boundary; self-intersections use nonzero fill rule, not even-odd rule; no geographic/spherical interpretation.

Mechanism — Signed ray-crossing point classification, not intersection enumeration or convex hull construction

Source — David G. Alciatore and Rick Miranda, Colorado State University, A Winding Number and Point-in-Polygon Algorithm, axis-crossing method and page 3 image reviewed; half-open convention expressed with equivalent signed predicates; https://www.engr.colostate.edu/~dga/documents/papers/point_in_polygon.pdf

## Polygon shoelace signed area (polygon-shoelace-signed-area)

> For n≥3 cyclic ordered vertices p_i=(x_i,y_i), with p_(n+1)=p_1, signed area A=½Σ_(i=1)^n(x_i y_(i+1)−x_(i+1)y_i). For a simple polygon ordinary area=|A|

n vertex count; x_i,y_i Cartesian coordinates; A oriented algebraic area.

General mathematical computation on synthetic or authorised inputs; no empirical benefit claimed.

Assumptions — Finite planar coordinates and cyclic boundary order; simple polygon required for ordinary enclosed area; use exact or suitably controlled accumulation.

Limitations — O(n) time and O(1) extra space; self-crossing walks give algebraic rather than union area; cancellation and overflow may affect floating-point calculations; zero alone does not certify degeneracy or simplicity.

Mechanism — Scalar geometric diagnostic, not a separately counted distinct algorithm

Source — Ohio State Ximera, Green’s Theorem as a planimeter, shoelace formula and boundary integral derivation; signed convention corroborated by Jeff Erickson Illinois winding-number search excerpt (direct page blocked); https://ximera.osu.edu/mooculus/calculus3/master/greensTheorem/digInGreensTheoremAsAPlanimeter

## Ramer–Douglas–Peucker polyline simplification (ramer-douglas-peucker-polyline)

> For ordered planar vertices p_i,…,p_j with j≥i+2, d_max=max_{i<k<j} min_{0≤t≤1} ||p_k−((1−t)p_i+t p_j)||₂. Split at first maximizing k if d_max>ε; otherwise replace subchain by endpoint chord (ε≥0). Return empty or singleton unchanged, adjacent endpoints directly

p_i,p_j chord endpoints; p_k interior vertex; t segment parameter; ε nonnegative distance tolerance; d_max maximal finite-segment deviation.

General mathematical computation on synthetic or authorised inputs; no empirical benefit claimed.

Assumptions — Finite ordered planar vertices, finite nonnegative tolerance; exact or controlled point-to-segment comparisons; zero-length chord distance is point distance.

Limitations — O(n²) worst-case time, O(n log n) balanced splits, O(n) stack/output; does not guarantee topology, minimal retained vertices or a Fréchet bound; output may self-intersect.

Mechanism — Recursive maximum-deviation simplification, not closest-pair minimization or a scalar diagnostic

Source — RPI CSCI 4560/6560 Spring 2026 Lecture 23, recursive split and complexity parsed; PostGIS ST_Simplify documentation on endpoint preservation and invalid output; finite-segment convention explicitly chosen; original Ramer and Douglas–Peucker papers not reviewed; https://www.cs.rpi.edu/~cutler/classes/computationalgeometry/S26/lectures/23_curves_polyline_simplification_sprouts.pdf

## Jarvis gift-wrapping convex hull (jarvis-gift-wrapping-convex-hull)

> For distinct planar points P, orient(a,b,c)=(b_x−a_x)(c_y−a_y)−(b_y−a_y)(c_x−a_x). Start at lexicographically least a; choose b≠a with orient(a,b,c)≥0 for every c∈P, using the farthest collinear supporting candidate. Repeat until returning to start; return unique extreme vertices without repeated closing point

P finite point set; a current extreme; b next extreme; c scanned point; n unique point count; h extreme vertex count; orient signed cross product.

General mathematical computation on synthetic or authorised inputs; no empirical benefit claimed.

Assumptions — Finite Cartesian points, deduplicate first, exact or reliably controlled orientation and squared-distance comparisons; empty and singleton sets return directly; collinear sets return their two extreme endpoints.

Limitations — O(nh) wrapping comparisons after deduplication (sorting-based deduplication adds O(n log n)); worst case quadratic; collinear edge-interior points deliberately omitted; rounding can cause wrong choices or failure to close.

Mechanism — Output-sensitive supporting-edge walk; alternative convex-hull construction grouped as variant of Andrew, not independent mathematical output

Source — Princeton COS226 Jarvis' March (indexed excerpt; direct fetch forbidden), output-sensitive wrapping; TU Wien Daniel Scherzer, Computational Geometry, Jarvis slides including collinearity and rounding (page image reviewed). Farthest-tie rule is explicit specification convention. https://www.cg.tuwien.ac.at/courses/ARTR/slides/ComputationalGeometry.pdf

## Ear-clipping polygon triangulation (ear-clipping-polygon-triangulation)

> For a simple counterclockwise polygon, clip consecutive vertices (a,b,c) when orient(a,b,c)>0 and no other active vertex q satisfies orient(a,b,q)≥0, orient(b,c,q)≥0, orient(c,a,q)≥0 simultaneously. Remove b, emit abc, and finish with the last triangle; number of triangles = n−2

n original vertex count; a,b,c consecutive active vertices; q another active vertex; orient(u,v,w)=(v_x−u_x)(w_y−u_y)−(v_y−u_y)(w_x−u_x).

General mathematical computation on synthetic or authorised inputs; no empirical benefit claimed.

Assumptions — One simple nonzero-area planar polygon, no holes, distinct vertices, no three vertices collinear (restricted general-position version); normalize clockwise input by reversal; robust predicates; n≥3.

Limitations — Naive repeated exhaustive ear scans take O(n³) time, O(n) additional storage including output; maintained ear bookkeeping can reduce time to O(n²) but is not specified here; no guarantee of mesh quality or Delaunay property; degeneracies outside scope.

Mechanism — Constructs a triangulation of an existing simple polygon through successive ear deletion; not hull construction or point containment

Source — Godfried Toussaint, Triangulations and Arrangements (1993), lecture notes archived by UC Irvine, two-ear theorem and naive cubic ear cutting; Hacettepe University Polygon Triangulation lecture, 28 January 2026, ear algorithm. https://www-dev.ics.uci.edu/~eppstein/junkyard/godfried.toussaint.html

## Cohen–Sutherland rectangular segment clipping (cohen-sutherland-segment-clipping)

> For rectangle R=[l,u]×[d,v], C(p)=1·[p_x<l]+2·[p_x>u]+4·[p_y<d]+8·[p_y>v]. Accept if C(a) OR C(b)=0; reject if C(a) AND C(b)≠0; otherwise choose an outside endpoint and one set bit, replace that endpoint by a+t(b−a), where t=(z−a_j)/(b_j−a_j) for the indicated coordinate j and boundary z; repeat

a,b ordered segment endpoints; l,u horizontal limits; d,v vertical limits; p point; [condition] indicator; j coordinate; z boundary coordinate; t segment parameter; OR and AND bitwise operations.

General mathematical computation on synthetic or authorised inputs; no empirical benefit claimed.

Assumptions — Finite Cartesian endpoints and l<u, d<v; closed axis-aligned rectangle; exact or reliably controlled predicates and intersection arithmetic; fixed bit priority left, right, bottom, top; zero-length segments handled by trivial tests.

Limitations — Constant number of clipping steps for four fixed half-planes in exact arithmetic; arithmetic cost depends on representation; floating-point rounding may cause inconsistent boundary classifications; no arbitrary polygon or open-boundary support.

Mechanism — Bit-coded half-plane rejection and endpoint refinement for a single segment; not pairwise segment-intersection enumeration or polygon clipping

Source — Carnegie Mellon University, Computer Graphics 15-462, 12 September 2001, slides 28–32 (extracted text and page image for slides 31–32 reviewed). Explicit boundary, bit-priority and point-contact conventions supplied by this specification. https://www.cs.cmu.edu/~jkh/462_f02/slides/07_viewing.pdf

## Sutherland–Hodgman convex-window polygon clipping (sutherland-hodgman-convex-window-clipping)

> For each directed counterclockwise window edge (a,b), let f(q)=orient(a,b,q)=(b_x−a_x)(q_y−a_y)−(b_y−a_y)(q_x−a_x). For consecutive cyclic subject vertices s,t, emit intersection s+f(s)/(f(s)−f(t))·(t−s) if inside states differ, then emit t if f(t)≥0; feed the output to the next window edge

a,b window edge endpoints; s,t current subject edge endpoints; q point; f oriented half-plane predicate; n initial subject vertex count; m window vertex count.

General mathematical computation on synthetic or authorised inputs; no empirical benefit claimed.

Assumptions — Finite ordered simple convex subject and strictly convex window, both positive area, no holes or repeated vertices; normalize both counterclockwise; exact or reliably controlled orientation and intersection arithmetic; boundary included during clipping.

Limitations — Single convex output only; this specification discards zero-area contact, not a full set-valued intersection for line or point contacts; no concave subject or window support. With at most n+i vertices after i clipping stages, naive time O(mn+m²) and working storage O(n+m), excluding input validation; arithmetic cost depends on representation.

Mechanism — Repeated polygon half-plane intersection with vertex-list reconstruction; distinct output and procedure from endpoint segment clipping or winding-number containment

Source — Carnegie Mellon University, Computer Graphics 15-462, 12 September 2001, slides 33–36 (extracted text and page image reviewed); four transition rules and convex clipping window generalization. Convex subject restriction and zero-area discard are explicit catalogue conventions. https://www.cs.cmu.edu/~jkh/462_f02/slides/07_viewing.pdf

## Bresenham integer line rasterization (bresenham-integer-line-rasterization)

> Let A=|x₁−x₀|, B=|y₁−y₀|, a=max(A,B), b=min(A,B). In normalized major/minor coordinates (u,v)=(0,0), set D=2b−a. Emit (u,v); while u<a, if D≥0 set (u,v,D)←(u+1,v+1,D+2(b−a)), otherwise set (u,v,D)←(u+1,v,D+2b); emit after each step. Invert the axis swap and direction signs and add the start point

(x₀,y₀),(x₁,y₁) ordered integer endpoints; A,B absolute coordinate differences; a,b major and minor lengths; u,v normalized offsets; D doubled implicit midpoint decision.

General mathematical computation on synthetic or authorised inputs; no empirical benefit claimed.

Assumptions — Integer pixel centers on a square Cartesian lattice; exact integer arithmetic; select x as major axis on equal magnitudes; normalize directions independently using the signs of endpoint differences; a=0 returns the single endpoint; ties select the diagonal in normalized coordinates.

Limitations — O(a+1) time and O(1) working state excluding O(a+1) output; fixed-width overflow must be avoided; no antialiasing, fractional endpoints, or all-touched-pixel guarantee; reversing endpoint order can change tie pixels.

Mechanism — Incremental integer midpoint decision for a linear primitive, generating a connected nearest-minor-coordinate lattice path; distinct from continuous segment clipping

Source — Brandeis University, CS155, Drawing 2D Primitives, Lecture 02, PDF pp. 4–5 (text and slide images reviewed); doubled midpoint recurrence and octant symmetry. Tie convention follows pseudocode, not the preceding slide's strict-positive diagonal rule. https://www.cs.brandeis.edu/~cs155/Lecture_02_6.pdf

## Midpoint circle rasterization (midpoint-circle-rasterization)

> Let F(x,y)=x²+y²−r². Start at (x,y)=(0,r), d=1−r. While x≤y, emit the distinct signed permutations of (x,y) translated by the center. Using old coordinates, if d<0 update (x,y,d)←(x+1,y,d+2x+3), else update (x,y,d)←(x+1,y−1,d+2(x−y)+5). Here d=F(x+1,y−1/2)−1/4

r integer radius; x,y nonnegative octant offsets; d integer midpoint decision; F implicit circle function; (cₓ,cᵧ) integer center.

General mathematical computation on synthetic or authorised inputs; no empirical benefit claimed.

Assumptions — Square Cartesian integer lattice and integer center, r≥0; exact integer arithmetic; plot only while x≤y; suppress duplicate signed permutations at axes and diagonal; r=0 produces the center alone.

Limitations — O(r+1) time and O(1) working state excluding O(r+1) output if each symmetry orbit is deduplicated locally; no filled disk, antialiasing, noninteger radius or anisotropic pixel support; not a guarantee of globally minimum radial error; fixed-width overflow must be avoided.

Mechanism — Nonlinear circle midpoint decision with coordinate-dependent increments and eightfold symmetry, distinct primitive and recurrence from linear rasterization; shared midpoint principle is not a claim of independent scientific novelty

Source — Brandeis University, CS155, Drawing 2D Primitives, Lecture 02, PDF pp. 5–6 (text and slide images reviewed); circle implicit equation, integer midpoint update and eightfold symmetry. Octant stopping and local deduplication explicitly specified here. https://www.cs.brandeis.edu/~cs155/Lecture_02_6.pdf

## Liang–Barsky parametric segment clipping (liang-barsky-parametric-segment-clipping)

> For a=(x₀,y₀), b=(x₁,y₁), d=b−a and rectangle [L,R]×[B,T], set p=(−dₓ,dₓ,−dᵧ,dᵧ), q=(x₀−L,R−x₀,y₀−B,T−y₀). If any pᵢ=0 with qᵢ<0 reject. Otherwise ℓ=max({0}∪{qᵢ/pᵢ:pᵢ<0}), u=min({1}∪{qᵢ/pᵢ:pᵢ>0}). Reject if ℓ>u; else return (a+ℓd,a+ud)

a,b ordered segment endpoints; d displacement; L,R,B,T inclusive rectangle bounds; p,q four coefficient pairs; ℓ,u feasible parameter limits.

General mathematical computation on synthetic or authorised inputs; no empirical benefit claimed.

Assumptions — Finite planar coordinates, L≤R and B≤T; closed rectangle and closed segment; exact arithmetic in mathematical definition; zero-length segments and degenerate rectangles allowed.

Limitations — Constant time and working storage for four inequalities; floating-point near-parallel or boundary comparisons can be unstable; no arbitrary nonconvex clip regions or measured performance advantage; identical returned endpoints represent a point.

Mechanism — Parameter-interval clipping replaces repeated outcode endpoint replacement, but computes the same closed rectangular segment intersection as Cohen–Sutherland; classified as a variant, not additional independent scientific evidence

Source — University at Buffalo, CSE 480/580, Lecture 9, slides 6–8 (page images reviewed): parametric inequalities and interval updates. Slide 7–8 left coefficient sign inconsistency and missing parallel skip in pseudocode resolved algebraically from slide 6. https://cse.buffalo.edu/faculty/walters/cs480/NewLect9.pdf

## Scanline even–odd polygon filling (scanline-even-odd-polygon-fill)

> For each selected integer row y, take every polygon edge (a,b) with min(aᵧ,bᵧ)≤y<max(aᵧ,bᵧ), and compute x=aₓ+(y−aᵧ)(bₓ−aₓ)/(bᵧ−aᵧ). Sort the resulting multiset x₁≤…≤x₂ₖ. Emit all integer pixel centers (x,y) with x₂ⱼ₋₁≤x<x₂ⱼ for j=1,…,k

a,b adjacent vertices; x,y Cartesian pixel-center coordinates; k half the crossing count; n polygon edge count; H number of selected rows; M number of emitted pixels.

General mathematical computation on synthetic or authorised inputs; no empirical benefit claimed.

Assumptions — Simple closed nonzero-area polygon with finite vertices, implicit closing edge and no zero-length edges; integer pixel centers; horizontal edges excluded; lower-inclusive upper-exclusive edge activity and left-inclusive right-exclusive spans are explicit catalogue conventions; retain multiplicity of coincident crossings.

Limitations — Direct per-row intersection and sorting costs O(Hn log(n+1)+M) time and O(n) working memory excluding output; no active-edge-table performance claim; boundary rule is not closed-set containment; no antialiasing, holes or self-intersections in this specification; floating-point ordering near vertices requires care.

Mechanism — Rowwise sorted edge intersections produce raster spans rather than evaluating individual point winding numbers; parity is related to containment but scanline batching and raster boundary policy are distinct computational procedures

Source — Harriet Fell, Northeastern University CS 4300, Lecture 9, September 2011, slides 5–10 (extracted text reviewed; page-image requests returned HTTP 429). Parity and paired crossing approach; direct recomputation and lower-inclusive/left-inclusive boundary rules explicitly specified here rather than reproducing the lecture's endpoint preprocessing. https://www.khoury.northeastern.edu/home/fell/CS4300/Lectures/CS4300F2011-9-ScanLineFill.pdf

## Chaikin corner-cutting subdivision (chaikin-corner-cutting)

> For a cyclic ordered polygon P₀,…,Pₘ₋₁, m≥3, set Q₂ᵢ=(3Pᵢ+Pᵢ₊₁)/4 and Q₂ᵢ₊₁=(Pᵢ+3Pᵢ₊₁)/4 for i=0,…,m−1, with indices modulo m; repeat on Q for k≥0 refinement rounds

P,Q input and refined vector-valued control polygons; m input vertex count; i cyclic vertex index; k number of rounds.

General mathematical computation on synthetic or authorised inputs; no empirical benefit claimed.

Assumptions — Finite real coordinates in a common dimension d≥1; ordered closed polygon with implicit closure, not a repeated closing vertex; repeated or coincident vertices permitted; finite nonnegative integer refinement count.

Limitations — Output size m·2^k and O(d m·2^k) arithmetic and storage for k≥1; limit is a periodic uniform quadratic B-spline, not generally an interpolant of the initial vertices; finite refinement is a polyline, not an exact smooth curve; no topology preservation or tolerance guarantee claimed.

Mechanism — Repeated local corner-cutting creates a refined control polygon rather than evaluating a spline at a query point as de Boor does; related quadratic spline limit does not imply independent empirical evidence.

Source — Neil Dodgson, University of Cambridge, Advanced Graphics Lecture Notes (2014), printed pp. 28–29, equations 46–47 and figure 14; text and page images reviewed. Periodic closure is explicitly fixed here. https://www.cl.cam.ac.uk/teaching/1314/AdvGraph/NADnotes14.pdf

## De Casteljau Bézier curve subdivision (de-casteljau-bezier-subdivision)

> For degree n≥0 Bézier control points Pᵢ⁰=Pᵢ and split s∈[0,1], compute Pᵢʳ=(1−s)Pᵢʳ⁻¹+sPᵢ₊₁ʳ⁻¹ for r=1,…,n and i=0,…,n−r. Left Lⱼ=P₀ʲ and right Rⱼ=Pⱼⁿ⁻ʲ for j=0,…,n; their Bernstein curves satisfy B_L(t)=B_P(st) and B_R(t)=B_P(s+(1−s)t) for t∈[0,1]

n polynomial degree; Pᵢʳ level-r interpolation points; s split parameter; L,R ordered control vectors; t local parameter; B Bernstein polynomial curve.

General mathematical computation on synthetic or authorised inputs; no empirical benefit claimed.

Assumptions — Finite real vector coordinates of common dimension d≥1; nonrational polynomial Bézier curve; s in the closed unit interval, n≥0; repeated vertices permitted; endpoint splits yield one constant segment.

Limitations — O(d n²) arithmetic and O(d(n+1)) storage with rolling rows and two boundary chains; subdivision preserves the polynomial exactly in exact arithmetic, not necessarily bitwise under rounding; no rational weights or adaptive error criterion in scope.

Mechanism — Reuses the exact registered de Casteljau interpolation triangle, returning boundary control polygons instead of only the evaluated point; classified as a variant, not an independent algorithm.

Source — Ching-Kuang Shene, Michigan Technological University, Subdividing a Bézier Curve; page text reviewed, left and reversed right boundary chains and parameter subintervals. https://pages.mtu.edu/~shene/COURSES/cs3621/NOTES/spline/Bezier/bezier-sub.html

## Median-split k-d tree nearest-neighbor search (kd-tree-axis-median-nearest-neighbor)

> For a finite nonempty indexed set P in R^d, choose split axis a = depth mod d and median pivot p under the order (coordinate a, record ID); recursively store the lower and upper rank halves. For query q minimize D(x) = sum_j (x_j - q_j)^2 over P; inspect each pivot, visit the nearer split side first, and prune the opposite side only when (q_a - p_a)^2 > D(best). For equal distances choose the smaller record ID.

P indexed points, d positive dimension, a split axis, p pivot, q query, D squared Euclidean distance, best incumbent..

General mathematical computation on synthetic or authorised inputs; no empirical benefit claimed.

Assumptions — Finite nonempty static points and query of the same positive dimension; unique comparable record IDs; exact arithmetic or conservative distance bounds; rank tie splitting permits equal coordinates in both children..

Limitations — Worst-case query visits all n pivots, O(nd) arithmetic; high dimensions and clustered data can reduce pruning. Sorting separately at each node costs O(n log^2 n) comparisons for fixed dimension; no average-case speed guarantee..

Mechanism — Coordinate-median indexing and exact branch-and-bound query are distinct from pairwise closest-pair computation and nearest-neighbour regression, which estimates a response; this entry specifies a single exact neighbour search, not a statistical estimator.

Source — Cornell University, CS4780 (2017), Lecture 16: KD Trees, text reviewed, axis-aligned recursive splitting and split-wall lower bound. https://www.cs.cornell.edu/courses/cs4780/2017sp/lectures/lecturenote16.html ; pivot storage, squared Euclidean bound and deterministic ID ties specified locally.

## Point-region quadtree spatial partition (point-region-quadtree-partition)

> For a half-open square cell C = [l_x,u_x) × [l_y,u_y), define m_j = (l_j+u_j)/2 and child index b = 1[x ≥ m_x] + 2·1[y ≥ m_y]. Store records in a leaf when occupancy n ≤ B or depth h ≥ H; otherwise recursively partition into the four disjoint midpoint children, assigning every record to its unique child.

C root or child cell, l and u bounds, m midpoint, B positive bucket capacity, H finite nonnegative maximum depth, h current depth, n occupancy, b quadrant index..

General mathematical computation on synthetic or authorised inputs; no empirical benefit claimed.

Assumptions — Finite planar indexed points inside a positive-width half-open root square; B ≥ 1 and integer H ≥ 0; exact midpoint arithmetic or explicit failure on unrepresentable midpoint; duplicate coordinates retained as separate records..

Limitations — Terminal leaves at maximum depth may exceed capacity. Worst-case construction performs O(n(H+1)) record assignments and stores O(1+nH) nodes with explicit empty children for H ≥ 1; large depth and clustered points increase memory. This bounded bucket policy generalizes capacity-one PR decomposition..

Mechanism — Fixed midpoint four-way key-space partition differs from rank-based binary k-d tree; finite depth and bucket rules are documented rather than counted as additional methods.

Source — Virginia Tech OpenDSA, CS5040 (2021), section 18.3 The PR Quadtree, text reviewed: fixed midpoint subdivision and configurable bucket occupancy. https://opendsa.cs.vt.edu/ODSA/Books/vt/cs5040/spring-2021/TR_200_CRNs_13282_13283/html/PRquadtree.html ; half-open ownership, finite depth and duplicate retention explicitly specified locally.

## Convex polygon separating-axis intersection test (convex-polygon-separating-axis-test)

> For two full-dimensional closed convex planar polygons P,Q, take every nonzero edge normal a from both polygons. Set I_P(a)=[min_{p in P} a·p,max_{p in P} a·p] and likewise I_Q(a). Declare disjoint iff at least one axis has max I_P < min I_Q or max I_Q < min I_P; otherwise report intersection including boundary contact.

P,Q ordered convex polygon vertices; a nonzero perpendicular to an edge; I_P,I_Q scalar projection intervals..

General mathematical computation on synthetic or authorised inputs; no empirical benefit claimed.

Assumptions — Finite vertices in cyclic boundary order of simple closed convex polygons with positive area, no zero-length edges, exact comparisons or an explicitly justified robust predicate; either orientation is permitted..

Limitations — Direct projection costs O((m+n)^2) arithmetic for m,n vertices; not valid for arbitrary nonconvex polygons; no contact manifold or penetration depth returned..

Mechanism — Projection interval feasibility decides closed-set intersection without constructing the clipped polygon; distinct from Sutherland–Hodgman boundary construction. Use signed dot products, not absolute projection magnitudes; multiplying by a positive axis scale does not change interval separation.

Source — Michael Lugo, Fun with the Separating Axis Theorem, Virginia Tech, text reviewed; Kansas State University CIS 580, Separating Axis Theorem, text reviewed: both polygons' edge normals and projection intervals. https://personal.math.vt.edu/mrlugo/sat.html ; https://textbooks.cs.ksu.edu/cis580/04-collisions/04-separating-axis-theorem/index.html

## Minimum enclosing disk by support enumeration (minimum-enclosing-disk-support-enumeration)

> For nonempty finite P in R², minimize r² over c∈R² and r≥0 with ||p−c||² ≤ r² for all p∈P. Enumerate singleton disks (c,r²)=(p,0), pair disks with c=(p+q)/2 and r²=||p−q||²/4, and noncollinear triple circumdisks with 2(q−p)·c=||q||²−||p||² and 2(s−p)·c=||s||²−||p||², r²=||c−p||². Retain containing disks and minimize r².

P finite planar points, c disk center, r nonnegative radius, support of size one to three..

General mathematical computation on synthetic or authorised inputs; no empirical benefit claimed.

Assumptions — Finite nonempty planar input, Euclidean metric, exact arithmetic or robust containment and collinearity tests; duplicate points allowed..

Limitations — O(n^4) arithmetic for exhaustive candidate generation and containment; not the randomized Welzl algorithm; near-collinearity may amplify floating-point error..

Mechanism — Exhaustive support enumeration is distinct from maximum pairwise distance, which provides only a lower bound on the enclosing diameter. A minimum disk center lies in the convex hull of its active boundary points (otherwise a separating direction reduces the maximum radius); a planar convex hull certificate needs at most three active points. No claim of randomized linear-time implementation.

Source — CGAL 6.2.1 Bounding Volumes, Min_circle_2 class reference, text reviewed: support of at most three boundary points, including duplicates and degenerate cases. https://doc.cgal.org/latest/Bounding_volumes/classCGAL_1_1Min__circle__2.html ; exhaustive enumeration and optimality argument independently derived here, not CGAL's Welzl implementation.

## Convex polygon Minkowski sum by edge merge (convex-polygon-minkowski-edge-merge)

> P⊕Q={p+q:p∈P,q∈Q}. For two CCW strictly convex polygon vertex cycles rotated to start at their lowest-y then lowest-x vertex, merge their cyclic edge vectors by increasing polar angle in [0,2π), summing co-directed vectors at equal angles. Starting at the sum of the first vertices, cumulatively add the merged edges, omitting the repeated closing vertex.

P,Q closed convex planar polygons; p,q points; ⊕ set addition; edge vectors in angular order.

General mathematical computation on synthetic or authorised inputs; no empirical benefit claimed.

Assumptions — Positive-area simple convex inputs in CCW order with no zero-length or redundant collinear edges; exact angular ordering or robust half-plane and cross-product comparison..

Limitations — O(m+n) arithmetic comparisons and output size for already valid ordered convex polygons; does not cover arbitrary nonconvex sums or input validation cost..

Mechanism — Constructs a set sum by merging edge directions rather than testing separation or constructing a single point-set hull. Support functions add, and exposed faces in any common direction add; co-directed edges therefore combine. Opposite directions must not be treated as ties.

Source — Ron Wein et al., CGAL 6.2, 2D Minkowski Sums user manual, section Computing the Minkowski Sum of Two Polygons, text reviewed: convex edge ordering, bottommost start and linear merge. https://doc.cgal.org/6.2/Minkowski_sum_2/index.html ; tie-breaking and robust angle comparator explicitly specified here.

## Uniform polygon area centroid (polygon-area-centroid-first-moment)

> For a simple polygon with cyclic vertices (x_i,y_i), let d_i=x_i y_(i+1)−x_(i+1)y_i, A=(1/2)Σ_i d_i. For A≠0 the area centroid is C=(Σ_i (x_i+x_(i+1))d_i, Σ_i (y_i+y_(i+1))d_i)/(6A).

A signed area; d_i signed edge cross product; C uniform area centroid; indices cyclic..

General mathematical computation on synthetic or authorised inputs; no empirical benefit claimed.

Assumptions — Simple closed finite planar polygon with nonzero area and uniform areal density; no holes in this specification; either orientation..

Limitations — O(n) arithmetic; near-zero signed area and cancellation can degrade floating-point accuracy; centroid may lie outside a concave polygon and is not generally the vertex average..

Mechanism — First-moment summary extends the shoelace area computation; diagnostic rather than a distinct algorithm. Signed origin-edge triangles have area d_i/2 and centroid (v_i+v_(i+1))/3, so their signed moments sum even for concave simple polygons. Reversing orientation reverses numerator and denominator together.

Source — Eric W. Weisstein, Polygon Centroid, MathWorld, equations (1)–(2), text reviewed: coordinate-weighted cross products divided by six times signed area. https://mathworld.wolfram.com/PolygonCentroid.html ; signed triangle first-moment derivation independently checked.

## Welzl randomized minimum enclosing disk (welzl-randomized-minimum-enclosing-disk)

> For finite planar P in uniformly random order and forced boundary R, |R|≤3, W(P,R) is the smallest disk containing P with every r∈R on its boundary. For p last in P let D=W(P\{p},R); return D if ||p−c_D||²≤r_D², otherwise W(P\{p},R∪{p}). At P=∅ or |R|=3 use the constrained support disk: empty sentinel for |R|=0, zero radius for |R|=1, diameter for two distinct points, circumdisk for three noncollinear points.

P ordered remaining points; R forced boundary set; p last point; c_D center and r_D radius of nonempty disk; W constrained subproblem.

General mathematical computation on synthetic or authorised inputs; no empirical benefit claimed.

Assumptions — Finite nonempty planar Euclidean root input, R initially empty; uniform random permutation and exact or robust closed containment and support construction. Empty sentinel contains no point. Duplicate coordinates cannot be added twice to R; reachable three-point supports are noncollinear under exact predicates..

Limitations — Expected O(n) arithmetic for fixed planar dimension and uniform random order; no deterministic linear-time guarantee. Index-based recursion uses O(n) stack; copying prefixes can increase cost. Near-collinearity requires robust arithmetic..

Mechanism — Randomized incremental variant for the same enclosing disk objective. Forced boundary is not an unconstrained smallest-disk problem: an obtuse three-point forced support requires its circumdisk, not the longest-edge diameter. For nonempty R, restrict centers to its affine equal-distance locus; containment inequalities are linear in the center and radius squared is the squared distance to a fixed support. An added violating constraint must be tight at the new optimum. Empty support is a sentinel, not a disk centered at an arbitrary origin.

Source — Emo Welzl (1991), Smallest enclosing disks (balls and ellipsoids), LNCS 555, pp. 359–370, publisher abstract reviewed (expected linear time), https://doi.org/10.1007/BFb0038202 ; Brown University, Linear Algebra with Mathematica, Part 7, Erect the Fence, recursion and constrained base cases reviewed, https://www.cfm.brown.edu/people/dobrush/cs52/Mathematica/Part7/fence.html ; original full text unavailable.

## Convex polygon fan binary point location (convex-polygon-fan-binary-point-location)

> For strictly convex CCW vertices v_0,...,v_(n−1), define orient(a,b,c)=(b−a)×(c−a). Let L=orient(v_0,v_1,q), U=orient(v_0,v_(n−1),q). Reject if L<0 or U>0. If L=0 or U=0 test closed segment membership on the corresponding extreme ray, using (q−v_0)·(q−v_j)≤0. Otherwise binary search for the largest i∈[1,n−2] with orient(v_0,v_i,q)≥0 and accept iff orient(v_i,v_(i+1),q)≥0.

v_i cyclic ordered vertices; n vertex count; q query; orient signed cross product; L,U extreme-ray tests; j extreme vertex index; i fan sector.

General mathematical computation on synthetic or authorised inputs; no empirical benefit claimed.

Assumptions — Strictly convex positive-area CCW polygon with n≥3, no repeated vertices or collinear consecutive edges; finite points and robust exact orientation and dot-product signs. Any cyclic anchor v_0 is valid for this strict convex version..

Limitations — O(log n) arithmetic comparisons per query after ordered polygon preparation and validity checks; O(n) vertex storage. Does not handle concave polygons; finite extreme-ray membership and exact boundary comparisons are essential..

Mechanism — Restricted convex point-membership variant of general polygon winding classification. Strict convexity orders anchor rays in an angle interval smaller than π; the cross-product predicate changes sign once for an interior wedge query. Each fan triangle is bounded by those rays and one outer edge, so only that edge remains to be tested. Finite-segment checks prevent accepting ray extensions beyond either endpoint.

Source — Algorithms for Competitive Programming, Check if point belongs to the convex polygon in O(log N), algorithm and implementation text reviewed, https://cp-algorithms.com/geometry/point-in-convex-polygon.html ; Texas A&M University, J. Chen, Chapter 6 Prune and Search, §6.2.1 p. 97, interior-anchor fan search and complexity cross-checked, https://people.engr.tamu.edu/j-chen3/courses/620/2025/Lectures/ch6.pdf ; extreme-ray and arbitrary vertex anchor conventions independently derived.

## Kirkpatrick–Seidel output-sensitive convex hull (kirkpatrick-seidel-output-sensitive-convex-hull)

> For planar P with distinct x coordinates, construct upper chains U(S). If |S|≤2 return points in increasing x. Otherwise choose a strictly between the two central split coordinates, and let (u,v) be the upper supporting edge with u_x<a<v_x. Then U(S)=U({p∈S:p_x≤u_x}) concatenated with U({p∈S:p_x≥v_x}). Reflect y to obtain lower chain, reverse it and join without repeating extrema. To find the bridge, pair points p,q with p_x<q_x; K is the median pair slope k=(q_y−p_y)/(q_x−p_x). Let C=argmax_{p∈S}(p_y−K p_x) and u=min_x C,v=max_x C. If u_x<a<v_x return (u,v); if v_x<a discard the left member of pairs with k≥K; if u_x>a discard the right member of pairs with k≤K; retain all others and any unpaired point, then repeat. With two remaining points return them in increasing x.

P input; S current subset; a split abscissa; n input size; h extreme vertex count; p,q paired points; k pair slope; K median slope; C support contacts; u,v bridge endpoints; U upper chain.

General mathematical computation on synthetic or authorised inputs; no empirical benefit claimed.

Assumptions — Finite planar coordinates with distinct x values and no three collinear; exact or robust slope, support and orientation comparisons. Choose the split between adjacent central order statistics, including for odd sizes; no input point is on the split. Empty and singleton inputs return directly.

Limitations — Worst-case O(n log h) arithmetic for h≥2 with worst-case linear selection for both median operations and linear partitioning; O(n) space with appropriate storage management. Sorting at each selection does not establish that bound. Duplicate abscissae and collinear triples are excluded here; arithmetic bit complexity and precision are separate.

Mechanism — Output-sensitive alternative to Andrew, Graham and Jarvis for the same extreme hull objective. Support contact abscissae move left as slope increases; if all contacts are left of the split then K exceeds the bridge slope, so the left point of each pair of slope at least K cannot be a bridge endpoint (its partner would lie above the bridge). The right-contact case is symmetric. A constant fraction is eliminated up to rounding; the two hull subproblems each contain at most ceil(n/2) points. The theoretical bound is from the published algorithm, not measured runtime.

Source — D. G. Kirkpatrick and R. Seidel (1986), The Ultimate Planar Convex Hull Algorithm?, SIAM Journal on Computing 15(1), 287–299, Algorithms 2.1 and 3.1 and Lemmas 3.2–3.3 reviewed in Stanford-hosted paper, pp. 289 and 292 page images reviewed. https://doi.org/10.1137/0215021 ; https://graphics.stanford.edu/courses/cs268-16-fall/Notes/KirkSeidel.pdf ; strict split and general-position restriction are catalogue conventions.

## Pick lattice polygon area identity (pick-lattice-polygon-area-identity)

> For a simple positive-area lattice polygon without holes, A=I+B/2−1 where I counts strict interior integer lattice points and B counts distinct boundary lattice points. For cyclic integer vertices p_i=(x_i,y_i), B=Σ_i gcd(|x_(i+1)−x_i|,|y_(i+1)−y_i|), using p_(n+1)=p_1.

A unsigned Euclidean area; I strictly interior lattice count; B distinct boundary lattice count; p_i vertices; n vertex count; gcd greatest common divisor.

General mathematical computation on synthetic or authorised inputs; no empirical benefit claimed.

Assumptions — Simple closed polygonal boundary, positive area, integer Cartesian vertex coordinates, no holes and no zero-length edges; both clockwise and counterclockwise order permitted. Count each boundary lattice point once.

Limitations — Constant-time arithmetic given I and B; obtaining I by exhaustive bounding-box enumeration with an O(n) containment test costs O(nWH) where W and H are integer grid counts across the box. Computing B uses n gcd operations. Not applicable to arbitrary real-coordinate, self-intersecting or holed polygons as stated; exact integer arithmetic avoids overflow.

Mechanism — Lattice-area identity used as a diagnostic rather than a separate algorithm. Writing displacement as g times a primitive integer vector, Bezout’s identity implies that lattice locations on the closed edge occur at parameters j/g for j=0,…,g. A half-open edge contributes g locations, so summation counts boundary vertices once. Triangulating into empty lattice triangles yields unit half-area triangles; Euler incidence counting gives the identity. This does not certify polygon validity.

Source — J. Harrison, A formal proof of Pick’s theorem, manuscript received 23 November 2015, statement and simple boundary assumptions reviewed (p. 1 page image and introduction), https://www.cl.cam.ac.uk/~jrh13/papers/pick.pdf ; Algorithms for Competitive Programming, Pick’s Theorem – area of lattice polygons, statement cross-checked, https://cp-algorithms.com/geometry/picks-theorem.html ; boundary gcd formula independently derived.

## Bounded half-plane intersection by angle-sorted deque (bounded-half-plane-intersection-deque)

> For H_i={q:cross(d_i,q)≥c_i}, d_i≠0 and c_i=cross(d_i,a_i), compute P=∩_i H_i. Assume P bounded with positive area. For nonparallel lines i,j their intersection is q=(c_i d_j−c_j d_i)/cross(d_i,d_j). Sort directions cyclically by half-circle and cross-product ordering. Normalize equal directions by positive scaling and retain maximal c. Maintain deque Q: before adding h, pop last while |Q|≥2 and its last adjacent intersection has cross(d_h,q)≤c_h; symmetrically pop first using its first adjacent intersection. If a new adjacent direction gap is at least π, report outside supported domain. Append h. After the sweep repeat back-against-first and front-against-last tests until neither pops. Require at least three lines and every cyclic gap strictly between 0 and π; return cyclic consecutive intersections.

H_i closed half-plane; d_i directed boundary vector; a_i point on boundary; c_i signed offset; cross planar determinant; P feasible polygon; Q deque; h incoming constraint; q boundary intersection.

General mathematical computation on synthetic or authorised inputs; no empirical benefit claimed.

Assumptions — Finite nonzero directions and finite offsets; known bounded positive-area intersection (for example supplied bounding rectangle with a strictly feasible point); exact or robust angular, determinant and side comparisons. Equal directions share positive normalization; opposite directions are not grouped.

Limitations — O(n log n) arithmetic/comparisons and O(n) storage; each constraint enters and leaves the deque at most once. Empty, unbounded or lower-dimensional intersections are outside this contract; domain rejection does not prove emptiness. Exact arithmetic bit complexity and input certification are separate.

Mechanism — Variant of sequential convex-window clipping. Angle order lets redundant boundaries be removed at ends of the active chain. Essential adjacent boundaries of a bounded positive-area polygon turn by less than π; equality at a corner alone creates no edge. Intersection formula follows from Cramer’s rule. No general infeasibility classifier claimed.

Source — Algorithms for Competitive Programming, Half-plane intersection – Sort-and-Incremental algorithm, angle/deque procedure reviewed, https://cp-algorithms.com/geometry/halfplane-intersection.html ; University of New Mexico CS 506, Half Plane Intersection, Duality and Arrangements, Spring 2020, p. 1 page image reviewed for problem and convexity, https://www.cs.unm.edu/~saia/classes/506-s24/lec/halfplane-intersection-and-duality.pdf ; strict pruning and restricted contract independently specified.

## Interval union length by endpoint sweep (interval-union-endpoint-sweep-length)

> For finite closed intervals [l_i,r_i] with l_i≤r_i, sort distinct endpoints x_1<…<x_m. Set c_0=0, c_j=c_(j−1)+#{i:l_i=x_j}−#{i:r_i=x_j}. Union length L=Σ_(j=1)^(m−1)(x_(j+1)−x_j)·1[c_j>0], and L=0 when m≤1.

l_i,r_i ordered endpoints; x_j distinct sorted coordinates; c_j count on open gap to next endpoint; m endpoint count; L Lebesgue length of union.

General mathematical computation on synthetic or authorised inputs; no empirical benefit claimed.

Assumptions — Finite real ordered endpoints and exact or robust comparisons and arithmetic. Empty input and singleton intervals have zero length; tied coordinates processed as one event.

Limitations — O(n log n) sorting and O(n) storage in comparison model. Length alone does not encode component membership or multiplicity. Floating-point differences and sums can lose precision.

Mechanism — Scalar coverage diagnostic. The union differs from disjoint covered open gaps only by finitely many endpoints of measure zero. Active count is constant on each gap, so grouping tied events preserves length including touching and zero-width intervals.

Source — F. P. Preparata and M. I. Shamos, Computational Geometry: An Introduction, section 8.4, p. 332, endpoint-count scan reviewed from Rensselaer Polytechnic Institute-hosted page image, https://www.cs.rpi.edu/~cutler/classes/computationalgeometry/F23/references/Computational_Geometry_An_Introduction.pdf ; Jeff Erickson, Klee’s Measure Problem, University of Illinois, problem and complexity reviewed, https://jeffe.cs.illinois.edu/open/klee.html ; grouped-event convention independently derived.

## Axis-aligned rectangle union area by sweep (rectangle-union-area-sweep-segment-tree)

> For ordered rectangles R_i=[l_i,r_i]×[b_i,t_i], discard zero-area records. Let Y_0<…<Y_m be distinct remaining vertical endpoints. A balanced segment tree on elementary gaps has node v spanning [Y_a,Y_b), canonical-cover count C_v and covered length L_v. Set L_v=Y_b−Y_a if C_v>0, 0 if C_v=0 at a leaf, and L_left+L_right otherwise. At x=l_i insert the vertical interval and at x=r_i delete it by adding ±1 to its maximal fully contained nodes. For distinct consecutive event coordinates x_j,x_(j+1), L_j is the root length after all events at x_j. Union area A=Σ_j (x_(j+1)−x_j)L_j; empty input gives A=0.

R_i rectangle; Y_h compressed coordinate; v tree node; C_v local cover multiplicity; L_v covered length from v and descendants; x_j sweep coordinate; L_j root covered length; A union area.

General mathematical computation on synthetic or authorised inputs; no empirical benefit claimed.

Assumptions — Finite ordered endpoints; exact or robust comparisons and arithmetic; fixed compressed tree; every deletion matches an earlier insertion; duplicate rectangles retain multiplicity.

Limitations — O(n log(n+1)) arithmetic/comparison time and O(n) auxiliary storage for n positive-area rectangles; only scalar area, not union boundary. Bit complexity and rounding separate.

Mechanism — Scalar coverage diagnostic extending interval union length. Each active interval decomposes into disjoint canonical spans. Positive local count covers the whole span; otherwise the children partition it. Induction proves the root invariant. The active set is constant inside each open x slab and rectangle boundaries have zero area.

Source — Jeff Erickson, Klee’s Measure Problem, University of Illinois, 31 July 1998, planar sweep and complexity reviewed, https://jeffe.cs.illinois.edu/open/klee.html ; H. Samet, Hierarchical Representations of Collections of Small Rectangles, ACM Computing Surveys 20(4), 1988, section 2.4 p. 288, parsed text on multiplicity and length reviewed, https://www.cs.umd.edu/users/hjs/pubs/SameCSUR88.pdf ; explicit recurrence and grouped events independently derived.

## Planar orthogonal range tree reporting (planar-orthogonal-range-tree-reporting)

> For n static records p_i=(x_i,y_i,i) with unique identities i, sort by (x_i,i) into positions 0,…,n−1. Build a balanced leaf tree on half-open position intervals; each node stores its descendant records ordered by (y_i,i). For closed B=[a,b]×[c,d], find l=first position with x_i≥a and r=first with x_i>b (n if absent). Decompose [l,r) into disjoint maximal tree intervals. In each associated y list take the slice from first y≥c to first y>d. Return R={i:a≤x_i≤b and c≤y_i≤d}, each identity once. Empty input or empty x slice returns no records.

n record count; i identity; x_i,y_i coordinates; B closed box; l,r rank bounds; R returned identities; k=|R|.

General mathematical computation on synthetic or authorised inputs; no empirical benefit claimed.

Assumptions — Finite static coordinates with consistent total order; unique comparable identities; ordered query bounds a≤b and c≤d; coincident coordinates and zero-width query boxes allowed.

Limitations — O(n log(n+1)) storage and construction by bottom-up merges; query O(log²(n+1)+k) for nonempty input without fractional cascading. No dynamic updates; result order unspecified and sorting costs extra.

Mechanism — Distinct static orthogonal reporting structure, not equivalent to alternating-axis k-d partition or one-dimensional aggregation trees. The primary rank range has O(log(n+1)) disjoint canonical subsets, each queried in its independent y order. Each identity belongs to exactly one selected subset.

Source — M. de Berg, O. Cheong, M. van Kreveld and M. Overmars, Computational Geometry: Algorithms and Applications, 3rd ed., chapter 5 section 5.3, pp. 108–109 page images reviewed for canonical subsets, presorted construction and Theorem 5.8, https://www.cs.cmu.edu/afs/cs/academic/class/15456-s13/Handouts/BKOS.pdf ; rank-based tie handling and sorted-list representation independently specified.

## Centered interval tree stabbing reporting (centered-interval-tree-stabbing-reporting)

> For n closed intervals I_i=[l_i,r_i], choose the upper median m of the 2n endpoint occurrences. Partition into L={i:r_i<m}, M={i:l_i≤m≤r_i}, R={i:l_i>m}. Store M in increasing l_i order and decreasing r_i order, and recurse on L and R. For q<m scan the increasing list while l_i≤q and visit L; for q>m scan the decreasing list while r_i≥q and visit R; at q=m return all M and stop. Empty subtrees return no identities. The result is {i:l_i≤q≤r_i}.

n interval count; i unique identity; l_i,r_i endpoints; m upper median endpoint; L,M,R partition sets; q query; k output size.

General mathematical computation on synthetic or authorised inputs; no empirical benefit claimed.

Assumptions — Finite totally ordered coordinates, l_i≤r_i, static intervals and unique comparable identities; repeated intervals and singleton intervals allowed.

Limitations — O(n) stored references and O(log(n+1)+k) query time; sorting endpoints anew at every node costs O(n log²(n+1)) comparisons; presorted stable partitioning can reduce construction to O(n log(n+1)). No dynamic updates or sorted output guarantee.

Mechanism — Each interval is owned by exactly one crossing node. Both strict child sets have at most floor(n/2) intervals because each contributes two endpoint occurrences on its side of the median. Each query visits one path; a scanned crossing interval needs only the endpoint facing the query, so each successful scan emits one identity.

Source — D. M. Mount, CMSC 754 Computational Geometry lecture notes, University of Maryland, Spring 2012, pp. 117–119, parsed text reviewed for partition, sorted lists and query complexity; https://www.cs.cmu.edu/afs/cs/academic/class/15456-s13/Handouts/cmsc754-lects.pdf ; upper median convention and repeated-sorting bound independently derived.

## Priority search tree three-sided reporting (priority-search-tree-three-sided-reporting)

> For static records p_i=(x_i,y_i,i), assign distinct ranks j_i by sorting (y_i,i). In a nonempty rank-ordered subset S choose p with minimum (x_i,i), store p and the minimum and maximum ranks u,v of S, remove p, and bisect the remaining ordered list into floor((|S|−1)/2) and ceil((|S|−1)/2) records. Recurse. For a≤b let l be the first rank with y≥a and r the first with y>b, using n if absent. For nonempty [l,r), visit a node only if v≥l, u<r and its stored x≤q_x; emit its identity if l≤j_i<r and recurse on both children. Return {i:x_i≤q_x and a≤y_i≤b}.

n record count; i identity; x_i,y_i coordinates; j_i y rank; S node subset; u,v rank extrema; a,b y bounds; l,r rank bounds; q_x x threshold; k output size.

General mathematical computation on synthetic or authorised inputs; no empirical benefit claimed.

Assumptions — Static finite coordinates, unique comparable identities, a≤b; coincident points and tied priority values allowed; all comparisons use consistent total orders.

Limitations — O(n log(n+1)) construction after initial sort by scanning and partitioning each rank-ordered subset; O(n) stored nodes; query O(log(n+1)+k) for nonempty input. Only the stated three-sided predicate; no dynamic update or sorted output guarantee.

Mechanism — Distinct heap-and-balanced-rank partition structure. Rank spans of nodes at a common depth are disjoint, so at most two partially intersecting spans occur per depth. A fully contained visited node passing the heap test emits its own point, and each failed child can be charged to a visited parent. This yields O(log(n+1)+k) visits and one output per matching record.

Source — E. M. McCreight, Priority Search Trees, SIAM Journal on Computing 14(2), 1985, pp. 257–276, abstract reviewed, https://doi.org/10.1137/0214021 ; University of Illinois CS598TMC, Fall 2019, Orthogonal Range Searching notes, pp. 4–5, construction and query analysis reviewed, https://courses.grainger.illinois.edu/cs598tmc/fa2019/lec1to3_ors.pdf ; axes exchanged and rank tie handling independently specified.

## Layered range tree with fractional cascading (layered-range-tree-fractional-cascading)

> For n static planar records with unique identities i, build a balanced leaf tree over ranks sorted by (x_i,i). At node v let A_v contain its descendant records sorted by (y_i,i). For each child c define F_c(t)=|{j:0≤j<t and A_v[j] belongs to c}| for 0≤t≤|A_v|. For closed rectangle [a,b]×[d,e], binary-search the root y list for s=first y≥d and t=first y>e, using n for missing bounds. Traverse the primary x interval using node rank spans, propagating [s,t) to [F_c(s),F_c(t)) in child c. Return the identities in those slices at maximal contained nodes. Empty input or slice yields no records.

n record count; i unique identity; v node; A_v sorted record references; c child; F_c prefix rank map; s,t half-open slice bounds; k output count.

General mathematical computation on synthetic or authorised inputs; no empirical benefit claimed.

Assumptions — Static finite totally ordered coordinates, unique comparable identities, ordered closed bounds a≤b and d≤e; repeated coordinates allowed.

Limitations — O(n log(n+1)) construction and storage using bottom-up merges; O(log(n+1)+k) reporting for nonempty input. No dynamic update or sorted output guarantee. Exact coordinate and identity order must be maintained.

Mechanism — Variant of planar orthogonal range tree reporting. The child list is an order-preserving subsequence of its parent, so the two prefix counts map any half-open slice exactly. At each primary depth at most two nodes straddle the x range boundaries; all other visited nodes terminate or report. One root y search plus constant work per visited node and one unit per reported identity removes the extra logarithmic factor.

Source — E. Demaine, MIT 6.851 Advanced Data Structures, Spring 2012, lecture 3 scribe notes, sections 3.1–3.2, pp. 5–8, parsed text and p. 8 page image reviewed, https://courses.csail.mit.edu/6.851/spring12/scribe/lec3.pdf ; exact prefix-rank and identity tie conventions independently specified.

## Persistent sweep planar point location (persistent-sweep-planar-point-location)

> For nonvertical edge e with ordered endpoints (a,b),(c,d), a<c, define h_e(x)=b+(d−b)(x−a)/(c−a). For consecutive distinct vertex abscissas X_j<X_(j+1), the active set A_j={e:a≤X_j and X_(j+1)≤c} has fixed vertical order in that open slab. Maintain a path-copied balanced search tree T_j for each slab. For X_j<x<X_(j+1) and off-edge query (x,y), find the immediately lower edge (largest h_e(x)<y) in T_j; return its upper incident face, or the unbounded face when no lower edge exists.

(a,b),(c,d) edge endpoints; h_e(x) interpolated height; X_j event coordinates; A_j active edges; T_j persistent root; (x,y) query; n edge count.

General mathematical computation on synthetic or authorised inputs; no empirical benefit claimed.

Assumptions — Finite planar straight-line subdivision with nonvertical edges, no overlapping or crossing interiors, intersections only at shared vertices, distinct abscissas of distinct vertices, and consistent incident face labels. Queries lie in an open slab off all edges. Exact comparisons assumed.

Limitations — O(n log(n+1)) preprocessing time and space using path copying of a balanced search tree with logarithmic update cost; O(log(n+1)) query time. This simple version does not claim the original specialised linear-space bound. Event abscissas, on-edge queries, queries beyond extreme events and general degeneracies are outside scope.

Mechanism — Distinct persistent search structure: unlike intersection reporting or polygon membership, old search roots locate labelled faces of a subdivision. Active edge heights cannot exchange order inside a slab without an intersection. Removing edges in the old order and inserting in the new order preserves the search invariant, and predecessor face labels identify the open vertical interval. Path copying preserves previous roots, using O(log(n+1)) new nodes per update; there are at most two updates per edge.

Source — N. Sarnak and R. E. Tarjan (1986), Planar Point Location Using Persistent Search Trees, Communications of the ACM 29(7), 669–679, https://doi.org/10.1145/6138.6151 ; IBM Research abstract reviewed, https://research.ibm.com/publications/planar-point-location-using-persistent-search-trees ; MIT 6.851 Spring 2012 lecture 3 scribe notes, sections 2.1–2.2, pp. 2–3, parsed text and p. 3 image reviewed, https://courses.csail.mit.edu/6.851/spring12/scribe/lec3.pdf ; restricted path-copying version, predecessor convention and midpoint update rules independently specified; original full paper not reviewed.

## Uniform polygon second area moments (polygon-second-area-moments)

> For CCW simple polygon vertices (x_i,y_i) with cyclic indices, let c_i=x_i y_(i+1)−x_(i+1)y_i. Then M20=Σ_i c_i(x_i²+x_i x_(i+1)+x_(i+1)²)/12, M02=Σ_i c_i(y_i²+y_i y_(i+1)+y_(i+1)²)/12 and M11=Σ_i c_i(2x_i y_i+x_i y_(i+1)+x_(i+1)y_i+2x_(i+1)y_(i+1))/24.

c_i oriented edge determinant; M20=∫_P x² dA, M02=∫_P y² dA, M11=∫_P xy dA; P polygon interior.

General mathematical computation on synthetic or authorised inputs; no empirical benefit claimed.

Assumptions — One simple counterclockwise polygonal boundary with positive area and finite coordinates; uniform unit area density; repeated closing vertex optional, no holes.

Limitations — O(n) arithmetic and O(1) auxiliary storage, excluding input validation. Raw origin-dependent moments have units of length to the fourth power, not normalized or central moments. The mixed moment can be negative; do not take its absolute value. Floating-point cancellation and overflow may occur with large coordinate offsets or near-degenerate polygons.

Mechanism — Diagnostic extending signed polygon area and first moments to raw quadratic integrals, not a new distinct algorithm. On a reference simplex the integrals of the squared barycentric coordinates are 1/12 and of their product 1/24; multiplying by the signed determinant and expanding the monomials gives the edge formulas. Oriented triangle chains sum to the polygon integral even when the origin is outside.

Source — J. Burkardt, polygon_integrals (revised 11 January 2021), Florida State University-hosted documentation, low-order raw moment formulas, https://people.sc.fsu.edu/~jburkardt/m_src/polygon_integrals/polygon_integrals.html ; Bockman (1989) and Steger (1996) listed there, originals not reviewed.

## Affine lower envelope by monotone slope stack (affine-lower-envelope-monotone-stack)

> For lines f_i(x)=m_i x+b_i sorted by strictly decreasing slope after retaining the least intercept per slope, keep an envelope stack with increasing start breakpoints. For new line j and last line i, compute x_ij=(b_j−b_i)/(m_i−m_j); pop i if x_ij≤its start, and repeat; append j with its computed start or −∞ for the first line. Query the last start≤x to obtain min_i f_i(x).

m_i slope; b_i intercept; x_ij crossing; x finite query; n input line count; h retained envelope line count.

General mathematical computation on synthetic or authorised inputs; no empirical benefit claimed.

Assumptions — Nonempty static set of finite affine functions on the entire real axis, exact ordered comparisons; only minimum value required, not every minimizing identity.

Limitations — O(n log(n+1)) sorting and O(n) stack work, O(n) storage, O(log(h+1)) query. Parallel lines with greater intercept are dominated; identical lines and isolated breakpoint-only ties need not retain their identities. No arbitrary insertion, deletion, vertical lines, bounded segments or floating-point robustness guarantee.

Mechanism — Dual monotone convex-hull variant, not a new distinct algorithm: mapping a line to (m,−b) maps lower-envelope segments to the upper hull. A smaller-slope new line beats the last line to the right of their crossing; if that crossing is no later than the last line's start, the last line has no surviving interval. Otherwise the crossing is the new start. Each line is pushed and popped at most once, giving linear stack work.

Source — R. Wein, CGAL 6.2 2D Envelopes user manual, introduction and convex hull with envelopes example, https://doc.cgal.org/6.2/Envelope_2/index.html ; pointwise minimum and point-line duality reviewed. The slope-stack construction, tie rule and query bounds are independently derived here, not claimed to be CGAL's implementation.

## Euclidean remainder greatest common divisor (euclidean-remainder-gcd)

> For nonnegative integers a,b not both zero, gcd(a,b)=gcd(b,a mod b) when b>0; gcd(a,0)=a.

a,b nonnegative integers; mod integer remainder; gcd greatest common divisor.

General mathematical computation on synthetic or authorised inputs; no empirical benefit claimed.

Assumptions — Exact integer arithmetic; at least one nonzero operand.

Limitations — For M=max(a,b)≥1, O(log(M+1)) remainder operations and a constant number of integer registers; bit cost depends on operand length and division implementation. Not a constant-time or factorization algorithm.

Mechanism — Distinct arithmetic algorithm. Writing a=qb+r proves that the common divisor sets of (a,b) and (b,r) agree. Remainders decrease until zero. If r>b/2 then b mod r=b−r<b/2; otherwise r≤b/2 already. Every two steps at least halve a positive divisor. Pick's lattice-area record uses gcd as a primitive, not this computation.

Source — K.-D. Crisman, Number Theory: In Context and Interactive, section 2.3, Algorithm 2.3.3 and proof reviewed, https://math.gordon.edu/ntic/ntic2019/section-euclid-alg.html ; remainder-operation bound independently derived.

## Sieve of Eratosthenes prime enumeration (eratosthenes-prime-sieve)

> For integer N≥2, mark 2,…,N initially; for each still marked p with p²≤N, clear p²,p²+p,…≤N; the marked set P={q∈[2,N]:q is prime}.

N inclusive bound; p candidate divisor; P returned prime set.

General mathematical computation on synthetic or authorised inputs; no empirical benefit claimed.

Assumptions — Exact integer indices; bounded allocation.

Limitations — O(N log log N) indexed word operations asymptotically using the standard prime reciprocal sum bound; O(N) flags plus output storage. Cost is exponential in the bit length of N; no claim of optimality or suitability for isolated large primality queries.

Mechanism — Distinct prime enumeration algorithm. Each cleared value is composite. Every composite c has least prime divisor p≤sqrt(c), so c≥p² and is cleared at p; p itself cannot be cleared by smaller primes. Work is bounded by N plus N times the sum of reciprocals of primes up to sqrt(N); the standard Mertens prime-reciprocal bound gives O(N log log N). This is not independent trial division of each candidate.

Source — M. Beckman, University of Illinois CS 491 CAP, 2019, The Sieve of Eratosthenes transcript, square-root reasoning, square-start marking and asymptotic bound reviewed, https://courses.physics.illinois.edu/cs491cap/fa2019/transcripts/sieve-of-eratosthenes/ ; finite inclusive-bound specification independently derived.
