# Race 887765 — executed frozen V1 retrospective scoring (15 Nov 2026)

The original frozen V1 `form_features` calculation was executed locally against the separately enriched five-runner record from `horse-v3-race-887765-recovery.zip`. The original archive has not been modified.

| V1 rank | Horse | Normalized heuristic weight | Observed finish | Prior valid Flat runs |
| ---: | --- | ---: | ---: | ---: |
| 1 | Ophelia Grace | 22.9413% | 4 | 3 |
| 2 | Capitalization | 21.1153% | 5 | 4 |
| 3 | Moira Express | 19.3848% | 2 | 3 |
| 4 | Bassenthwaite | 18.5353% | 1 | 3 |
| 5 | Angel Numbers | 18.0233% | 3 | 3 |

- Five of five runners pass the historical count gate (at least three unique prior Flat finishes).
- **Winner ranked first: NO**. **Winner in highest four: YES**. **Four selections overlap with actual first four: 3/4**.
- Ranking uses original `scripts/horse_model_pipeline.py` form-strength and softmax coefficients, not any newly fitted weights.
- This is a **retrospective reconstruction**, not a preserved pre-event forecast: the actual frozen V1 `forecast()` gateway requires pre-event verified race-stage, timestamps, source observation, and active field, which are not present in the retrospective ZIP. The real pre-event gateway was **not** invoked or passed.
- These percentages are **uncalibrated mathematical weights**, not trustworthy win or place probabilities.
- A five-runner race offers no evidence of a standard four-paid-places handicap. No verified Sky Bet extra-place terms, historical odds or EV.
- Sample was selected by available recovery; **not untouched holdout**, **UNVALIDATED**, **publication BLOCKED**, **training_eligible=false**. V1 and V2 production/models unchanged.

Local report + complete five-runner features delivered to user as `horse-v3-race-887765-v1-retrospective-run.zip`. Dataset baseline SHA-256: `92a061307e66fef95cad900cb47ba9034dceee34d4a0a14e78a2e9f09a26af86`.
