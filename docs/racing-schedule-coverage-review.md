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

## Independent calendar check for 2 December

The [BHA fixture list](https://media.britishhorseracing.com/bha/Fixture_List/2026_Fixture_List.pdf) lists Southwell, Haydock Park, Ludlow and Newcastle. The later [BHA transfer notice](https://www.britishhorseracing.com/press_releases/bha-confirms-transfer-of-12-ludlow-fixtures/) moves Ludlow's 2 December fixture to Catterick Bridge. [Catterick's calendar](https://www.catterickbridge.co.uk/Racing/Fixtures-at-a-Glance) also lists the transferred meeting. These are meeting-level references. Exact race times, declarations, withdrawals and non-runners remain uncorroborated.

Leave automated coverage for that date unknown until a permitted source can supply a current date/course record and subsequent race and runner evidence. The BHA documents were checked manually. This change does not add automated collection or redistribution. Maintain the venue transfer in a dated source comparison before counting either meeting as matched. For runner coverage, independently reconcile explicit non-runner and withdrawal statuses against an exact race and field. Do not infer withdrawals from discrepancies in count. Odds and model publication gates remain unchanged.
