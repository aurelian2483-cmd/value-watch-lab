#!/usr/bin/env python3
"""Bounded fallback refresh gate with read-only diagnostics."""
import datetime as dt
import json
import os
from pathlib import Path
from zoneinfo import ZoneInfo


LONDON = ZoneInfo('Europe/London')
RETRY_AGE = dt.timedelta(minutes=15)


def instant(value):
    parsed = dt.datetime.fromisoformat(value.replace('Z', '+00:00'))
    if parsed.utcoffset() is None:
        raise ValueError('Timezone required')
    return parsed


def snapshot_health(snapshot, now, *, future=False):
    """A new envelope cannot certify stale, missing or future runner receipts."""
    try:
        generated = instant(snapshot['generated_at_utc'])
        age = now - generated
        status = {'age_seconds': age.total_seconds()}
        if age < dt.timedelta(0):
            return {**status, 'reason': 'SNAPSHOT_TIMESTAMP_FUTURE'}
        if age >= RETRY_AGE:
            return {**status, 'reason': 'SNAPSHOT_TOO_OLD'}
        if (not future and snapshot.get('race_date_uk') != now.astimezone(LONDON).date().isoformat()):
            return {**status, 'reason': 'WRONG_LONDON_CARD_DATE'}
        rows = snapshot.get('races')
        if not isinstance(rows, list) or (not rows and not future):
            return {**status, 'reason': 'RACE_ROWS_MISSING'}
        if future and not rows and not snapshot.get('fixture_meetings'):
            return {**status, 'reason': 'FUTURE_COVERAGE_EMPTY'}
        checked = stale = missing = invalid = future_receipts = 0
        for row in rows:
            start = instant(row['startUTC'])
            if not now < start <= now + dt.timedelta(days=2):
                continue
            if row.get('runner_data_status') != 'SINGLE_SOURCE_RUNNERS_OBSERVED' and not row.get('runners'):
                missing += 1
                continue
            try:
                observed = instant(row['runner_observed_at_utc'])
            except (KeyError, ValueError, TypeError, AttributeError):
                missing += 1
                invalid += 1
                continue
            checked += 1
            if observed > generated:
                future_receipts += 1
            elif now - observed >= RETRY_AGE:
                stale += 1
        return {**status, 'rows': len(rows), 'runner_receipts_checked': checked,
                'stale_receipts': stale, 'missing_runner_receipts': missing,
                'future_runner_receipts': future_receipts, 'invalid_claimed_receipts': invalid,
                'reason': 'RUNNER_RECEIPT_AFTER_SNAPSHOT' if future_receipts else
                'RUNNER_RECEIPTS_INVALID' if invalid else
                'RUNNER_RECEIPTS_STALE' if stale else
                'RUNNER_RECEIPTS_MISSING' if not future and missing and not checked else
                'CURRENT_SNAPSHOT'}
    except (KeyError, ValueError, TypeError, AttributeError):
        return {'reason': 'SNAPSHOT_SCHEMA_OR_TIMESTAMP_INVALID'}


def should_refresh(event, data, now, upstream=None, future=None):
    if event != 'workflow_run':
        return True, 'PRIMARY_TRIGGER'
    if not upstream or upstream.get('conclusion') != 'success' or upstream.get('head_branch') != 'main':
        return False, 'UPSTREAM_NOT_SUCCESSFUL_MAIN'
    if snapshot_health(data, now)['reason'] != 'CURRENT_SNAPSHOT':
        return True, 'STALE_OR_MISSING_RACECARDS'
    if future is not None and snapshot_health(future, now, future=True)['reason'] != 'CURRENT_SNAPSHOT':
        return True, 'STALE_OR_MISSING_FUTURE_RACECARDS'
    return False, 'RECENT_RACECARDS_ALREADY_PUBLISHED'


def read_snapshot(path):
    try:
        return json.loads(Path(path).read_text(encoding='utf-8'))
    except (OSError, ValueError):
        return {}


def main():
    data = read_snapshot('racing-research-data.json')
    future = read_snapshot('racing-future-data.json')
    event_file = os.environ.get('GITHUB_EVENT_PATH')
    payload = json.loads(Path(event_file).read_text()) if event_file else {}
    now = dt.datetime.now(dt.timezone.utc)
    run, reason = should_refresh(os.environ.get('GITHUB_EVENT_NAME'), data,
                                now, payload.get('workflow_run'), future=future)
    with open(os.environ['GITHUB_OUTPUT'], 'a') as output:
        output.write('refresh=' + str(run).lower() + '\n')
    print(json.dumps({'decision': reason, 'today': snapshot_health(data, now),
                      'future': snapshot_health(future, now, future=True)}, sort_keys=True))


if __name__ == '__main__':
    main()
