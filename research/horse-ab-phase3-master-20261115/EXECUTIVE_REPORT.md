# Value Watch — master mathematical research handover

15 November2026. **KEEP BASELINE / CONTINUE RESEARCH.** Challenger is not ready for independent promotion review. Research stays UNVALIDATED and BLOCKED; betting eligibility remains false.

## Main conclusion

The original Phase1/Phase2 numerical results reproduce successfully, including all16and21definitions. The original76 frozen source records have now been recovered and independently checked byte-for-byte against immutable Git blobs. The selected challenger remains a precisely defined research candidate, not a validated improvement.

The remaining feasible infrastructure has been implemented: immutable A/B registration, one-shot source adapter, complete paired vectors, exclusion ledger, manually reviewed two-publisher result-evidence gate, amendments, locked-endpoint analysis, calibration summaries, source/identity audits, regression tests and a separate read-only dashboard. **Actual new paired pre-event forecasts=0; reviewed outcomes=0; completed prospective comparisons=0.** No future observations are implied.

No coefficients or model were reselected. Production code, Betting Hub, original V1/V3+, recommendations and existing scheduled collectors were not changed, merged or deployed.

## 1. Required reviewer questions

| Question | Evidence-based answer |
|---|---|
| Were Phase1/Phase2 reproduced? | Yes. All16Phase1 and21Phase2 definitions;76races/730runner appearances;58/593 earlier development and18/137 later diagnostic. Per-race score discrepancy at most4.44e-16; all first-choice counts match. Seven deterministic Phase2 output files match byte-for-byte. |
| What actually supplies V3+ probabilities? | Inspected Hub source routes CONTEXT_FORM_RESEARCH_V1 through horse-predictions-data.json. V3+ is a provenance badge. Original all-weather V1 and additive fixedV3distance/surface pilot are separate. Source/deployment metadata were inspected; live served-byte/browser parity was not independently verified. |
| Were both models frozen? | Yes. Registration at2026-11-15T21:19:58.150351+00:00 binds exact model definitions, code, protocol and previously examined race exclusions. Model bundle SHA256560ff45d28c097111bd9868ceca8bb7c556b1c86b3c61f2c2f6a3576e495ed58. Local timestamp is not an independent timestamp-service attestation. |
| Was the prospective system implemented/tested? | Yes, research-only.54pipeline tests,8fixed-endpoint tests and4independent targeted regressions pass; source/archive and other legacy checks are separately listed below. Real source ingestion was executed once. |
| How many genuinely new races were captured? |0. The pinned feed lists20observed race records but zero usable current forecasts;19fail pre-event buffer and one has unknown discipline.20upstream exclusions are preserved. This is feed coverage, not a complete racing census. |
| How many paired model vectors were frozen before a new race? |0. Synthetic future fixtures only test software and are removed from their temporary stores. They are never entered as real observations. |
| How many independently verified new outcomes? |0. The verification contract is implemented; no actual independently reviewed result bundle was supplied or invented. |
| Did B outperform A on new races? |Unknown: no new paired results exist. Historical exploratory B scores improve; this is not a new validation result. |
| Are improvements statistically credible? |Not established. All76races were previously examined. Multiple-configuration and dependence uncertainty remain; no untouched sample has accumulated. |
| Were quality/leakage issues found? |Yes: missing local timezone data, local-clock/first-availability limits, provisional outcomes, sparse evidence and selected archives. Three concrete new-prototype input/coverage defects were repaired before real registration. |
| Is it appropriate to leave current V3+ unchanged? |Yes as the conservative comparison decision. This is not certification of the existing model's accuracy, calibration, safety or profitable betting value. Its existing research safeguards must remain. |
| Is B ready for promotion review? |No. Predefined new-evidence, precision, provenance and review gates are unmet. |
| What additional evidence is required? |Actual future paired vectors frozen before start with credible independent time evidence; complete race/field/coverage records; independently corroborated reviewed outcomes; enough dates/meetings/races for sufficiently precise paired scoring and calibration. |
| What remains blocked/outstanding? |Natural future-data accumulation, actual independent outcome review and applicable A/B market evidence; visual browser preview and original Python-tzdata-dependent test execution are environment blocked. No unattended workflow is active. |

## 2. Exact frozen formulas

For each runner, original resolved historical percentile y=(N-position)/(N-1); known nonfinishers0. Latest3–6same-discipline runs within730days; source-derived similarities and original missingness policy remain unchanged. Let r=2^(-age/H), c=1+w_d*s_d+w_g*s_g+w_k*s_class+w_q*s_course, m=sum(r*c*y)/sum(r*c), R=sum(r), q=.5+R/(R+5)*(m-.5), and p=softmax(beta*q) across the same complete active field.

| Parameter | A: baseline | B: frozen challenger |
|---|---:|---:|
| Distance bonus |1|0|
| Going bonus |1|1|
| Class bonus |.5|.5|
| Course bonus |.5|.5|
| Recency half-life |90days|45days|
| Neutral prior |5|5|
| Inverse temperature |2|4|

Source context recency uses the min(original capture date,target date) in Europe/London. The adapter validates original recency against that cutoff and obtains B's45day weight as r90². It does not re-age a historic forecast on a later analysis date. Source SHA, fixed parameter set and baseline-vector parity are required before capture. The two model JSON specifications and registered source snapshot are included.

## 3. Independently reproduced historical results

| Same previously examined76races | Mean log loss | Mean multiclass Brier sum | First-choice winners |
|---|---:|---:|---:|
| A, original context |2.13943453|0.86614837|13/76|
| B, selected challenger |2.11717707|0.86059489|16/76|

B's historical1.04%relative log-loss reduction remains exploratory. The later18race diagnostic was also previously seen; it is not a clean holdout. No new model selection was performed during this master directive. Original failure candidates and uncertainty tables remain in the complete Phase2 snapshot and original ZIP.

Original raw76record recovery verifies both byte-level Git blob hashes and canonical record SHA256. It does not reconstruct absent original publisher HTML or independently prove historical first availability. Labels remain provisional single-source. Internal independent arithmetic review is distinct from the owner's forthcoming external mathematical review.

## 4. What explains the apparent gain?

The first choices agree on55races, with11wins each. They differ on21races: A wins2and B wins5. Only seven outcome-discordant first choices account for B's net three extra winners, so that hit-count advantage is fragile.

Using already archived candidate vectors in one fixed ordered decomposition:

| Transition | Changed first choices | Incremental mean log-loss difference |
|---|---:|---:|
| Original -> distance removed |3|-0.0014234|
| Then recency90 ->45 |19|+0.0014423|
| Then inverse scale2 ->4 |0|-0.0222764|

Thus most net probability-score gain in this ordered decomposition comes from confidence scaling. The scaling stage cannot change rankings. These are order-dependent behavioural explanations, not causal effects or permission to retune. Distance and recency can cancel or reinforce each other's ranking changes.

Robustness checks also reveal weaknesses: the group of32races where every runner's original recency evidence mass is at least1has a **mean** B-minus-A log-loss difference+0.0055681, whereas the44races with at least one sparse runner show-0.0424943. This does not mean all32individual races worsen. Median latest-history age over90days has only8races and also deteriorates on average. Subgroups are small, overlapping and confounded; no new adaptive rule was created.

Full same-event descriptive diagnostics cover discipline, field size, missing going, history evidence, target distance, going category, class, course experience, recency and original confidence, including empty bins. Exact calibration counts and all per-race rows are in analysis/. No subgroup-specific weight fitting or new hypothesis-confirmation claim was made.

## 5. Prospective infrastructure, execution and coverage

The one-shot collector reads only the existing public repository context feed at a pinned commit. It can also consume an exact retained connector snapshot. It neither starts the production collector cycle nor edits its schedules. Actual acquisition used commit9bdc35c9581744bb19495ab38663c585076445c0 and exact source Git blob74887274029001f87a033a80d5a714574ec2e9b6. Source bytes/hash and acquisition receipt are retained.

The inspected feed generated20:00:52UTC contained20observed records, zero forecasts and20explicit exclusions. The A/B ingestion ran using the actual OS clock after registration; no historic timestamp was supplied. The ledger therefore contains zero forecast/result objects. Empty exports and unavailable mean scores are deliberate, not missing success data.

New captures require aware timestamps, original source/gate/parameter identity, complete canonical fields, valid resolved history, source and runner freshness, more than5minutes pre-start buffer, exclusion of all earlier76IDs and baseline-vector reproduction. Feed ingestion also checks current field/conditions status against the frozen source. Duplicate identities, unknown outcomes, numeric overflow and changed scheduled starts are withheld with structured reasons. Old A-only captures cannot be retrospectively called A/B forecasts.

Append-only content-addressed objects retain inputs, both complete vectors, model/protocol hashes, source receipts and coverage events. Complete temporary files are fsynced, then published exclusively by Windows no-overwrite rename or POSIX link; existing objects are never replaced. Physical crash/concurrency/junction security was not exhaustively certified. Local clock and hashes are integrity evidence, not trusted time or source-truth proof.

Result ingestion requires two distinct allowlisted publisher snapshots with retained UTF8 bodies and byte hashes, post-race aware receipt times, explicit human final-result review, canonical cross-source identity mapping, exact winner and complete field agreement. **It is a manual-review evidence contract, not an automatic arbitrary-HTML verifier.** Different publishers may share upstream origin; that independence must be reviewed. No real result was verified in this session. Field changes produce exclusion rather than post-event renormalisation. Amendments append to a unique reviewed result chain and preserve earlier evidence.

## 6. Locked evaluation and statistical precision

Primary endpoint is paired race-equal B-minus-A log loss. Secondary endpoints are Brier sum, first-choice accuracy, calibration, coverage and descriptive strata. The primary fixed-window evaluator selects the first500paired reviewed races spanning at least60London dates, includes the complete last date and applies the maximum180day horizon. It does not choose a favourable stopping date. The raw all-observed ledger summary is separately labelled; the locked evaluator is the confirmatory-window view. The eight endpoint tests check thresholds, final-date completion, ordering and exclusion after the endpoint.

Date-cluster intervals use20000draws and seed20261115. Fewer than2dates gives no interval; few-date estimates remain descriptive. Repeated horses, shared history and meeting dependence require final sensitivity review. The planning target500/60is not proof of adequate power. Historical paired-SD0.077754implies an illustrative iid500race95%half-width0.00682; design effects2or4give about0.00964or0.01363. Those planning approximations are not guaranteed fresh-data precision, especially after historical selection.

The explicit prospective review margin is an upper95%LL-difference bound below-0.005, with no Brier deterioration and satisfactory calibration, coverage, verified outcomes and timestamp evidence. The margin is an analyst planning judgement, not a measured commercial threshold. Even meeting score gates does not approve deployment; external independent review and owner decision remain required. Current counts are far short of every validation gate.

## 7. Market benchmark boundary

The older32race benchmark compared a distinct archived V1 with observed market probabilities. No exact A/B paired odds sample was established here; no new A/B market comparison was executed. It is retained as a separate documentary reference through the earlier research audit, not merged into new model validation. No executable-price, commission, settlement, EV,CLV or ROI claim is made. Missing market evidence remains unavailable.

## 8. Software review and test status

| Check | Executed outcome |
|---|---|
| Phase1 independent16definition audit |PASS; all race-level scores/counts reconcile|
| Phase2 full21definition reproduction |PASS; seven deterministic files byte-equal|
| Original76frozen-record byte/Git/canonical hash audit |76/76PASS|
| New pipeline |54tests PASS|
| Fixed endpoint |8tests PASS|
| Independent targeted repair regressions |4tests PASS; no extra predictive evidence|
| New archive-contract tests |7/7PASS|
| Existing evidence/refresh-gate/session suites |6/6,8/8,4/4PASS|
| Existing context/model/secondary suites |Attempted; timezone-dependent errors/failures retained as environment-blocked, not passed|
| Dashboard source content |Offline read-only/gate/zero-data assertions PASS|
| Dashboard rendered browser/HTTP preview |BLOCKED: unavailable browser route and Windows socket permission10013; no visual or HTTP200claim|

The first pipeline-suite attempt failed setup because this sandbox denies hardlinks. The Windows implementation was changed to exclusive no-overwrite rename before actual registration; failed and passing logs are preserved. Independent review found and repaired three prototype issues before freeze: exponential JSON overflow, malformed nested-object error handling and double counting a changed schedule as two races. A suspected Git NUL-separator bug was incorrect and explicitly retracted; actual receipt hashing passed. No successful test is treated as proof of prediction accuracy.

All current model-source bytes still match the registered source hash. The separate locked-endpoint analysis module does not alter either frozen formula or its registration. Exact commands, runtime versions, source hashes and review receipts are included.

## 9. Completed, blocked and outstanding work

| Directive phases | Status |
|---|---|
| A–B recovery/reproduction |Complete within Phase1/Phase2scope; originals and discrepancies preserved|
| C formula freezing |Complete; exact registration and A/B files included|
| D infrastructure audit |Complete; limitations and environment failures documented|
| E prospective pipeline |Implemented/tested; one real feed ingestion executed|
| F statistical protocol |Frozen; endpoint evaluator tested; planning precision assessed|
| G prospective comparisons |0eligible pairs/outcomes available; cannot manufacture or wait artificially|
| H/J disagreements/robustness |Complete, historical descriptive analysis only|
| I applicable market benchmark |Blocked for A/B: no exact eligible paired odds sample|
| K model decision |KEEP BASELINE / CONTINUE RESEARCH|
| L research dashboard |Built, read-only, real zero counts; visual preview environment-blocked|
| M software-quality review |Completed within stated test scope; no full adversarial filesystem or power-loss certification|
| N documentation/delivery |Complete package and isolated draft research PR prepared; no merge/deployment|

Future accumulation, independent source/time verification and external review remain necessary. **No background scheduler or automatic future work was activated.** Leaving this session does not secretly accumulate races; the documented one-shot process can be run later under the frozen protocol with fresh source data.

**Final decision: KEEP BASELINE / CONTINUE RESEARCH. No model qualifies for promotion review yet.**
