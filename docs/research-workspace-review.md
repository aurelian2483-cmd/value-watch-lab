# Value Watch research workspace review

The development branch starts from `main` at `281fbb0f` and incorporates the original journal assertion commit `6351a466` from [draft PR #109](https://github.com/aurelian2483-cmd/value-watch-lab/pull/109). GitHub's check page showed a failure in the desktop/mobile research browser step. Local Chromium reproduced the Compare timeout. The heading was already in the DOM inside a collapsed outcome disclosure. QA now opens the disclosure before verifying model content. Other assertions now follow the existing Wildcard audit, missing-price and rugby model states.

## Existing sections and evidence contracts

| Workflow | Existing implementation | Changes in this branch |
| --- | --- | --- |
| Event research and four paper slips | Homepage and Paper Lab share the production desk and saved-workspace engine. | Refined homepage panels and linked the four primary sports from Analyst to the actual desk filters. |
| Model research and historical performance | Analyst, Research Lab, Racing Lab, Validation Centre and Track Record already read model, archive and result snapshots. | Exposed model analysis, matched-sample validation and historical performance directly from the homepage. The underlying research pages use their existing metrics and evidence contracts. |
| Market research | Football retains source snapshots for benchmark and Sky Bet 1X2 prices. Racing already exposes observed favourites, publisher selections and model leaders. | Added a read-only market workspace for captured football prices, fractional equivalents, completeness, timestamps and source links. It links into the existing racing analysis. |
| Source operations | Operations Control already audits snapshots and includes sport desks. | Added the published racing discovery and expanded football corroboration audits to the Operations page. |

Model calculations, recorded data, storage formats and model approval gates were preserved. Model status remains **UNVALIDATED** and publication remains **BLOCKED**.

## Source findings

- On 20 November, the Sporting Life index returned 20 November meeting dates for all seven requests covering 21–27 November. Meeting pages recovered race observations for the first six requested dates. The seventh shows zero recovered races in that snapshot. The fixtures endpoint recorded HTTP 404 and the Racing Post calendar recorded HTTP 406. Date mismatch, HTTP failure and partial recovery are displayed as separate observations. Declarations and coverage remain provisional.
- The expanded football snapshot contains 212 primary discoveries across six competitions and zero corroborations. The audit records twelve Sky HTTP 404 errors across November and December. The failure establishes an unavailable secondary route in that collection. The primary discoveries remain visible and the collector's forecast eligibility rules still apply.
- Football market records currently contain individual captures, so this release does not infer movement or closing-line value. No new ROI or predictive improvement claims were made.

## Review evidence

Browser screenshots are generated under `work/browser-qa/`. Local before-and-after homepage captures use the same checkout, browser, viewports and data snapshots, with the original homepage HTML taken from the reviewed `main` commit. Market captures show the recorded prices at desktop and mobile widths. Operations captures show the raw source statuses and recovered counts.

The branch focuses on connecting and improving existing workflows and filling the market and source-diagnostic gaps. A comprehensive visual redesign of each existing sport and research page, renewed upstream data access, and independently substantiated model improvement remain open.
