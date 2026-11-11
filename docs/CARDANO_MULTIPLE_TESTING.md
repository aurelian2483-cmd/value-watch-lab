# Cardano multiple-testing safeguards v1

Module: `cardano-lab/multiple-testing.js`. Test: `node tests/cardano_multiple_testing.cjs`.

Accepts a declared family of hypotheses with unique IDs, numerical p-values in [0,1], and explicit preregistration flags. Calculates **Holm step-down adjusted p-values** (family-wise error control for valid p-values even under arbitrary dependence) and **Benjamini–Hochberg adjusted q-values** (false discovery rate under independence or appropriate positive dependence). Reports which hypotheses meet a configurable alpha threshold (default 0.05), and identifies exploratory/non-preregistered tests.

**Critical:** These methods do not create valid p-values. The current Cardano scoring, bootstrap and calibration modules do **not** produce p-values suitable for direct input. The researcher must supply independently justified tests, an honest complete hypothesis family, and a documented sampling design. BH may not control FDR with arbitrary dependence. Neither method cures look-ahead leakage, optional stopping, p-hacking, poor calibration or selection bias. Statistical significance does not imply profitable betting or permission to publish selections. Research-only, UNVALIDATED, publication BLOCKED.

Next: verified experiment-family registration, source/outcome provenance, dependent-outcome inference and controlled walk-forward model comparisons.
