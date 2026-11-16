# Independent Phase 1 and Phase 2 reproduction

Status: **PASS for software/arithmetic reproduction; research remains UNVALIDATED/BLOCKED.**

## What actually executed

The complete existing Phase 2 ZIP was CRC-checked and extracted to a separate `phase2_snapshot/` directory. Original workspace Phase 1/Phase 2 files and the source ZIP were not edited. From the extracted directory, these commands ran successfully:

```text
python run_phase2.py --root . --bootstrap 10000
python methods/check_foundations.py
python methods/independent_review.py
```

`run_reproduction.py` then independently recalculated every Phase 1 mask using the preserved historical finishing percentiles, date-derived recency, similarity values and winner identities. This was audit reproduction of the archived sixteen definitions, not a renewed feature search, retuning or selection exercise. It also separately recalculated log loss, multiclass Brier and first-choice hits from every Phase 2 saved probability vector.

Executed commands, actual interpreter path/version, UTC start/end timestamps, stdout, stderr, input hashes and outcomes are retained under `executed/`. No command failed. No historical source collection, model fitting, new outcome verification or prospective observation is claimed.

## Reconciled counts and definitions

- 76 unique race identities; 730 runner appearances.
- All 16 Phase 1 factor masks, preserving the historical-form anchor.
- All 21 Phase 2 model definitions, with 1,596 candidate/race probability vectors.
- Phase 2 development/later diagnostic counts reconcile to 58/18 races; the runner counts reconcile to the saved machine-readable summaries.
- The development-selected challenger remains `E_NODIST_half_life_inverse_temperature`: distance off, half-life 45, neutral prior 5, inverse temperature 4. No candidate was retuned or substituted.
- All 16 Phase 1 first-choice totals and per-race scores match their archived references within 1e-12.
- All Phase 2 score totals and first-choice counts reconcile. The included independent checker also verifies all nine expanding-date selections, normalisation and positive-temperature/centered-logit ranking invariance.

## Exact deterministic-output reproduction

SHA-256 byte equality was confirmed before-versus-after rerun for:

1. `candidate_definitions.json`
2. `metrics_and_uncertainty.json` — including bootstrap intervals and calibration bins
3. `race_comparisons.csv`
4. `race_type_diagnostics.json`
5. `runner_predictions.jsonl`
6. `summary.csv`
7. `walk_forward_diagnostic.json`

All seven match exactly. Input hashes are unchanged. The regenerated run receipt has a new execution timestamp, as expected; it is not claimed byte-identical to the original receipt. Precise arithmetic discrepancies are in `executed/REPRODUCTION_RECEIPT.json` and `phase1_reproduced_all16.json`.

## Scope of independence and remaining limitations

The Phase 1 calculations and Phase 2 probability rescoring use separately written arithmetic. Phase 2 candidate generation/uncertainty reproduction executes the provided original script, independently checking deterministic output rather than inventing a different statistical method. Matching its bootstrap output does not establish correct frequentist coverage or an independently validated model improvement.

Every race had already been examined in earlier research. There are zero new prospective races and zero independently verified outcomes in this reproduction task. Source hashes establish exact artifact identity, not independent first availability or correctness of the underlying single-publisher results. No conclusion of calibration, profitable betting or model-promotion readiness follows from these successful checks.

## Portable use

From this directory:

```text
python run_reproduction.py
```

Requires Python 3.10+ standard library. Executed here with Python 3.14. The complete `phase2_snapshot/` supplies the inputs and scripts; no credentials, paid services, private sibling directories or network connection are needed. Running again overwrites only this reproduction copy's generated outputs/logs, never the original source ZIP or production repository.

The original `phase2_snapshot/PACKAGE_MANIFEST.json` describes the original ZIP contents. Its execution receipt timestamp deliberately differs after reproduction; consult this task's own receipt and the final master package manifest for reproduced-copy identity.
