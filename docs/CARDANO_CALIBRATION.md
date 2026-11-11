# Cardano calibration diagnostics v1

Module: `cardano-lab/calibration.js`. Test: `node tests/cardano_calibration.cjs`.

Uses the binary holdout input contract from `evaluation.js` and bins forecast probabilities into equal-width intervals (2–20 bins, default 10). For each bin, calculates count, mean predicted probability, observed outcome frequency and absolute gap. Expected calibration error (ECE) is the sample-weighted average of absolute gaps. Flags populated bins below a configurable minimum sample count (default 30). Empty bins are displayed with null averages.

**Limitations:** ECE is sensitive to bin boundaries, sample size and selection bias. Small-sample flags are warnings, not a confidence interval. The module cannot verify actual holdout provenance, independent outcomes, market odds or positive expected value. It is not a model approval system. All outputs remain research-only, UNVALIDATED and publication BLOCKED.

Future work: reliability diagrams, bootstrap uncertainty, adaptive binning, three-way calibration and independent data provenance checks.
