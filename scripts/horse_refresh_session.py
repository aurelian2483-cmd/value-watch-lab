#!/usr/bin/env python3
"""At most six collection cycles; normal triggers remain a single collection.
A running session reduces cron dependence, but cannot guarantee source/CI uptime.
"""
import datetime as dt
import json
import os
import subprocess
import time
from pathlib import Path

MAX_CYCLES = 6
INTERVAL_SECONDS = 1200
MAX_SESSION_SECONDS = 110 * 60


def requested_cycles(event_name, payload):
    if event_name == 'push' and '[active-racing-refresh]' in str(payload.get('head_commit', {}).get('message', '')):
        return MAX_CYCLES
    if event_name != 'workflow_dispatch':
        return 1
    raw = payload.get('inputs', {}).get('active_cycles', '1')
    try:
        n = int(raw)
    except (TypeError, ValueError):
        raise ValueError('active_cycles must be an integer from 1 to 6')
    if not 1 <= n <= MAX_CYCLES:
        raise ValueError('active_cycles must be an integer from 1 to 6')
    return n


def run_session(cycles, clock=None, monotonic=time.monotonic, sleep=time.sleep, runner=subprocess.run):
    if type(cycles) is not int or not 1 <= cycles <= MAX_CYCLES:
        raise ValueError('Invalid session cycle count')
    clock = clock or (lambda: dt.datetime.now(dt.timezone.utc))
    started = monotonic(); completed = 0
    for index in range(cycles):
        now = clock().astimezone(dt.timezone.utc)
        if not 4 <= now.hour < 22 or monotonic() - started >= MAX_SESSION_SECONDS:
            break
        if index:
            delay = max(0, started + index * INTERVAL_SECONDS - monotonic())
            # Do not wait until another day or outside the race collection window.
            if (now + dt.timedelta(seconds=delay)).hour >= 22:
                break
            if delay:
                print(json.dumps({'status': 'ACTIVE_SESSION_WAITING', 'next_cycle': index + 1,
                                  'next_due_utc': (now + dt.timedelta(seconds=delay)).isoformat()}), flush=True)
                sleep(delay)
        now = clock().astimezone(dt.timezone.utc)
        if not 4 <= now.hour < 22 or monotonic() - started >= MAX_SESSION_SECONDS:
            break
        env = dict(os.environ, HORSE_SESSION_CYCLE=f'cycle-{index + 1:02d}')
        print(json.dumps({'status': 'COLLECTING', 'cycle': index + 1, 'maximum_cycles': cycles}), flush=True)
        # A failed/blocked cycle ends the session; never bypass source safeguards.
        # GNU timeout sends TERM/KILL to the entire cycle process group, including collectors.
        runner(['timeout', '--signal=TERM', '--kill-after=30s', '600s',
                'bash', 'scripts/horse_refresh_cycle.sh'], env=env, check=True)
        completed += 1
    print(json.dumps({'status': 'ACTIVE_SESSION_FINISHED', 'completed_cycles': completed}), flush=True)
    return completed


def main():
    path = os.environ.get('GITHUB_EVENT_PATH')
    payload = json.loads(Path(path).read_text()) if path else {}
    run_session(requested_cycles(os.environ.get('GITHUB_EVENT_NAME'), payload))


if __name__ == '__main__':
    main()
