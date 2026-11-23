# Bottleneck Lab — private human-review decision register

This is an additive, **read-only research stage** stacked after the existing source evidence, original-response hash and frozen model-version audits. It does not create a reviewer, signature, independent result, winning method, profitability result, or automatically verified outcome.

## Current known limitations

The original 23 November 2026 archive contains 36 review-ready source claims (23 tennis and 13 NFL). The raw-evidence pipeline expects 72 original response files and, when run without private files, reports all 72 missing. The verified outcomes feed is empty. An empty private review register is therefore the correct starting point: **36 NOT_REVIEWED and zero certified**. This is a snapshot-time replay, not a current live re-fetch.

## What the register can do

- Create an optional private journal template, bound by a SHA-256 digest to the **exact raw evidence audit**.
- Validate a sequence of review decisions for exact forecast IDs: NEEDS_EVIDENCE, DISPUTED, REJECTED, or READY_FOR_EXTERNAL_AUDIT. There is no VERIFIED, ACCEPTED_BET or AUTO_APPROVE state.
- Check reviewed-at timestamps, duplicate journal IDs, reason text, source-evidence fingerprints and a hash chain. Changing or deleting an entry invalidates the chain *only against a preserved externally witnessed tip*; it does not independently authenticate a reviewer or prevent a coordinated rewrite.
- Require matching raw response bytes and at least two evidence fingerprints for a READY_FOR_EXTERNAL_AUDIT *handoff*. Even then, the outcome remains unverified pending an independent source audit.
- Produce a safe summary and a record of which archived packets still need independent review. **No file write is performed by the module**, no original source bytes appear in the output, and no results-feed.json is changed.

## Test and run (Node.js 22)

~~~sh
node --test research/bottleneck-selector/selector.test.mjs research/bottleneck-selector/evidence-bridge.test.mjs research/bottleneck-selector/method-identity.test.mjs research/bottleneck-selector/result-review.test.mjs research/bottleneck-selector/source-verification.test.mjs research/bottleneck-selector/raw-source-evidence.test.mjs research/bottleneck-selector/review-journal.test.mjs

node research/bottleneck-selector/result-review-cli.mjs > /tmp/bottleneck-worklist.json
node research/bottleneck-selector/source-verification-cli.mjs /tmp/bottleneck-worklist.json > /tmp/bottleneck-source-dossier.json
node research/bottleneck-selector/raw-source-evidence-cli.mjs /tmp/bottleneck-source-dossier.json > /tmp/bottleneck-raw-audit.json
node research/bottleneck-selector/review-journal-cli.mjs /tmp/bottleneck-raw-audit.json > /tmp/bottleneck-review-status.json
~~~

To prepare an *empty private journal template* locally, use:

~~~sh
node research/bottleneck-selector/review-journal-cli.mjs /tmp/bottleneck-raw-audit.json --template > /private/path/private-review-journal.json
~~~

The output file's directory is a placeholder, not an actual created directory. Do not put private review files, original provider response bytes, sensitive reviewer identities or restricted data in this public GitHub repository. If entering a decision, use only a pseudonymous reviewer alias (not proof of identity), an exact prediction ID, an explanation and any separately supported evidence SHA-256 references. The append-only digest is computed using exported decisionDigest() and must be preserved with an external checkpoint to detect later rewritten histories. A reviewer must independently verify the original source and the relevant settlement rules outside this module.

## Security and statistical restrictions

The register accepts self-reported review notes but **never trusts them as final result attestations**. There is no automatic export to results-feed.json, no source-to-dropdown-engine selection, no A/B promotion, no bookmaker-odds or ROI claim, and no enabled 250-method tournament. The existing 1,000-catalogue-entry threshold, quality review and explicit later approval remain binding.

PR and branch should remain drafts pending full CI and implementation review.
