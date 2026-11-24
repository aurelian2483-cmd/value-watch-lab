# Central Data Intelligence — Phase 1

Separate draft development branch, based on last green catalogue revision daafe0383664d0a339595a4c537043ceb40bd0e4. No changes to the running catalogue automation.

This phase reuses the historical and prospective evidence inventories already present in the base. It adds a deterministic aggregate integrity manifest covering four existing source files; it does not collect new data or certify individual results.

Run from the repository root:
```sh
node --test research/central-data-intelligence/manifest.test.mjs
node research/central-data-intelligence/manifest.mjs . "$(git rev-parse HEAD)"
```

The declared revision is a label supplied by the caller, not verified membership. Source receipts hash bytes and record lengths. Before/after checks detect ordinary changes during inspection, but do not establish a transactional filesystem snapshot. The manifest is content-addressed and tamper-evident relative to a separately trusted fingerprint, not digitally signed. Treat source rights, provider authenticity and cross-provider identity as unverified. Data quality reconciliation does not certify outcomes or imply statistical validity.

No individual source records are exposed. Missing files are unknown, not zero. Historical and prospective evidence remain separate; no summed unique event count. The module does not create source files, change existing files, run models, access protected partitions, make financial decisions or publish anything.

Next phases, not yet implemented: broader allowlisted source catalogue, source-rights review, identity crosswalk review, independent provenance checks, and operational access-control design. Do not duplicate existing collectors.
