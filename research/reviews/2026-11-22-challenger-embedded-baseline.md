# Horse-racing review — exact-freeze challenger baseline

Date: 22 November 2026
Reviewed main: `f6a806fa`
Decision: **KEEP BASELINE / CONTINUE RESEARCH**
Safety: **UNVALIDATED**, publication **BLOCKED**, no bets placed

## Evidence reviewed

- Current racecard, context, form and challenger snapshots.
- Model documentation, source/provenance audits, Phase 3 protocol and locked
  prospective status.
- 209 immutable context forecasts, 133 immutable form forecasts and 83
  immutable challenger forecasts using their existing integrity validators.
- Provisional result ledgers and current two-publisher corroboration fields.
- Source-observed market archive through the existing read-only diagnostic.

The 06:59–07:00 UTC racing snapshots were about 100 minutes old at review time,
so current cards were no longer eligible as fresh recommendations. The current
racecard contained 386 active runners and seven explicit non-runners. No frozen
forecast contained a history date on or after its target race. Forecast
generation preceded the five-minute cutoff, and runner observations were no
more than 30 minutes old at freeze in all validated archives.

Phase 3 remains at zero genuinely pre-event A/B pairs and zero independently
reviewed outcomes. Its fixed endpoint has not started. Historical archive
changes since the prior review were additions; no frozen forecast file was
modified or deleted.

## Defect in the evaluation surface

The learned challenger stored `baseline_form_weight` for every runner in every
frozen record, but the published challenger performance compared only with
uniform chance. Comparing a separately collected form archive can introduce
field-revision and capture-time confounding. Not reporting the exact embedded
baseline could therefore make the challenger appear stronger than the model it
was intended to improve.

## Reversible improvement

`compare_embedded_form_baseline` now scores the challenger and its embedded
form vector on the identical frozen field, freeze timestamp and result receipt.
It:

- validates the source-backed outcome with the existing chronology checks;
- rejects missing, non-finite, non-positive or non-normalized baseline vectors;
- rejects duplicate scored revisions;
- reports paired Brier and log-loss deltas with the existing race bootstrap;
- retains `UNVALIDATED`, `BLOCKED` and research-only labels.

The challenger archive validator now also fails closed when an embedded form
vector is invalid. No coefficient, probability, forecast archive, result
ledger, market archive or website file was changed.

## Current descriptive comparisons

Lower scores are better; negative deltas favour the first named model.

| Comparison | Races | Brier delta | Log-loss delta | Interpretation |
| --- | ---: | ---: | ---: | --- |
| Challenger minus exact embedded form | 57 | +0.002315 | +0.014179 | Challenger worse on point estimates; both 95% race-bootstrap intervals cross zero. |
| Context minus form, two-publisher-corrob. outcomes | 59 | -0.000633 | -0.002533 | Tiny context advantage; both intervals cross zero. |
| Context minus proportional source-price reference | 100 | +0.086845 | +0.333220 | Context materially worse; prices are unverified observations, not executable or closing. |

Challenger-versus-form 95% intervals were `[-0.017509, +0.022606]` for Brier
and `[-0.082848, +0.118156]` for log loss. The data do not establish challenger
improvement. The form model's current corroborated comparison with uniform is
descriptively better (`-0.008004` Brier, `-0.044979` log loss), but it still is
not independently verified or a profitability claim.

## Remaining gates

1. Capture Phase 3 pairs prospectively under its frozen registration and obtain
   independent timestamp attestation.
2. Review outcomes from genuinely independent sources, including amendments,
   withdrawals and changed fields.
3. Use auditable available/closing prices before making market or EV claims.
4. Replace race-level exploratory intervals with the predeclared date-clustered
   Phase 3 endpoint once the fixed sample exists.
5. Do not promote the challenger; its retrospective test already failed and the
   current exact-freeze point estimates are also worse than form.
