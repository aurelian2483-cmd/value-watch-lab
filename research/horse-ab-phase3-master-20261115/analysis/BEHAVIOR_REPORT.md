# Frozen A/B behaviour and subgroup diagnostics

Retrospective only: same76 previously inspected races; **zero prospective scored races**. No parameters or subgroup rules were fitted.

## Ordered changes

| Change | First-choice changes | Full ranking changes | Winners before/after | Incremental log loss | Incremental Brier |
|---|---:|---:|---:|---:|---:|
|A0_FULL to A1_NO_DISTANCE|3|39|13/13|-0.0014234|-0.0004061|
|A1_NO_DISTANCE to E_NODIST_half_life|19|63|13/16|0.0014423|-0.0000660|
|E_NODIST_half_life to E_NODIST_half_life_inverse_temperature|0|0|16/16|-0.0222764|-0.0050814|

This is an order-dependent arithmetic decomposition, not causal attribution. Distance removal and recency changes interact; the selected beta changes confidence and scores while preserving ranks. Previous outcome-based selection remains.

## Fixed descriptive bins

### distance_bin

| Bin | Races | Dates | A/B winners | B minus A log loss | B minus A Brier | Small bin |
|---|---:|---:|---:|---:|---:|---|
|under1mile|26|6|3/5|-0.0300668|-0.0058202|no|
|1to_under2miles|23|9|3/5|-0.0093481|0.0008612|no|
|atleast2miles|27|10|7/6|-0.0257342|-0.0107610|no|
|unmapped|0|0|0/0|empty|empty|yes|

### going_bin

| Bin | Races | Dates | A/B winners | B minus A log loss | B minus A Brier | Small bin |
|---|---:|---:|---:|---:|---:|---|
|AW|38|6|5/8|-0.0298434|-0.0047271|no|
|soft_heavy_label|21|8|4/4|-0.0081506|-0.0036664|no|
|other|17|8|4/4|-0.0227267|-0.0097319|no|
|unmapped|0|0|0/0|empty|empty|yes|

### class_bin

| Bin | Races | Dates | A/B winners | B minus A log loss | B minus A Brier | Small bin |
|---|---:|---:|---:|---:|---:|---|
|atmost3|20|9|3/3|-0.0139070|-0.0044385|no|
|4to5|29|11|4/5|-0.0123208|-0.0051692|no|
|atleast6|11|4|1/3|-0.0329649|-0.0054110|no|
|unknown|16|7|5/5|-0.0433443|-0.0077417|no|

### any_same_course_history

| Bin | Races | Dates | A/B winners | B minus A log loss | B minus A Brier | Small bin |
|---|---:|---:|---:|---:|---:|---|
|False|7|6|2/3|-0.0426902|-0.0159068|yes|
|True|69|12|11/13|-0.0201846|-0.0045031|no|

### last_run_bin

| Bin | Races | Dates | A/B winners | B minus A log loss | B minus A Brier | Small bin |
|---|---:|---:|---:|---:|---:|---|
|under30days|50|9|7/12|-0.0328387|-0.0082736|no|
|30to90days|18|8|5/3|-0.0091309|-0.0005572|no|
|over90days|8|6|1/1|0.0143404|0.0002055|yes|

### A_confidence_bin

| Bin | Races | Dates | A/B winners | B minus A log loss | B minus A Brier | Small bin |
|---|---:|---:|---:|---:|---:|---|
|0to0.1|20|6|4/6|-0.0235625|-0.0033220|no|
|0.1to0.2|40|11|5/5|-0.0207571|-0.0041617|no|
|0.2to0.3|14|7|4/5|-0.0281824|-0.0143030|no|
|0.3to0.5|2|2|0/0|0.0022600|0.0055422|yes|
|0.5to1|0|0|0/0|empty|empty|yes|

## Definitions and limits

going: AW by explicit surface first; otherwise any soft/heavy substring including in-places labels; other nonempty or unmapped empty. Not a severity measure.

course: Any runner has any used history with course similarity exactly1; not every runner or a measured course advantage.

last_run: Median across runners of days between target date and most recent used historic date; not an independent fitness measurement.

ranking: Descending frozen probability; archive runner order breaks exact ties. Beta stage invariant.

scope: All bins partition exact same76races per axis; overlaps between axes are confounded. Small-bin flag n<10 is descriptive. No p-values or subgroup retuning.

The evidence does not establish causality, independently calibrated probabilities, a subgroup advantage, betting EV or profitability. No deployment or promotion follows. Exact raw labels, row identities and all frozen-stage scores are retained in behavior.json.
