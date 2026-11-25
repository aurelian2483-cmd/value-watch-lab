# Synthetic forecast verification campaign v1

Separate development branch stacked on verified PR #181 ffd47d864fd1820a7f13a9b66756ee052595e91e. The eight method definitions are already present in mathematical-library batch-001.json and batch-002.json at catalogue revision 0b4773cd00f009416587aee6e95f058fb53026e5. No catalogue entry has been changed or empirically qualified.

Implemented fixed synthetic assessment paths:
- Multiclass Brier score: mean unscaled sum of squared category errors.
- Categorical log loss: no epsilon clipping or hidden finite substitute for zero observed mass; explicit INFINITE_LOSS.
- Ranked probability score: unscaled sum of squared cumulative errors over ordered categories.
- ROC AUC: average rank tie handling; reject absent positive/negative classes.
- Fixed-bin expected calibration error: equal-width bins with left-closed/right-open intervals except final endpoint included.
- Pinball quantile loss and central interval score: directional penalties, validated levels.
- Calibration-in-the-large: fixed-slope logistic offset with bounded root solver; reject boundary probabilities and single-outcome samples.

Seven assessment methods have 32 artificial cases each and the calibration offset has 26, totaling 250 cases. Independent Python Fraction/Decimal oracles reconstruct the inputs, use pair ordering for ROC, product logarithm for log loss, and a closed-form calibration offset for constant synthetic input probabilities. They check all outputs against a predeclared 1e-9 absolute tolerance. All cases are retained, including failures. No observed sports outcomes, historical datasets, holdout or actual predictions are read. No threshold or model selection is performed. Synthetic tests demonstrate software arithmetic, not improvement in prediction accuracy.

CI reruns the original 250 numerical cases plus 250 new cases, checks canonical deterministic replay, verifies independent reference results, rejects changed inputs/flags/tolerance/counts and detects altered numeric output. It records file hashes and a reconciliation summary. Test artifacts expire after seven days. No source mutation, producer dispatch, execution authorization, scientific qualification, merging or deployment. Research UNVALIDATED and publication BLOCKED.
