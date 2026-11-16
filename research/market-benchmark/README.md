# Market comparison core — experimental research only

This library implements **proportional de-vigging**, multiclass **log loss**, multiclass **Brier score** and paired scoring of an independent model versus an observed closing bookmaker market.

- No provider, scraping or automatic odds acquisition is included.
- It does not modify the Betting Hub, existing model calculations or paper slips.
- The closing quote is evaluated **after the outcome** as a hindsight benchmark. Never treat a mixture containing closing odds as a prediction available when the original forecast was frozen.
- Use source-licenced odds with complete same-event, same-selection, same-market outcome vectors (for example, a complete football 1X2 market). No mixing ordinary-time 1X2 with including-overtime markets.
- The collector or independent reviewer must verify event identities, actual settlement, source receipts and observation timestamps *before* calling this core. The library checks format and chronology, not provider authenticity.
- Multiple bookmakers may use different de-vig methods. Proportional normalisation is a documented baseline, not necessarily the most accurate treatment.
- A lower model log loss than a closing-line baseline is evidence about forecasting quality, not verified tradable expected value or profit.
- Pair comparisons only on the same events and predeclare model variants/weights to reduce multiple-testing and hindsight selection bias.
- Results remain `research_only: true`, `model_validation: UNVALIDATED`, `publication_gate: BLOCKED`.

## Usage

Run `node tests/test_market_benchmark_core.cjs` for source-free regression assertions.

`require('./core.js').evaluate({...})` expects:

| Key | Meaning |
|---|---|
| `event_id`, `market_id` | Stable matching identities |
| `start_utc` | Offset-aware start time |
| `model_probabilities` | All outcomes in the same declared order |
| `model_frozen_at_utc` | Timestamp earlier than start |
| `closing_odds` | Complete decimal prices matching model outcome order |
| `closing_observed_at_utc` | Actual attributable quote time, between forecast freeze and start |
| `closing_source` | HTTPS source reference (not proof of authenticity) |
| `winner_index` | Independently checked outcome index in the shared vector |
| `blend_weight` | Optional fixed experimental weight for hindsight-only blend; must be in [0,1] |

No automatically imported football-data.co.uk or exchange archive records are included. Verify licence rights and exact time provenance before selecting any archive for integration.
