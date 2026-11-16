# Executed verification and limitations

Phase2 executed locally using Python3.14standard library. All numerical code is compatible with Python3.10+ syntax; other interpreter versions have not been run in this session.

Executed commands from workspace:

```text
python work/phase2/run_phase2.py --bootstrap 10000
python work/phase2/methods/check_foundations.py
python work/phase2/methods/independent_review.py
python work/phase2/build_report.py
```

The analysis script completed21distinct definitions,1596race predictions,58/18 chronological diagnostics and10000draw date-cluster uncertainty. Baseline/A1 checked against existing Phase1 rows; all16masks were not recomputed. Inputs76races/730runner appearances/4038historical observations reconcile. Original percentiles and recency reconstruct exactly. Mean score checks and candidate selections passed independently implemented arithmetic checks (maximum mean error4.44e-16). Positive-temperature and centered-logit rank invariance passed. Mathematical midpoint and ESS properties passed foundation checks. Leave-one-date-out results retained.

Scripts were rerun after portability correction to use packaged inputs instead of an external sibling folder. Complete recomputation in a separate copied directory passed: seven deterministic result files, including all probabilities, scores, uncertainty and walk-forward results, matched byte-for-byte. See CLEAN_COPY_REPRODUCTION.json. Generation timestamps were excluded from the byte comparison.

Limits: internal arithmetic independence is not independent source/outcome verification or the user's forthcoming external review. All76races were already seen. No external library fitting, live browser prediction replay, new data collection, prospective forecast generation, production tests, merges or deployment were run. Source trace and successful Pages workflow metadata do not prove live served-byte/runtime parity.
