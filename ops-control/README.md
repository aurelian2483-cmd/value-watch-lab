# Value Watch — Operations Control Centre

**Standalone read-only management dashboard** at `/ops-control/`. The application is intentionally separate from the main Value Watch research/paper-slip UI; its code and files live only in this folder and are not linked into the main navigation.

## Scope

- Director's source-health briefing and incident queue
- Four automated sport manager desks: football, horse racing, tennis, NFL
- Mathematics/probability, market-evidence, dynamic-model and IT/QA oversight
- Timestamp/freshness checks on four published snapshots and secure gate checks
- Mobile/tablet/desktop layout, on-demand refresh, five-minute refresh while visible, local JSON report export

The named roles are software presentation and automated validation logic, **not independently employed agents** or real expert sign-offs. The tool cannot inspect GitHub Actions status or verify Sky Bet directly.

## Data and isolation

GET only, same-origin reads from `../research-dashboard-data.json`, `../racing-research-data.json`, `../other-sports-data.json` and `../horse-model-data.json`. The four sources cover four sport desks; the second horse source is independent model-audit input. Version 3 writes only to its own browser-local `vw-ops-control:incident-history:v1` key; it writes no shared Value Watch localStorage, makes no GitHub mutations, and contains no order placement or secret tokens.

The UI must never promote experimental probabilities to certified odds, EV, accuracy or bet advice. `UNVALIDATED` / `BLOCKED` remain the only publication state.

## QA

`node --check ops-control/app.js && node ops-control/qa.cjs`. The read-only workflow `.github/workflows/operations-control-qa.yml` checks standalone changes; deployment/publication is a separate GitHub Pages process.

## Hosting

If GitHub Pages publishes from this repository's `main` root, the expected standalone route is `/value-watch-lab/ops-control/`. This folder shares the repository and Pages hosting with the source research, but **is a separate application**. A separate repository/domain can be used in a later migration without embedding it in Value Watch's main UI. Confirm the actual published URL in Settings > Pages or your normal hosting configuration.

## Final-release verification

Release smoke QA must pass against the same branch as the proposed operations dashboard. The separate operations workflow is read-only and is not a GitHub Pages deployment confirmation. Confirm actual Pages publication on a browser before claiming a live release.

## Version 3: device-local incident history

The Director action register now maintains up to 250 incidents in this browser only, with stable owner/action keys, first and last observation times, observation counts, reopened counts, and status `ACTIVE` or `RESOLVED`. A missing issue is marked resolved only after all four source feeds are accessible, fresh, timestamped and still have research-only `UNVALIDATED` and `BLOCKED` gates. `RESOLVED` means the same warning no longer appeared in a complete audit; it **does not** establish a real-world fix, that the issue is permanently gone, or human approval. An incomplete, stale or failed audit does not auto-resolve historical issues.

Reopening a resolved issue increments its reopen count. The page automatically refreshes while visible, but **does not run unattended when closed**. History is device/browser-specific; clearing site storage, using private browsing or opening on a different device can lose it. If storage is blocked or corrupted, the dashboard explicitly warns and will not silently overwrite corrupt data. The local JSON export includes a snapshot of this history and actions. There is no server-side incident database, cross-device syncing, actual human task assignment, or automatic GitHub/market remediation.

Tests: `node tests/test_ops_history.cjs`, `node tests/test_ops_control.cjs`, and `node ops-control/qa.cjs` in the existing read-only workflows.

## Version 4 — Director's Daily Briefing

When the Operations Control Centre page is opened or refreshed, it produces a **browser-local UK-day briefing**. It compares the new audit with the previously saved audit in this browser and reports outstanding urgent P1 incidents, new warnings, feed deterioration/recovery, issues observed open for at least 24 hours, repeated/reopened incidents and warnings no longer observed during a complete audit. Every briefing includes a recommended next investigation step. The local audit JSON export contains the briefing snapshot.

**Limitations:** This is not an unattended daily scheduled report or email, and it is not a shared central database. The history is stored only in this browser, under the independent `vw-ops-control:director-briefing:v1` localStorage key. It keeps at most 45 UK calendar days and the latest audit snapshot. The first audit has no comparison baseline. Repeated observations are not independent confirmations or genuine human assignment. Incidents only count as cleared after an audit with all required feeds accessible, fresh, timestamped and maintaining research-only `UNVALIDATED`/`BLOCKED` gates. Corrupt or unavailable storage is displayed as a warning without silently destroying existing data. The underlying Value Watch models, paper slips and GitHub workflows remain read-only from this dashboard.

Version 4 test command: `node tests/test_ops_briefing.cjs`. The broader operations QA and full research regression must also pass before merging.

## Version 5 — unattended scheduled monitoring and GitHub issue reports

The independent workflow `.github/workflows/operations-scheduled-monitor.yml` is scheduled for **07:17 and 19:17 UTC daily** (fixed UTC, not fixed UK local time: the clock changes with BST). GitHub Actions scheduled runs are best-effort and may be delayed or skipped, especially during platform incidents; they do not offer guaranteed timing. A manual `workflow_dispatch` option is also available in the GitHub Actions interface. The scheduled job runs only against `main` and never edits betting research, model files or Pages content.

`ops-control/scheduled-monitor.cjs` reads **four repository snapshot JSON files**, examines file availability, parse safety, publisher research-only gates (`UNVALIDATED`/`BLOCKED`), publication age (24 hours for football and tennis/NFL; 6 hours for horse racing and the racing model), sport event-array availability and verified racing coverage. It creates a Markdown management report and JSON evidence saved as Actions artifacts for 30 days. It cannot verify live website uptime, independent bookmaker odds, winning probabilities, employee sign-offs or total fixture coverage. Static research files may be stale even while the public Pages site is available.

On the first actual scheduled/manual run, the workflow creates one GitHub Issue named **[Operations Control Centre] Director scheduled briefing**. Each subsequent run updates that issue and adds a comment with the latest report. A marker suppresses duplicate comments for the same GitHub Actions run ID. GitHub notifications depend on repository subscription, issue participation and the user's GitHub notification/email settings; comments are **not guaranteed push or email delivery**. **Close the Director issue to opt out of comments**; subsequent runs leave it closed and keep artifacts and Actions summaries. The workflow does not create separate issues for each P2 warning and does not silently change models, bets or account state. A failure in GitHub Actions or GitHub Issues permissions can prevent reporting; inspect the workflow logs.

The issue reporter has narrowly scoped `issues: write` permission only in the scheduled/manual job. Pull-request and push tests run with `contents: read`, without issue-write access. The runtime report itself is read-only toward Value Watch files; the only remote write is the explicit Director issue/comment report. Existing V3/V4 browser-local incident history remains separate; these scheduled reports are stored in GitHub, not merged into the browser's local database.

Tests: `node tests/test_ops_scheduled.cjs && node tests/test_ops_notify.cjs`. Before claiming the **first real alert delivery**, verify that a scheduled or manually dispatched run succeeded and the Director issue was created/updated. Successful CI on a PR is not proof that the cron or GitHub notifications have fired.

## Secondary horse-racing meeting coverage check

The Director's scheduled monitoring now performs an **independent, date-scoped secondary-source check** of the current UK/Ireland meeting list. It fetches the `https://racingontv.co.uk/?day=today` meeting listing separately from the primary Sporting Life JSON and requires the page to explicitly confirm the current UK date, meeting total and race total. It extracts only entries with meeting name, UK/IRE country, start/end times, number of races and stated `Scheduled/Abandoned/Cancelled` status. It matches normalized venue names and compares the displayed meeting and race totals. A reported abandoned/cancelled venue is listed separately, not treated as an active missing meeting.

Output `ops-control/out/racing-secondary.json` contains the provider URL, observed time, source SHA-256, matched/missing/primary-only meeting lists and race-count discrepancies. The evidence and any limits appear in the GitHub Director issue/report and 30-day workflow artifacts. If the provider is inaccessible, returns an ambiguous page, changes HTML, does not explicitly confirm the **exact UK date**, or disagrees with its own count header, the check reports `SECONDARY_UNAVAILABLE` or an unverified schema: it **never invents a result**. The secondary source may itself derive data from the same upstream feed, so agreement is **not an independent certification of completeness**. The existing `coverage_verified:false` and P2 warning stay in place. This checker performs no bookmaker queries, forecast promotions, bets, source writes or automatic corrections.

Tests: `node tests/test_ops_racing_secondary.cjs`. A real scheduled/manual run must be inspected before claiming that live secondary access works. An observed discrepancy is an investigation lead, not automatic proof that Sporting Life missed a real meeting.

### Structured HTML correction (12 Nov 2026)

The secondary provider's actual meeting markup is an expandable `<li><button>` row containing a `font-bold` venue span, a UK/IRE country span, a labelled scheduled/abandoned status span, and a mobile race-count field; the same values also appear in desktop fields. Flat text extraction was unreliable and previously returned zero meetings despite a source header of three meetings and 21 races. The new parser isolates the `All meetings today` section and individual `<li>` rows, verifies the UK date and header totals, rejects malformed/duplicate rows, and retains bounded mismatch diagnostics. A read-only PR workflow fetches the live public source and checks real-source parsing; if the primary snapshot is for the same UK day, it also performs end-to-end meeting-list reconciliation. The independent-coverage P2 and all `UNVALIDATED`/`BLOCKED` research gates are retained even when two lists match. Do not rely on a green CI run alone as evidence that future source pages will remain compatible.
