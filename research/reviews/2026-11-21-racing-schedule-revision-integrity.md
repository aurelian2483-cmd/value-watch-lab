# Horse-racing review — schedule-revision evidence integrity

Reviewed `main` at `b7d0ded6bbd03d5329d5fbdfc2f89c526982f8da` on 21 November 2026. This is a research-only review. Model validation remains `UNVALIDATED`, publication remains `BLOCKED`, and no bet or performance claim is created.

## Concrete defect and reversible improvement

Race `950179` moved from 14:48 to 14:49 UTC. The source collector captured a new 14:49 receipt but retained the 14:48 receipt as `PUBLIC_SELECTION_OBSERVED`. That made an obsolete schedule revision eligible to look like active evidence for the current race and caused the committed evidence-integrity test to fail.

`collect_racing_community.supersede_schedule_revisions` now reconciles public selection receipts against the current race ID/start pair. A mismatched prior receipt is retained, not deleted, and relabelled `SUPERSEDED_SCHEDULE_OBSERVATION` with:

- its original verification state;
- the reconciliation timestamp; and
- the current start time that superseded it.

The affected 14:48 receipt was migrated in place. The current 14:49 receipts remain active. Re-running reconciliation is idempotent. This is a source-ledger integrity change only: forecast probabilities, model parameters, frozen forecast archives and settlement records are unchanged.

## Data and model review

- The latest committed racing snapshot was generated at 04:17 UTC. It contained 47 races, 490 active runner observations and no recorded non-runners or withdrawals. At the 08:11 UTC review time it was nearly four hours old, so it must not be described as a current live field or current executable market.
- Archive validators accepted 181 context records, 120 form records, 70 challenger records and 741 uniform-reference records. Between the prior reviewed revision and current `main`, these archive directories contain additions only (100 files), with no modified or deleted frozen records.
- Context/form construction uses only dated prior runs (`age > 0`), enforces a five-minute pre-off capture buffer, rejects stale runner fields, checks active/non-runner consistency, and keeps market prices and target outcomes out of the feature vectors. The trained challenger remains explicitly retrospective; its documentation records that it lost to both original form and uniform baselines on its untouched later test.
- The registered prospective A/B protocol still has zero paired forecasts and zero independently reviewed outcomes. Retrospective and prospective evidence therefore remain separate.

## Descriptive comparisons (not validation)

Using only the currently cross-publisher-corroborated outcome entries for both models, the context/form comparison has 50 identical-field all-weather pairs. Context minus form was -0.000733 Brier and -0.002950 log loss, but both paired bootstrap intervals cross zero (Brier -0.002363 to +0.000730; log loss -0.008815 to +0.003066). No improvement is established.

The existing form baseline has 65 cross-publisher-corroborated outcomes and descriptive deltas versus uniform of -0.007180 Brier and -0.039659 log loss. These are not independent validation: publisher independence is not attested, the sample is selected by available complete fields, and the prospective protocol has no eligible comparisons.

A read-only market diagnostic matched 108 context forecasts to same-field Sky Bet prices displayed by Sporting Life within 30 minutes before forecast freeze; three were excluded. Context was worse by +0.071564 Brier and +0.311337 log loss. These are observed display prices, not independently verified executable or closing prices, so this is a retrospective warning rather than an ROI or closing-line comparison.

## Verification

- `python -m unittest discover -s tests -p 'test_horse_*.py'`: 127 passed.
- `python -m unittest discover -s tests -p 'test_racing_*.py'`: 18 passed (the previously failing committed data check now passes).
- `python -m unittest discover -s tests -p 'test_published_racing_selections.py'`: 6 passed.
- Focused publisher/verdict/community tests: 16 passed.
- Racing context UI checks and the synthetic browser check passed.
- JSON validation and `git diff --check` passed.

`node tests/test_community_evidence.cjs` still fails on current `main` at `Current changed journal revision required`. This failure predates and is unrelated to this schedule-revision fix; it remains a release-blocking integrated-suite gap.

## Remaining gaps

1. Current snapshots depend on scheduled refreshes and were stale at review time; a stored “fresh when generated” label is not proof of freshness when viewed later.
2. No independently attested prospective A/B race/result pair exists yet.
3. Result corroboration is cross-publisher, not proof of independent underlying origins.
4. Market observations are neither verified executable prices nor closing prices.
5. The current main-branch context-vs-form display still uses provisional results; stricter cross-source comparison work remains in draft review.
6. The unrelated community/paper-journal JavaScript integration failure must be resolved before a release claim.

No website deployment was attempted or claimed.
