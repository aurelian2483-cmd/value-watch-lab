# Cardano three-outcome research evaluation

Standalone module `cardano-lab/multiclass-evaluation.js` accepts exactly three distinct outcome labels (e.g. HOME, DRAW, AWAY), a complete probability vector for the candidate and baseline, a known outcome, and ordered prediction/event/result timestamps. Each record must be labelled HOLDOUT. The module computes multiclass Brier (sum of squared probability errors per event) and log loss, and returns candidate minus baseline deltas; lower is better.

This is separate from the existing binary evaluator. It cannot prove genuine out-of-sample provenance, prevent hindsight contamination, verify outcomes, adjust market margins, estimate confidence intervals, or validate profitability. No automatic recommendations. Research-only, UNVALIDATED, publication BLOCKED.

Run `node tests/cardano_multiclass_evaluation.cjs`; GitHub Actions runs it alongside the existing contract suite.
