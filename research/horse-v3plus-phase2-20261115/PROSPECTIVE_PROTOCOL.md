# Frozen prospective protocol — pending independent review

Date15 November2026. This file prepares a future experiment; it does not start a collector, create an automation, alter betting selections, or approve a model.

## Primary comparison

Comparator A0 is exactly the context formula in INVESTIGATION_REPORT.md: distance1, going1, class.5, course.5; half-life90days, prior5, inverse-temperature2; original percentile/linear score. Primary challenger is `E_NODIST_half_life_inverse_temperature`: distance0; going1, class.5, course.5 unchanged; half-life45days, prior5, inverse-temperature4; original percentile/linear score. This choice was frozen from the58-race development selection. Do not substitute a better later/full-sample candidate.

The exact challenger is:

`y_h = (field_h-position_h)/(field_h-1)` for numeric finishes; known nonfinishers0.

`r_h = 2^(-age_h/45)`

`c_h = 1 + s_going,h + .5*s_class,h + .5*s_course,h`

`m_i = sum_h(r_h*c_h*y_h)/sum_h(r_h*c_h)`

`R_i = sum_h r_h`

`q_i = .5 + R_i/(R_i+5)*(m_i-.5)`

`p_i = exp(4*q_i)/sum_j exp(4*q_j)`

For both methods, retain the context pipeline's same-discipline/latest3–6resolved runs/730day lookback, missingness and nonfinisher policy. Do not quietly switch to original all-weather V1 eligibility or isolated fixedV3.

## Start and eligible population

- Begin only after this exact protocol and code/data hashes have been independently reviewed and timestamped in a public or otherwise immutable research record. Every target start must be after that timestamp and all previously inspected race IDs are excluded.
- Use the existing lawful data sources and a separate research-side scoring process. Production collectors and site remain unchanged. If no such process can produce both candidates without production changes, the experiment remains prepared and unstarted.
- Include every consecutively eligible race in a declared geographic/source/time coverage window; declare that window before collection. Record every screened race and exclusion reason, source outage and unavailable prediction. Require both models on exactly the same complete active field. No outcome-based exclusion or late choosing of race types.
- Freeze source snapshots, complete runner IDs, histories, race conditions, code/config hash and both vectors before the existing5-minute cutoff; include an independent timestamp/receipt where feasible. Check the existing runner-freshness rules. Preserve original inputs and revisions; choose the latest valid revision strictly before cutoff using a frozen deterministic rule.
- If the actual field changes after capture, retain original record and apply a prespecified common exclusion/abstention policy. Before starting, specify whether prediction-time-field settlement or common complete-final-field eligibility is the target; do not change it after observing winners. Record counts for both coverage and sensitivity. The present dataset does not solve withdrawal simulation.
- Confirm final winners and fields against an independent second source. Conflicts and unresolved labels stay pending; retain them and report coverage. Provisional single-source outcomes must never be relabelled verified without evidence.

## Endpoint and analysis lock

Planning target: first500paired independently resolved eligible races spanning at least60distinct dates. If500races arrive before60dates, continue through the60th eligible date; include all eligible races from the final date. Set a maximum180calendar-day collection window from actual start; if target is not met, report the experiment incomplete and do not silently lower the target. These are operational planning values, not an assertion of80%power or adequate precision. Record per-discipline counts; no subgroup tuning. Hurdle/Chase counts may remain inadequate and must be reported as such.

Primary endpoint is race-equal paired mean log-loss difference challenger-minus-A0. Secondary endpoints are multiclass Brier sum, top-one counts/tie sensitivity, and the locked fixed-bin calibration summaries fromPhase2. No training, threshold adjustment, parameter updates, interim selection, or choosing a favourable stopping date. Interim checks are confined to blindness-preserving data integrity, availability and normalisation. Preserve all failures.

At the fixed endpoint use paired race-date cluster bootstrap,20000draws, prespecified seed20261115, with a sensitivity analysis for repeated horses/meetings if enough clusters exist. Report effect size,95%interval, date influence, field-size and discipline strata. One primary challenger avoids a new parameter-selection family. Any secondary candidate comparison requires separate multiplicity control and is exploratory. Phase2's no-distance-only candidate can be archived as a labelled secondary diagnostic, but must not replace the primary candidate on the basis of new results.

If primary interval includes0, record no demonstrated improvement. If it excludes0 favourably, inspect calibration/Brier/coverage/data-integrity and practical effect size before proposing a model—not deploying it. Better log loss alone is not proof of uniform superiority, external validity, or profitable bets. Require independent reviewer approval for any future proposal; this protocol gives no permission to merge, deploy, alter recommendations, or relax UNVALIDATED/BLOCKED.

## What additional evidence is needed

Fresh pre-result forecasts from the exact immutable candidate, a complete screened-race ledger, independent resolved outcomes, retained first-availability/source evidence, more dates and broader discipline coverage, and sufficiently precise paired score/calibration estimates. Assess executable prices and betting value only in a separate approved study; this protocol has no ROI/EV claim.
