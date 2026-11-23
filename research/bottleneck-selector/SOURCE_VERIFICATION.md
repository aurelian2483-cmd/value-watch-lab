# Bottleneck Lab — source verification dossier (research-only)

This stage does **not** independently verify any of the archived sporting results. It creates a reproducible list of exactly what an external reviewer must verify before results can become defensible evidence. The user-approved 1,000-entry catalogue gate remains unchanged.

## What it adds

- Checks that the input is an original research-only, blocked Bottleneck worklist and is a snapshot-time replay, **not a live result feed**.
- Validates exact forecast identifiers, sport-specific market settlement rules, pre-event timing, result-observation chronology, source URLs, hashes and duplicate identities.
- Groups result claims by sport and source-host pair so source dependence can be investigated. Distinct hostnames are **not** proof of upstream independence.
- Outputs traceable receipt-pair fingerprints, source URLs and an explicit manual source/settlement review checklist.
- Keeps independently_verified_outcome=false, source_independence_certified=0, selected_method=null and scoring_authorised=false even for two matching source claims.
- Never changes the website, source collectors, betting gates or results-feed.json.

Run with Node 22 from the repository root:

~~~sh
node --test research/bottleneck-selector/selector.test.mjs research/bottleneck-selector/evidence-bridge.test.mjs research/bottleneck-selector/method-identity.test.mjs research/bottleneck-selector/result-review.test.mjs research/bottleneck-selector/source-verification.test.mjs
node research/bottleneck-selector/result-review-cli.mjs > /tmp/bottleneck-result-review.json
node research/bottleneck-selector/source-verification-cli.mjs /tmp/bottleneck-result-review.json > /tmp/bottleneck-source-verification.json
~~~

At initial inspection, 36 archived result claims were review-ready: **23 tennis** and **13 NFL**. The source-host pairs were ESPN → ATP Finals (6), ESPN → WTA files (17) and ESPN → GitHub nflverse (13). These figures represent archived source records, not completed external verification checks.

## Missing external verification

A genuinely independent review needs retained original source bytes or equivalent independently verifiable original evidence; a strict event/competitor and settlement match; scrutiny of both sources' actual upstream origin; and a traceable human reviewer decision addressing discrepancies. Neither matching record digests nor a different URL authenticates the evidence.

This stage **does not accept self-asserted reviewer flags as proof**, and cannot automatically promote any row into the verified results archive. Authentic outcome certification is a separate controlled workflow for future explicit review. Source-to-dropdown-engine mapping is also unresolved, so even genuine outcomes would not alone establish an Engine 2.5 versus Engine 3.0 winner.

Keep the branch and stacked pull request in draft until all relevant CI, independent evidence audit and existing user approval processes succeed.
