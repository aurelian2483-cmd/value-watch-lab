# V3 individual-history recovery — completed 11-result checkpoint (2026-11-15)

**Research only / UNVALIDATED / publication BLOCKED.** This document is not a full-field performance test.

## Recovery completed
All 11 previously unresolved historical race matches from the 18-item list were manually reopened against the listed Sporting Life publisher result pages and checked for horse displayed, date/race ID, finishing position, final runner count, published distance and going. Saved as [remaining 11 rows](../horse-v3/remaining-11-results-rechecked-2026-11-15.json). Together with [seven previously rechecked rows](../horse-v3/published-results-rechecked-2026-11-15.json), these cover all 18 identified race-page matches. They are retrospectively publisher-checked, not independent cross-provider confirmation, and historical first availability remains unknown. Separate six earlier verified records belong to different 2025 targets.

For the six horses associated with target races **890908** (Newcastle 2025-11-24, 8 historical finishers) and **894962** (Wolverhampton 2025-12-22, 5 historical finishers), complete the reconstructed prior histories from these 18 records. Electric Avenue's two separate earlier verified rows on 2025-07-24 and 2025-08-15 were also reused only for that horse (horse 1105875), because their dates precede the later 2025-11-24 target; do not double-count within the same target/race ID.

## Executed exact individual reliability calculation
Source formula: [horse_v3_history_reliability.cjs](../../scripts/horse_v3_history_reliability.cjs). Pulled the committed script and evaluated the supplied historical rows in a JavaScript V8 harness. Recomputed target race context strictly as a matching filter: target 890908 Standard 1m5y (1765 yards), target 894962 Standard 5f21y (1121 yards).

| Target race | Horse | Prior unique results | Distance adaptive coefficient | Surface adaptive coefficient | Logit delta |
| --- | --- | ---: | ---: | ---: | ---: |
| 890908 | Samra Star | 3 | 0.055858 | 0.055858 | +0.009335 |
| 890908 | Electric Avenue | 5 | 0.071969 | 0.055621 | +0.022980 |
| 890908 | Second Fiddle | 3 | 0.056227 | 0.056227 | +0.034113 |
| 894962 | Beach Partee | 3 | 0.055978 | 0.055978 | -0.007976 |
| 894962 | U S S Charleston | 3 | 0.055221 | 0.025000 | -0.004428 |
| 894962 | Mister Moet | 3 | 0.055179 | 0.042769 | -0.016657 |

Machine-readable results: [six-horse-adaptive-context](../horse-v3/six-horse-adaptive-context-2026-11-15.json). This confirms differentiated adjustments with actual published historical rows, **not** model predictive power. The historic race outcomes were known during source recovery. Positive or negative deltas are relative rankings, not probabilities of a win.

## Full-field eligibility
- **890908**: only 3 of the published 8 target runner histories reconstructed here.
- **894962**: only 3 of the published 5 target runner histories reconstructed here.
- Neither can pass full-field V1/V3 eligibility on this overlay alone; no race probability vector, V1-V3 log loss, Brier, or selection/ROI can validly be computed.
- The 2025-autumn original ZIP was previously reported missing complete past forms for all 117 target races. Do not overwrite or infer missing-runner history.
- Historical published result runner counts are not guaranteed to equal pre-event forecast fields, so pre-off nonrunner attestation also remains outstanding.

## Next precisely scoped recovery
1. Obtain all target runner IDs from immutable 2025 autumn source archive if accessible, and list the 5 outstanding histories for 890908 and 2 for 894962 by exact horse ID.
2. For those horses, recover at least three earlier Flat race results each with source race ID, published final runners, finish, distance, going and chronological integrity; retain all missing/excluded data transparently.
3. Determine whether independent point-in-time evidence exists; if unavailable, confine the eventual full-field comparison to **retrospective exploratory**, not untouched pre-race validation.
4. Only after complete target fields and exact record checks, compute matched full-field V1 / fixed V3 / individual-adaptive V3 scores; do not optimize coefficients on these two results.
5. Keep race-characteristics adaptive model and live production unchanged.

## Source reference
Historical race pages linked individually in the saved 11-row JSON. Both target race meeting listings:
- https://www.sportinglife.com/racing/results/2025-11-24
- https://www.sportinglife.com/racing/results/2025-12-22

No tests on new untouched races, no CI execution, and no live site changes were claimed during this recovery.
