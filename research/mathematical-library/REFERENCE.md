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
