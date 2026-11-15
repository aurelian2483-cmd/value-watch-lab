# Model identity and fresh-data audit

## Final snapshot recheck

At newer main commit `43065553c327a95904fe4d4ddaebccc75616fbd2`, provisional context ledger blob `3bf9fbaa2728448146b8cc5728bd00d216f3cbb8` still contains the same76 scored races. Compared every race ID, forecast hash, winner ID, log loss and Brier score against the original experiment inputs: zero additions or changes, and zero amendments. The ledger diff updates fetch-attempt counts and source recheck timestamps/receipts for existing races only. New metadata does not add validation races or change the reported numerical results. `late_snapshot_ledger_check.json` records the comparison.

## Deployment parity addendum

Repository Pages workflow run `43744266481` completed successfully for the exact audited commit `69582ebc3d2196e2fb35276d8233c0e1f0d826bc` (created2026-11-15T18:00:31Z). This supports successful deployment workflow metadata, not independent confirmation of the bytes currently served or the browser runtime. Direct read-only access to the public Pages URL was unavailable through the web retrieval tool; no live bundle or displayed-card parity was verified. Report the model identity as pinned repository source identity. During this check a newer main commit `8c3b4e2054cf55303f4a0c4ec64641f647193289` had a Pages run `43754330321` in progress (created19:46:57Z). Do not imply that the latest deployment finished or that the current user's displayed runtime was inspected.

Pinned main: `69582ebc3d2196e2fb35276d8233c0e1f0d826bc`. Pinned isolated V3 branch: `95b7d4137a11c25f84d669d759613fd581aff72b`. `manifest.json` records immutable Git blob IDs for every inspected source.

## What the Betting Hub actually uses

`index.html` loads `paper-lab/horse-v3plus.js`, `engine.js`, `desk.js` and `racecards-core.js`. `desk.js` sources `horse-predictions-data.json` as racing-context, alongside `racing-research-data.json`. `engine.js` calls `Cards.contextForecast(race,contextFeed,now)` and transfers each matched runner's `model_probability` to the card choice. `racecards-core.js` explicitly requires model `CONTEXT_FORM_RESEARCH_V1`, matching race/start/field, fresh runner checks, UNVALIDATED/BLOCKED and no odds/EV. Collector path is `discover_horse_races.py` -> `enrich_horse_runners.py` -> `horse_context_pipeline.py`; `horse_refresh_cycle.sh` publishes the resulting context and prediction feeds.

The V3+ module is explicitly an evidence/provenance label, not a selection engine. It never changes probabilities. It reads `horse-research-status.json`; that snapshot says zero V3 frozen forecasts. Its origin wording explicitly distinguishes Context model from V1 and fixed V3. Thus the 76-race context ablation is relevant to the current Hub's experimental context weights, but cannot be described as a validated V1+V3 ensemble test.

## Exact mathematical distinctions

Context model: latest 3–6 resolved same-discipline outcomes within730 days; known non-finishers score0, unresolved recent outcomes block forecasting. Numeric finish percentile y=(field_size-position)/(field_size-1). Recency r=2^(-age/90). Similarities are d=exp(-abs(log(past_distance/target_distance))/.25), g=1/(1+abs(broad_going_index_difference)) for matching broad surface families, c=1/(1+abs(class_difference)), and q=indicator(same course name). Missing similarities contribute no bonus. History weight w=r*(1+1*d+1*g+.5*c+.5*q). Mean m=sum(w*y)/sum(w). Reliability R=sum(r)/(sum(r)+5). Strength s=.5+R*(m-.5). Runner weights are softmax(2*s). The 16 ablations disable only bonus terms; they preserve same history selection, reliability and softmax.

V1 `FORM_PERCENTILE_SOFTMAX_RESEARCH_V1` also uses recency90, prior5 and softmax inverse temperature2, but restricts targets to all-weather and uses valid prior numeric Flat finishes. It lacks the context model's same-discipline/non-finish eligibility. Removing all context bonuses does not turn the 76-race mixed-discipline sample into archived V1.

Isolated fixed V3 `V3_FIXED_DISTANCE_SURFACE_RESEARCH` is different again: base f=.5+sum(r*(y-.5))/(5+sum(r)); distance residual A=sum(r*(y-.5))/(5+sum(r)) computed only on runs within20% of target distance; surface residual B similarly uses runs whose going starts Standard. Logit=2*(f+.15*A+.15*B). Latest3–6 valid numeric Flat finishes, all-weather target. These are additive residuals, unlike context's reweighted historical mean. The isolated live archive has zero records at the inspected commit.

## Fresh evaluation data

Inspected all112 context archive files in the pinned tree. The result ledger references76 unique races, exactly the already examined sample. The remaining36 archived records have latest generation07:17:14.971751 on15November; ten race IDs are outside the76, but have no matching outcome in the provisional context ledger. No context archive has a generation timestamp after the examined sample's maximum11:06:09.178576 on15November. The published prediction feed generated17:48:43.266204 has zero current forecasts. Therefore genuine unseen matched context evaluation count is0 in this snapshot.

## Leakage and sample cautions

All76 races have already contributed to exploratory comparisons and selection; none is an untouched prospective holdout. All76 frozen timestamps precede target start by more than5minutes, and recorded history dates precede the race; this does not independently attest first input availability. Outcomes remain single-source provisional. Main's context/V1 and isolated V3 scopes differ. No shared names, UI badges or backfilled overlays resolve those differences. No production edits or collector runs performed in this audit.
