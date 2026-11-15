# Phase3 retrospective robustness and prospective planning

Status: **research only; zero prospective scored races**. These are the same 76 previously examined races over 12 dates, not a fresh holdout. No model was refitted or selected in this analysis.

Model A is A0_FULL (distance1, half-life90, prior5, beta2). Frozen B is the development-selected E_NODIST_half_life_inverse_temperature (distance0, half-life45, prior5, beta4). Going1/class.5/course.5, original percentile, history and field identities are otherwise shared. `robustness.py` regenerates `robustness.json` from frozen Phase2 vectors and original inputs.

## First-choice disagreement

| Same race sample | Races | A correct | B correct | B minus A log loss | B minus A Brier |
|---|---:|---:|---:|---:|---:|
| Same first choice | 55 | 11 | 11 | -0.0173401 | -0.0045820 |
| Different first choice | 21 | 2 | 5 | -0.0351363 | -0.0080979 |
| All | 76 | 13 | 16 | -0.0222575 | -0.0055535 |

Both correct11; only A correct2; only B correct5; neither58. Thus B's extra three first-choice successes arise from seven outcome-discordant races, a very small count. Probability-score gains also occur when the favourite stays the same. Neither explains a causal reason for improvement or validates future accuracy.

## Fixed descriptive robustness bins

| Bin | Races | A correct | B correct | B minus A log loss |
|---|---:|---:|---:|---:|
| Current field under8 | 23 | 6 | 7 | -0.0249475 |
| Current field8–12 | 37 | 3 | 3 | -0.0124971 |
| Current field over12 | 16 | 4 | 6 | -0.0409614 |
| Flat | 47 | 6 | 10 | -0.0252778 |
| Chase | 13 | 2 | 1 | -0.0124742 |
| Hurdle | 16 | 5 | 5 | -0.0213340 |
| Any runner A recency evidence below1 | 44 | 12 | 14 | -0.0424943 |
| Every runner A evidence at least1 | 32 | 1 | 2 | **+0.0055681** |
| No history going missing | 29 | 7 | 6 | -0.0173624 |
| Going missing fraction greater0 to .5 | 17 | 1 | 4 | -0.0416382 |
| Going missing fraction over.5 | 30 | 5 | 6 | -0.0160070 |

Evidence is the original A sum of unbonused recency weights, not history count. Going missing fraction is missing historic going similarities divided by all runner-history rows in a race; the reported aggregate is race-equal. Evidence bins and field/discipline bins overlap and are confounded. B worsens proper scores in the32race non-sparse-evidence bin despite one extra top choice; this is a fragility to monitor, not permission to introduce a subgroup rule. Flat going missingness is high and none is missing in these Chase/Hurdle rows, so missingness effects cannot be separated from discipline. Do not sum overlapping bins.

Full Brier values, dates per group and raw race rows are in the JSON. The Phase2 leave-one-date-out check remains favourable for B, but cannot remove post-selection bias or between-date/shared-history dependence.

## Calibration counts and interpretation

Overall A13/76 first choices correct (17.11%), mean top probability14.79%; B16/76 correct (21.05%), mean top probability16.32%. These global gaps alone do not establish calibration. Exact top-label and pooled-runner fixed bins, including sparse counts and race-balanced runner weights, are retained in Phase2 metrics_and_uncertainty.json. There are730 runner appearances in76 outcome vectors, not730 independent Bernoulli trials. No new bins or calibration fitting were selected here.

## Planning precision and fixed endpoint

Historical paired log-loss difference SD is0.0777540. Under an illustrative iid normal approximation, at500 races the95% interval half-width is about0.0068154, and an80%-power two-sided5% test would detect a true difference of about0.0097420. Formula: n approximately ((1.96+0.841621)*paired_SD/target_difference)^2; precision half-width approximately1.96*paired_SD/sqrt(n). These are scale calculations, not proof of500 being sufficient.

The12-date intercept-only cluster SE is0.0064885 versus iid SE0.0089190, an estimated design effect0.5292. That unexpectedly smaller estimate is unstable and must not justify reducing sample size. Conservative planning uses design effect at least1; sensitivity effects2/4 inflate the500race half-width to about0.0096399/0.0136309 and the80% detectable difference to0.0137773/0.0194840. Fresh variance, effect size and dependence may differ, and historical B was selected using these outcomes. No empirical power or validated confidence guarantee follows.

The frozen prospective protocol's first500 reviewed pairs over at least60 dates, complete final date and maximum180calendar days is an operational planning rule. It must not become favourable optional stopping. The practical primary review margin -0.005 is an explicit analyst judgement; score superiority still requires the fixed-endpoint upper95% bound below that margin and the other locked protocol gates. No interim threshold or model change is permitted based on observed outcomes. Incomplete enrollment remains incomplete. Date-cluster inference with few dates and repeated horses remains limited.

## Market comparison and evidence limits

The older32race market benchmark evaluated a distinct archived V1 against observed market probabilities. Exact A/B forecasts and eligible market rows were not matched in this analysis; therefore **A/B market comparison was not performed**. The old benchmark must not be used as if it compared B against market. No identified paired executable odds, settlement or commission data support EV, CLV or ROI here. An attempted local artifact transfer was unavailable; no additional recovery was pursued.

Method sources and limits are retained in Phase2 methods/REVIEW.md: Gneiting and Raftery on proper scoring; Cameron and Miller on clustering/few clusters; Vaicenavicius et al. on richer multiclass calibration; Guo et al. on temperature calibration. None validates this model or the500/60 planning rule for racing.

## Result

B is a frozen candidate worth prospective comparison, with a visible sparse-evidence subgroup weakness. The completed retrospective analysis contains **zero prospective evidence**. Keep production unchanged and preserve UNVALIDATED/BLOCKED until the separately locked protocol and independent review requirements are satisfied.

## Frozen top-label calibration counts

| Model | Probability bin | Races | Mean probability | Actual win fraction |
|---|---|---:|---:|---:|
|A0_FULL|0�0.1|20|0.08542|0.20000|
|A0_FULL|0.1�0.2|40|0.13241|0.12500|
|A0_FULL|0.2�0.3|14|0.24920|0.28571|
|A0_FULL|0.3�0.5|2|0.37402|0.00000|
|A0_FULL|0.5�1|0|empty|empty|
|E_NODIST_half_life_inverse_temperature|0�0.1|14|0.08942|0.28571|
|E_NODIST_half_life_inverse_temperature|0.1�0.2|43|0.13791|0.16279|
|E_NODIST_half_life_inverse_temperature|0.2�0.3|14|0.24937|0.21429|
|E_NODIST_half_life_inverse_temperature|0.3�0.5|5|0.34655|0.40000|
|E_NODIST_half_life_inverse_temperature|0.5�1|0|empty|empty|
