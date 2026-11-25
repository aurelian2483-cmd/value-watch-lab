# Batch 045 candidate archive repair (2026-11-25)

Exact failing head: 067a0a77de64b1ca4e28957eb81c437ff8e92aaa. PR 171 open/draft; authorised branch confirmed. Full research regression run 45683668703 succeeded. Registry run 45683668702 failed (65/66 tests passed); job 139450474605 log identifies the deep-equality assertion in experiment-registry-catalogue-intake.test.mjs, "admitted batch preserves all reviewed specifications".

The archived candidate-batch-045.json retained two pre-review records, whereas batch-045.json contains four reviewed records documented in BATCH-045-ADMISSION.md. The radix-two record changed definition, assumptions and mechanism note; Bluestein changed assumptions, computation and mechanism note. The two reviewed cosine/sine transformations were missing from the archive. The original staging version remains accessible in Git history at the failing head.

Repair: copy the exact admitted batch bytes to the reviewed candidate archive. No admitted records, prior identifiers, generated snapshots, candidate 046, tests, validators or gate settings are changed. The existing evidence ledger has 367 unique IDs; its ordering matches the 367 reference headings, and the four admitted records agree with their ledger fields. Progress reports 367 registered, 144 distinct algorithms after recorded equivalences and zero qualified; these are snapshot counts, not scientific validation. The next candidate IDs are absent from the current ledger.

The repair addresses the identified equality failure without relaxing the assertion. No local full workflow execution or fresh literature review is claimed. New exact-head hosted checks must pass before additional admissions. No experiments, protected data access or deployment.
