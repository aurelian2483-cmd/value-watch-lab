#!/usr/bin/env python3
"""Bounded fallback refresh gate; does not guarantee GitHub scheduler latency."""
import datetime as dt
import json
import os
from pathlib import Path


def should_refresh(event, data, now, upstream=None):
    if event != 'workflow_run':
        return True, 'PRIMARY_TRIGGER'
    if not upstream or upstream.get('conclusion') != 'success' or upstream.get('head_branch') != 'main':
        return False, 'UPSTREAM_NOT_SUCCESSFUL_MAIN'
    if not 6 <= now.hour < 22:
        return False, 'OUTSIDE_COLLECTION_WINDOW_UTC'
    try:
        observed = dt.datetime.fromisoformat(data['generated_at_utc'].replace('Z', '+00:00'))
        if observed.tzinfo is None:
            raise ValueError('Timezone required')
        age = (now - observed).total_seconds()
        if 0 <= age < 15 * 60:
            return False, 'RECENT_RACECARDS_ALREADY_PUBLISHED'
    except (KeyError, ValueError, TypeError, AttributeError):
        pass
    return True, 'STALE_OR_MISSING_RACECARDS'


def main():
    try:
        data = json.loads(Path('racing-research-data.json').read_text())
    except (OSError, ValueError):
        data = {}
    event_file = os.environ.get('GITHUB_EVENT_PATH')
    payload = json.loads(Path(event_file).read_text()) if event_file else {}
    run, reason = should_refresh(os.environ.get('GITHUB_EVENT_NAME'), data,
                                dt.datetime.now(dt.timezone.utc), payload.get('workflow_run'))
    with open(os.environ['GITHUB_OUTPUT'], 'a') as output:
        output.write('refresh=' + str(run).lower() + '\n')
    print(reason)


if __name__ == '__main__':
    main()
