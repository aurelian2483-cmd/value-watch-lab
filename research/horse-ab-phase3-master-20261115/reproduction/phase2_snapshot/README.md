# Value Watch Phase2 independent-review package

Start with INVESTIGATION_REPORT.md. Every result is research-only, UNVALIDATED/BLOCKED. No production replacement is established. PROSPECTIVE_PROTOCOL.md is prepared, not running.

## Reproduce offline

Python3.10+ standard library. From this extracted directory:

```text
python run_phase2.py --root . --bootstrap 10000
python methods/check_foundations.py
python methods/independent_review.py
python build_report.py
```

No external packages, credentials, network or shell setup required. The first command recomputes Phase2's21definitions and uncertainty; it does not rerun the Phase1 sixteen-mask search. All original Phase1 scores are retained as inputs. A run receipt pins plan/code/input hashes; timestamps may change on reproduction.

## Contents

- ANALYSIS_PLAN.md: locked before Phase2 scores; not public preregistration.
- INVESTIGATION_REPORT.md: full report,21candidate definitions/results, failures, interpretation and decision.
- inputs/:76archived derived races, original16-mask scores, recovered positions/fields/race types.
- results/:definitions, per-runner vectors, per-race paired results, split metrics, calibration, confidence bands, subgroup results, walk-forward diagnostics, audit and receipt.
- identity/:Hub source trace, exact pinned source files, deployment metadata and archive inventory.
- methods/:theoretical review, source links, independent calculation check scripts/receipts and leave-one-date-out sensitivity.
- PROSPECTIVE_PROTOCOL.md: exact frozen challenger and future evaluation requirements.
- VALIDATION.md: executed commands and testing limitations.
- PACKAGE_MANIFEST.json: SHA256of packaged files excluding itself.

The ZIP includes full per-runner predictions and inspected source copies. The research PR may omit the large generated runner_predictions.jsonl; running run_phase2.py regenerates it exactly from included inputs before the independent checker runs.

## Decision

Retain current context model. The selected research challenger removes distance, uses half-life45/prior5/inverse-temperature4. It improves exploratory scores but has zero untouched evaluation races, mixed calibration/hit results and wide multiplicity-aware uncertainty. No profit or approved model-promotion claim.
