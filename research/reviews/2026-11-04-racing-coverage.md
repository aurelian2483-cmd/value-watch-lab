# Racing coverage and context-model upgrade — 4 November 2026

## Purpose

Expand the horse research system beyond selected all-weather races, repair missing meeting coverage, and make the evidence and remaining limitations visible. This is a research upgrade, not model promotion or verified betting advice.

## Implemented changes

- Discovery recognises the source's actual country aliases (including Scot, Wale and Eire). Previously those labels silently excluded Scottish, Welsh and Irish meetings.
- Runner observations use current racecard conditions, not merely the initial listing's metadata. The collector retains discipline evidence and known non-finisher status in dated histories.
- A separate CONTEXT_FORM_RESEARCH_V1 lane reweights historical finishes by recency, distance, broad going, class and course similarity. It separates FLAT, HURDLE, CHASE and NH_FLAT histories. Known falls/pull-ups and other supported non-finishes do not disappear as successful completions.
- Structured second-publisher discipline is used when a matching fixture and receipt support it. Explicit hurdle/chase/bumper source-title terms and disclosed full-field flat-history inference are alternative evidence; unknown or conflicting disciplines are withheld.
- The existing frozen form baseline and the unpromoted trained challenger retain their own records. New context records have separate hashes, immutable revisions and a provisional forecast-to-result evaluation cycle.
- Quote snapshots retain publisher, bookmaker, observed time, source digest and active field. Shortening/drifting comparisons require the same field and market. A changed field is reported as such, not interpreted as value.
- Racecards publish before slower model/result work. The racing schedule requests a refresh every twenty minutes during the configured collection window; GitHub scheduling delays remain possible.
- The main page distinguishes recorded market favourite, context-model leader and frozen baseline. A dedicated context evidence page exposes coverage, missing-data reasons, features and prospective evaluation.

## What the model does not establish

The context weights are declared exploratory choices, not fitted or calibrated win probabilities. There is no demonstrated betting edge or independently verified executable price. Draw/pace bias, carried-weight effects, official-rating effects, trainer/jockey statistics and fitness are not modelled merely because some related fields can be collected. Three usable same-discipline prior runs per active runner and a fresh confirmed full field remain required; novice or uncertain fields can legitimately have no forecast.

SP/BSP, verified opening/closing prices, profitability and automatic collection of every tipster/forum opinion are not implied by source quote history. Official challenge remains 0/100; model validation UNVALIDATED; publication gate BLOCKED.

## Verification

Automated controls cover discipline separation, future/same-day exclusions, non-finishes, immutable records, field/context changes and provisional scoring. Live collection, model counts and workflow outcomes are recorded after verification; no retrospective forecasts receive prospective credit.

The first expanded collection observed 48 races across six meetings, including Scotland, Wales and Ireland, with 29 complete source-price captures. Its first context run archived 14 forecasts: four turf and ten all-weather. No jump field qualified on that run; implemented jump calculations do not override insufficient same-discipline evidence. Initial context scored-result count was zero.

Automatic tipster collection remains unconnected: the publisher returned a client challenge to the unattended HTTP client. Existing manual observations remain labelled as such; no new opinions or consensus were invented.

Deployment verification: the expanded horse workflow and dashboard checks passed. At the 19:13 UK refresh, ten earlier context forecasts had source-backed provisional scores. That evening snapshot had no new eligible context forecasts, so current forecasts and the earlier frozen archive must be viewed separately; no old race is presented as an upcoming selection.
