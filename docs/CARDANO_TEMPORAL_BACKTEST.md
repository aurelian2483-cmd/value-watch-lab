# Cardano temporal fold audit v1

`cardano-lab/temporal-backtest.js` accepts externally produced, HOLDOUT-labelled binary forecasts with event IDs, fold IDs and a training cutoff timestamp. It sorts events chronologically, rejects repeated event IDs, enforces training cutoff before forecast issuance and before the first forecast in each fold, and rejects overlapping chronological folds. It reports Brier and log-loss deltas against a baseline per fold and overall, with low-sample warnings.

This is a **chronology audit**, not a complete walk-forward model trainer. It cannot establish that historical feature inputs were actually available at the training cutoff, detect all leakage, verify outcomes, or guarantee independent folds. Multiclass and multi-sport model integration remain future work. It does not create or publish picks. Models remain UNVALIDATED, publication BLOCKED.

Run `node tests/cardano_temporal_backtest.cjs`.
