# Cardano byte-level evidence integrity

`cardano-lab/evidence-integrity.js` (Node.js) hashes explicitly supplied raw evidence bytes using SHA-256 and compares the computed digest against a receipt's claimed SHA-256. It rejects malformed HTTPS URLs, invalid digests, non-byte input, empty evidence and evidence above 10 MiB. It never performs network requests.

**Trust boundary:** A matching digest proves only that the provided bytes match the supplied digest. It does **not** prove the bytes were fetched from the declared URL, that the publisher authored them, that the result is accurate, or that the timestamp predates a sporting event. The digest and content may both have been invented by an attacker. `publisher_authenticated=false` and `source_fetched=false` are intentional.

Use only for offline integrity checks and evidence preparation. Independent authenticated capture, source provenance, timestamp verification and outcome confirmation are separate required steps. UNVALIDATED / BLOCKED / research-only remain enforced.

Test: `node tests/cardano_evidence_integrity.cjs`.
