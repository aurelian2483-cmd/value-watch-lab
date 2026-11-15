# Darts source integration — status and limits (15 Nov 2026)

## Findings
Darts API official docs https://dartsapi.com/documentation provide:
- `/v1/results`: match ID, `played_on` **date only**, winner/loser ID and score, final status, paging.
- `/v1/fixtures`: incoming schedule, may omit `starts_at` or leave `date_confirmed` unset.
- A free key, 500 requests/day, 60/minute. Results on the free plan are delayed by at least seven days; live scores and advanced odds/model APIs are paid.
- Terms (https://dartsapi.com/terms) allow own-product usage, not bulk redistribution, rate-limit workarounds or sharing the API key.

## Delivered
- `scripts/darts_api_adapter.py`: conservative, documented translation into D1 player/result/fixture contracts; day-only carrier timestamps clearly flagged, same-date and unconfirmed fixture rows excluded.
- `scripts/collect_darts_research.py`: bounded pagination and time windows, fixed host, secure bearer header, hard request limits, no provider raw data in downloadable artifact or git.
- `tests/test_darts_api_adapter.py`: offline tests for missing times, future leak, identities and duplicates.
- `.github/workflows/darts-source-diagnostic.yml`: **manual-only** provider probe, explicit `DARTS_API_KEY` secret required; an offline test job also runs on pull requests.

## What remains externally blocked
A Darts API credential does **not** exist in the current available environment. No provider calls or real match data have been executed by this branch. The GitHub secret must be created by an authorised account holder, and provider fixture schema should be reviewed against a real, permitted response before automated publication is considered. We must also confirm which historical result window the free tier actually returns before evaluating player coverage. No change is made to `darts/feed.json` or the Betting Hub.

Crucially, an API credential or free plan is **not equivalent to a trustworthy real-time betting feed**. Actual fixture timing and source freshness, licence, independent result labels, and all D1 validation gates remain mandatory. The existing D1 model is **UNVALIDATED / BLOCKED**.

## Execution
Offline: `python -m unittest discover -s tests -p 'test_darts_api_adapter.py' -v`

With an authorised GitHub secret: run the **Darts research source diagnostic (no publication)** workflow via Actions → Run workflow, then review its counts-only artifact and logs. The workflow does not change production data. No key should be pasted into chat, source code or site HTML.
