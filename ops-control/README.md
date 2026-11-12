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

GET only, same-origin reads from `../research-dashboard-data.json`, `../racing-research-data.json`, `../other-sports-data.json` and `../horse-model-data.json`. The four sources cover four sport desks; the second horse source is independent model-audit input. It writes no shared localStorage, makes no GitHub mutations, and contains no order placement or secret tokens.

The UI must never promote experimental probabilities to certified odds, EV, accuracy or bet advice. `UNVALIDATED` / `BLOCKED` remain the only publication state.

## QA

`node --check ops-control/app.js && node ops-control/qa.cjs`. The read-only workflow `.github/workflows/operations-control-qa.yml` checks standalone changes; deployment/publication is a separate GitHub Pages process.

## Hosting

If GitHub Pages publishes from this repository's `main` root, the expected standalone route is `/value-watch-lab/ops-control/`. This folder shares the repository and Pages hosting with the source research, but **is a separate application**. A separate repository/domain can be used in a later migration without embedding it in Value Watch's main UI. Confirm the actual published URL in Settings > Pages or your normal hosting configuration.
