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

## Integrated draft on current main

This draft carries the journal fix and the workspace integration from the existing development branch onto `main` at `8b58e759`. It adds a Research Centre, shared cross-section navigation, an evidence summary on the homepage, and a lazy-loaded racing price view using the existing racecard rules. The football market workspace and Operations source tables come from the existing development commit. The football collector runs from `research/prospective-100` and uses month-specific Sky fixture paths. The audit preserves that route's 404 responses independently of the primary counts. No collector changes were required to expose those findings.

The racing price view checks the published research gates, matched active field and publisher URL. Its compact table shows observed decimal and fractional prices, the source timestamp, a favourite only while eligible, and movement only across comparable observations. A captured source record is never a currently available offer. All changes are read-only with respect to published evidence and existing research storage.

| Capture | Desktop | Mobile |
| --- | --- | --- |
| Homepage before | [Desktop](preview/research-terminal/desktop-before.webp) | [Mobile](preview/research-terminal/mobile-before.webp) |
| Homepage after | [Desktop](preview/research-terminal/desktop-after.webp) | [Mobile](preview/research-terminal/mobile-after.webp) |
| Research Centre | [Desktop](preview/research-terminal/research-centre-1440.webp) | [Mobile](preview/research-terminal/research-centre-390.webp) |
| Football markets | [Desktop](preview/research-terminal/market-intelligence-1440.webp) | [Mobile](preview/research-terminal/market-intelligence-390.webp) |

Local verification includes the 57 Node regression files, 314 Python tests, Playwright research desk and Pro workflows, Darts, Sports Watch and Operations QA. Research Centre coverage includes mobile overflow, axe, invalid report fallback, source provenance and withheld stale favourites. The draft's pull-request checks also exercise its code against current main snapshots.

Open scope includes a complete redesign of each individual sport screen, richer model stage and feature-contribution views where suitable evidence exists, and an independent historical outcome review. Missing provider access, matched outcome evidence and repeated comparable prices constrain the corresponding analysis. An empty or provisional sample supplies no evidence of improved selections.
