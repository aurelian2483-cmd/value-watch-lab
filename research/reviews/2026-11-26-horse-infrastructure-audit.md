# Horse racing infrastructure audit, 26 November 2026

Baseline PR #143 at `6f48a600da1a43fcab6fb256ba59cbd4da45045b`.
Research only. Model status **UNVALIDATED**. Betting publication **BLOCKED**.

## Date-cluster bootstrap

The resampling unit is one Europe/London date, selected uniformly and with
replacement. All paired races from a selected date enter each draw. The
statistic divides the sampled score totals by the sampled race counts.
Equal averaging of date means would target a different estimand. For two
synthetic dates with 18 zero deltas and 12 one deltas, the mixed draw is
0.4. Enumerating the four possible draws gives 0, 0.4, 0.4 and 1. The
separate count-matrix implementation reproduced both endpoints of a
20,000-draw unequal-date example.

Dates and race deltas are sorted before sampling with seed 20261115.
The code now precomputes date totals without changing the draw sequence,
sum order or endpoint indices for the same input. The audit records the
largest date contribution. Tests cover the spring jump, the repeated
autumn hour, and local midnight. The UK transitions in 2026 were
29 March and 25 October. [UK clock changes](https://www.gov.uk/when-do-the-clocks-change)

The 30-race and two-date guards establish when the code computes an
exploratory interval. They give no assurance of 95% coverage. Correlation
between dates, uneven availability, shared providers and repeated horses
can reduce effective information further. This treatment applies to the
retrospective diagnostics. The registered Phase 3 endpoint and interval
implementation retain their original bytes. [General few-cluster context](https://facultysites.dss.ucdavis.edu/research/Cameron_Miller_JHR_2015_February.pdf)

## Synthetic coverage experiment

There were 1,200 independent synthetic samples per cell and 20,000
fixed-seed bootstrap draws per sample. The independent count matrix
reuses those draws across samples. The target is the population
race-weighted mean. All dates are independent in the generator.
The two balanced scenarios have true mean zero. In the informative-size
scenario, 15-race and 60-race dates occur with equal probability and
have means of −0.08 and +0.08. The race-weighted target is +0.048.
Each cell includes Monte Carlo standard error and average interval width
in the [receipt](2026-11-26-horse-date-bootstrap-synthetic.json).

| Independent dates | Balanced IID races | Date-correlated races | Informative date size |
| ---: | ---: | ---: | ---: |
| 2 | 47.8% | 49.1% | 47.0% |
| 5 | 84.0% | 84.4% | 79.0% |
| 10 | 90.5% | 90.8% | 88.6% |
| 15 | 90.8% | 90.0% | 89.8% |
| 22 | 94.2% | 93.5% | 91.6% |
| 30 | 93.2% | 94.0% | 93.2% |
| 60 | 94.4% | 95.2% | 94.2% |

These are finite-sample results under specified synthetic assumptions.
Even at 60 dates they give no general assurance for horse racing.
Two runs with NumPy 2.3.5 and one OpenBLAS thread produced byte-identical
JSON.

## Phase 3 intake and feed freshness

The registered state contains zero paired forecast objects and zero
reviewed results. The workflow inventory has no active Phase 3 schedule.
The one-shot registration and acquisition remain isolated. The production
racing workflows refresh other feeds and research archives.

At 09:41 UTC on 26 November, main commit
`e2ec193c195c68e8a3337ccd7e2c7cfb59c6ae51` contained a context envelope
generated at 05:14 UTC, 267.5 minutes old. The real-clock adapter rejected
it in a disposable store. It contained ten upcoming forecasts. All ten
original runner observations had already exceeded the 30-minute limit
at envelope generation, although all ten later field checks matched.
The context producer reuses the immutable original A forecast when its
field, conditions and inputs have the same signature. A later observation
confirms the current field without refreshing the original runner receipt.
Nineteen other races lacked same-discipline history and six had an
unconfirmed field. [Pinned intake receipt](2026-11-26-phase3-intake-receipt.json)

The most recent listed [fallback workflow run](https://github.com/aurelian2483-cmd/value-watch-lab/actions/runs/45761794300)
at the time of inspection started at 05:28 UTC and skipped discovery
after the bounded refresh gate. The preceding [scheduled run](https://github.com/aurelian2483-cmd/value-watch-lab/actions/runs/45760156214)
started at 05:13 UTC. This establishes the gap in observable refreshes
through this audit. It does not identify the scheduler's internal cause.

The wrapper now records acquisition after the response read, checks the
clock again before validation, and binds local input to its declared
repository, path, commit, SHA-256 and Git blob identity. A supplied
receipt needs external provenance. The fallback distinguishes wrong
London date, stale or empty coverage, and stale, missing or impossible
runner receipts. The operations monitor uses a 30-minute snapshot
threshold for daily racecards and context forecasts and reports
original-runner receipt deficits even with a fresh envelope. Tracked
production snapshots and schedule definitions were not edited.

A qualifying pair still requires a timely original forecast and field
observation, before the five-minute pre-off boundary, plus an
independently reviewable timestamp for the actual paired bytes.
No archived A can be aged forward with a later field check.

### Fresh-feed follow-up

At 09:46 UTC, the read-only test merge
`3963462f774ac16ab5a41050a31785b9547f05de` exposed the 09:38 UTC context
feed from main revision `331a27090bc7d204c578ae9e7579779be448d8aa`.
The real-clock adapter processed 11 forecasts in a disposable store.
Seven passed the existing capture gates and four still had stale
original runner receipts. The probe produced no independent timestamp
attestation and created no entries in the registered ledger.
[Fresh-feed probe receipt](2026-11-26-phase3-fresh-feed-probe.json)

The starting draft contained 478 frozen forecast files. Every one
matches its corresponding blob in the 612-file main snapshot used by
the first intake probe. The later test merge contained 629 forecast files.
The draft did not change any archive file, registered model weight,
protocol, endpoint or evidence object.

## Results and market references

| Candidate | Verified evidence | Admission decision |
| --- | --- | --- |
| British Horseracing Authority | Public official results search. Weatherbys administers the racing database. | Official reference candidate. Result revision history, complete machine-readable extracts and retention rights remain unverified. [Results](https://www.britishhorseracing.com/racing/results/) · [Weatherbys role](https://www.britishhorseracing.com/industry_links/weatherbys/) |
| Sporting Life and At The Races | The 25 November 20:00 Kempton results agreed on the winner, 11 starters and winning time. Sporting Life marked the race weighed in. | Manual cross-check only. Upstream independence is unverified. Sporting Life prohibits automated capture and requires permission for retention or reuse. No publisher body was retained or admitted. [Sporting Life result](https://www.sportinglife.com/racing/results/2026-11-25/kempton/950221/unibets-new-var-goal-guarantee-fillies-handicap) · [At The Races results](https://www.attheraces.com/results/25-November-2026) · [Sporting Life terms](https://www.sportinglife.com/terms-and-conditions) |
| The Racing API | The provider describes its process as aggregation from public records and manual input. Its service terms permit application and analytical use with stated restrictions. | Distinct delivery path only. Upstream independence, exact plan coverage and permission for public retention of raw result bodies remain unverified. [Terms](https://www.theracingapi.com/terms-of-service) |
| Betfair Exchange Historical Data | Provider specification identifies market and runner IDs and publication time in epoch milliseconds. The service is delivered after settlement, with access depending on the package. | Candidate for a separately approved retrospective timing study. Verify period, market type, full runner coverage, pre-off availability and exact usage rights on the selected package. No data purchased or admitted. [Feed specification](https://historicdata.betfair.com/files/Betfair-Historical-Data-Feed-Specification.pdf) · [Release lag](https://support.developer.betfair.com/hc/en-us/articles/360002427051-How-frequently-is-the-historical-data-updated) |
| Betfair daily BSP CSV | Official directory specifies selection IDs, final BSP, and pre-off and morning weighted averages. It documents a 1001 sentinel for cases without a backer at BSP. | Useful candidate for final-price reference only. Aggregates lack a point-in-time quote. Date completeness, exact runner joins and retention rights remain unverified. [History](https://promo.betfair.com/betfairsp/SP_history.html) · [Data dictionary](https://promo.betfair.com/betfairsp/prices/index.php) |

Automated result collection requires an authorised feed or written
permission covering use and retention of the evidence required by the
registered protocol. No production refresh or provider collection was
started during this audit. No current source met all independent
settlement or historical benchmark requirements.
