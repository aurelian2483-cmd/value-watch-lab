# Football producer interfaces and shadow boundary

The producer scripts below were inspected in the [pinned research tree](https://github.com/aurelian2483-cmd/value-watch-lab/tree/0ab96a96fd66608d931c4109392ee29fe2ba3650).
They were not run. The shadow adapter reads committed snapshots locally.

| Interface | Actual fields, timestamps, and writes | Eligibility gap |
| --- | --- | --- |
| [Premier League dashboard sync](../../.github/workflows/experiment85-research-dashboard-sync.yml) | Experiment 82 builds the schedule. Experiment 102 writes `experimental_model_forecasts` with ordered `home`/`away`, `kickoff_utc`, `model`, `prob_home`/`prob_draw`/`prob_away`, optional `training_basis`, and null `odds`/`expected_value`. `generated_at_utc` is a dashboard timestamp. Experiment 106 separately records primary and revision hashes in `research/forecast-archive/v2` and `research/forecast-revisions/v2`. Sync copies the dashboard and legacy history to the website. | No explicit stable fixture ID, season, exact model version/configuration or independent pre-kickoff attestation in the dashboard forecast. Archive creation times remain source-declared and explicitly unattested. |
| [Expanded football workflow](../../.github/workflows/football-expanded-research.yml) | `expanded_football.py` uses `league`, `espn_event_id`, ordered teams, `kickoff_utc`, research probability fields, training and schedule receipts. Archive rows have `generated_at_utc`, `record_sha256` and optional `revision_of`; the writer checks a five-minute pre-kickoff buffer and appends by digest. `performance.entries` references that digest and records scores and two receipt claims. Workflow publishes `football-expanded-data.json`. | Forecast digest is not model-configuration identity or independent freeze evidence. Expanded finals retain their existing evidence tier. They provide no reviewed evaluation receipt set. |
| [Market capture](../../scripts/refresh_hybrid_market.py) | `event_id`, `start_utc`, `market`, `snapshot_at_utc`; benchmark and Sky Bet blocks carry `source_id`, source URL/hash, `source_event_id`, observed/captured/HTTP timestamps, and decimal `prices`. Sky Bet also carries a source market ID. Capture writes the hybrid-market snapshot. | The market key or source observation cannot fill a missing forecast identity, cutoff or freeze. No automatic join. |
| [First-write capture](../../scripts/capture_prospective_research.py) | Tennis/NFL only. `prediction_id`, `sport`, `event_id`, `model_version`, `market`, `recorded_at_utc`, `event_start_utc`, snapshot and source fingerprints, participant IDs and probabilities. Writes `prediction-ledger.json`, capture audit and pending queue. [Capture tests](../../tests/test_prospective_capture.py) cover first-write and chronology. | No current football adapter or rows. |
| [Legacy verifier](../../scripts/verify_football_results.py) | Expects `id`, `isProspective`, `sportCode`, `marketCode`, `providerMatchId`, `selectionCode`, `eventStartUTC`, `recordedAtUTC`. After provider confirmation appends `predictionId`, `verified`, `result`, `marketCode`, `fullTimeScore`, `source`, `observedAtUTC` to `results-feed.json`. Observation is script wall time, not a provider timestamp or independent receipt. | WIN/LOSS is selection settlement, not an outcome vector. Ordered teams, season, receipt digest and independent corroboration are missing. No conversion to an adjudicated outcome. |

[Match Centre tests](../../tests/test_football_match.cjs) exercise schedule and
training cutoffs. [Provenance tests](../../tests/test_football_provenance.py)
exercise snapshot pins, receipt conflicts and missing archives. The
[Phase 17–22 contracts](../football-prospective-evaluation/SCHEMA.md) are the
boundary for prospective inclusion. The safe integration point is a local
diagnostic projection from explicit producer fields, without joining forecasts
to a schedule, price, archive or result to backfill missing evidence.

Implemented code supports specific named research variants. The source does
not establish a complete football V1–V6 family or a deployable integration.
