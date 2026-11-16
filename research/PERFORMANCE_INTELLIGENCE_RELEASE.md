# Value Watch — coordinated Phases 9–14 (staged release, no automatic model certification)

This branch adds the **Performance Intelligence** foundation for all seven sport divisions while keeping the maths and selection systems untouched. It is not proof that the system is profitable or that every research source is complete.

## Phase scope and actual support

| Phase | Delivered in this branch | Remaining external dependency |
| --- | --- | --- |
| 9 Performance Intelligence | Contract-matched accuracy, multiclass Brier, log loss, reliability bins and Wilson 95% hit-rate intervals | Sufficient genuine independently audited prospective outcomes |
| 10 Automated independent result evidence | Existing Tennis/NFL first-source review and NFL TheSportsDB second-source pilot; clearer queue and health states | Proven Tennis second-provider player identities, retired-match semantics and final result provenance; no automatic certification |
| 11 Model-versus-model and baselines | Strict same-event/sport/market/version paired comparison; uniform-probability descriptive baseline | Multiple frozen model versions on the *same fixtures* and credible market/naive reference baselines |
| 12 Weekly reports | Scheduled collector builds a rolling calendar-week report with immutable input fingerprint, seven-sport coverage, review status, score gaps | Observations over time; weekly report regenerates as the week progresses and is not a historical performance backtest |
| 13 Seven-sport integration | One transparent dashboard and source-coverage report for Football, Horse racing, Tennis, NFL, Darts, Rugby Union and Rugby League | Unified pre-event collectors, settlement semantics and independent source verification for the other five sports |
| 14 Final QA and security | Safe DOM text rendering, same-origin CSP, strict no-positive-EV/no-ROI guards, duplicate/chronology tests, browser QA and live-data integration | Independent security review, penetration testing, source licence review and objective prospective performance audit remain necessary |

## Model scoring

Scores from `validation-centre/performance-core.js` are **descriptive only**. A forecast must pass `validation-centre/core.js` pre-event probability/identity rules, and an outcome must pass the existing two-source receipt-contract checks. This is a *machine-checkable metadata contract*, NOT third-party attestation of source authenticity. The model continues to display `UNVALIDATED` and `BLOCKED` regardless of sample size.

- Multiclass Brier: `sum((p_outcome - I_observed)^2)` (lower is better).
- Log loss: `-ln(p_observed)` (lower is better).
- Uniform-probability reference uses `1/K` for the K mutually exclusive outcomes. This is only a weak sanity baseline; it is NOT a betting-market benchmark or a formal model's outperforming achievement.
- Top-outcome hit rate uses a 95% Wilson interval; this interval does not apply to Brier or log loss.
- Five fixed-width confidence bins display observed top-outcome accuracy, mean confidence, counts and descriptive ECE. Sparse bins are misleading; all labels remain UNVALIDATED.
- Model-vs-model comparisons use the same sport, event, market, actual outcome and frozen pre-event probability vectors, excluding duplicate/mismatched final records. One model per distinct `model_version` on each event. Differences are not an independent significance claim.
- Fewer than 30 scored events: TOO_FEW_PAIRED_RESULTS. 30–99: EXPLORATORY_SAMPLE_ONLY. 100+: DESCRIPTIVE_NOT_CALIBRATED. **Even 100+ does not establish model validation or positive EV.**

## Source and pipeline health

`scripts/build_performance_report.cjs` builds `research/performance-report-latest.json` and `research/performance-reports/week-YYYY-MM-DD.json`, where the date is the UTC Monday at the start of the rolling week. All seven sports are listed; source health and capture support are separate columns. Report outputs are on the research-only side and are never interpreted as betting selections.

The existing capture workflow now runs the report generator after provider collection and result reconciliation. Failure must fail closed. It does not write `results-feed.json`, retrospective forecasts, odds, EV, wager recommendation, or betting-approval states.

## Test coverage and release gate

- `node tests/test_performance_intelligence.cjs`: score arithmetic, small samples, Wilson intervals, calibration bins, empty results, chronology/identity, true same-event model comparisons and duplicate exclusion.
- `node tests/test_performance_release_integrity.cjs`: same-origin CSP, DOM text safety, script dependency order, report gating and real archived-record consistency.
- Existing entire `tests/*.cjs` and `tests/*.py` suites, Playwright desktop/mobile QA and combined PR code/current-main data integration are release prerequisites.
- `node scripts/build_performance_report.cjs` should be exercised on a disposable PR checkout and never applied to live archives before the user approves deployment.

**Release policy:** keep this branch/PR unmerged until the user explicitly approves live website deployment. Do not describe this release as completing independent result verification or seven-sport model validation.
