# Frozen horse-field reconciliation — executed 15 November 2026

**Research-only / UNVALIDATED / publication BLOCKED.**

The automated workflow examined 66 intact frozen forecast records. Seven tests passed.
Ten unique races had incompatible runner identities across 22 archived forecast
revisions. In every affected race, the final recorded revision had a smaller
field than the earliest. This does **not** prove official withdrawals or
establish which field matches the official starter list. No records were changed.

| Sporting Life race ID | Course | Start (UTC) | Revisions | IDs missing from latest vs first |
|---|---|---|---:|---|
| 947375 | Wolverhampton | 2026-11-03 16:30 | 2 | 1151465, 985147 |
| 946744 | Wolverhampton | 2026-11-03 17:00 | 2 | 1226874 |
| 946749 | Wolverhampton | 2026-11-03 19:30 | 2 | 1141923 |
| 947113 | Chelmsford City | 2026-11-05 18:15 | 2 | 1205075 |
| 947473 | Dundalk | 2026-11-06 20:15 | 2 | 1037589, 1146098, 1208707 |
| 947522 | Southwell | 2026-11-07 18:00 | 2 | 1141390 |
| 948032 | Dundalk | 2026-11-11 17:02 | 2 | 1218387 |
| 948520 | Dundalk | 2026-11-13 18:30 | 2 | 1228376 |
| 948523 | Dundalk | 2026-11-13 20:00 | 2 | 1163292 |
| 948524 | Dundalk | 2026-11-13 20:30 | 4 | 1185933, 1188499, 1199624, 1223153 |

The attached CI artifact `horse-field-reconciliation-unresolved` (run
43710275978) contains each historical forecast hash, precise capture time and
full runner-ID list, including intermediate revisions.

## Evidence needed before releasing these races into BSP matching
1. Independently verify the official actual starter field and withdrawals
   with their timestamps from licensed/authorized sources.
2. Resolve which model freeze and full runner set represent the predeclared
   analysis point. Do not choose the revision based on the eventual result.
3. Match the official Betfair WIN selection IDs and market start to that
   exact field and handle Betfair non-runner and reduction-factor rules.
4. Retain unresolved races as excluded; no invented BSP or probability values.

Original immutable archive, published website, live slips, and model coefficients
were left untouched.
