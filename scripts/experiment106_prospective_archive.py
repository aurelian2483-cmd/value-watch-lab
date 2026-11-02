#!/usr/bin/env python3
"""Freeze experimental forecasts before kickoff, retaining revisions separately.
Git history supplies a persistence trail, not independent timestamp attestation.
"""
import datetime as dt
import hashlib
import json
import math
from pathlib import Path
from experiment62_fixture_discovery import norm

ROOT = Path(__file__).resolve().parents[1]
FEED = Path('/tmp/experiment82/dashboard-data.json')
ARCHIVE = ROOT / 'research/forecast-archive/v2'
REVISIONS = ROOT / 'research/forecast-revisions/v2'
OUT = Path('/tmp/experiment106/archive-report.json')
UTC = dt.timezone.utc

def canon(value):
    return json.dumps(value, sort_keys=True, separators=(',', ':')).encode()

def digest(value):
    return hashlib.sha256(canon(value)).hexdigest()

def when(value):
    value = dt.datetime.fromisoformat(value.replace('Z', '+00:00'))
    if value.tzinfo is None:
        raise ValueError('Timezone required')
    return value.astimezone(UTC)

def identity(record):
    return (record['league'], norm(record['home']), norm(record['away']),
            when(record['kickoff_utc']).isoformat(), record['model'])

def probabilities(record):
    values = [record[k] for k in ('prob_home', 'prob_draw', 'prob_away')]
    if any(type(v) not in (int, float) or not math.isfinite(v) or not 0 < v < 1 for v in values):
        raise ValueError('Invalid forecast probabilities')
    if abs(sum(values) - 1) > 1e-8:
        raise ValueError('Forecast probabilities do not sum to one')
    return values

def load_records(directory):
    records = {}
    for path in sorted(directory.glob('*.json')):
        record = json.loads(path.read_text())
        unsigned = dict(record)
        saved = unsigned.pop('record_sha256')
        if saved != path.stem or digest(unsigned) != saved:
            raise ValueError('Archive integrity failure: ' + path.name)
        if record.get('publication_gate') != 'BLOCKED' or record.get('challenge_eligible') != 0:
            raise ValueError('Unsafe archive')
        if when(record['generated_at_utc']) >= when(record['kickoff_utc']):
            raise ValueError('Archive is not pre-match')
        probabilities(record)
        key = identity(record)
        if key in records:
            raise ValueError('Duplicate primary fixture/model archive')
        records[key] = record
    return records

def archive(data, now, directory=ARCHIVE, revisions=REVISIONS):
    if (data.get('research_only') is not True or data.get('publication_gate') != 'BLOCKED'
            or data.get('model_validation') != 'UNVALIDATED'
            or data.get('official_challenge', {}).get('completed') != 0):
        raise ValueError('Unsafe feed')
    generated = when(data['generated_at_utc'])
    if not dt.timedelta(minutes=-5) <= now - generated <= dt.timedelta(hours=36):
        raise ValueError('Stale or future feed')
    existing = load_records(directory)
    checked = {(norm(f['home']), norm(f['away']), when(f['kickoff_utc']))
               for f in data['upcoming_fixtures'] if f['verification'] == 'SCHEDULE_CROSS_CHECK'}
    pending = []
    counts = {'new_primary_records': 0, 'unchanged': 0, 'revisions': 0, 'skipped_started': 0}
    seen = set()
    for forecast in data.get('experimental_model_forecasts', []):
        if (forecast.get('research_only') is not True or forecast.get('publication_gate') != 'BLOCKED'
                or forecast.get('model_validation') != 'UNVALIDATED'
                or forecast.get('challenge_eligible') != 0
                or forecast.get('odds') is not None or forecast.get('expected_value') is not None):
            raise ValueError('Unsafe forecast')
        kickoff = when(forecast['kickoff_utc'])
        if kickoff <= now:
            counts['skipped_started'] += 1
            continue
        if (norm(forecast['home']), norm(forecast['away']), kickoff) not in checked:
            raise ValueError('Forecast schedule not cross-checked')
        probabilities(forecast)
        record = {k: forecast[k] for k in ('home', 'away', 'kickoff_utc', 'model',
                  'prob_home', 'prob_draw', 'prob_away')}
        record.update(league='E0', generated_at_utc=now.isoformat(),
                      feed_generated_at_utc=data['generated_at_utc'],
                      source_feed_sha256=digest(data),
                      model_input_audit=data.get('experimental_model_audit', {}),
                      training_basis=forecast.get('training_basis'),
                      research_only=True, model_validation='UNVALIDATED',
                      publication_gate='BLOCKED', challenge_eligible=0,
                      odds=None, expected_value=None,
                      source_first_availability_verified=False,
                      independent_timestamp_attested=False)
        key = identity(record)
        if key in seen:
            raise ValueError('Duplicate fixture/model in feed')
        seen.add(key)
        old = existing.get(key)
        if old and probabilities(old) == probabilities(record) and old.get('model_input_audit') == record['model_input_audit']:
            counts['unchanged'] += 1
            continue
        if old:
            record['revision_of'] = old['record_sha256']
            target = revisions
            counts['revisions'] += 1
        else:
            target = directory
            counts['new_primary_records'] += 1
        record['record_sha256'] = digest(record)
        pending.append((target, record))
    # Validate the complete batch before writing any records.
    for target, record in pending:
        target.mkdir(parents=True, exist_ok=True)
        path = target / (record['record_sha256'] + '.json')
        with path.open('x') as handle:
            handle.write(json.dumps(record, indent=2) + '\n')
    return {'status': 'RESEARCH_ARCHIVE_UPDATED', **counts,
            'primary_records': len(existing) + counts['new_primary_records'],
            'publication_gate': 'BLOCKED', 'official_challenge': '0/100',
            'independent_timestamp_attested': False}

def main():
    data = json.loads(FEED.read_text())
    report = archive(data, dt.datetime.now(UTC))
    data["prospective_archive_audit"] = report
    FEED.write_text(json.dumps(data, indent=2) + "\n")
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(report, indent=2) + '\n')
    print(json.dumps(report))

if __name__ == '__main__':
    main()
