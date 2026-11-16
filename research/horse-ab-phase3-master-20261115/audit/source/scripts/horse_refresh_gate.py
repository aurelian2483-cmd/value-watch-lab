#!/usr/bin/env python3
"""Bounded fallback refresh gate; does not guarantee GitHub scheduler latency."""
import datetime as dt
import json
import os
from pathlib import Path


def should_refresh(event, data, now, upstream=None, future=None):
    if event != 'workflow_run':
        return True, 'PRIMARY_TRIGGER'
    if not upstream or upstream.get('conclusion') != 'success' or upstream.get('head_branch') != 'main':
        return False, 'UPSTREAM_NOT_SUCCESSFUL_MAIN'
    minimum_age_seconds = 15 * 60
    def recent(snapshot):
        try:
            observed = dt.datetime.fromisoformat(snapshot['generated_at_utc'].replace('Z', '+00:00'))
            if observed.tzinfo is None:return False
            age = (now - observed).total_seconds()
            if not 0 <= age < minimum_age_seconds:return False
            # A regenerated envelope must not hide old upcoming runner observations.
            for race in snapshot.get('races', []):
                start = dt.datetime.fromisoformat(race['startUTC'].replace('Z', '+00:00'))
                if now < start <= now + dt.timedelta(days=2) and race.get('runners'):
                    seen = dt.datetime.fromisoformat(race['runner_observed_at_utc'].replace('Z', '+00:00'))
                    if seen.tzinfo is None or not 0 <= (now-seen).total_seconds() < minimum_age_seconds:return False
            return True
        except (KeyError, ValueError, TypeError, AttributeError):
            return False
    if not recent(data):return True, 'STALE_OR_MISSING_RACECARDS'
    if future is not None and not recent(future):return True, 'STALE_OR_MISSING_FUTURE_RACECARDS'
    return False, 'RECENT_RACECARDS_ALREADY_PUBLISHED'



def main():
    try:
        data = json.loads(Path('racing-research-data.json').read_text())
    except (OSError, ValueError):
        data = {}
    try:
        future = json.loads(Path('racing-future-data.json').read_text())
    except (OSError, ValueError):
        future = {}
    event_file = os.environ.get('GITHUB_EVENT_PATH')
    payload = json.loads(Path(event_file).read_text()) if event_file else {}
    run, reason = should_refresh(os.environ.get('GITHUB_EVENT_NAME'), data,
                                dt.datetime.now(dt.timezone.utc), payload.get('workflow_run'), future=future)
    with open(os.environ['GITHUB_OUTPUT'], 'a') as output:
        output.write('refresh=' + str(run).lower() + '\n')
    print(reason)


if __name__ == '__main__':
    main()
