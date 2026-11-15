# Six recovered Flat performances — source verification audit (15 November 2026)

**Status:** Six records corroborated against publicly readable Sporting Life race-result pages. **Not independently verified across publishers; NOT approved as prospective pre-event data or for model training.** This does not certify original capture-time authenticity.

## Checks performed
- Reopened `research/horse-v3/recovered-prior-races-pilot.json` on the isolated V3 branch.
- Checked all six URLs against the displayed race date, course, distance, going, declared runner count, horse name and finishing position.
- Followed linked horse profiles where available to check identity; original research horse IDs remain the intended identity keys.
- Reopened the user-provided September–December 2025 ZIP. For target race 877817, Ebendi (968902) has zero prior rows; for target race 877820, Jewel Maker (856295) and Electric Avenue (1105875) also have zero prior rows. This confirms these six are *missing from that stored archive*, not evidence of debuts.
- All six prior dates precede their 8 September 2025 target race. No duplicate (target race, horse ID, historical race ID) triples.
- No result data or trained model was altered.

## Verified records
| Target race | Horse (ID) | Prior race (ID) | Date | Finish | Field | Source |
| --- | --- | --- | --- | --- | --- | --- |
| 877817 | Ebendi (968902) | Musselburgh (871191) | 2025-08-01 | 5 | 5 | https://www.sportinglife.com/racing/results/2025-08-01/musselburgh/871191/platform-interior-solutions-handicap |
| 877820 | Jewel Maker (856295) | Redcar (875180) | 2025-08-23 | 3 | 6 | https://www.sportinglife.com/racing/results/2025-08-23/redcar/875180/every-race-live-on-racing-tv-handicap |
| 877820 | Jewel Maker (856295) | Thirsk (876160) | 2025-08-29 | 5 | 10 | https://www.sportinglife.com/racing/results/2025-08-29/thirsk/876160/aja-novice-flat-amateur-jockeys-handicap |
| 877820 | Jewel Maker (856295) | Carlisle (876627) | 2025-09-01 | 1 | 8 | https://www.sportinglife.com/racing/results/2025-09-01/carlisle/876627/aja-novice-flat-amateur-jockeys-handicap |
| 877820 | Electric Avenue (1105875) | Doncaster (869892) | 2025-07-24 | 6 | 9 | https://www.sportinglife.com/racing/results/2025-07-24/doncaster/869892/sky-bet-extra-places-handicap-rnd-div-2 |
| 877820 | Electric Avenue (1105875) | Thirsk (873695) | 2025-08-15 | 6 | 8 | https://www.sportinglife.com/racing/results/2025-08-15/thirsk/873695/ray-eileen-mclean-memorial-handicap |

## Decision and next gate
1. Six results may move from **SOURCE_LINKED_LEADS** to **PUBLISHER_RESULT_VERIFIED_RETROSPECTIVE** in a *separate audit record*, not by rewriting the frozen ledger.
2. For model eligibility, capture original source bytes and SHA-256 receipts; independently check exact horse identity, race classification and field for each row. Verify any differences in non-runners/declared entries.
3. Confirm whether published current-profile data can be shown to have been available at the target date. Without historic pre-race capture, maintain **RETROSPECTIVE_ONLY**.
4. Expand missing histories for **all runners** in each target race and apply the unchanged V1 full-field requirement; the six matched rows do not make either target race automatically training-eligible.
5. Seek a second underlying publisher for result corroboration. Two pages from Sporting Life are not independent evidence.
6. Remain `UNVALIDATED`, `publication_gate=BLOCKED`, `training_eligible=false`.

No website changes, market value estimates, or confirmed predictive improvements.
