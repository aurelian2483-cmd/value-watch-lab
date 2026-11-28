# Phase 3 transactional repair and external review supplement

Baseline draft commit is `74574d0369765875b8f75a4fc5d4c2bfd6a0d86a`. The registered protocol, registration, model weights, scoring code, forecast archives and original review evidence retain their existing bytes. Value Watch remains **UNVALIDATED** and betting publication remains **BLOCKED**. The registered live collector and scheduler remain disabled. External reviewer sign-off is outstanding.

## Defect reproduction and repair

| Reproduced baseline defect | Implementation and verified repair |
| --- | --- |
| Two writers saw the same empty ledger and each froze the same input. | The disposable SQLite ledger serialises operations with an exclusive rollback-journal transaction. A unique canonical source hash allows only one forecast per input under the pinned registration. That input returns the original forecast on retry. A distinct revision with the same scheduled start remains immutable. A conflicting start for the same race is rejected. Six simultaneous threads and four independent processes each produced one forecast in their respective tests. |
| A shared batch clock let a second record use the earlier timestamp after its cutoff. | The repaired intake takes an aware UTC and monotonic sample after obtaining the database lock for each record, takes a fresh sample after probability computation, and checks the clock and all time constraints again immediately before commit. The persisted UTC high-water mark rejects backwards wall-clock readings across restarts. A backwards monotonic sample within the operation also fails closed. The exact five-minute cutoff, stale receipts, forward jumps, clock changes, London midnight and the repeated autumn hour are covered. Two still-eligible records in a delayed batch retain distinct capture times. A record that becomes late at the commit boundary leaves only a rejection entry. |
| Interruption after adding a forecast left its immutable audit event absent. | Forecast and corresponding freeze event commit in one transaction. A deferred foreign key links the forecast to its exactly matching, unique freeze event. A savepoint rolls back any staged forecast when final validation fails. Hard exits at eight intake boundaries test the feed, source, race, forecast, audit, pre-commit and post-commit states. Retries complete rolled-back work or return an already committed forecast with its original timestamp and single freeze event. Each actual retry can record a separate duplicate attempt. |

The original [defect receipt](../intake-audit.json) is regenerated from the same baseline audit script and compared byte for byte. That audit deliberately exercises the frozen historical implementation. The repair uses the frozen input-validation rules and probability functions with a new persistence boundary. The acceptance route lives outside the registered directory. It requires a disposable scratch root and fixture capability, and it admits only synthetic fixture race identities. It has no live source adapter or registered-ledger target.

## Scheduler acceptance

The bounded fixture runner polls UTC slots automatically. Each slot has a durable state, actual first-start observation, last observation, attempt count and pinned feed digest. A separate SQLite lock serialises scheduler processes while allowing each forecast to commit independently. If a process exits after slot claim, after pinning its feed, during capture, or during slot completion, a later worker resumes the eligible slot with its original pinned feed and fresh per-record clock samples. An expired started slot is reported as interrupted and expired. A missed slot is recorded with its actual detection time and triggers no backfill. Valid earlier committed pairs retain their bytes.

Acceptance checks cover automatic polling against both injected and system clocks, concurrent scheduler processes, stale envelopes and field receipts, pinned acquisitions, missed slots and seven hard-exit scheduler boundaries. `DONE` means the intake loop completed. Per-record acceptance or rejection is in the audit. The new GitHub workflow runs only disposable QA on pull request or explicit dispatch. It defines no scheduled triggers or production writes.

## Reproduce and verify

Use Git and Python 3.12 or later with SQLite and Europe/London timezone data available. From the repository root:

```sh
git rev-parse HEAD
base=research/reviews/phase3-independent-review
sha256sum -c "$base/SHA256SUMS"
sha256sum -c "$base/transactional-repair/SHA256SUMS"
python "$base/verify_pins.py"
evidence="$(mktemp -d)"
python scripts/audit_phase3_isolation.py "$evidence/baseline.json"
cmp "$evidence/baseline.json" "$base/intake-audit.json"
python research/phase3-transactional/acceptance.py "$evidence/acceptance.json"
cmp "$evidence/acceptance.json" "$base/transactional-repair/acceptance.json"
python -m unittest discover -s research/horse-ab-phase3-master-20261115 -p 'test_*.py'
python -m unittest discover -s tests
for test in tests/*.cjs; do node "$test"; done
```

Use the exact commit in the repository link for this supplement. The [acceptance receipt](acceptance.json) identifies executed tests and injected process-exit boundaries. The [local regression receipt](local-regression.json) records integration verification. The baseline package pins the main snapshot and verifies all 612 protected forecast identities in the integrated Git tree. The original statistical simulations were left intact.

## Review limits

The clock samples document local acceptance and the final chronology check. Independent first availability of the canonical pair bytes requires external attestation. Tests cover real application-process termination around storage operations. They do not establish a power-loss recovery guarantee, bound filesystem sync latency after the final check, or certify operation on network volumes, replicated storage or multiple hosts. SQLite uses rollback-journal mode with synchronous EXTRA and exclusive transactions. Its storage and lock semantics remain relevant to the eventual host review. [SQLite transaction documentation](https://www.sqlite.org/lang_transaction.html) · [SQLite synchronous modes](https://www.sqlite.org/pragma.html#pragma_synchronous)

Activation still requires authorised data and retention, source lineage and completeness, independent timestamp evidence, and external technical review. Any future activation must explicitly use the repaired path. The frozen manual adapter remains available for exact baseline reproduction.
