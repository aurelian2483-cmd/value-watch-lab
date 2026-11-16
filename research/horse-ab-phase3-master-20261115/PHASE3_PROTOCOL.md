# Phase3 frozen prospective A/B protocol

Research-only. UNVALIDATED / BLOCKED / betting eligible false. Written before any Phase3 prospective outcome is scored. The older76races and all prior searched results are excluded from confirmatory enrollment. No further coefficient search is permitted.

## Models and input parity

ModelA: context formula, similarity weights distance1, going1, class.5, course.5; H90days,K5,beta2. ModelB: distance0,going1,class.5,course.5; H45days,K5,beta4. Original percentile and known-nonfinisher0 policy remain. Histories use original latest3–6 resolved same-discipline runs within730days. Context source records include the original source-cutoff date through their90day recency values; B uses r45=r90². Audit reconstructs r90 from original Europe/London min(capturedate,startdate), preserving source semantics rather than silently re-aging on a later date.

For runneri: w=r*(1+distance*s_d+going*s_g+class*s_c+course*s_q); m=sum(w*y)/sum(w); R=sum(r); q=.5+R/(R+5)*(m-.5); p_i=softmax(beta*q_i). Neutral reliability always uses unbonused recency mass. Active fields, ordered horseIDs and historical rows are shared exactly. ModelB is the already selected Phase2candidate, not the lowest-scoring all76variant or separate fixedV3pilot.

## Enrollment and capture

The registration snapshot content-addresses both definitions, source code and this protocol before enrollment. CLI uses actual OS UTC clock, requires aware source timestamps and start>capture+5minutes, nonfuture source observations and <=30minute runner freshness at both original and A/B captures. The system requires exact original model/parameter IDs, complete canonical active field and baseline reproduction. Existing76IDs are prohibited. Every attempted input and exclusion is retained in an isolated append-only object store. Complete upstream coverage/outage evidence is needed; counts of the supplied feed are not a complete race census.

Population: all original context-eligible declared source races in FLAT,HURDLE,CHASE,NH_FLAT, captured consecutively within existing source coverage. NH_FLAT has no historical validation here and is always separately labelled. No outcome-based race/discipline selection. Existing production collector is read only; this system consumes its complete context forecast records and keeps research-side A/B snapshots. No production or scheduled collector edits and no paid accounts/services.

Future racecard fields alone without a complete validated context record cannot be enrolled. Retrospective reconstruction never counts as a prospective pair. Existing A-only archives cannot be upgraded by calculating B after the event. Local file hash+clock records integrity, not independent first availability; a pre-event Git commit or independent timestamp should additionally attest the actual pair bytes. A missing attestation remains explicit and blocks promotion claims.

## Revisions, withdrawals and results

Unchanged input gives an idempotent reference to its original pair; it does not rewrite capture time. Changed valid pre-cutoff inputs with the same raceID and scheduled start make an additional immutable revision. A changed scheduled start for an existing raceID is withheld as SCHEDULE_CHANGED_REQUIRES_REVIEW, rather than counted as a second race; no automatic schedule remapping is implemented. Analysis uses the latest captured pair before cutoff, irrespective of later success. Frozen/final complete horseID sets must match exactly. No after-result renormalisation, replacing a scratched horse, or choosing an older field that happens to match.

Results require two distinct allowlisted publisherIDs with HTTPS source URLs, retained UTF8 source bodies and byte hashes, aware post-start source observation times, matching final fields/winners/start/race identity and explicitly reviewed canonical cross-source ID mappings. The reviewer must inspect source bodies; this is not an automatic arbitrary-HTML parser or independent proof of assertions. Two different URLs/publishers can share upstream data; editorial independence must be assessed. No outcome is counted without that documented review. Original publisher HTML absent from past records is not fabricated.

Keep unresolved, conflicting, unreviewed and unmatched outcomes pending/excluded with reasons. Amendments append evidence explicitly referencing the current unique result head; preserve previous records, materialise only the unique latest chain head, reject ambiguous forks. Record result amendments and changes in eligible coverage; do not erase an unfavourable result.

## Endpoints, dependence and fixed stopping

Primary endpoint: race-equal mean delta log loss, B minus A. Negative favoursB. Secondary: paired multiclass Brier sum, first-choice winner count/accuracy, top-label and pooled-runner fixed-bin calibration, agreement, and coverage/exclusions. Raw vectors support independent rescoring. Runner appearances are not independent races.

Planning endpoint: first500paired reviewed races covering at least60distinct Europe/London race dates. Continue through the60th eligible date if500arrive sooner, including the complete last date. Maximum180calendar days from actual registration. If insufficient, report incomplete rather than change thresholds. This planning target is not a power guarantee; historical dependence/small effects may require many more observations. No optional favourable stopping or interim retuning.

Use20000paired race-date cluster bootstrap draws, seed20261115, race-weighted ratio of sampled score sums/counts, with all races in each sampled date. If fewer than2dates, no interval. Few dates produce descriptive uncertain intervals. Meeting and repeated-horse dependence remain; at the final endpoint inspect meeting/horse clustering where data support it, retain date-level analysis as locked primary. Analyse Flat/Hurdle/Chase/NH_FLAT and field-size/form coverage descriptively without tuning; do not interpret tiny subgroup differences as confirmatory evidence.

## Criteria for independent promotion review, never automatic deployment

All of the following are necessary: fixed endpoint reached without interim selection; complete credible coverage and leakage audit; independently corroborated reviewed source outcomes; credible pre-event timestamp attestations for actual A/B bytes; no material identity/field/amendment defects; primary paired95%upper LL delta below-0.005 (practical research margin fixed here, not empirically established commercial value); paired Brier upper95%<=0; calibration reviewed for material deterioration and subgroup fragility. The0.005margin is an explicit analyst planning judgement, not a claim the sample has sufficient power or predicts profits. A separate independent reviewer must assess precision, practical meaning and dependence before any candidate qualifies. No automated software flag approves superiority or deployment.

Until all requirements are met: KEEP BASELINE / CONTINUE RESEARCH. Even satisfying score criteria gives only eligibility for independent review. Preserve UNVALIDATED/BLOCKED; owner and independent review are required for any subsequent production proposal. No bookmaker EV,CLV,ROI or settlement-profit conclusion follows from these predictive scores.

## Timezone/dependency policy

Python3.10+ standard library. Use real IANA Europe/London via ZoneInfo if installed; otherwise NodeIntl with Europe/London and aware ISO instants, invoked without a shell and with bounded execution. The tested Windows environment lacks tzdata and uses Node26.13.0Intl. Reject if neither database-capable route is available. Never substitute UTC for London. Exact runtime versions and source hashes accompany run receipts. Injected clocks and synthetic races are confined to unit tests, with temporary stores removed; CLI exposes no historical-now option.
