# Private historical-odds evaluation adapter

This extends the already merged [market comparison core](./README.md). It accepts **operator-provided, licensed, timestamped historical quote vectors** and immutable pre-event forecast vectors. It never downloads feeds or guesses a price.

Run:

```sh
node research/market-benchmark/evaluate-file.cjs /private/approved-input.json /private/new-summary.json
node tests/test_market_benchmark_import.cjs
```

The first argument must be a private, rights-cleared JSON file. The output must not already exist; it is created with restrictive permissions where supported. **Keep both paths outside the repository.** This is research-only, not a live or production odds connector. There is no included real dataset and no score claims.

## Input contract

```json
{
  "schema_version":1,
  "data_rights_confirmed":true,
  "use_scope":"PRIVATE_RESEARCH",
  "events":[]
}
```

Each real event must contain `event_id`, `market_id`, `model_version`, `start_utc`, `model_probabilities`, `model_frozen_at_utc`, `closing_odds`, `closing_observed_at_utc`, `closing_source`, `winner_index`. Also explicitly attest these five Boolean values: `outcome_verified`, `event_identity_verified`, `market_identity_verified`, `quote_source_verified`, `model_forecast_archive_verified`.

All outcome vectors must use **the same complete, fixed selection ordering**, market type and settlement rules; e.g. regulation-time football 1X2 includes the draw, while NFL moneyline including overtime does not. A data steward must independently inspect these attestation fields. The program validates chronology and numeric structure but cannot independently verify a provider, data rights, event settlement or historical price authenticity.

The output contains only aggregate scores and exclusion counts, not source quotes, event names or URLs. Missing evidence is excluded and the publication gate remains BLOCKED. A data input containing verified source evidence is still not proof of prospective profitability. The model and market are scored on identical matched events, with lower log loss and Brier being better. Model performance is not compared to unverified executable bookmaker prices or conflated with closing-line value.

Future work: connect a legitimately authorised provider; check full historical event coverage, actual quotation capture time, event identity mapping, settlement rules and model archival authenticity; add walk-forward predeclared variant evaluations and uncertainty intervals. No automatic odds import should be deployed until those conditions are met.
