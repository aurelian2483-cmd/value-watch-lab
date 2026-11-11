# Cardano experiment-family registration and completeness audit

`cardano-lab/experiment-family.js` records a declared set of hypothesis IDs and descriptions, a protocol SHA-256, dataset SHA-256, and preregistration timestamp. `audit` checks that each declared hypothesis has one result, no undeclared hypothesis was silently included, results postdate registration, and result hashes match the declared protocol and dataset. Missing, unexpected, duplicate and nonconforming entries are reported separately.

**Important:** This is a *local consistency check*, not tamper-proof preregistration. Users can supply false timestamps or hashes; the module does not fetch or cryptographically verify external records. A family that passes is only internally complete, not independently validated. Publication stays BLOCKED and all models remain UNVALIDATED. Future work requires signed/versioned registration records with external timestamp evidence, immutable storage, protocol execution evidence and independent outcome verification.

Run `node tests/cardano_experiment_family.cjs`.
