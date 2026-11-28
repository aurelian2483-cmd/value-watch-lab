# Batch 049 reference snapshot repair

- Failed head: `5f94cb31930760c2b9fa5a4c7dd8eb2b8f826c65`.
- Registry run 45726929401: 65/66 tests passed; snapshot test failed on REFERENCE.md. Full regression run 45726929383 succeeded.
- Compared complete stored reference against the assertion's generated output from the pinned run. The stored side matched the pinned file, and exactly four lines differed: each Batch 049 mechanism line had one additional trailing period. Replaced the snapshot with the exact generated text and terminal newline. The first three snapshots passed the sequential comparison before the reference assertion failed.
- No specification, identifier, generator, test, candidate, ledger or lifecycle claim changed. No experiments or protected data accessed. Fresh CI must confirm the correction before new admissions.
