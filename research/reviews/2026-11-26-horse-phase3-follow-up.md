# Phase 3 intake and dependence audit follow-up

This review follows draft PR #143 from `716ffb4897bff4ff8aaaeeb1e9c05f3d9556d4e8`, which contains the requested `6f48a600da1a43fcab6fb256ba59cbd4da45045b` checkpoint. Model status is **UNVALIDATED** and betting publication is **BLOCKED**.

## Race-date intervals

The count-matrix oracle and unequal-size example reproduced the race-weighted date bootstrap. Sampling dates uniformly and dividing the sampled total delta by the sampled number of races targets a race-weighted mean. The retrospective code uses sorted inputs, a fixed seed and deterministic endpoint ranks. Its ranks are 500 and 19,499 using zero-based indexing for 20,000 draws. The locked Phase 3 implementation uses ranks 499 and 19,499. Both conventions remain as recorded.

The original independent-date simulation reproduced byte for byte. Its 47–49% coverage with two dates is consistent with an exact simple case. For two independent continuous, symmetric and equal-sized dates, the percentile interval covers the true centre only if the two date means bracket it. That event has probability 50%, regardless of the number of races per date. The 30-race floor therefore cannot establish adequate precision.

The follow-up [serial stress test](2026-11-26-horse-date-bootstrap-serial.json) uses stationary Gaussian date shocks and independent race noise, with 30 races per date and a known race-weighted population mean of zero. Adjacent-date correlation applies to the daily shock. The experiment uses 1,200 trials per cell and 20,000 bootstrap draws per trial. The receipt includes the analytic and observed standard deviations of the sample mean. Two runs under NumPy 2.3.5 with one OpenBLAS thread matched byte for byte.

| London dates | Zero correlation | Correlation 0.3 | Correlation 0.6 |
| ---: | ---: | ---: | ---: |
| 5 | 83.42% | 72.83% | 53.83% |
| 15 | 91.83% | 82.67% | 66.00% |
| 22 | 93.33% | 82.42% | 64.08% |
| 60 | 94.17% | 84.17% | 67.42% |

With 60 dates and correlation 0.6, the true sampling standard deviation was 0.02047 versus 0.01059 with independent dates. The average bootstrap interval width fell from 0.04110 to 0.03972. This quantifies the failure mode when sampling whole dates still treats dependent dates as exchangeable. The correlation values are synthetic stress settings. No racing data or Phase 3 outcomes entered the experiment.

```sh
OPENBLAS_NUM_THREADS=1 python scripts/audit_horse_date_bootstrap.py --serial /tmp/horse-date-serial.json
cmp /tmp/horse-date-serial.json research/reviews/2026-11-26-horse-date-bootstrap-serial.json
```

## Phase 3 intake and freshness

The [earlier fresh-feed probe](2026-11-26-phase3-fresh-feed-probe.json) found seven technically eligible pairs at 09:46 UTC. The [real-clock recheck](2026-11-26-phase3-expired-feed-recheck.json) at 10:30 UTC used the identical 09:38 feed and verified its bytes against the pinned Git commit tree. By then all 11 listed forecasts failed on stale current-field observations. An additional 17 races had insufficient same-discipline history and seven lacked verified going. The registered ledger still held zero forecasts and zero result objects.

The one-shot adapter now validates upstream exclusion rows before invoking the frozen inspector. Previously the inspector could append a pair and then encounter an invalid exclusion row in the same response. The adapter now links the acquisition receipt to the parsed feed digest, reports original Git/source identity and exclusion counts, and rejects a backwards clock jump before enrollment. Its `--probe` mode uses the existing registration with an empty temporary ledger and deletes temporary records on success or failure. It exercises the real intake code with the real clock. Revision conflicts against existing forecasts are covered by the registered regression suite.

The fallback gate now identifies a newly generated daily snapshot with upcoming races and zero observed runner fields. The operations monitor requires zoned racing timestamps, reports invalid schedules and the five-minute cutoff, and checks timing, runner IDs and context signatures on current-field receipts separately from original receipt age. These checks identify why a fresh-looking envelope can be unusable. GitHub scheduling remains best effort.

Phase 3 is a manually invoked isolated intake. No active Phase 3 schedule was found, and the existing scheduled horse workflow targets a different research archive. Later matching field checks cannot refresh an original A receipt. Independent timestamp attestation must cover actual A/B bytes and their pre-event availability. The registered state, model code, protocol and fixed-window evaluator have the same file contents as the PR baseline.

## Source evidence and access

| Candidate | Verified scope | Remaining evidence requirement |
| --- | --- | --- |
| BHA and IHRB | BHA exposes an official results search. IHRB provides Irish stewards reports and non-runner notices. | Verify permission to retain raw result evidence and obtain complete fields and revision history. IHRB notices can corroborate changes and adjudications within their scope. [BHA results](https://www.britishhorseracing.com/racing/results/) · [IHRB raceday resources](https://www.ihrb.ie/Raceday) |
| RMG, PA Betting Services, and ARC | RMG offers licensed race-day results and withdrawals for its 37 listed courses and names PA as the supplier. ARC's older PA announcement and its separate ATR/Ascot rights agreement show why lineage and licensed scope need checking by course and period. | Verify exact country, course and date coverage, upstream lineage, finality and amendment times, and raw retention in writing. Two delivery brands may share the same underlying feed. [RMG race-day data](https://racecoursemediagroup.com/structure-area/race-day-data/) · [PA announcement](https://pa.media/blogs/company-news/arc-appoints-pa-as-its-official-data-partner/) · [ARC rights agreement](https://www.arenaracingcompany.co.uk/media-centre/news/industry-news/arc-atr-and-ascot-racecourse-sign-major-rights-agreement) |
| SPRC starting price | Published methodology selects a UK bookmaker sample at the off. | Scope any licensed extract as a final market reference. Establish race and runner completeness, timing and revisions through permitted receipts. Aggregate SP gives no specific Sky Bet quote. [SPRC rules](https://www.thesprc.org/rules-regulations/) |
| Betfair Exchange Historical Data | Basic carries one-minute traded-price and market-definition updates. Advanced adds one-second best back/lay offers and traded volume. Pro supplies tick-level depth. Data are released after settlement. Betfair's published terms limit the standard use to personal/internal research and restrict onward distribution. | Obtain permission for any repo retention or downstream use. On entitled data, reconcile the full WIN field and withdrawals to independent official IDs and verify the publication timestamp and in-play transition. Completeness and executable Sky Bet quotes remain unverified. [Packages](https://support.developer.betfair.com/hc/en-us/articles/360002407812-What-data-packages-are-available) · [Release timing](https://support.developer.betfair.com/hc/en-us/articles/360002427051-How-frequently-is-the-historical-data-updated) · [Terms](https://historicdata.betfair.com/Betfair-Historical-Data-Feed-Specification.pdf) |

No external dataset or raw publisher result body was admitted in this follow-up. The project needs a fresh eligible feed and an independently timestamped capture path for prospective collection. Reviewed settlement additionally needs two permitted evidence sources with retained bodies, exact identity reconciliation and human review. A historical benchmark needs its own coverage and timing audit.
