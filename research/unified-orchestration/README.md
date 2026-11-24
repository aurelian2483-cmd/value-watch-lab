# Phase 3 — Operational Research Orchestration foundation

Stacked on accepted Phase 2 revision 79379e17c448f17404d0df70d76b87fcb4f51504 (PR #178). Existing Phase 2 files and source pins are unchanged. This first milestone is a persistent metadata review registry, not a research execution engine. No producer services, signing keys, dataset collection, experiments, scheduler, repair, publication or deployment are enabled.

## Fixed dependency graph

Catalogue, data and reference metadata review precede laboratory review; laboratory precedes compute; compute precedes supervisor; supervisor precedes the final readiness review. One explicit advance records one metadata review. The final readiness decision is always EXECUTION_BLOCKED. Completed metadata reviews do not mean successful scientific experiments, source rights verification, empirical qualification or live hardware acceptance.

## Local operation

Use separate operator-owned directories for the accepted Phase 2 state and the new registry, and a separate plan file. JSON plan fields: kind APPROVED_ORCHESTRATION_REVIEW, schemaVersion 1, baseRevision (exact accepted Phase 2 commit above), stateSha256 (exact independently reviewed accepted state fingerprint), trustSha256 (null for historical manual review or independently trusted signing registry fingerprint for signed review), mode HISTORICAL_MANUAL_REVIEW or SIGNED_REPORT_REVIEW. Retain the exact plan SHA-256 separately after explicit review. Do not derive trusted fingerprints from untrusted inputs.

Commands:
- node research/unified-orchestration/registry.mjs status <phase2-state-dir> <registry-dir> <plan> <trusted-plan-sha256> [trusted-registry-sha256]
- node research/unified-orchestration/registry.mjs advance <phase2-state-dir> <registry-dir> <plan> <trusted-plan-sha256> <NEW-or-previous-registry-sha256>

Retain the emitted registrySha256 independently after every accepted advance. NEW is valid only when the registry does not exist. Each advance checks the exact previous state fingerprint inside a writer lock, rechecks the Phase 2 state and plan, and atomically replaces a bounded registry file with a deterministic receipt chain. On restart the chain is reconstructed against the pinned evidence and fixed task graph; altered outcomes, out-of-order events, wrong plan, and mismatched state fail closed. Registry inspection without a separately retained latest fingerprint cannot detect a correctly rehashed rollback. Receipt age is not measurement freshness. Operator-owned storage is the trust boundary; atomic rename is not a power-loss durability guarantee. An interrupted writer lock requires manual review; no automatic repair. The registry stores metadata only, not raw datasets or private keys.

CI tests synthetic historical and signed fixtures plus actual accepted historical Phase 2 state extracted from the exact verified artifact 14975003557, run 45511111878. Ephemeral CI evidence approval does not grant production authority. Archive expiry 2026-12-01 23:36 UTC; later reproduction requires retaining approved artifacts or reviewing replacements. Physical Windows/GPU and actual producers remain unverified.

## Next milestones

1. Verify initial CI and actual historical review lifecycle.
2. Read-only orchestration dashboard and durable incident/control records.
3. Producer adapter contracts, approval-bound queue and lifecycle verification using synthetic isolated workloads only.
4. Explicit operational acceptance, independently reviewed provenance, production identity setup and host verification before any genuine research execution can be considered.
5. Complete regression, backup/recovery, browser acceptance and local release.

Research UNVALIDATED. Publication BLOCKED. No execution, repair, data access, source mutation or scientific validation authorized. No forced picks. No merging or deployment.

## Read-only orchestration dashboard

Baseline 2fb03d6 passed 56/56 tests, all seven metadata reviews against the exact accepted historical Phase 2 archive, and full research regression (45511914830, 45511914931). Start the new viewer with node research/unified-orchestration/dashboard.mjs <phase2-state-dir> <registry-dir> <plan> <trusted-plan-sha256> [port [trusted-registry-sha256]]. Default port 8767; open http://127.0.0.1:8767; Ctrl+C stops it. It binds only to IPv4 loopback, uses GET/HEAD only, restricts Host, Origin and cross-site requests, and never advances tasks or grants permissions. Any local process can read the viewer; do not expose it or include sensitive raw data. The dependency cards distinguish recorded metadata reviews, satisfied dependencies, waiting tasks and the next explicit fixed-order review. The progress count is not scientific completion. The viewer reloads every 15 seconds. With a separately retained exact registry anchor, later changes cause a 503 response until the operator restarts with the newly reviewed fingerprint. Without that anchor, the viewer displays a warning that rollback cannot be ruled out. Invalid registry, plan or evidence fails closed. No automatic producer action, repair or deployment. New HTTP and browser tests await CI; the browser checks empty, partial, complete and corrupted states at 1440/390/320 widths and timed refresh on copies of the accepted historical evidence.

## Responsive layout regression correction

Revision c178ed2 passed 59/59 integration tests and full research regression (45512205857), but browser run 45512205743 failed the horizontal-overflow assertion in the completed review state. The long machine-readable lifecycle status was replaced in visible prose by a wrapping human-readable label; the exact status remains in the JSON endpoint and data-lifecycle attribute. Main, grid and gate text now have explicit responsive sizing/wrapping, without hiding overflow. The original overflow requirement remains and the browser suite adds element-level diagnostics, exact lifecycle state assertions, visible untruncated fingerprints and an additional 280px viewport. Expected browser coverage: 16 state/viewport cases plus one timed refresh. Retest pending on the corrected revision. No Phase 2 modifications or research permission changes.
