# Offline prospective football evaluation v1

**Eligible real forecasts: 0. Eligible real adjudicated outcomes: 0.**
Models **UNVALIDATED**. Publication **BLOCKED**. The pinned repository
prediction ledger contains zero prospective football forecasts, and its outcome
feed contains zero rows. The evaluator has no adapter to either feed.
[Current interfaces](ARCHITECTURE.md) · [Input contracts](SCHEMA.md)

## Reproduce

Run from the repository root with Python 3.11 or later. The same commands work
with `python` on Linux, macOS and Windows. Quoted paths may contain spaces.

```sh
python -m unittest discover -s tests -p test_football_prospective_evaluation.py
python scripts/football_prospective_evaluation.py evaluate --forecasts tests/fixtures/football-prospective/empty/forecasts.json --outcomes tests/fixtures/football-prospective/empty/outcomes.json --manifest tests/fixtures/football-prospective/empty/manifest.json
```

Replace `evaluate` with `validate` to check input contracts without scoring.
Replace the three `empty` paths with `synthetic` for a labelled test example
with an otherwise eligible path. Both examples report `insufficient_data`
with no real metrics. Unit tests also exercise the prospective-labelled code
path using in-memory synthetic data. Synthetic test results provide no model
evidence. The two commands only read explicit input files and emit JSON to stdout.
They do not invoke providers, capture forecasts, write ledgers, select models or
publish anything.

For future actual prospective input, pass `--trusted-manifest-sha256` with a
digest obtained from a separately trusted reviewer or protected review record.
Computing a hash from an unreviewed packet only checks those bytes. It supplies
no attestation. Without a pin, all prospective-labelled rows are excluded.
The harness cannot verify external timestamps, payload contents, claimed
licences or acquisition independence from metadata alone. Sources and proofs
must be verified by a reviewer before a manifest is trusted.

## Scoring and reporting

- Log loss is negative natural logarithm of the probability assigned to the
  observed home/draw/away result, floored at `1e-15` for the logarithm only.
- Multiclass Brier is the sum of the three squared differences from the one-hot
  outcome. It ranges from zero to two. The engine does not rescale, round,
  normalize or repair forecasts. Probabilities must sum to one within `1e-9`.
- The uniform vector and fixed illustrative `[0.45, 0.30, 0.25]` vector are
  declared baselines. Both are scored on exactly the same eligible fixtures
  as the candidate in each immutable model cohort. No outcomes are used to tune
  either baseline. At most one candidate record per fixture may enter a run.
- The report shows input row counts, per-forecast reason codes, count of
  excluded rows by reason and the scoring denominator per model. Two receipts
  for one adjudicated fixture count as one outcome. A partial prospective cohort
  suppresses scores for the whole run. Missing roster fixtures, absent attested
  records and per-record exclusion reasons remain visible. Intervals are withheld
  because no independent sampling design is established, even if a future
  packet contains many fixtures.
- Historical quotes are optional reference metadata with a conservative
  30-minute age limit at freeze. The harness produces no market benchmark,
  price execution inference, value metric or betting instruction.

### Report template

Use the evaluator output as the source of counts. When eligible real counts
are zero, report **Insufficient data for prospective scoring** and list real
forecasts, adjudicated outcomes and the exclusion counts. Leave metrics blank.
For future nonempty cohorts, report the exact number of fixtures per model,
paired baseline scores, exclusions and unavailable intervals. Retain
**UNVALIDATED** and **BLOCKED** and make no model-approval claim.

### Review limits

Unknown event aliases, conflicting schedule records and reschedules are held
out. This contract requires an exact roster and explicit reviewer mapping to
every eligible outcome receipt. It does not use date-only records, historical
reconstructions or any Phase 10 candidate overlap as a settled result.
Timestamp discipline checks submitted metadata. It cannot detect unlogged
feature leakage or a reviewer who approved incorrect underlying records.
No reserved holdout or live source is used.
