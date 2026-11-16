# Exact historical football fixture matching — evidence gate

This independent research-only audit links archived Value Watch football records to the pinned TipsAudit external football CSV **only when kickoff instants and both team names exactly match** after whitespace/case normalisation. It never infers team aliases, competition equivalence or reversed home/away identities.

The original `research-history.json` reports **18 entries**, `sample_size: 18`, `metrics_status: INSUFFICIENT_SAMPLE`, `official_challenge: 0/100`, and archived entries that state `challenge_eligible: 0` and `timestamp_independently_attested: false`. The source is not an immutable certified pre-event forecast ledger.

Any exact same-named fixture remains only a potential identity match until third-party timing, league, competition, settlement and pre-event archive are verified. The code outputs zero model-versus-market paired scores by design, even if two records match perfectly.

Run:

```sh
node tests/test_football_pair_audit.cjs
node research/market-benchmark/football-pair-audit.cjs research-history.json /private/pinned-external.csv /private/new-pair-summary.json
```

The existing manual `external-football-market-benchmark.yml` will also create a pair-audit aggregate alongside the market-only summary. It pins the external source blob SHA and fails closed if that source changes. The workflow does not execute scheduled automatically and never publishes raw bookmaker odds or model predictions.

**Do not** compare the 18-entry Value Watch log loss (0.98705) to the external 8079-event market log loss (0.99491): unrelated event populations, unknown matching and nonattested prior forecast times invalidate such a comparison.

Next: develop an append-only pre-event probability archive, independently attest creation times and settled outcomes, obtain rights-cleared quotes with provable market-time provenance, and predeclare true paired evaluations. Research gates stay `UNVALIDATED` and `BLOCKED`.
