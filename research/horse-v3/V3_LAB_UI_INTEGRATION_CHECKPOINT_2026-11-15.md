# V3 Lab evidence integration — UI candidate checkpoint (15 November 2026)

Status: **Step 2 of 3 COMPLETE in isolated research branch; NOT deployed to live website**.

## Changes
- Compared the live `main:v3-research/index.html` with the diverged older research branch. Preserved the newer live V3 comparison section and its script/CSS dependencies in the isolated integration candidate rather than replacing them with the older research page.
- Added `v3-research/evidence-status.js` and `v3-research/evidence-status.css`.
- Added read-only evidence monitor with the following allowlisted metrics: today's publisher-observed races, source observation stale >60m, publisher field changes, frozen V1 and V3 record counts, unresolved historical field conflicts.
- Explicit research-only / UNVALIDATED / BLOCKED status; unavailable or stale feed displays clear messages. No odds, selections, stakes, or model release controls.
- Status feed expected at `../horse-research-status.json`; this file has **not** been published on main. Missing data is a deliberately tested failure state.

## Verification
Workflow: https://github.com/aurelian2483-cmd/value-watch-lab/actions/runs/43722929401 — SUCCESS.
- Node: 12 UI validation cases, existing V3 asset presence and JavaScript syntax checks passed.
- Python: 6/6 safe status contract tests passed.
- Generated candidate static evidence report and allowlisted JSON as GitHub artifact, not published on website.

## Remaining Step 3
1. Review exact changes against current live main and test mobile/desktop rendering in an actual browser. This Actions job tests structure, scripts and status contracts, **not** a full browser end-to-end screenshot or performance audit.
2. Configure a safe periodic export of `horse-research-status.json` to the live static site with its own immutable source and freshness checks. It must never move model or scratch data into betting slips.
3. Deploy the evidence UI and public research-only JSON together after end-to-end QA; verify the actual GitHub Pages path and rollback strategy.
4. Confirm no regressions to the existing homepage, research lab, Gold Council or paper slips.

No live release, bookmaker price, validation, model weighting or wagering changes performed.
