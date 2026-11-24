# Unified Research Control Centre — Phase 2 foundation

Separate stacked branch based on Phase 1 accepted head ead68f5d893cbe6428e374e7a9216a1633077dfc. No original project changes. The initial integration supports local, explicitly approved batches of six summary files, one atomic accepted state, receipt age, and an opt-in loopback viewer. It does not run producers, poll external sources, collect datasets, start on boot or authorize research.

## Controlled intake
Create two separate existing directories for the inbox and state, owned by the operator and not writable by untrusted processes. Copy only the six aggregate summary files named in the inherited source-pins.json into the inbox. An operator must review the exact source and contents before approving. Provide approval.json with kind APPROVED_SUMMARY_BATCH, schemaVersion 1, sequence (starts at 1 and increases by exactly one), approvedAt (UTC ISO time with milliseconds), and sources in pin order with id, head, reportRevision, run, artifact and summarySha256. Identity fields must match the inherited pins. The expected SHA-256 of the exact approval bytes must come from a separately trusted review; merely hashing an untrusted manifest is not authentication.

Run:
- node research/unified-live/sync.mjs sync <inbox> <state-dir> <trusted-approval-sha256>
- node research/unified-live/sync.mjs status <state-dir>
- node research/unified-live/viewer.mjs <state-dir> 8766

Open http://127.0.0.1:8766 on the same computer. The viewer reloads every 15 seconds; it reads accepted state, not the inbox. Stop it using Ctrl+C. No server is installed or started automatically. Any local process can read this loopback service, so do not expose it or use it with sensitive raw data. Only GET/HEAD are supported. No remote access or CORS.

Each batch is staged, validated by the inherited adapters, independently checked against approved byte hashes, and committed to current.json with a writer lock and atomic replacement. Replays do not refresh receipt age. Unchanged individual reports retain their first-received timestamp across batches. Missing, corrupted, out-of-order, unapproved or unsafe files do not replace accepted state. The status distinguishes no accepted batch, recently received, stale and clock uncertain. Measurement freshness always remains UNKNOWN; receipt age is not producer health. State corruption fails closed. A leftover writer lock after interruption requires manual verification that no writer is running before removal. Atomic replacement is not a power-loss durability guarantee; backup and restoration acceptance are subsequent milestones.

## Scope and provenance
Initial adapters are deliberately bound to the Phase 1 revision set; changed report bytes are local operator-approved candidates, not proof that an immutable GitHub artifact has changed or that a producer supplied them. The source labels remain declared, not authenticated by the viewer. CI independently downloads the five exact verified historical archives and the pinned Git catalogue and exercises the real aggregate contracts. Synthetic fixtures test sequencing and changed bytes; they are not research results. New source revisions and automatic producer feeds require reviewed promotion, source-specific provenance and explicit authorization in subsequent development. No automatic approval is provided outside isolated CI. The local state directory is a trusted operator boundary; self-hashes do not defeat deliberate re-signing by an attacker with write access.

Research UNVALIDATED; publication BLOCKED; execution, repair, data access and mutation not authorized. No merge or deployment. Initial test results pending.

## Next milestones
Actual six-source CI acceptance; browser acceptance for populated, empty, stale and corrupted local state; rejected-batch incident reporting; recovery and rollback tests; independently approved revision promotion; authenticated producer adapters; bounded polling and lifecycle controls; final integration audit and local release. Physical Windows and GPU acceptance remain separate.

## Checkpoint and isolated recovery

Create a separate operator-owned backup directory and a new empty recovery directory. Run node research/unified-live/sync.mjs checkpoint <state-dir> <backup-dir> and retain the emitted sequence and checkpointSha256 separately in a trusted record. Run node research/unified-live/sync.mjs recover <backup-dir> <empty-state-dir> <trusted-checkpoint-sha256> <sequence>. The operation never overwrites active state or existing checkpoints, rejects mismatched hashes and preserves original timestamps and approval sequence. Inspect the recovered state using status before manually selecting it for a new viewer. There is no automatic failover or active rollback; an older isolated checkpoint is historical and must not be presented as newer evidence. Recovery is not proof of physical disk durability or independent provenance. Do not use operator directories writable by untrusted processes. The earlier baseline 4fd2f73 passed 14 tests, thirteen browser scenarios including timed refresh, and full regression (runs 45505643944 and 45505644034). Checkpoint/recovery tests and actual CI recovery are pending on the new revision.
