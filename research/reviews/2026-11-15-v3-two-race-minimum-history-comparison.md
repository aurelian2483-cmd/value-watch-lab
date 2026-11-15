# Horse V3 — 13-runner two-race minimum-history replay (2026-11-15)

**WARNING: RETROSPECTIVE POST-HOC / TRUNCATED HISTORY / UNVALIDATED / PUBLICATION BLOCKED**

## Recovery scope
The 11 remaining original historical-result leads were checked against publisher race result pages and saved in [remaining-11-results-rechecked](../horse-v3/remaining-11-results-rechecked-2026-11-15.json). The seven other horses omitted from the prior worklist were identified by exact profile ID. Their 21 linked prior-run histories (three most recent past runs each) were recovered as [remaining-seven-horses-21-linked-history](../horse-v3/remaining-seven-horses-21-linked-history-2026-11-15.json). These entries link profile summaries to source-result race IDs, with unverified historical first availability.

Together with the prior seven rechecked rows and two earlier Electric Avenue results, the research inputs now provide a **minimum of three** past dated races for all:
- 8/8 published runners in race **890908** at Newcastle, 2025-11-24, winner horse 1105875 (Electric Avenue).
- 5/5 published runners in race **894962** at Wolverhampton, 2025-12-22, winner horse 1184423 (U S S Charleston).

**Critical:** This is a minimum-count reconstruction only. Original frozen V1 is allowed to use **up to six most recent qualifying past races** for each runner. Here most horses have only **three recovered rows**; some earlier rows were not yet reconciled. As a result the experiment below compares three-run-*truncated* versions, not faithful reruns of full historical frozen V1 or isolated fixed V3. Source pages inspected after the outcomes and the final target fields are also known retrospectively.

## Executed arithmetic replay
Computed from the recovered input rows and `scripts/horse_v3_history_reliability.cjs` in the JavaScript V8 harness. Reproduction code committed: [research_horse_v3_two_race_truncated_replay.cjs](../../scripts/research_horse_v3_two_race_truncated_replay.cjs).

- Truncated baseline: `softmax(2 * formStrength)`.
- Truncated fixed context: `softmax(2 * (formStrength + 0.15 * (D_signal+G_signal)))`.
- Truncated individual-adaptive: `softmax(2 * formStrength + individual_delta_logit)`.
- All three use the **same available histories and runner fields within each target race**; no trained weights and no bookmaker-price inputs.
- Winner-rank, log loss, and Brier are **descriptive on selected races with known outcomes**, not validation.

| Target race | Variant | Winner probability (heuristic) | Winner rank | Log loss ↓ | Brier ↓ |
| --- | --- | ---: | ---: | ---: | ---: |
| Newcastle 890908 | Truncated baseline | 0.132545 | 3 / 8 | 2.020833 | 0.862284 |
| Newcastle 890908 | Truncated fixed | 0.135743 | 3 / 8 | **1.996992** | **0.857318** |
| Newcastle 890908 | Truncated adaptive | 0.134018 | 3 / 8 | 2.009781 | 0.859778 |
| Wolverhampton 894962 | Truncated baseline | **0.180107** | 4 / 5 | **1.714205** | **0.846540** |
| Wolverhampton 894962 | Truncated fixed | 0.176031 | 4 / 5 | 1.737095 | 0.859563 |
| Wolverhampton 894962 | Truncated adaptive | 0.178476 | 4 / 5 | 1.723303 | 0.851411 |

**Interpretation:** Mixed directional results. Context additions help one reconstructed target and hurt the other. This does **not** establish V3 advantage or justify model selection/tuning. Full-field historical result information was available retrospectively; none are frozen pre-event forecasts.

## Audit and remaining work
1. Recover up to **six** valid prior Flat results for each of the 13 exact target runners, not just the minimum three; verify dates, race ID, distance, going and final field. Preserve duplicate filtering and chronological eligibility.
2. For the 2025 retrospective set, first-availability and official pre-off field are not independently attested. Even a complete retrospective refit cannot become an untouched prospective test.
3. Compare original V1 vs fixed V3 vs adaptive V3 on a genuinely untouched cohort **after** recovering and freezing more complete features. No changing coefficients based on these two outcomes.
4. Existing `main`, production V1, V2, V3, paper slips, market quotes and publication gates remain unchanged.
5. This step executed an in-tool V8 arithmetic calculation; **the committed Node CLI has not been executed in CI**, and no CI status is claimed.
