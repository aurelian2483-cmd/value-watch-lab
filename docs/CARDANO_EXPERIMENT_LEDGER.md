# Cardano experiment ledger — prototype contract v1

Standalone Node/browser module: `cardano-lab/experiment-ledger.js`. No live UI integration or automatic data collection. Test: `node tests/cardano_experiment_ledger.cjs`.

An experiment record requires a schema version, unique immutable record ID, hypothesis, one of four sports, research lane, state, UTC creation/update timestamps, dataset SHA-256, method version, deterministic seed, at least one timestamped HTTPS source, and explicit research-only / UNVALIDATED / BLOCKED gates.

States: PROPOSED, RUNNING, COMPLETED, FAILED, REJECTED. Terminal states must include a result summary and SHA-256 of a separately retained result artifact; a hash alone does not prove the artifact exists. Nonterminal records cannot claim results.

`validate(record)` returns `{valid,errors}`. `append(history,record)` validates and returns a new copied array, refusing duplicate IDs. It is **not** durable or tamper-proof storage; it does not cryptographically verify content hashes, check source authenticity, or prove experiment execution. Persistent append-only storage, revisions/links, migration, outcome reconciliation, and concurrency controls remain future work.

No probability or betting decision is produced by this module. Never treat synthetic fixtures as real evidence.
