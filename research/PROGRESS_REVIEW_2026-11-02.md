# Value Watch progress and correctness review — 2 November 2026

## Conclusion and scope

The football and racing lanes are functioning research pipelines. They have not demonstrated reliable predictive superiority or profitable betting value. Model status remains UNVALIDATED, publication BLOCKED, and official challenge 0/100.

Reviewed current main and research/prospective-100 source, active workflow definitions, public snapshots, archive integrity, result validation, revision selection and page error handling. This is a source-and-data audit with targeted regression and browser checks, not proof that every possible defect is absent. No credentials were inspected.

## Verified evidence at the start of review

- 21 Premier League archives: 20 current primary forecasts plus one legacy archive. Hashes, probability sums and pre-event timestamps checked.
- 114 expanded-league forecasts: integrity and capture/input ordering checked in the preceding checkpoint audit; archive loading rechecked with the hardened implementation.
- Eight racing form forecasts and 13 equal-chance reference fields: archive hashes, probability vectors and field identities checked.
- One published provisional racing result: metrics recomputed against its frozen forecast. The published feed also reports second-publisher corroboration; this review does not establish independent underlying data origin.
- No expanded-league scored outcomes. First archived model kickoff is 3 November 2026 at 19:45 UTC; result checking becomes eligible at 22:45 UTC.
- Existing 44 tests passed before changes. The updated suite has 50 passing tests.

## Defects fixed

1. **Premier League final-result rules:** completed ESPN events were not explicitly restricted to FT or checked for the expected competition. Require eng.1 and regulation-time FT. Football-Data corroboration now matches kickoff time interpreted in Europe/London, within 60 seconds, rather than calendar date alone.
2. **Revision reversal:** expanded football and racing could reuse an older A forecast after inputs changed A → B → A, while evaluation continued selecting B. A return to previous inputs now creates a new preserved revision, and an unchanged subsequent refresh reuses that newest revision. Expanded football also rejects duplicate current fixture batches before writing.
3. **Public result integrity:** Premier League ledger/history previously accepted plausible stored metrics without recalculating them from the referenced forecast, and source validation used domain substrings. Both now validate archive hashes, fixture/model identity, exact HTTPS source hosts, scores and recomputed metrics. Existing racing results now validate identity and the primary receipt against their frozen forecast.
4. **Concurrent branch writes:** Premier League synchronization and its result audit used different concurrency groups, and some pushes did not rebase. Shared result-writing concurrency and rebases reduce avoidable push conflicts. Expanded and horse workflows already rebase their distinct files.
5. **Stale racing evidence display:** failed refreshes cleared forecasts but could leave previous evidence/evaluation panels visible. These panels now explicitly clear when the current snapshot cannot be verified.

New tests cover non-regulation results, wrong competitions/kickoffs, altered public result metrics/identities/source hosts, A → B → A revisions, duplicate forecast batches, and altered racing result identities/receipts. Synthetic tests never enter production research ledgers.

## Remaining priorities

### P1 — Complete and monitor real evaluation

- Verify future expanded-league settlements against both publishers, with no retrospective forecast backfill.
- Track expected refreshes, completed runs, snapshot age and unresolved eligible results. A configured cron is not proof that every scheduled invocation occurred; GitHub can delay scheduled work.
- Separate result collection from discovery success. Currently a failed discovery stage can prevent later archive/result processing in the same workflow. Racing can also fail closed on a day with no usable current racecards.
- Add a documented result-correction process. Existing immutable scores are normally skipped on later runs; hash integrity does not detect a publisher amending a previously accepted result. Preserve original settlements and append explicit corrections rather than silently rewriting history.
- Preserve raw result/training evidence beyond temporary artifacts if long-term reproducibility is required. Hashes identify content but cannot reconstruct content once snapshots expire.

### P2 — Strengthen scientific comparisons

- Fixed equal chance is a sanity benchmark, not a strong football model or market benchmark. Add a frozen competition-frequency baseline and timestamped margin-adjusted market comparisons.
- Champions League remains sparse: 4 of 18 fixtures modelled in the expansion snapshot. Test a hierarchical cross-league challenger; do not fill gaps by borrowing unadjusted domestic averages.
- Premier League prior-season source/model labels and the Champions League reference calendar require explicit season maintenance. Add season-readiness alerts before rollover.
- Evaluate opponent adjustment and recency as separate football challengers. Current prior-season scoring baselines are transparent but limited.
- Racing is a form-only all-weather heuristic. Class, distance, going, pace, draw and race strength require separately tested improvements.
- Racing intervals resample whole races but do not account for all meeting/day dependence. Treat them as exploratory; consider clustered evaluation when the sample supports it.
- Freeze promotion criteria and evaluation periods. Neither 30 nor 100 observations automatically establishes model validity.

### P2 — Simplify the product

The root four-sport page retains historical cards and separate older feeds alongside the newer labs. Make the active football/racing lanes and their timestamps the primary view. NFL and tennis should retain explicit coverage states; they are not proven equivalent to the implemented football/racing pipelines by this audit.

No prices, EV estimates, grades, qualified picks, model promotion or challenge credit were created by these fixes.

## Post-fix live verification

- Premier League synchronization run 41543877769 completed successfully, including the hardened tests, archive capture, final-result audit, public-history validation and publication. The archive now has 21 primary forecasts plus the existing legacy record; the current feed has 20 upcoming estimates.
- Racing run 41543877804 completed successfully. All eight archived form forecasts now have provisional scores and second-publisher corroboration; none remains pending. No new post-event forecasts were created. This remains an insufficient sample.
- Football settlement remains correctly withheld for Newcastle–Everton on 2 November: ESPN supplied a final, but the corroborating Football-Data CSV contains no matching fixture row at review time. Both the legacy and current-model records are pending for the same underlying match; they are not two separate match outcomes.
- Website deployment run 41543941118 completed successfully. Browser QA confirmed that stale racing snapshots clear evidence and evaluation panels rather than retaining prior values.

Run receipts:
- https://github.com/aurelian2483-cmd/value-watch-lab/actions/runs/41543877769
- https://github.com/aurelian2483-cmd/value-watch-lab/actions/runs/41543877804
- https://github.com/aurelian2483-cmd/value-watch-lab/actions/runs/41543941118
