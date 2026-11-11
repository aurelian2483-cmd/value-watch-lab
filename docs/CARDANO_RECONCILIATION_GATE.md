# Cardano reconciliation integrity gate

`cardano-lab/reconciliation-gate.js` joins structurally reconciled historical predictions and outcome receipts with offline byte-hash verification reports. Missing, inconsistent or duplicated integrity evidence is surfaced. The gate never labels records as externally verified or eligible for real-world scoring.

This is intentionally a **partial evidence stage**: matching bytes to a self-declared digest does not establish that the publisher supplied those bytes, that the result is correct or that the capture time is authentic. No externally sourced match results have been ingested or scored by this module. A future authenticated acquisition process and independent result verification are necessary before real-world historical evaluation.

Test: `node tests/cardano_reconciliation_gate.cjs`. Research-only, UNVALIDATED, BLOCKED.
