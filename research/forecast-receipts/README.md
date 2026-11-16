# Future football forecast snapshot receipts (research only)

This workflow captures **already published** experimental forecast vectors from `research-dashboard-data.json`. It never regenerates a forecast from results or updates existing model calculations.

- Source input is required to be recent (generated within 48 hours) and created no later than the capture time.
- Every retained fixture must be at least 5 minutes before kick-off when captured; values must form a 1X2 probability vector.
- Each receipt includes actual processing clock, source SHA-256 and repository commit SHA.
- Duplicate, started and incomplete event observations are excluded; output is generated as an immutable, non-overwriting run artifact with a 90-day retention period.
- Receipts do **not** independently certify that the source was immutable when originally published. The GitHub Actions run metadata and retained artifact provide additional traceability but are **not** independent trusted timestamp notarisation.
- No automatic scheduled workflow, modifications to the four slips, or publishable betting scores are included.
- No existing research archive is overwritten. Source-generated timestamp is metadata, not independent proof of pre-match model publication.
- Archive records remain `challenge_eligible: 0`, `timestamp_independently_attested: false`, `UNVALIDATED` and `BLOCKED`.

## Running a capture

After merge, start **Freeze published football forecasts as research receipt** using GitHub Actions → Run workflow. Download the resulting private workflow artifact and preserve its run ID, attempt, created-at, repository commit and source hash in a trusted private record. Do not use the artifact as official prediction certification or a backdated bet.

This deliberately fails if no fresh source data is present or no GitHub commit identity can be established. To reach stronger independent verification, add a separately controlled timestamp witness/notary and a second-source settlement feed; do not label the existing source timestamps independently verified until that evidence exists.

Test with `node tests/test_forecast_snapshot_receipts.cjs`.

## Experimental settlement audit

`settlement-audit.cjs` reuses the repository's existing two-publisher result-corroboration logic. It matches a previously saved receipt to later reported final results using exact team text, UTC start and model name, then reports **exploratory, explicitly unattested** model log loss and multiclass Brier.

Because neither a capture receipt nor two publishers of a result independently certify the original forecast's publication timestamp, the audit always reports `attested_eligible: 0` and never claims verified betting performance. It does not compare closing bookmaker prices. Its summary is only a diagnostic for archive and results alignment.

Test with `node tests/test_forecast_settlement_audit.cjs`. A future workflow may evaluate a retained receipt against subsequently published verified-results data, but no automatic retroactive promotion is authorised.
