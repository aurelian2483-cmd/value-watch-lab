# Cardano research evaluation v1

Module: `cardano-lab/evaluation.js`. Test: `node tests/cardano_evaluation.cjs`.

The module accepts pre-existing binary-outcome holdout records with unique IDs, probability and baseline probability in (0,1), observed outcomes 0/1, and chronological prediction, event and resolution timestamps. It rejects training-labelled records and invalid inputs. It calculates mean Brier score and logarithmic loss for both model and baseline; lower is better. Deltas are model minus baseline, so negative deltas indicate improvement on the supplied sample.

**Limits:** The module cannot prove the split was genuinely out-of-sample, independently verify timestamps or outcomes, prevent source leakage, or establish significance, calibration, EV, or profitability. Multiclass markets (including football draws), correlated selections, overround adjustments, confidence intervals, walk-forward evaluation and reliable provenance are not yet implemented. It makes no betting recommendations. Models remain UNVALIDATED and publication BLOCKED.

Future work: independently timestamped predictions, real outcome reconciliation, temporal backtests, calibration bins, uncertainty intervals, and multiple-testing correction. Do not use synthetic tests as evidence of predictive skill.
