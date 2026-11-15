# V3 historical-form recovery checkpoint — 15 November 2026

**RESEARCH ONLY / RETROSPECTIVE / UNVALIDATED / PUBLICATION BLOCKED**

## Provenance inventory

Recovered from the existing isolated V3 research branch without modifying the frozen 2025 source archive:
- Six previously publisher-result-checked historical performance rows, now preserved as [history recovery overlay](../horse-v3/individual-history-recovery-overlay-2026-11-15.json); target races 877817 and 877820.
- Eighteen historical race-ID/date matches for target races 890908 and 894962, from `next-two-18-result-page-matches.json`, with exact URLs from `next-two-exact-result-urls.json`. These are **partial leads**: position, runner count, distance and going deliberately remain null until rechecked.
- Seven of the eighteen matches were rechecked against Sporting Life public result-page text and preserved separately in [published-results-rechecked](../horse-v3/published-results-rechecked-2026-11-15.json). Rechecked rows:
  * Samra Star 4/8 2025-11-20 (Newcastle 890399, 7f14y, Standard) and 4/10 2025-11-07 (Newcastle 888302, 7f14y, Standard);
  * Electric Avenue 1/10 2025-11-07 (Newcastle 888302, 7f14y, Standard) and 3/7 2025-10-17 (Newcastle 884817, 1m5y, Standard);
  * Second Fiddle 1/7 2025-10-17 (Newcastle 884817, 1m5y, Standard) and 1/7 2025-10-09 (Newcastle 883419, 1m5y, Standard);
  * Beach Partee 7/7 2025-12-04 (Chelmsford City 893024, 5f, Standard).
- Retrospective published race results: all single Sporting Life publisher. Rechecking pages is **not independent origin verification**, source bytes and cryptographic hashes have not been retained here, and data first availability before the target is unknown.
- Seven confirmed rows are a **subset** of the eighteen matches, not additive to them. Six previous records relate to other target-race history and are not overlapping rows from the 18.

## Individual-horse demonstration: Electric Avenue for race 890908, Newcastle, 2025-11-24
Target Newcastle 18:15 on 24 Nov 2025, reported by Sporting Life historical race results as Standard / all-weather, **1m5y** (1765 yards). Published result of the target race is already known: Electric Avenue won, so this case is **not blinded or an untouched test**.

Used exactly four *previous* dated, publisher-checked records:
| Previous date | Race ID | Position | Runners | Distance | Going |
| --- | --- | ---: | ---: | --- | --- |
| 2025-07-24 | 869892 | 6 | 9 | 7f 213y | Good (Good to Soft in places) |
| 2025-08-15 | 873695 | 6 | 8 | 7f 218y | Good to Firm (Good in places) |
| 2025-10-17 | 884817 | 3 | 7 | 1m 5y | Standard |
| 2025-11-07 | 888302 | 1 | 10 | 7f 14y | Standard |

Executed the previously committed `scripts/horse_v3_history_reliability.cjs` calculation directly on these assembled inputs (V8 harness; not Node CI):
- `formStrength = 0.5556982635`
- `distance effective sample = 3.6164899584`, reliability `0.4197173067`, adaptive coefficient `0.0629575960`
- `surface effective sample = 1.9870620510`, reliability `0.2843916422`, adaptive coefficient `0.0426587463`
- `deltaLogit = +0.0142654684`.

This is a **single-horse contextual calculation, not a full-field V3 probability, predictive-success measurement, or model evaluation**. Every target runner must have complete comparable, pre-event historical records before the full-field softmax and V1-versus-V3 race result can be correctly calculated. A positive logit increment for an eventual winner on a known historical result must **not** be represented as model effectiveness.

## Remaining gate
1. Check the remaining 11/18 result-page matches for position, actual starters, distance, going and exact horse.
2. Complete all histories for all runners, not merely selected horses; keep excluding races with inadequate data.
3. Capture reliable original source receipts, externally verifiable historical time availability, and independent origin evidence when possible.
4. Apply all-field eligibility gates and compute V1/fixed-V3/adaptive-V3 on identical races, without tuning after looking at results.
5. Preserve original 2025 archive, models, and live site unchanged. This checkpoint is documentary plus a single-horse arithmetic demonstration.
