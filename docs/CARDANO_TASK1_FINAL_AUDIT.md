# Cardano Task 1 — engineering sign-off review

Review date: 2026-11-11
Scope: development branch only; no production release or model validation.
Status: CONDITIONAL / NOT SIGNED OFF.

## Verified by source inspection
- Experiment ledger and local archive enforce schema, duplicate rejection, and research-only flags.
- Evidence register independently hashes captured bytes and checks receipt byte length.
- Readiness checks explicitly distinguish offline consistency from publisher/outcome verification.
- Research workflow combines experiment validation, evidence registration, and readiness diagnostics.
- Diagnostic archive stores research-only snapshots and requires a matching ledger experiment.
- CI contains integration, negative, recovery, and evidence-tampering tests. The project owner reported the latest run green; this review did not independently retrieve run logs.

## Open issues before Task 1 sign-off
1. **Evaluation linkage:** research-workflow.js explicitly returns evaluation_performed:false and does not invoke the binary/multiclass scoring modules. This is correct for unverified real-world data, but a separate reproducible *synthetic-fixture* evaluation path and linkage to experiment/result hashes remains to be built and tested without opening the publication gate.
2. **Persistence atomicity:** experiment-store.js and diagnostic-store.js use independent localStorage-style writes. They do not provide atomic multi-key transactions, cross-tab concurrency guarantees, or an automated recovery transaction.
3. **Real browser verification:** Node fixture tests do not demonstrate browser persistence, quota-exceeded handling, interrupted writes, or recovery on the intended user device.
4. **Diagnostic snapshot trust:** diagnostic-store.js checks structural flags but does not cryptographically authenticate archived diagnostic contents or recompute readiness on import. Imported snapshots must not be treated as authoritative verified evidence.
5. **Real-world source/outcome verification:** publisher authentication and independent outcome verification are not implemented. This is a scientific-validation dependency, not permission to score or publish.

## Required acceptance checks
- Add explicit fixture-only evaluation linkage with source/dataset/result hashes and fail-closed provenance.
- Test write failure, interrupted operations, recovery, and concurrent-update behaviour; document transactional limits.
- Browser smoke test for local archive export, restore, corruption and persistence.
- Keep UNVALIDATED / BLOCKED; verify no real-money or live publication paths.
- Record passing CI run and code review evidence before sign-off.

## Boundaries
This document does not claim production readiness, real-world predictive accuracy, positive EV, autonomous agents, or external data validation.
No merge, deployment, new cost, or safety-gate relaxation is authorised.
