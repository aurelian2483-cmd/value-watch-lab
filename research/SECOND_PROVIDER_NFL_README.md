# Second provider pilot — NFL research result observations

**Scope:** Separate-provider NFL results observation, *not verified settlement or approved betting model*. The source has a distinct operator from ESPN. Current connector: TheSportsDB's free V1 `eventsday.php` endpoint.

TheSportsDB public API documentation describes `eventsday.php` with a date, sport and league filter, and the `123` shared free key. It imposes tiered limits and may not contain complete NFL schedules. Sources:
- https://thesportsdb.readme.io/reference/geteventsbyday
- https://www.thesportsdb.com/API.php

## Matching strategy
1. Read the immutable pre-event NFL forecast and its original ESPN source URL and frozen participant IDs.
2. Reload the original ESPN game metadata **only for participant-name and home/away mapping**, never as the second provider's outcome.
3. Query TheSportsDB for the UTC game date, `American Football`, `NFL`.
4. Match the *exact normalized home and away team names*, timestamp within two hours, a final status, numeric full-time score, supported market and frozen participant IDs.
5. If duplicate matches, missing scores, uncertain dates/status or incomplete provider lists occur, **withhold** rather than guess.
6. Record resulting claims in `research/secondary-result-evidence.json` as `SECONDARY_UNVERIFIED`. Keep original observations unchanged; reruns skip existing entries. The `research/result-review-status.json` reconciler may label matching claims `READY_FOR_HUMAN_REVIEW`, never independently verified.
7. Restrict fetches to a bounded number of original URLs and dates per run, in addition to a timeout and maximum response size.

## Limits and risks
- TheSportsDB free endpoint may return only a limited subset of matches. *No match* does not imply *no game*.
- Data from separate domains is not sufficient proof of independent upstream sourcing; cross-provider syndication remains possible.
- NFL overtime/tie settlement is represented in a three-outcome experimental forecast. No bookmaker-specific settlement is inferred.
- Tennis is **excluded**: player identity equivalence and retirement/walkover rules have not been independently established against a second provider.
- The first prospective predictions were captured on 16 November 2026. Future matches must not be marked finished early.
- HTTP source requests do not alter betting signals, forecasts, `results-feed.json`, paper slips, ROI, odds or research publication gates.
- Sources may change API fields over time; any schema drift must fail closed and produce a source error rather than inventing results.

## Testing
`python -m unittest discover -s tests -p 'test_secondary_nfl_results.py' -v` tests identity mapping, event timestamps, outcomes, ties, incomplete/ambiguous matches, bad sources, free-tier source absence and idempotent archiving. Included in full regression and the capture workflow's PR checks.

No betting approval or independently certified results are produced by this feature.
