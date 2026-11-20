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

> P(X=k)=Γ(k+r)/(Γ(r)k!)·(1−p)^k p^r

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

> Set q=ln(10)/400 and g(s)=(1+3q²s²/π²)^(-1/2). Inflate own RD to v=min(350,√(RD²+c²t)). For prior period opponents compute E_j=(1+10^(−g(RD_j)(r−r_j)/400))^(-1), I=q²Σg(RD_j)²E_j(1−E_j). Set RD_new=(v^(-2)+I)^(-1/2) and r_new=r+q RD_new²Σg(RD_j)(S_j−E_j)

r,r_j ratings, RD standard deviations, c process inflation, t elapsed periods, S_j assigned Elo score, j opponent index.

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

Source — doi:10.1093/biomet/39.3-4.324

## Exponentially weighted moving average (ewma)

> S_t=αX_t+(1−α)S_(t−1), S_1=X_1

X_t time-ordered metric, S_t smoothed value, 0<α≤1 smoothing weight, t observations.

Track changes in prior football chance-creation rates, horse sectionals, tennis serve rates, rugby try rates, NFL drive efficiency or darts checkout rates

Assumptions — Fixed observation-step interpretation of decay.

Limitations — Unequal gaps distort real-time decay.

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

Source — Hastie, Tibshirani and Friedman, The Elements of Statistical Learning, 2nd ed., §4.4

## Bayesian change-point detection (changepoint)

> With J_0(0)=1, update J_t(r+1)=J_(t−1)(r)π_r(x_t)(1−H(r+1)) and J_t(0)=Σ_r J_(t−1)(r)π_r(x_t)H(r+1); normalize J_t over run lengths

r run length, J joint with observed data, H hazard using segment length, π_r previous-run predictive density; reset sufficient statistics on r=0 using a fresh prior.

Track changes in prior football chance-creation rates, horse sectionals, tennis serve rates, rugby try rates, NFL drive efficiency or darts checkout rates

Assumptions — Segments have a probabilistic duration and tractable run predictive updates.

Limitations — Mis-specified hazard generates spurious resets.

Source — Adams and MacKay, Bayesian Online Changepoint Detection, arXiv:0710.3742

## Skellam distribution (skellam)

> P(D=k)=exp(−a−b)(a/b)^(k/2)I_abs(k)(2√(ab))

D goal difference, k integer, a,b positive Poisson rates, I_m modified Bessel function of first kind.

Estimate a football scoreline or goal differential

Assumptions — Independent Poisson scores.

Limitations — Shared or overdispersed increments.

Source — doi:10.2307/2981372

## Beta-binomial distribution (beta-binomial)

> P(K=k)=C(n,k)B(k+a,n−k+b)/B(a,b)

K successes, n trials, k integer 0..n, a,b positive beta shapes, B beta function, C binomial coefficient.

Model tennis service points, darts checkout attempts or comparable bounded event rates

Assumptions — Trials exchangeable within group.

Limitations — Fatigue breaks exchangeability.

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

> P(X=k)=λ^k/[(k!)^ν Z], Z=Σ[j≥0] λ^j/(j!)^ν

X count, k,j nonnegative integers, λ and ν positive parameters.

Model goal or try counts at a fixed exposure

Assumptions — Numerical normalization needs tail control.

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

Source — Goodfellow, Bengio and Courville, Deep Learning, §6.2.2.3

## Plackett–Luce ranking (plackett-luce)

> P(π)=∏_j exp(θ_(π_j))/Σ_(k≥j) exp(θ_(π_k))

π entrant permutation, θ log worth, j,k rank indices.

Estimate probabilities of horse finishing orders

Assumptions — Sequential choice and ties excluded.

Limitations — Pace interactions violate independence of irrelevant alternatives.

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

Source — McFadden, Conditional Logit Analysis of Qualitative Choice Behavior, 1974

## Bayes posterior update (bayes-rule)

> P(H∣D)=P(D∣H)P(H)/Σ_j P(D∣H_j)P(H_j)

H hypothesis and H_j exhaustive exclusive hypotheses, D observed evidence.

Estimate or update a binary event such as a tennis service hold or a football clean sheet

Assumptions — Positive marginal evidence and coherent prior.

Limitations — Correlated evidence can be counted twice.

Source — Gelman et al., Bayesian Data Analysis, 3rd ed., ch. 1

## Exponential elapsed-time weighting (exp-time-decay)

> w_i=exp(−λ(t−t_i)), μ̂=Σ_i w_i x_i/Σ_i w_i

x_i metric, t_i earlier availability time, t cutoff, λ>0 inverse time, μ̂ estimate.

Track changes in prior football chance-creation rates, horse sectionals, tennis serve rates, rugby try rates, NFL drive efficiency or darts checkout rates

Assumptions — One decay timescale.

Limitations — Smooth forgetting can hide an abrupt regime switch.

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

Assumptions — Use a proven cost inequality.

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

Source — doi:10.1109/18.61115

## Multiclass Brier score (brier)

> BS=N^(-1)Σ_iΣ_j(p_ij−1[y_i=j])²

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

Assumptions — Correct conditional continuous CDF implies uniform marginal PIT.

Limitations — Uniform PIT alone does not establish sharpness or independence.

Source — Diebold, Gunther and Tay, Evaluating Density Forecasts with Applications to Financial Risk Management, International Economic Review, 1998

## Randomized PIT for discrete observations (randomized-pit)

> u_i=F_i(y_i⁻)+v_i[F_i(y_i)−F_i(y_i⁻)]

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

Source — original: use bounded Jensen–Shannon disagreement in the FB-06 convex shrinkage equation; exp(−γD_JS) preserves simplex closure

## Predictive-density stacking (stacking)

> w*=argmax_(w≥0,Σw=1) Σ_i ln(Σ_j w_j p_j^(-i)(y_i)), use earlier-origin predictions for p_j^(-i)

w blend weights, j component, i calibration record, y_i observed result held out from component fit.

Combine, calibrate or compare forecasts for the same sporting event target

Assumptions — Chronological adaptation of predictive stacking with matched target probabilities.

Limitations — Adjacent fold dependence and collinear components destabilize weights.

Source — doi:10.1214/17-BA1091

## Bayesian model averaging (bma)

> p(y∣D)=Σ_j p(y∣D,M_j)w_j, w_j=p(D∣M_j)p(M_j)/Σ_k p(D∣M_k)p(M_k)

D history, M_j candidate model, w_j posterior model mass, y future event.

Combine, calibrate or compare forecasts for the same sporting event target

Assumptions — Comparable evidence on same observed data.

Limitations — Diffuse priors distort marginal likelihood.

Source — doi:10.1214/ss/1009212519

## Temperature scaling (temperature)

> p_j(T)=softmax(z/T)_j, fit T>0 by minimizing earlier calibration log loss

z class logits, T global temperature, p output probabilities.

Combine, calibrate or compare forecasts for the same sporting event target

Assumptions — Valid logits and common held-out target mapping.

Limitations — Argmax unchanged and class bias remains.

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

Limitations — Sparse leaves and repeated splits overfit.

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

Source — original: finite-horizon law of total probability with checkout and bust absorbing outcomes

## Advantage tennis service-game probability (tennis-game)

> G(p)=p⁴[1+4(1−p)+10(1−p)²]+20p³(1−p)³·p²/[p²+(1−p)²]

p fixed iid probability server wins a point, G probability server wins game.

Map a service-point propensity to service-game probability

Assumptions — Advantage rules with win by two after 3–3.

Limitations — No-ad or pressure-dependent point strength invalidates recursion.

Source — original derivation: enumerate wins before deuce, then condition on first non-split two-point deuce cycle

## Finite-horizon Markov reward recursion (bellman-policy)

> V_t(s)=Σ_a π_t(a∣s)Σ_u P_t(u∣s,a)[r_t(s,a,u)+V_(t+1)(u)], V_T=g

s,u states, a action, π fixed policy, P transition, r step reward, g terminal value, T horizon.

Summarize rule-consistent scoring or rank trajectories

Assumptions — State contains all relevant score/time information.

Limitations — Aliased states produce invalid transition estimates.

Source — Puterman, Markov Decision Processes, 1994

## Exact sampled Ornstein–Uhlenbeck transition (kalman-ou)

> X_(t+Δ)∣X_t=x~N(μ+exp(−κΔ)(x−μ), σ²(1−exp(−2κΔ))/(2κ))

κ>0 reversion rate, μ level, σ diffusion scale, Δ time gap, X latent continuous state.

Track changes in prior football chance-creation rates, horse sectionals, tennis serve rates, rugby try rates, NFL drive efficiency or darts checkout rates

Assumptions — Continuous Gaussian mean reversion with constant coefficients.

Limitations — Permanent shifts misread as transitory.

Source — Uhlenbeck and Ornstein, On the Theory of the Brownian Motion, Physical Review, 1930

## Exponential Hawkes intensity (hawkes)

> λ(t)=μ+Σ_(t_i<t) α exp(−β(t−t_i)), fit log likelihood Σ_i ln λ(t_i)−∫λ(t)dt

t_i earlier event times, t current time, μ>0 baseline, α≥0 excitation, β>0 decay.

Summarize earlier matches’ within-game event timing for later fixtures, treating in-game transition forecasting as a separately specified cutoff.

Assumptions — Stationarity requires α/β<1 for the univariate process.

Limitations — Score effects or interruptions mistaken for self-excitation.

Source — doi:10.1093/biomet/58.1.83

## Proximal gradient for L1 regularization (prox-l1)

> b_new=S_(ηλ)(b−η∇f(b)), S_c(z)=sign(z)max(abs(z)−c,0) componentwise; leave intercept unthresholded

b coefficients, f smooth convex training objective, λ penalty, η≤1/L step for L-Lipschitz gradient.

Predict a continuous sport target like race time or score differential

Assumptions — Convex objective and proper step size.

Limitations — Bad scaling slows convergence.

Source — Parikh and Boyd, Proximal Algorithms, Foundations and Trends in Optimization, 2014

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

Study a pre-event intervention such as a lineup change or a schedule/rest exposure

Assumptions — Conditional exchangeability, positivity and consistency.

Limitations — Unmeasured ability or extreme propensities distort estimate.

Source — Hernán and Robins, Causal Inference: What If, 2020

## Augmented inverse probability weighting (aipw)

> τ̂=mean[m_1(X)−m_0(X)+A(Y−m_1(X))/e(X)−(1−A)(Y−m_0(X))/(1−e(X))]

A exposure, Y outcome, X confounders, e propensity, m_a conditional outcome regression for A=a.

Study a pre-event intervention such as a lineup change or a schedule/rest exposure

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

Source — doi:10.1093/biomet/49.1-2.65

## Centered log ratio (clr)

> z_j=ln x_j−K^(-1)Σ_i ln x_i

x positive K-part composition, z log-ratio coordinates.

Compare composition of scoring patterns or drift of historical feature bins

Assumptions — Common denominator and strictly positive parts.

Limitations — Zeros and singular output covariance.

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

Assumptions — Constant velocity approximation over short intervals.

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

Limitations — Truncated mass and frozen coefficients may behave poorly at extreme rates.

Source — PR #112 at 1fbd53d94ca152f1d4246e784a3c86bb33146648, research/football-baseline-v1/replay.mjs and README.md

## Population stability divergence (population-stability-index)

> PSI=Σ_j (q_j−p_j) ln(q_j/p_j)

p,q positive bin frequencies for reference and subsequent past window; j fixed bin.

Compare composition of scoring patterns or drift of historical feature bins

Assumptions — Common binning and positive bins.

Limitations — Sparse bins exaggerate drift; magnitude depends on binning.

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

Estimate time to a future withdrawal or return in records with defensible risk sets

Assumptions — Nonrecurrent terminal event within defined risk period.

Limitations — Repeated returns require resetting or recurrent-event framework.

Source — Kalbfleisch and Prentice, The Statistical Analysis of Failure Time Data, 2nd ed., 2002

## Competing-risks cumulative incidence (cumulative-incidence)

> F_k(t)=∫_0^t S(u)h_k(u)du, S(u)=exp(−Σ_j∫_0^u h_j(v)dv)

F_k probability first failure by t has cause k, h_j cause-specific hazard, S event-free survival.

Estimate time to a future withdrawal or return in records with defensible risk sets

Assumptions — Mutually exclusive first causes and right censoring compatible with fit.

Limitations — Treating competing exits as independent censoring overstates incidence.

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

## Renewal expected long-run event rate (stationary-renewal)

> N(t)/t→1/E[X] almost surely for iid positive inter-arrivals X

N(t) events by elapsed time t, X positive gap, E finite mean.

Estimate clustering in prior goals, tries or drive outcomes

Assumptions — Reinitialization between comparable intervals and constant gap distribution.

Limitations — Match clock stoppages and dependence alter long-run rates.

Source — Ross, Stochastic Processes, 2nd ed., renewal theory

## Compound Poisson weighted scoring (compound-poisson)

> S=Σ_(i=1)^N Y_i, N∼Pois(λ); E[S]=λE[Y], Var(S)=λE[Y²]

N event count, Y points per event, S weighted total, λ expected count.

Approximate a weighted rugby scoring total by summing simulated counts of marked events.

Assumptions — Independent iid event values and independent event count.

Limitations — Conversion attempts depend on tries rather than forming independently marked event values.

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

Transform skewed duration predictors for model fitting

Assumptions — Use only when implied negative-time mass is negligible or truncate with explicit normalization.

Limitations — Long delays can reflect mixed rules instead of an exponential mechanism.

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

> U=Σ_j(d_1j−n_1j d_j/n_j); V=Σ_j n_1j(n_j−n_1j)d_j(n_j−d_j)/(n_j²(n_j−1)); use U²/V

risk counts n, failures d by group and event time j; omit n_j≤1.

Estimate time to a future withdrawal or return in records with defensible risk sets

Assumptions — Independent censoring, independent units, fixed groups and positive V.

Limitations — Crossing hazards can cancel against each other.

Source — Kalbfleisch and Prentice, The Statistical Analysis of Failure Time Data, 2nd ed.

## Greenwood survival variance formula (greenwood)

> Var[Ŝ(t)]≈Ŝ(t)²Σ_(τ_j≤t) d_j/[n_j(n_j−d_j)]

n_j risk set, d_j failures, τ_j time, Ŝ Kaplan–Meier estimate.

Estimate time to a future withdrawal or return in records with defensible risk sets

Assumptions — Independent censoring with n_j>d_j at included times.

Limitations — Unstable at tail of follow-up or all-at-risk failure.

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

Assess calibration or forecast quality in a permitted historical assessment sample

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

Assumptions — IID continuous observations for conventional null.

Limitations — Fitting F_0 on observations changes test distribution.

Source — Anderson, On the Distribution of the Two-Sample Cramér–von Mises Criterion, Annals of Mathematical Statistics, 1962; one-sample quantile expression follows from integrating squared ECDF discrepancy

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

> AP=Σ_j(R_j−R_(j−1))P_j, descending distinct score thresholds

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

Limitations — Temporal drift breaks finite-sample coverage guarantee.

Source — Lei et al., Distribution-Free Predictive Inference for Regression, JASA, 2018

## Conformalized quantile regression (conformal-quantile)

> Set s_i=max(l̂(x_i)−y_i,y_i−û(x_i)); use split conformal corrected score quantile r and return [l̂(x)−r,û(x)+r]

l̂,û fitted lower and upper quantile models; r corrected rank threshold, s calibration score.

Predict a continuous sport target like race time or score differential

Assumptions — Disjoint fitting and calibration, exchangeable scores.

Limitations — Drift and poor quantile fit degrade coverage or width.

Source — Romano, Patterson and Candès, Conformalized Quantile Regression, NeurIPS 2019

## Vector scaling calibration (vector-scaling)

> q_j=softmax(a⊙z+b)_j; fit class-specific a,b on disjoint earlier calibration logits via cross entropy

z logits, a,b vectors, ⊙ componentwise product, q calibrated probabilities.

Combine, calibrate or compare forecasts for the same sporting event target

Assumptions — Adequate calibration examples in each class, offset identifiable up to common shift.

Limitations — More degrees of freedom overfit rare outcomes.

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

Source — Herbster and Warmuth, Tracking the Best Expert, Machine Learning, 1998

## Posterior expected-loss decision (bayes-regret)

> a*=argmin_(a∈A)Σ_θ L(a,θ)p(θ∣D)

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

> S_j=Var(E[Y∣X_j])/Var(Y)

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

> For d+1 simplex points sort by loss, reflect worst x_w around centroid c of others with x_r=2c−x_w; expand at c+2(x_r−c) if best, contract if reflection is no better than second worst, or shrink toward best if contraction fails.

d dimensions, c centroid, x_w worst point, objective scalar; use standard outside/inside contraction 1/2 and shrink 1/2.

Fit parameters or solve a calibration objective using authorized training records or a sport simulator.

Assumptions — Continuous local search with scaled coordinates.

Limitations — Can stagnate at nonstationary points.

Source — Nelder and Mead, A Simplex Method for Function Minimization, Computer Journal, 1965

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

> For target i choose distinct other indices a,b,c; mutant v=x_a+F(x_b−x_c); copy each mutant coordinate with chance CR plus one forced mutant coordinate; retain trial if loss no larger

x bounded candidate vector, F scale, CR crossover probability, use clipping to declared bounds.

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

> For labels and classifier outputs ±1 set ε_m=Σ_i w_i1[y_i≠h_m(x_i)], α_m=0.5 ln((1−ε_m)/ε_m); update w_i∝w_i exp(−α_m y_i h_m(x_i)), aggregate sign(Σ_m α_m h_m)

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

> Compute i,f,o=sigmoid(W_g[x_t;h_prev]+b_g) with separate g weights; u=tanh(W_u[x_t;h_prev]+b_u); c_t=f⊙c_prev+i⊙u; h_t=o⊙tanh(c_t)

x observations, h output, c memory, i/f/o gates, u candidate, W,b fit coefficients.

Use sequences of earlier match or session measurements to learn form features for later fixtures.

Assumptions — Chronological input sequences with documented resets and causal training.

Limitations — Sparse teams and regime shifts make capacity hard to regularize.

Source — Gers, Schmidhuber and Cummins, Learning to Forget: Continual Prediction with LSTM, Neural Computation, 2000

## Gated recurrent unit (gru)

> r=σ(W_r x+U_r h), z=σ(W_z x+U_z h), u=tanh(W_u x+U_u(r⊙h)), h_new=(1−z)⊙h+z⊙u

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

Source — Tibshirani, CMU 10-725 Optimization, Lecture 6, §6.1.1. https://www.stat.cmu.edu/~ryantibs/convexopt-F13/scribes/lec6.pdf

## Iterative shrinkage-thresholding (ista)

> For F(x)=f(x)+λ‖x‖₁, set u=x_k−∇f(x_k)/L and x_(k+1),j=sign(u_j)max(abs(u_j)−λ/L,0).

f smooth convex training loss, λ≥0 penalty, L>0 upper bound on the gradient Lipschitz constant, j feature index.

Fit sparse linear historical performance features without applying the L₁ term as an ordinary derivative

Assumptions — Fixed convex composite objective with a minimizer and valid smoothness bound.

Limitations — Poor curvature can slow progress and arbitrary feature scales change the L₁ fit.

Source — Beck and Teboulle (2009), A Fast Iterative Shrinkage-Thresholding Algorithm for Linear Inverse Problems, §3. https://www.ceremade.dauphine.fr/~carlier/FISTA

## Accelerated iterative shrinkage-thresholding (fista)

> Initialize y₁=x₀ and t₁=1. With soft threshold S_a(u)_j=sign(u_j)max(abs(u_j)−a,0), set x_k=S_(λ/L)(y_k−∇f(y_k)/L), t_(k+1)=(1+√(1+4t_k²))/2, and y_(k+1)=x_k+[(t_k−1)/t_(k+1)](x_k−x_(k−1)).

f smooth convex loss, λ≥0 L₁ penalty, L>0 upper bound on the gradient Lipschitz constant, x fitted iterate, y extrapolated point, t acceleration scalar.

Fit a sparse historical margin model when the unaccelerated method requires many passes

Assumptions — Fixed convex composite objective with a minimizer and a valid smoothness bound.

Limitations — Acceleration can yield nonmonotone objective values at successive fitted iterates.

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
