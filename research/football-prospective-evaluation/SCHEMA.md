# Football prospective contracts v1

The executable schemas are in [football_prospective_contract.py](../../scripts/football_prospective_contract.py)
and [football_prospective_evaluation.py](../../scripts/football_prospective_evaluation.py).
All object fields listed below are required, and extra fields and duplicate
JSON member names fail validation. Files use UTF-8. Timestamps require seconds
and `Z` or a known numeric UTC offset. An unzoned local time, date alone or
unknown offset fails validation. Comparisons normalize timestamps to UTC.

## Shared shapes

- Event fields are `namespace`, `id`, `competition`, `season`, `home`, `away`
  and `starts_at`. Participants are ordered, distinct names. The stable key
  is namespace plus opaque provider ID. Known event equality also requires
  exact competition, season, ordered names and UTC kickoff. There is no fuzzy
  match or imputed kickoff.
- Provenance has `source` and lowercase `sha256`. Source is an HTTPS reference
  or an opaque permitted local reference in the [intake source shape](../football-result-provenance/intake-schema-v1.md).
  The evaluator does not open or fetch referenced material.
- Availability is `{"state":"known","value":...}`,
  `{"state":"unknown","value":null}` or
  `{"state":"unavailable","value":null}`.
- Canonical record hashes are SHA-256 of sorted-key, compact UTF-8 JSON with
  literal Unicode, excluding the `content_sha256` field itself. Canonical hashes
  cover fields such as origin, probabilities, training receipts and dates.
  Manifest pins cover the exact file bytes, including line endings and BOM.

## Forecast packet

Object with integer `schema_version: 1`, `kind: football-frozen-forecasts`
and `records`. A record has:

- `record_id`, `content_sha256`, `origin` (`prospective` or `synthetic`), and
  `event`. The ID is `forecast-v1:` plus SHA-256 of the canonical JSON array
  of namespace, event ID, model name, model version SHA-256 and configuration
  SHA-256. Repeated IDs are rejected, including resealed revisions.
- `model` with `name`, `version_sha256` and `configuration_sha256`.
- `market: FULL_TIME_1X2`, `settlement_scope: regulation_time`,
  `outcome_order: ["home","draw","away"]` and `probabilities`.
- `input_cutoff`, `created_at`, `frozen_at`, in that order and all before
  kickoff. `input_receipts` is a nonempty array of distinct content hashes
  with `observed_at`, `period` (`training` or `calibration`) and `provenance`.
  Input observations cannot exceed the declared cutoff.
- `market_observation` is availability-wrapped. Known quotes have `event`,
  `market`, `market_id`, `settlement_scope`, `bookmaker`, `observed_at`,
  `completeness`, `quotes` and `provenance`. The event, market and settlement
  must match and the observation must be within 30 minutes before or at freeze.
  Prices are decimal numbers greater than 1 and no greater than 1,000,000.
  All three outcomes are required for `complete`. Fewer are `partial`.

## Outcome packet

Object with integer `schema_version: 1`, `kind: football-outcome-receipts`
and `records`. A record has `receipt_id`, `content_sha256`, `origin`,
`event`, `provider`, `acquisition_lineage`, `status`, `settlement_scope`,
`score`, `observed_at`, `retrieved_at` and `provenance`.
Receipt IDs, providers and lineage labels are lowercase tokens. Status is
`final`, `abandoned`, `postponed` or `void`. Scope is `regulation_time`,
`including_extra_time`, `including_penalties` or `unavailable`. Scores use
the availability shape with two ordered nonnegative integers for a known
score. A final requires an observation after kickoff and a known score and
scope. Retrieval must be at or after observation.

Only agreeing regulation-time finals with a matching reviewer decision
are scoreable. The exact reviewed set must contain at least two receipts
with distinct provider event keys, provider labels, acquisition lineages
and original payload hashes. Distinct metadata cannot itself demonstrate
independence. Contradictions, duplicate evidence and unsupported statuses
stay unresolved with specific reason codes.

## Review and split manifest

Object with integer `schema_version: 1`, `kind: football-evaluation-manifest`,
`as_of`, `split`, `freeze_attestations` and `outcome_reviews`.

- `split` has `training`, `calibration` and `evaluation` objects with
  `start` and `end`, and a `fixtures` roster of `partition` and `event`.
  Windows are non-overlapping, chronologically ordered and half-open.
  Training and calibration must end by `as_of`. A stable event key or
  ambiguous alternate ordering may occur only once across the roster.
  Eligible forecasts must match their evaluation roster fixture. Cutoff
  cannot exceed evaluation start. Input observations must belong to the
  declared training or calibration window.
- Each freeze attestation has `record_id`, `forecast_sha256`, `observed_at`
  and `provenance`. The independent reviewer supplies evidence that the
  exact record was frozen at or before observation, and that observation
  was strictly before kickoff and no later than `as_of`.
- Each outcome review has the forecast `event`, `outcome_sha256` array,
  `reviewed_at`, `decision: exact_fixture_and_independent_sources_reviewed`,
  and `provenance`. The review binds the forecast key and full event identity
  to the exact set of receipt hashes. Providers may use different IDs when
  the reviewed identity matches exactly. The review follows every retrieval
  and precedes or equals the report cutoff `as_of`.

Only exact trusted manifest bytes can enable prospective-labelled scoring.
The code does not verify the truth of reviewer or provider assertions.
