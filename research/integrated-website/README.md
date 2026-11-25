# Integrated Research Website — read-only evidence release

This is the integrated website layer on top of the accepted PR #185 revision f5022f2eeb305d277cd7ef21fcce2fdf149dda9e. No existing component or source pin is replaced. The original Phase 1/2/3 state is verified with its existing contract validators and independently retained archive fingerprints. Newer accepted reports are displayed separately with their own revisions and provenance. The catalogue uses the accepted 331-specification checkpoint (not a live branch count). User-supplied hardware reports are represented by the previously committed derived review; raw local receipts are not uploaded.

## Open the website
Extract Sky-Research-Integrated-Website.zip and open index.html. All ten sections, native navigation, tables, charts and evidence details work offline with no installation. The included status.json and manifest bind the integrated evidence. Source workflow links are optional external links; no requests are made by the page itself. The original Phase 3 loopback viewer and producer-contract controls remain unchanged.

## Reproduce
Run from the repository root with Node 22 and Python 3.12. Prepare an empty archive directory containing the five exact ZIP archives named phase3.zip, campaign.zip, readiness.zip, pilot.zip, historical.zip and the exact catalogue.json blob listed in source-pins.json. The accepted original CI artifacts are time-limited; keep the archive copies to reproduce later.
- python -B research/integrated-website/prepare.py <archive-directory> <new-prepared-directory>
- node research/integrated-website/build.mjs <prepared-directory> <empty-output-directory>
- npm ci --ignore-scripts --no-audit --no-fund
- npx playwright install chromium
- node research/integrated-website/browser-acceptance.mjs <prepared-directory> <output-directory> <qa-directory>
- python -B research/integrated-website/package.py <output-directory> <qa-directory>

CI's download mode verifies exact source workflow metadata and archive byte hashes. The build verifies original Phase 3 nested release and state, accepted catalogue blob, campaign reference binding, hardware review, historical counts and all gates. Chromium checks navigation and details at six viewport widths, file opening with no external requests, read-only HTTP test hosting, and tamper rejection. The output is a deterministic read-only site; no live-data provider requests, producer integration, raw data, protected evaluation or deployment.

## Scope and release boundary
All source evidence remains historical, not synchronized current measurements. A matching fingerprint binds a receipt to its pinned bytes, not to external truth. Hardware acceptance is unsigned and fixed-test only. Historical study is single-source retrospective development and independent certification is outstanding. No model qualification, live monitoring, production scheduler or GPU workload dispatch. Research UNVALIDATED; publication BLOCKED; execution blocked. No merge or Pages update.
