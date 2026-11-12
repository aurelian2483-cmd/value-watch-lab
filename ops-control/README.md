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
