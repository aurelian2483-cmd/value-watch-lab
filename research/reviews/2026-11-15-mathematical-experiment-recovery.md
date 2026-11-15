# Value Watch mathematical experiment recovery ledger — 2026-11-15

**Purpose:** Preserve recovered research without changing live predictions, selection eligibility, or publication gates. This is a **recovery index**, not a proof of positive expected value or a model-promotion decision.

## Evidence classification
- **R — Repository-backed:** Source file or preserved result in this repository; reported outcome may still be retrospective, single-source, or unreplicated in the current session.
- **C — Conversation-recovered:** Numbers reported in earlier ChatGPT project discussions, not yet matched to an exact source-data artifact and executable experiment in this repository.
- **P — Proposed:** Mathematical design or adjustment not verified as calibrated/deployed.
- **M — Missing:** Needed provenance or results not recovered. Do not fill with assumptions.

## Horse racing

### HR-01 — Original all-weather form baseline (R)
- Model: `FORM_PERCENTILE_SOFTMAX_RESEARCH_V1`.
- Code: [scripts/horse_model_pipeline.py](../../scripts/horse_model_pipeline.py).
- Finish percentile: `(field_size - finish_position) / (field_size - 1)`.
- Past-run weight: `2 ** (-age_days / 90)`.
- Mean weighted finish percentile shrunk toward 0.5 by `sum_weights/(sum_weights+5)`.
- Full-field softmax of `2 * shrunk_form_strength`.
- Minimum 3 and maximum 6 eligible past runs; lookback <=730 days. Current code scope is eligible all-weather races.
- Code explicitly labels estimates UNVALIDATED, research-only and publication BLOCKED.

### HR-02 — Ten-feature conditional-logit challenger (R)
- Model: `AW_CONDITIONAL_LOGIT_PILOT_V1`.
- Sources: [README](../horse-challenger/README.md), [model-v1.json](../horse-challenger/model-v1.json), [reproduction script](../../scripts/reproduce_horse_challenger.py).
- Data: 92 collected historical GB all-weather handicaps, 58 retained, 34 excluded. Chronological split: 14 fitting races (<2026-10-01), 18 validation races (2026-10-01 through 2026-10-15), 26 later test races (>=2026-10-16).
- L2 candidates 0.1, 1, 10, 100; best validation log losses respectively 2.2230915807, **2.1459537096**, 2.1601480175, 2.1930358198. Selected L2=1, then refitted on train+validation only.
- Ten ordered features / fitted coefficients:
  - official_rating: 0.9063070963952543
  - weight_lbs: -0.25533648647586893
  - shrunk_form: 0.2715090628002485
  - last_finish: 0.6192848289239028
  - surface_form: 0.19624079860072752
  - distance_form: 0.23566935122863056
  - course_form: 0.16792669534701785
  - class_change: 0.4178986335868233
  - log_days_since_run: -0.09928279421385798
  - rating_change: 0.1961413689987747
- Same 26 retrospective test races: challenger log loss **2.4381463254**, multiclass Brier **0.9258999232**; form baseline **2.3463840688**, **0.9038487946**; uniform baseline **2.351176**, **0.903153** (uniform figures from README).
- **Decision: Do not promote.** Challenger worse on both measures than either comparator. Retrospective cards obtained after outcomes, first availability and pre-event fields not independently attested. No proved betting ROI. Keep prior test untouched.

### HR-03 — Context-parameter search (C, not yet source-reconciled)
- Conversation-recovered: 34 races, 368 runner observations, 2,096 historical records and 801 comparable-going records.
- Original log loss **2.32599**; best of 12 reported in-sample configurations **2.30722**, with distance=1, going=2, temperature=4 (these numbers are *configuration values*, not calibrated win probabilities).
- Reported context alternative ~2.3208 log loss and first-choice winners 3/34 versus original 4/34; top-three winner coverage context 12/34 versus original 11/34.
- **Do not promote from this evidence**: exact versioned 12-run grid, scoring files, training-time and target leakage checks, and independent holdout not yet matched.
- Do not confuse HR-03's 34-race grid with HR-02's separate 26-race challenger test.

## Football

### FB-01 — Extended historical screening pattern (C)
- Conversation-recovered 3,749 historical fixtures; 279 qualified; 175 correct (62.7% among qualified; 7.4% coverage).
- League split reported: Premier League 75/106, Championship 16/30, La Liga 47/82, Bundesliga 37/61.
- **Missing:** exact code revision, selection rule, source seasons, point-in-time features, independent holdout, bookmaker prices and ROI. High hit rate alone is not value.

### FB-02 — Six-season formula comparison (C)
- Conversation-recovered: 2,280 fixtures with a 640-match chronological holdout.
- Poisson log loss 1.03332/Brier 0.62093; recent-form 1.03215/0.62027; opponent-adjusted 1.03298/0.62096.
- **Provisional interpretation:** recent-form slightly lower proper scoring loss on that holdout; exact run receipt and code revision to recover.

### FB-03 — Opponent-defence gamma experiment (C)
- Conversation-recovered calibration log losses: gamma 0=0.999316; 0.25=0.999937; 0.5=1.000994; 0.75=1.002496; 1=1.004460.
- Reported decision gamma=0. **Missing**: calibration sample and run artifact.

### FB-04 — Player adjustment experiment (C)
- Conversation-recovered calibration log loss: baseline 0.976144; adjustment strengths 0.15=0.976491, 0.30=0.976850, 0.60=0.977601. Reported subsequent 290-match test baseline log loss 1.015413.
- Reported decision not to promote adjustment. **Missing**: run artifact and corresponding code.

### FB-05 — 50/50 research and betting-value proxies (C)
- Conversation-recovered reported mixing model and market probabilities 50/50, with investigated max decimal odds 5.00 and min calculated EV 5%.
- Historical test reported 220 selections, 79 winners, 80.65 expected winners; this does not establish positive ROI.
- Separate 1,140-match Premier League 50/50 proxy reported 532 selections, 136 winners, -10.5% ROI; stricter proxy 24 selections, 3 winners, -55.2% ROI. Keep experiments separated until definitions and source receipts recovered.

### FB-06 — V6 uncertainty shrinkage (P)
- Proposed: `S_adjusted = S_baseline + r * (S_total - S_baseline)`.
- **Missing:** fitted r, chronological proper-score result and proof of live implementation. Do not label tested or deployed.

### FB-07 — Live historical football scoring ledger (R)
- [research-history.json](../../research-history.json) (as read 2026-11-15): 18 entries, status `INSUFFICIENT_SAMPLE`, mean multiclass Brier 0.5876897271 and mean log loss 0.9870525550. Includes multiple model entries per fixture; deduplication and model grouping are required before statistical claims.
- Repository flags `model_validation=UNVALIDATED`, `publication_gate=BLOCKED`, and `official_challenge=0/100`.
- Do **not** conflate this short live ledger with FB-01's historical screening.

## Research controls and handoff
1. Preserve all original JSON, data, coefficients and failed experiments. No refitting against already-viewed test sets.
2. Recover exact 12-run HR-03 grid and football experiment artifacts via repository history/branches, workflow artifacts or conversation exports; capture immutable SHA, dataset identity, date split, metric definitions, and pre-event timing.
3. Reconcile duplicated football fixtures and distinguish selection accuracy, log loss, Brier, calibration, and executable-price ROI.
4. Only compare models on the *same* events and eligibility rules. Treat market snapshots without executable price attestation as research inputs.
5. Require fresh untouched chronological/prospective evaluation before promoting any experimental advantage.
6. **No changes to live predictions, odds, site UI, workflows, or publication gates are authorized by this ledger.**

## Recovery state
This document was assembled from repository files inspected on 2026-11-15 plus **conversation-reported values** clearly marked C/P. It is not a full audit of all historical branches/workflow artifacts and no model tests were executed during this documentation step.
