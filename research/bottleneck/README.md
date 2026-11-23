# Cross-sport Bottleneck evidence review

Reviewed 23 November 2026 at PR #148 head `f684c28d967e10d95f96c8df2a86cd0a97fad1f2`.
GitHub reported default branch `main` at `92d06237e9d7f5ff27294d4c9bf17014173c4ba1`.
The Pages API reported a successful build of that commit from **main / root**.
PR #148 was an open draft with successful [regression](https://github.com/aurelian2483-cmd/value-watch-lab/actions/runs/45107788044)
and [browser and main-snapshot checks](https://github.com/aurelian2483-cmd/value-watch-lab/actions/runs/45107788178).
Its implementation supplied a readiness panel and hid the football-only hybrid on non-football filters.
It did not generate Bottleneck forecasts. This follow-up keeps that work and separates Union and League.

## Readiness at the pinned revision

Counts below belong to different evidence tiers and overlap. A forecast count does not establish a correctly matched result, and absence from a snapshot does not establish absence from a league. The [machine inventory](inventory.json) gives per-competition, tour, or course counts, event-date bounds, selected source receipts, revisions and SHA-256s. Dated snapshots are as captured, with any expired records still useful for diagnosis. Existing desk cutoffs remain authoritative for current display.

| Lane and market | Stored evidence | Bottleneck disposition |
| --- | --- | --- |
| Football · regulation 1X2 | Premier League 40 fixtures and 40 experimental model rows; expanded 212 fixtures and no current forecast rows; international one friendly with one forecast. Separate archive has 608 reconstructed PL forecasts from 733 date-only source finals across two seasons. Expanded archive has 66 receipt-linked two-source finals. | Existing V0 retrospective experiment only. Its 288-fixture evaluation has been inspected. Need a fresh window, frozen pre-kickoff predictions and as-of source receipts. |
| GB/IRE racing · win, named field | 38 day racecards, 145 future rows and 14/11/11 context/form/challenger forecast rows; form/context/challenger provisional scored archives contain 95/136/61 rows respectively, with overlap. Another provider archive has 712 records. The locked A/B has 0 paired forecasts and 0 reviewed outcomes. | Keep form/context models. The 76-race A/B history has already been examined. Need one immutable pre-off field per race, exact runner crosswalks, independently adjudicated results, and a new window. |
| Tennis · ATP/WTA match winner | 7 WTA fixtures and 4 current estimates; no ATP fixture in this snapshot. 44 frozen ledger predictions, 38 primary observations and 23 secondary claims. No contract-matched verified outcomes. | Fixed K24 Elo stays experimental. Need retained tour/surface-tagged match history, stable player IDs, exact independent finals and retirement/walkover adjudication. |
| NFL · three-way including overtime | 18 fixture rows and 18 estimates across weeks 11–12; 30 ledger predictions. Two primary observations, two secondary claims, no verified settlement in the unified feed. | K24 Elo with tie prior stays experimental. Need a retained complete multi-season exact-ID game history and independent overtime/settlement review. A scoring-margin candidate can use earlier game scores; availability features require their own pre-kickoff timestamps. |
| Darts · match winner | 80 delayed date-only result rows; 9 timed and 12 tentative fixture entries. 9 analysis rows in the D1 Elo snapshot; 10,521 training observations are reported but their raw history is not published. | Need retained full paginated match history, exact provider-to-official IDs, true start times, format and leg/set scores. Date carriers cannot establish time of play. |
| Rugby Union · Pro D2 regulation result | 81 LNR source-observed finals, 16 clubs, 6 Pro D2 fixtures in the current sampled schedule. No independent finals in the Pro D2 extract. | Completed a limited date-ordered screening. No current Bottleneck estimates or eligibility. The existing experimental Pro D2 Elo baseline remains available when its existing checks pass. Other Union competitions are schedule-only for this research. |
| Rugby League · NRL | No League rows in the provider sample; separate official calendar. Archived replay requires an external match CSV absent from this repository revision. | Need stored exact historical outcomes and event IDs, confirmed timing, retained inputs and a League-specific baseline. |
| Basketball | Discovery coverage only, no connected history, outcomes or model inputs. | Blocked pending permitted event identity, scores and time-safe history. |
| Cricket | Discovery and manual links, no connected history, outcomes or model inputs. | Blocked pending permitted format-specific fixtures, rules, scores and time-safe inputs. |
| Golf | Directory/manual lookup, no connected tournament/round history or model inputs. | Blocked pending tournament, round and participant IDs, times, results and retention approval. |

The [verified outcome feed](../../results-feed.json) is empty. The separate [performance report](../performance-report-latest.json)
has 74 ledger forecasts and zero contract-matched outcome pairs. Expanded football finals belong to
a different archive contract and are not counted in that zero. No sport earns the second star.

### Source, identity and cutoff notes

- **Football.** [Replay documentation](../football-baseline-v1/README.md) identifies the pinned
  openfootball public-domain commit and strictly prior-date reconstruction. The 608 fixture keys
  use season, exact ordered names and date. Date-only results give no quote time or evidence the model
  ran before kickoff. The expanded [observations](../../football-expanded-data.json) use ESPN event IDs
  in schedules and ordered league/teams/zoned kickoff in archived finals. All 66 finals pass
  [the existing two-receipt filter](../../football-match/history.js). Breakdown: Championship 24,
  Champions League 4, Bundesliga 9, Ligue 1 9, Serie A 10 and La Liga 10. Their exact dates and
  a sample ESPN/Sky Sports hash and observation pair are in the inventory. The legacy 18 rows
  reduce to 16 exact keys before alias mapping. Keep separate the 768 single-source
  [open-matchday results](../../historical-reliability-data.json), including 72 Europa League rows.
  The [previous pilot](https://github.com/aurelian2483-cmd/value-watch-lab/tree/bd048d782e0fe1b9ef6364662d301e920bad658b/research/football-verified-results-pilot)
  found 51 candidates on its older sample, 4 repeats after aliases and 0 additions. Those candidate
  counts are not treated as a retest of the newer feed. Its rights review records non-commercial
  attribution limitations and unresolved upstream rights. Training totals in league audits count
  collector inputs, not certified finals. Some schedule divisions have source errors or sparse dates.
- **Racing.** The [racecards](../../racing-research-data.json) identify Sporting Life race and runner IDs,
  runner observation time and content hash, with a separate The Racing API schedule/going cross-check.
  The day feed is a partial GB/IRE sample and has a 30-minute card/source policy. Future listings and
  provisional runners are not confirmed fields. Records from different archives can refer to the same
  race or carry distinct provider IDs. The 712 second-source files are observations, not 712 verified
  matches to primary forecasts. [Locked endpoint](../horse-ab-phase3-master-20261115/LOCKED_PRIMARY_STATUS.json)
  explicitly has zero pairs. [Archived A/B](../horse-ab-phase3-master-20261115/EXECUTIVE_REPORT.md)
  and Sky 81 are already-examined research; the 81 canonical settings are not 81 validated predictors.
- **Tennis and NFL.** [Collector](../../scripts/collect_other_sports.py) retains ESPN event IDs,
  ordered participant IDs, source time and digest, plus the training count and digest. The daily
  archives preserve those snapshot receipts, not the full match-row histories consumed to fit Elo.
  Tournament pages and missing draws cannot establish a player result. NFL secondary records can
  carry a separate nflverse game ID or a TheSportsDB claim. [Adjudication](../RESULT_REVIEW_README.md)
  and [NFL source review](../SECOND_PROVIDER_NFL_README.md) do not establish independent upstream
  provenance simply because two hosts match. Snapshot freshness limits remain 36 hours for the desk.
- **Darts.** [Feed](../../darts/feed.json) preserves provider result/fixture IDs and date precision.
  Each of three sampled historical days was paginated with more rows indicated.
  The [D1 snapshot](../../darts/analysis.json) retains source digests and a training date, with
  no published full training log. [Source notes](../darts/SOURCE_INTEGRATION_2026-11-15.md)
  cover the API and PDC identity limitations. Scheduled times and single-source results do not
  supply a proven event crosswalk.
- **Rugby.** [Schedule](../../rugby-research-data.json) reports 14 of 14 sampled days, with a
  truncation warning and no completeness claim. TheSportsDB provider IDs and official NRL
  schedule rows remain distinct. [LNR extract](../../rugby/pro-d2-results.json) carries round URLs
  and hashes plus match URL IDs and club slugs. It has 12 receipt entries and dates only.
  The complete earlier rounds support a chronological retrospective replay. The later snapshot
  does not attest when scores became available to a historical prediction system.
- **Discovery lanes.** [Data rights and availability ledger](../../docs/phase69-free-source-coverage.md)
  records what is known about anonymous source access and reuse. Basketball/cricket discovery,
  golf directory links and copied visual references do not supply historical outcome evidence.
  This review does not confer new data rights or collect new provider data.

## Experiment results

**Football.** The existing [V0 implementation](../football-baseline-v1/bottleneck-v0.mjs)
compared 19 configurations including the baseline, using 320 fixtures for selection and
288 for evaluation, with strictly earlier dates for features. It tested recent, venue and
form-shock goal differences against a reconstructed Poisson form baseline. The historic
[isolated workflow](https://github.com/aurelian2483-cmd/value-watch-lab/actions/runs/44745585507)
completed. Its score output could not be recovered in this review. We did not rescore
an already-opened confirmation set or substitute baseline-only metrics. There is no
Cubist deployment or cross-sport reuse in the reviewed paths. No time-matched benchmark
was used for a new experiment.

**Rugby Union, Pro D2.** [Frozen protocol](PRO_D2_PROTOCOL.md) and [full result](pro-d2-screening.json).
A capped prior points-margin adjustment was added to the conditional home/away log odds
from the existing Elo specification. It preserved the draw prior. Chronology used 40
warm-up records, 16 diagnostic matches, 24 evaluation matches across 6 dates and one
excluded incomplete round row. Same-day outcomes cannot affect one another. No market
benchmark or actual prospective feature receipt was available.

| Window | Common sample | Elo log loss → challenger | Elo Brier → challenger |
| --- | ---: | ---: | ---: |
| Diagnostic | 16/16 | 0.87423 → 0.86879 | 0.52032 → 0.51503 |
| Held out from candidate design | 24/24 | 0.73020 → 0.71920 | 0.42819 → 0.41907 |

The paired date-cluster 95% bootstrap interval for challenger minus Elo was **−0.02302 to +0.02202**
for log loss and **−0.02048 to +0.02206** for Brier. The log-loss change was worse in
one of three evaluation rounds. There were 20 home wins, one draw and three away wins.
Average top confidence was 55.2% for Elo and 56.9% for the challenger, with top-label accuracy
83.3% and 79.2% respectively. The small, home-skewed, single-season sample cannot establish
calibration by class, stability across seasons or incremental predictive value. No tuning
or promotion followed this result.

## Reproduction and release review

```sh
python research/bottleneck/inventory.py > /tmp/value-watch-bottleneck-inventory.json
diff -u research/bottleneck/inventory.json /tmp/value-watch-bottleneck-inventory.json
python research/bottleneck/pro_d2.py > /tmp/value-watch-pro-d2-screening.json
diff -u research/bottleneck/pro-d2-screening.json /tmp/value-watch-pro-d2-screening.json
node tests/test_bottleneck_readiness.cjs
python -m unittest discover -s tests -p test_bottleneck_research.py
node scripts/dashboard_shell_browser_qa.cjs
```

The desk shows baseline availability, a separate unavailable Bottleneck field, lane-specific
evidence and the independent second-star requirement. The original first star, prices,
model outputs, rankings, EV, qualification, stakes and slips use their existing paths.
Release of the readiness UI requires review of this stacked draft and PR #148. Enabling
a Bottleneck estimate or second star requires a separate sport-specific release review
with predeclared out-of-sample results, independent outcome evidence, time-safe inputs,
calibration and incremental-value evidence. **UNVALIDATED / BLOCKED.**
