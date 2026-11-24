# Mathematical Testing Laboratory quality audit

Reviewed draft PR #173 at df3d3ac3172f50c3b6246da77aa15654efaec043. Both workflows passed: [synthetic laboratory](https://github.com/aurelian2483-cmd/value-watch-lab/actions/runs/45475694170), [full research regression](https://github.com/aurelian2483-cmd/value-watch-lab/actions/runs/45475694175). CI checked out synthetic merge 032a696 against catalogue base 53ce0b33d88e547cccc78796f34a2668b2669074. Laboratory: 16 JS and 4 Python tests passed, 5 fixed known-answer cases and analytical checks, reproducible report, persistence and CPU agreement. Full regression included 335 Python tests.

Audit corrections:
- Status adapter destructured malformed bundles before validation and sparse arrays could bypass the contract check. Reordered validation; check all expected report slots.
- Stored report agreement alone could accept changed known answers or contradictory worker success metadata. Check the fixed criteria and recompute verdict arithmetic without executing solvers; require returned worker state and matching verdict.
- Sparse eigenproblem inputs now fail before arithmetic.
- Added read-only verification of actual terminal lifecycle and checkpoint bytes, plus pre-read artifact size checks. End-to-end CI copies the dedicated store, verifies the copy and checks the original remains unchanged.
- Added real Chromium tests at 1440, 390 and 320 pixels, no execution controls or external requests, cross-artifact status reconciliation and repeatability. New checks pending.

Scope: five fixed fixtures, four numerical methods. No empirical validation, general algorithm certification, GPU backend, production integration or tests on user hardware. No sports dataset or protected partition used by these new modules. File checks are not hostile-filesystem isolation; hashes are not signatures; copying an inactive store is not a production backup system. CPU timeouts are best-effort worker termination, not OS enforcement. The original catalogue and other draft branches remain unchanged. Recheck the moving base before integration. No merge or deployment authorized.
