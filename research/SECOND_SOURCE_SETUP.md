# Racing second-source connection and evaluation

The optional connector uses The Racing API's documented Free-plan endpoints:

- `/v1/racecards/free` for today's racecard observations.
- `/v1/results/today/free` for today's results. Daily result observations are cached so older forecasts can be corroborated later.

Provider documentation: https://api.theracingapi.com/documentation
Official schema inspected: https://api.theracingapi.com/openapi.json (version 1.4.4).

## Account-dependent activation

No account, subscription or purchase has been created. Use provider API credentials for an account you choose to use. In this GitHub repository, open **Settings → Secrets and variables → Actions → New repository secret**, then add:

- `RACING_API_USERNAME`
- `RACING_API_PASSWORD`

Use the provider-issued API credentials, not your GitHub password. Never paste them into chat, repository files, workflow inputs or logs. The workflow passes these secrets only to the optional collector step. It permits only the two documented free endpoints, rejects redirects, limits request frequency and sanitizes HTTP/network failures.

Run **Horse racing experimental discovery** on `main` after configuration. A successful credentialed integration run is required before treating the connector as operational. Missing credentials leave the existing pipeline working with an explicit `MISSING_CREDENTIALS` audit.

## Matching and evidence

Schedule corroboration requires an unambiguous normalized course match and a timezone-aware scheduled start within 60 seconds. Ambiguous 12-hour times are rejected. Matching is schedule-only: it does not prove that archived features were available at their historical cutoff.

Results require the same course and start, the complete frozen runner field and the same unique winner. Different names, missing runners, dead heats, corrections, missing offsets and source errors remain unresolved. A second publisher is not proof that the two publishers generated their underlying data independently. Provisional and cross-publisher samples remain separate. Official challenge progress stays 0/100 and model status stays UNVALIDATED.

## Evaluation protocol

Scores compare the model with equal chance on the same frozen field. Revisions cannot increase sample size. Calibration bins are descriptive. Paired uncertainty intervals resample whole races only after at least 30 scored races. The 100-race review target is not a guarantee of validation or profitable value.

Do not backfill missing pre-race forecasts or represent reconstructed historical tests as prospectively archived predictions. Model parameters remain versioned; any later changes require a separate model version and evaluation sample.
