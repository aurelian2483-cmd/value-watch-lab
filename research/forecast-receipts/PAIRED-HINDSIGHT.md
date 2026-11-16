# Paired historical hindsight — research-only diagnostic

**This is not certified live-prediction performance or evidence of a profitable betting strategy.**

The source inputs are:

1. An original `forecast-receipt.json` captured **before** the fixture by the proposed forecast-snapshot workflow (PR #73). Captures record model probability vectors and source file hashes but are not independently timestamp-notarised.
2. The repository's later `football-expanded-data.json` containing football final scores corroborated by two separate source receipts. It uses the established `research-audit-core.js` validator.
3. A permitted TipsAudit CC BY 4.0 historical CSV containing source-reported Pinnacle closing 1X2 odds and full-time results. See `research/market-benchmark/EXTERNAL-FOOTBALL-2026-11-16.md`.

## Run privately

```sh
node tests/test_paired_hindsight_research.cjs

node research/forecast-receipts/paired-hindsight.cjs \
  /private/forecast-receipt.json \
  /private/football-expanded-data.json \
  /private/tipsaudit-predictions-all.csv \
  /private/NEW-paired-summary.json
```

The program requires exact home and away team text after case/whitespace normalisation, identical UTC kick-off instant, unchanged model version, corroborated full-time result, agreement with external 1X2 outcome and complete closing odds. It excludes duplicate external keys and entries with reversed historical home/away names.

Scores are computed **only on the same paired events**. It records observed model and closing-market multiclass log loss/Brier, but clearly labels the market as hindsight-only, forecast capture as not independently certified, and publication as blocked.

## No automatic model promotion

This module does not reconstruct forecasts retrospectively or select a winning formula based on results. It does not make claims about the tradability of the closing prices, price timing, exchange commission, EV, profitability or source completeness. In particular, the data source is an external track record, not a complete census of football fixtures.

The model's original publication timestamp still needs independently verifiable attestation; the closing prices need verifiable source timestamps and market execution conditions. A completed comparison is not proof of an exploitable edge.

No actual captured future-receipt dataset has yet been supplied to this module. Consequently **no legitimate model-versus-market result has yet been obtained**. The current implementation is a tested comparison pathway, not a scored forward experiment.

Dependency: PR #73, which must be reviewed and merged before this PR. Both require explicit user notice before merges.
