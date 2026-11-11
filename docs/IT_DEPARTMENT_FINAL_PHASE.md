# Value Watch 3.0 Cardano — IT Department (final-phase feature)

**Status: planned only. Do not implement or expose the button until the scientific engines, data workflows and dashboard are ready for final integration.**

## Purpose
A single **IT Department** button opens a technical support and system-health centre. It must report actual observed state, not simulate agent activity or invent successful checks.

## Planned capabilities
1. **Health monitor:** module availability, data-source freshness, GitHub Actions status when authenticated and available, browser storage health, source provenance and four-sport / four-paper-slip coverage.
2. **Problem detector:** missing or stale records, mismatched schemas, failed imports, broken links, workflow errors and regression risks.
3. **Repair assistant:** create reproducible incident reports, propose minimal changes, run targeted and end-to-end regression tests and distinguish proposed fixes from verified fixes.
4. **Quality control:** protect UNVALIDATED / BLOCKED / research-only gates, reject invented odds, outcomes, source evidence or agent activity; track accessibility and performance checks.
5. **Backup and recovery:** show backup availability, export checks and recovery instructions; never overwrite or erase data without explicit user approval.
6. **Incident history:** record symptom, evidence, suspected root cause, action, test result, remaining risks and resolution status.

## Operational boundaries
- Default read-only diagnostic mode; no silent production edits, deployment, main-branch merges, destructive actions, costs or safeguard relaxation.
- Repairs to a development branch may follow existing project-manager authorization; production release requires explicit user approval.
- Status labels must distinguish **passed**, **failed**, **not run**, **not connected**, **unknown**, and **stale**.
- An offline/static website cannot autonomously inspect remote infrastructure or run GitHub CI without an authorised integration. Show such checks as not connected until implemented.
- Every claimed fix requires evidence of relevant tests, cross-module regression review and rollback planning.

## Release acceptance criteria
- One-click access from the main dashboard, usable on desktop and mobile.
- Actual diagnostics for all four sports, four slips, experiment archive and data-source pipelines.
- Read-only first; explicit user action for repairs and high-risk operations.
- Browser tests, fault-injection tests, accessibility checks, recovery checks and a documented incident workflow.

## Priority
**Final integration stage**, after current mathematical research, provenance, historical validation and Control Tower work. This document is a requirement reservation, not a claim of implementation.
