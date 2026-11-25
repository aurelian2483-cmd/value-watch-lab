# Racing schedule coverage review

Reviewed 25 November 2026 using the 20:32 UK future snapshot. The Operations table distinguishes index failures, meeting-page recovery, published racecards and runner-field status. Successful HTTP requests and single-source runner observations do not establish complete or independently verified declarations.

| UK date | Index races | Meetings / pages recovered | Recovered racecards | Single-source fields / unconfirmed |
| --- | ---: | ---: | ---: | ---: |
| 26 Nov | 0 | 5 / 5 | 35 | 29 / 6 |
| 27 Nov | 0 | 5 / 5 | 38 | 38 / 0 |
| 28 Nov | 0 | 6 / 6 | 43 | 43 / 0 |
| 29 Nov | 0 | 3 / 3 | 22 | 22 / 0 |
| 30 Nov | 0 | 4 / 4 | 29 | 29 / 0 |
| 1 Dec | 0 | 4 / 4 | 29 | 29 / 0 |
| 2 Dec | 0 | 0 / 0 | 0 | 0 / 0 |

All seven Sporting Life index calls returned the wrong date. The going feed supplied 27 dated links across the first six dates and all 27 meeting-page requests succeeded. Its result contained no 2 December link to follow. The alternate Sporting Life fixtures and Racing Post requests returned 404 and 406 respectively, and the At The Races parser reported an unverified format. The same-day card covered 40 races in five of 17 observed meetings, with the other 12 outside the configured GB/IRE scope.

## Manual official-source cross-check for 2 December

Reviewed 25 November 2026. This is a manual meeting and schedule cross-check, not a project-feed match. Official venue/BHA pages confirm all four meetings, and the Southwell and Haydock event pages expose provisional schedule information. **Value Watch recovered zero race IDs for 2 December; project race coverage remains UNKNOWN. Runner declarations, withdrawals and non-runners also remain UNKNOWN.** Do not promote these meetings to matched race coverage or use them for odds until exact race and field reconciliation succeeds.

| Meeting | Official evidence found | What it establishes | Remaining gap |
| --- | --- | --- | --- |
| Southwell | [Official 2 December event page](https://www.southwell-racecourse.co.uk/whats-on/wednesday-afternoon-flat-racing-2nd-december-2026) advertises a flat fixture, 8 races and approximate first/last times of 13:44/17:30. | Meeting plus venue-advertised schedule summary. | No project race IDs matched; exact race entries and declared runners are not verified. |
| Haydock Park | [Official event page](https://www.thejockeyclub.co.uk/haydock/events-tickets/christmas-time-raceday/) lists seven provisional schedule rows. | Meeting and a venue schedule candidate. | The page header says first race 12:08 while the detailed first row says 12:05. Keep schedule reconciliation unresolved; no project race IDs or runner declarations verified. |
| Newcastle | [Official fixture list](https://www.newcastle-racecourse.co.uk/downloads/newcastle-a4-2.pdf) and [venue events page](https://www.newcastle-racecourse.co.uk/whats-on) list the 2 December fixture. | Meeting-level confirmation. | No detailed official race schedule or declared field reconciled to project race IDs. |
| Catterick Bridge | [BHA transfer notice](https://www.britishhorseracing.com/press_releases/bha-confirms-transfer-of-12-ludlow-fixtures/) and [Catterick notice](https://www.catterickbridge.co.uk/News/ArtMID/451/ArticleID/40794/Additional-Fixture-on-Wednesday-2nd-December) confirm the Ludlow fixture transfer. | Meeting identity and transfer. | Transfer does not establish project race IDs, exact race coverage or declarations. |

Third-party racecard listings were found during research, but their reuse rights are not cleared for Value Watch publication. They are not used as project data or reproduced here. Source discovery alone does not make content available for redistribution.

## Independent calendar check for 2 December

The [BHA fixture list](https://media.britishhorseracing.com/bha/Fixture_List/2026_Fixture_List.pdf) lists Southwell, Haydock Park, Ludlow and Newcastle. The later [BHA transfer notice](https://www.britishhorseracing.com/press_releases/bha-confirms-transfer-of-12-ludlow-fixtures/) moves Ludlow's 2 December fixture to Catterick Bridge. [Catterick's calendar](https://www.catterickbridge.co.uk/Racing/Fixtures-at-a-Glance) also lists the transferred meeting. These establish meeting-level references. The official-page cross-check above improves schedule discovery but still does not reconcile the source schedules to project race IDs or provide verified runner declarations.

Leave automated coverage for that date unknown until a permitted source supplies a current date/course record and subsequent race and runner evidence. The BHA and racecourse pages were checked manually; this change adds no automated collection or redistribution. Maintain the venue transfer in a dated source comparison before counting either meeting as matched. For runner coverage, independently reconcile explicit non-runner and withdrawal statuses against an exact race and field. Do not infer withdrawals from discrepancies in count. Odds and model publication gates remain unchanged.
