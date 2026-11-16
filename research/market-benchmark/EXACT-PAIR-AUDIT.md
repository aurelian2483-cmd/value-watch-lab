# Exact historical football fixture matching — evidence gate

This independent research-only audit links archived Value Watch football records to the pinned TipsAudit external football CSV **only when kickoff instants and both team names exactly match** after whitespace/case normalisation. It never infers team aliases, competition equivalence or reversed home/away identities.

The original `research-history.json` reports **18 entries**, `sample_size: 18`, `metrics_status: INSUFFICIENT_SAMPLE`, `official_challenge: 0/100`, and archived entries that state `challenge_eligible: 0` and `timestamp_independently_attested: false`. The source is not an immutable certified pre-event forecast ledger.

Any exact same-named fixture remains only a potential identity match until third-party timing, league, competition, settlement and pre-event archive are verified. The code outputs zero model-versus-market paired scores by design, even if two records match perfectly.

## Observed first overlap check — 16 November 2026

Using the immutable external CSV blob `d846f87991977b062a8250a61572e1c0075be3db` and the currently published `research-history.json`:

- **18** Value Watch archived football research entries.
- **1** exact fixture overlap: Newcastle v Everton, 2 November 2026, 20:00 UTC.
- **17** unmatched archive entries by exact kickoff and team text.
- The external result and archived result agree on an away win for the single overlap, and the external CSV includes a complete closing 1X2 quote vector.
- **0** independently timestamp-attested forecast records; therefore **0** eligible paired market-vs-model scores.

This check identifies an *identity candidate*, not a demonstrated pre-kickoff model forecast. Even the overlapping record cannot be used for model-versus-market performance until stronger original archive evidence exists. The external source is a track record, not an exhaustive fixture registry.

Run:

```sh
node tests/test_football_pair_audit.cjs
node research/market-benchmark/football-pair-audit.cjs research-history.json /private/pinned-external.csv /private/new-pair-summary.json
```

The existing manual `external-football-market-benchmark.yml` will also create a pair-audit aggregate alongside the market-only summary. It pins the external source blob SHA and fails closed if that source changes. The workflow does not execute scheduled automatically and never publishes raw bookmaker odds or model predictions.

**Do not** compare the 18-entry Value Watch log loss (0.98705) to the external 8079-event market log loss (0.99491): unrelated event populations, unknown matching and nonattested prior forecast times invalidate such a comparison.

Next: develop an append-only pre-event probability archive, independently attest creation times and settled outcomes, obtain rights-cleared quotes with provable market-time provenance, and predeclare true paired evaluations. Research gates stay `UNVALIDATED` and `BLOCKED`.
