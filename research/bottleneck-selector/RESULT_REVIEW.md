# Bottleneck Lab — manual result evidence worklist

The next research-only stage following the version-identity ledger. It reuses the existing Validation Centre receipt cross-check logic and the canonical prediction, primary, secondary and review archives. It creates a deterministic worklist for **human verification**, not a verified outcomes feed.

## Inputs
- prediction-ledger.json: original first-write-wins pre-event model receipts.
- research/provider-result-observations.json: original provider final claims, unverified.
- research/secondary-result-evidence.json: second-source claims, unverified.
- research/result-review-status.json: snapshot-time reconciliation states.
- results-feed.json: actual outcome archive, never altered here.
- Bottleneck Evidence Bridge and Method Identity: preserve exact six options and the absence of verified dropdown engine identity.

Run with Node 22:

~~~sh
node --test research/bottleneck-selector/selector.test.mjs research/bottleneck-selector/evidence-bridge.test.mjs research/bottleneck-selector/method-identity.test.mjs research/bottleneck-selector/result-review.test.mjs
node research/bottleneck-selector/result-review-cli.mjs > /tmp/bottleneck-result-review.json
~~~

The output contains each reviewable exact-event packet with a forecast receipt, event/market/model identity, primary and secondary source URLs/timestamps/hashes, and the reported result claim. It carries **explicitly false** independent-outcome-verification, betting and scoring flags. It is not published to GitHub Pages or committed as a result data file.

The replay uses the archived review-status publication time to avoid falsely treating older evidence as current. Replaying old claims is useful for auditing but **does not establish source freshness**. Duplicate identities, inconsistent status counts, late source observations, ambiguous event-matched forecasts and conflicting publication gates are blocked or withheld.

### Human verification is still outstanding

Even if two providers report the same result, the source authenticity, upstream independence, competition identity, settlement rules and recorded response bytes must be investigated. READY_FOR_HUMAN_REVIEW is a queue status, not a certificate. A reviewer must inspect the real event and sources; a future separate, explicitly approved process can assess evidence for entry into results-feed.json. This module neither writes verified outcomes nor selects a winning engine.

**Do not infer the parent-engine identity** from FIXED_ELO_K24_V1 or POISSON_BASELINE_2025_26_V1. Neither the 608 reconstructed historical cases nor the human-review packets are verified engine-versus-engine trials. The 1,000-entry catalogue requirement and subsequent provenance/approval decision remain binding before any broad method tournament.

**Not deployed.** No website edits, bets, odds-based EV claims, or automatic promotion. Keep draft until the branch-specific tests and whole-repository regression are reviewed.
