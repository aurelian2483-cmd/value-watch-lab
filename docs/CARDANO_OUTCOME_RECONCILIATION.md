# Cardano outcome reconciliation prototype

`cardano-lab/outcome-reconciliation.js` joins pre-existing prediction records to supplied result receipts by stable event ID, retaining prediction and source hashes as **unverified claims**. It rejects malformed or duplicate identifiers, invalid chronology, invalid HTTPS receipt URLs and missing SHA-256 fields. It reports missing events, receipts without matching predictions, unknown outcomes, pre-event receipts and conflicting valid receipts. Conflicting receipts are never treated as confirmed results.

This module is **not** a live results collector, a source-authentication engine or a proof of accuracy. A hash field is not proof that the underlying content exists or matches the hash. A URL is not proof that its publisher confirms the outcome. No predictions are scored automatically. The model remains UNVALIDATED and publication BLOCKED.

Run `node tests/cardano_outcome_reconciliation.cjs`. Next: independently fetched and verified source evidence, result-status semantics (postponed/abandoned/void), real provenance capture and a reproducible historical scoring pipeline.
