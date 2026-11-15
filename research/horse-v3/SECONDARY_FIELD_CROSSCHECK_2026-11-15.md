# Secondary result crosscheck — executed 15 November 2026

Research status: **UNVALIDATED / publication BLOCKED**.

An isolated GitHub Actions job read 66 existing immutable V1 forecast receipts and 453 SHA-checked cached The Racing API result receipts, examined the 10 previously identified conflicting races, and ran **14/14 tests successfully**.

## Race-by-race findings

| Race ID | Course | Crosscheck |
|---|---|---|
| 947375 | Wolverhampton | Latest forecast runner field matches recorded final starters |
| 946744 | Wolverhampton | Latest forecast runner field matches recorded final starters |
| 946749 | Wolverhampton | Latest forecast runner field matches recorded final starters |
| 947113 | Chelmsford City | Latest forecast runner field matches recorded final starters |
| 947473 | Dundalk | No matching secondary result in current archive |
| 947522 | Southwell | Latest forecast runner field matches recorded final starters |
| 948032 | Dundalk | No matching secondary result in current archive |
| 948520 | Dundalk | No matching secondary result in current archive |
| 948523 | Dundalk | No matching secondary result in current archive |
| 948524 | Dundalk | No matching secondary result in current archive |

All five final-field matches were to the later revision, but this is **after-event published evidence**, not proof of confirmed non-runner status at the earlier forecasting timestamp. The remaining five were all Dundalk and remain evidence gaps, not assumed mistakes.

Workflow: https://github.com/aurelian2483-cmd/value-watch-lab/actions/runs/43711031899
Artifact: horse-secondary-field-crosscheck-research, contains per-race candidate receipts, model snapshot SHA-256 IDs, and runner-set difference diagnostics.

## Decision

No disputed race was released for Betfair BSP matching, no forecasts were rewritten, no missing horse identities were inferred, no simulated odds or P&L were produced, and the live betting website remains unchanged.

## Next evidence gate

Find legally available independently confirmed final runner fields and timestamps of withdrawals at these specific meetings, especially Dundalk, and obtain authorized Betfair WIN BSP plus unambiguous provider-to-provider ID mapping. Compare model snapshots using a predeclared freeze policy rather than post-outcome selection.
