# Release and enrollment checkpoint

Accepted software baselines:
- Website PR #195 head 3f46d594f6f707cbc4d3fc99fda6587c5c7510c8, six applicable workflows passed (45574716821, 45574716730, 45574716857, 45574716704, 45574716798, 45574716799); odds refresh intentionally skipped. Do not treat a moving main branch as the tested base.
- Client PR #196 head d2010dd4bbf241a3f49a9b9b0b5786f98d808c6f; Windows and Linux portable tests, actual loopback TLS, controller QA, full regression passed (45576100718, 45576100450, 45576100638).
- PR #194 retains historic hosted fixed QA; two CPU jobs and 500 fixed checks passed. No independent scientific qualification.

This package is deliberately dry-run by default. It includes the exact client Git blob dcb6d1d378e840da9a142bcff7dac1097ac33536, Windows launcher, instructions and member manifest. The ZIP builder uses tracked bytes and deterministic metadata across platforms. CI tests archive integrity and the extracted client and Windows launcher. No external service or credential is required for dry run.

## Actual online deployment acceptance gates

1. Select an authorized hosting account, confirm cost limits and ability to provide durable storage, trusted HTTPS and controlled backend access. GitHub Pages can serve the historical read-only site but cannot run the persistent controller; the local HTTPServer implementation must never be internet-exposed.
2. Implement and verify a provider-appropriate service boundary with explicit revision, server clock, rate and size limits, secret rotation, durable storage, access restrictions, authenticated evidence intake and restoration/rollback controls. No production execution until separately authorized.
3. Deploy only a bounded presence/fixed-QA environment; verify health, restart and storage persistence, TLS and observer isolation. Keep physical GPU dispatch blocked.
4. Provision a unique PC-only token using the provider secret-management channel, never GitHub or chat. Owner explicitly authorizes the physical PC connection and runs the client on the actual PC. Verify the exact revision and authenticated heartbeat from the remote endpoint; demonstrate no inbound PC listener and no secret persistence.
5. Verify approved fixed GPU numerical acceptance and an independent result-evidence contract before any remote GPU execution. A heartbeat is not a GPU attestation. Verify scheduling, interruption, no-duplicate execution and storage recovery; no automatic fallback or retry of ambiguous work.
6. Independently authorize release of the read-only website candidate against current main and verify live routes, preserved pre-existing site, rollback plan and all research gates. Static software release is distinct from scientific publication. No production dispatch or model qualification implied.

No provider account is provisioned, paid plan selected, main merged, real hardware remotely connected or production service deployed by this PR. Research UNVALIDATED; publication and production dispatch BLOCKED.
