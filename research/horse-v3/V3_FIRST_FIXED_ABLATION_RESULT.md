# First V3 fixed-ablation retrospective result — 2026-11-15

**Race:** 887765, Wolverhampton, 2025-11-03, five finishers. Seven prior runs recovered in the separate research overlay. Original archive and V1/V2 left untouched.

The first candidate definitions were fixed as:
- M1 original frozen V1 historical Flat-form softmax.
- M2 form + 0.15 × shrunk similar-distance historical form signal (distance within 20%).
- M3 form + 0.15 × shrunk historical Standard-going signal.
- M4 form + both signals.
All use original 90-day historical decay, five-run neutral shrinkage, maximum six previous results, and original inverse temperature 2. No fitting or retrospective outcome-based optimisation was performed.

| Variant | Winner rank | Top-four overlap | Log loss | Brier |
|---|---:|---:|---:|---:|
| M1_V1 | 4 | 3/4 | 1.6854944516 | 0.8309271403 |
| M2_DISTANCE | 4 | 3/4 | 1.6975984597 | 0.8359250090 |
| M3_SURFACE | 4 | 3/4 | 1.6927837353 | 0.8339626591 |
| M4_BOTH | 4 | 3/4 | 1.7050080663 | 0.8390192510 |

**Result:** All three experimental contextual variants perform *worse* than frozen V1 for this one race. This is exploratory, selected, after-event data, not an untouched validation result. Do not use the result to choose/tune a model and still call it independently tested. A five-runner race is not evidence of four-paid-place each-way terms.

Code: `scripts/horse_v3_experimental_ablations.py` and `tests/test_horse_v3_experimental_ablations.py`. The local proof-of-concept, row rankings, parameters and report were delivered separately in `horse-v3-first-ablations.zip`. CI regression tests for committed module are not yet confirmed as executed. No source-first-availability attestation, calibrated probabilities, price/EV claims, training approval or deployment.

**Release gate: UNVALIDATED / BLOCKED.**
