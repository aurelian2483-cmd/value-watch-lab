# Dundalk official non-runner timeline: first executed cross-check

Date: 15 November 2026. **UNVALIDATED / BLOCKED.** No bet qualification or BSP joining.

The race archive contains 66 original V1 records, of which the previous audit identified 10 changed-field races. Five had no cached secondary result, so their post-event non-runners were researched against publicly accessible results and, where available, the Irish Horseracing Regulatory Board (IHRB) non-runner log.

## Executed results

| Sporting Life race ID | Date / time UTC | Removed from frozen fields | Source-supported evidence | Chronology assessment |
|---|---|---|---|---|
| 947473 | 6 Nov 20:15 | Jazzy Dancer, Local Lad, Sarfarcat | Published Racing Post final non-runners; no regulator logged timestamps retained | Final-field match only |
| 948032 | 11 Nov 17:02 | Golddream | Published Racing Post final non-runner; no regulator logged timestamp retained | Final-field match only |
| 948520 | 13 Nov 18:30 | Mutamarid Lsk | IHRB log 07:32:37; archived later field 09:39:36 | Reported log precedes removal |
| 948523 | 13 Nov 20:00 | Spicy Margarita | IHRB log 13:29:42; archived later field 16:45:44 | Reported log precedes removal |
| 948524 | 13 Nov 20:30 | Femme Beauty, African Affair, My First Rose, Wild Berries | IHRB logged times 05:47:45, 07:56:47, 10:41:49, 11:04:25; archived successive field changes 06:36, 09:39 and 15:21 | All five archived removal transitions align with logged times |

Audit result: **three races** consistent with quoted regulator chronology; **two races** have final-result-only evidence. Five individual archive transitions have regulator-log-consistent classification; two have no regulator timestamp. **No races released** for Betfair BSP comparison.

## Exact source provenance and limitations

- Regulatory non-runner logs: https://www.ihrb.ie/non-runners/ . Page evidence read 15 Nov 2026; page may be subsequently updated. This log has not been independently archived at the times shown.
- 6 Nov 20:15 published result and non-runners: https://www.racingpost.com/results/1138/dundalk-aw/2026-11-06/932495/ .
- 11 Nov 17:02 published result and non-runner: https://www.racingpost.com/results/1138/dundalk-aw/2026-11-11/933096/ .
- 13 Nov 18:30, 20:00 and 20:30 published final result summary: https://www.sportinglife.com/racing/meeting/2026-11-13/dundalk/122566 .

These are source statements compared against immutable model snapshots, not independent proof that a model observed an official scratch notification in real time. We have not obtained licensed Betfair BSP data or unambiguous Betfair selection mappings. Historic forecast versions and price records remain unchanged.

GitHub Actions: https://github.com/aurelian2483-cmd/value-watch-lab/actions/runs/43712956282 — **15/15 unit tests passed**, generated `dundalk-nonrunner-chronology-research` artifact with complete transition-level diagnostics.

## Next gate

Preserve verifiable official snapshot receipts of non-runners in future collection, ideally with observed-at timestamps and source hashes recorded before off. Retrospective evidence may support a historical race-field audit but must not be mistaken for contemporaneous source availability. Authorised official Betfair WIN BSP data and exact cross-provider ID mapping remain prerequisites to any sharp-market scoring.
