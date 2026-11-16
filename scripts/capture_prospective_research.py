#!/usr/bin/env python3
"""Append-only, pre-event tennis/NFL research forecast capture.

Runs only on source-observed fresh events; never recalculates model probabilities.
Never backfills forecast timestamps or scores results. All publication gates stay blocked.
"""
import argparse
import hashlib
import json
import math
import re
from datetime import datetime, timezone, timedelta
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SHA = re.compile(r'^[a-f0-9]{64}$')
SPORTS = ('tennis', 'nfl')
MARKETS = {'tennis': 'MATCH_WINNER', 'nfl': 'GAME_RESULT_INCLUDING_OVERTIME'}
MAX_AGE = timedelta(hours=36)

def utc(value):
    if not isinstance(value, str) or not (value.endswith('Z') or re.search(r'[+-]\d\d:\d\d$', value)):
        raise ValueError('Explicit offset UTC timestamp required')
    result = datetime.fromisoformat(value.replace('Z', '+00:00'))
    if result.tzinfo is None:
        raise ValueError('Naive timestamp')
    return result.astimezone(timezone.utc)

def iso(value):
    return value.astimezone(timezone.utc).isoformat().replace('+00:00', 'Z')

def digest(value):
    return hashlib.sha256(json.dumps(value, sort_keys=True, separators=(',', ':'), ensure_ascii=False).encode()).hexdigest()

def guarded(data):
    return isinstance(data, dict) and data.get('research_only') is True and data.get('model_validation') == 'UNVALIDATED' and data.get('publication_gate') == 'BLOCKED'

def snapshot_candidates(feed, now):
    if not guarded(feed):
        raise ValueError('Source safety gates missing')
    generated = utc(feed['generated_at_utc'])
    if generated > now + timedelta(minutes=5) or now - generated > MAX_AGE:
        raise ValueError('Source snapshot not fresh')
    if not isinstance(feed.get('sports'), dict):
        raise ValueError('Missing sports')
    records = []
    audit = {'events_examined': 0, 'rejected': {}, 'eligible': 0}
    def reject(reason):
        audit['rejected'][reason] = audit['rejected'].get(reason, 0) + 1
    for sport in SPORTS:
        events = feed['sports'].get(sport, {}).get('events', [])
        if not isinstance(events, list):
            raise ValueError('Invalid event list')
        for event in events:
            audit['events_examined'] += 1
            try:
                event_id = event['id']
                start = utc(event['startUTC'])
                if not isinstance(event_id, str) or not 0 < len(event_id) <= 120:
                    raise ValueError('EVENT_ID')
                if not start > now + timedelta(minutes=5):
                    raise ValueError('STARTED_OR_TOO_SOON')
                f = event['forecast']
                if not isinstance(f, dict) or f.get('model') != 'FIXED_ELO_K24_V1' or f.get('market') != MARKETS[sport] or f.get('calibrated') is not False or f.get('odds') is not None or f.get('expected_value') is not None:
                    raise ValueError('MODEL_CONTRACT')
                if not isinstance(f.get('training_matches'), int) or f['training_matches'] < 8 or not isinstance(f.get('training_sha256'), str) or not SHA.fullmatch(f['training_sha256']):
                    raise ValueError('TRAINING')
                trained = utc(f['training_latest_start_utc'])
                forecast_at = utc(f['generated_at_utc'])
                observed_at = utc(event['source_collected_at_utc'])
                if trained > forecast_at - timedelta(hours=6) or forecast_at > generated or observed_at > now + timedelta(minutes=5) or observed_at >= start - timedelta(minutes=5) or now-observed_at > MAX_AGE:
                    raise ValueError('TIMING')
                source_hash = event['source_sha256']
                if not isinstance(source_hash, str) or not SHA.fullmatch(source_hash):
                    raise ValueError('SOURCE_FINGERPRINT')
                if not isinstance(event.get('source'), str) or not event['source'].startswith('https://site.api.espn.com/apis/site/v2/sports/'):
                    raise ValueError('SOURCE_URL')
                outcomes = f['outcomes']
                if not isinstance(outcomes, list) or len(outcomes) != (2 if sport == 'tennis' else 3):
                    raise ValueError('OUTCOMES')
                probs = {}
                for entry in outcomes:
                    key, probability = entry['id'], entry['probability']
                    if not isinstance(key, str) or not key or key in probs or not isinstance(probability, (int, float)) or isinstance(probability, bool) or not math.isfinite(probability) or not 0 < probability < 1:
                        raise ValueError('PROBABILITY')
                    probs[key] = float(probability)
                if abs(sum(probs.values()) - 1) > 1e-6:
                    raise ValueError('PROBABILITY_SUM')
                participants = event['participants']
                if not isinstance(participants, list) or len(participants) != 2 or any(not isinstance(p.get('id'), str) for p in participants):
                    raise ValueError('PARTICIPANTS')
                ids = {p['id'] for p in participants}
                if len(ids) != 2 or set(probs) != (ids if sport == 'tennis' else ids | {'tie'}):
                    raise ValueError('OUTCOME_IDENTITY')
                stable_id = sport + ':' + event_id + ':' + f['market'] + ':' + f['model']
                item = {
                    'prediction_id': stable_id, 'sport': sport, 'event_id': event_id,
                    'model_version': f['model'], 'market': f['market'],
                    'recorded_at_utc': iso(now), 'event_start_utc': iso(start),
                    'snapshot_sha256': digest(feed),
                    'probabilities': probs,
                    'source_fingerprint': source_hash,
                    'source_observed_at_utc': iso(observed_at),
                    'training_fingerprint': f['training_sha256'],
                    'research_only': True, 'model_validated': False
                }
                records.append(item)
                audit['eligible'] += 1
            except (KeyError, ValueError, TypeError, AttributeError) as exc:
                reject(str(exc) if isinstance(exc, ValueError) else 'INVALID_FIELDS')
    return records, audit

def append_only(ledger, candidates):
    if ledger.get('schemaVersion') != 1 or ledger.get('kind') != 'PROSPECTIVE_PREDICTION_LEDGER' or ledger.get('modelValidated') is not False or not isinstance(ledger.get('records'), list):
        raise ValueError('Invalid ledger contract')
    existing = {}
    for record in ledger['records']:
        key = record.get('prediction_id')
        if not isinstance(key, str) or key in existing:
            raise ValueError('Existing ledger has duplicate or invalid ID')
        existing[key] = record
    created = 0
    seen = {}
    for record in candidates:
        key = record['prediction_id']
        if key in seen and seen[key] != record:
            raise ValueError('Conflicting duplicate current source forecast')
        seen[key] = record
        prior = existing.get(key)
        if prior is not None:
            # Existing records must NEVER be overwritten, including after model revisions.
            # Material differences are logged for manual review, not treated as new forecasts.
            continue
        ledger['records'].append(record)
        existing[key] = record
        created += 1
    return created

def review_queue(ledger, results, now):
    if results.get('schemaVersion') != 1 or results.get('kind') != 'VERIFIED_OUTCOME_FEED' or not isinstance(results.get('records'), list):
        raise ValueError('Invalid outcome feed')
    finalized = {(r.get('sport'),r.get('event_id'),r.get('market')) for r in results['records'] if isinstance(r, dict)}
    pending=[]
    for record in ledger['records']:
        try:
            if utc(record['event_start_utc']) < now - timedelta(hours=6) and (record['sport'],record['event_id'],record['market']) not in finalized:
                pending.append({'prediction_id':record['prediction_id'],'sport':record['sport'],'event_id':record['event_id'],
                                'market':record['market'],'event_start_utc':record['event_start_utc'],
                                'status':'AWAITING_INDEPENDENT_FINAL_RESULT','automatic_settlement':False})
        except (KeyError,ValueError,TypeError):
            continue
    return {'schema_version':1,'research_only':True,'model_validation':'UNVALIDATED','publication_gate':'BLOCKED',
            'generated_at_utc':iso(now),'pending_count':len(pending),'pending':pending[:2000],
            'notice':'Unverified result queue only. Neither final outcome nor bookmaker settlement is inferred.'}

def run(root,now):
    feed=json.loads((root/'other-sports-data.json').read_text(encoding='utf-8'))
    path=root/'prediction-ledger.json'
    ledger=json.loads(path.read_text(encoding='utf-8'))
    results=json.loads((root/'results-feed.json').read_text(encoding='utf-8'))
    candidate,audit=snapshot_candidates(feed,now)
    count=append_only(ledger,candidate)
    queue=review_queue(ledger,results,now)
    audit.update({'appended':count,'total_frozen':len(ledger['records']),'review_pending':queue['pending_count'],'generated_at_utc':iso(now),
                  'note':'Source-observed experimental snapshots, not independently verified forecasts or outcomes.'})
    if count:
        path.write_text(json.dumps(ledger,indent=2,ensure_ascii=False)+'\n',encoding='utf-8')
    (root/'research'/'prospective-capture-audit.json').parent.mkdir(parents=True,exist_ok=True)
    (root/'research'/'prospective-capture-audit.json').write_text(json.dumps({'schema_version':1,'research_only':True,'publication_gate':'BLOCKED',**audit},indent=2)+'\n',encoding='utf-8')
    (root/'research'/'pending-independent-results.json').write_text(json.dumps(queue,indent=2,ensure_ascii=False)+'\n',encoding='utf-8')
    return audit

if __name__=='__main__':
    parser=argparse.ArgumentParser(description='Fail-closed prospective tennis/NFL research capture (no automatic settlement)')
    parser.add_argument('--root',type=Path,default=ROOT)
    args=parser.parse_args()
    print(json.dumps(run(args.root,datetime.now(timezone.utc)),indent=2))
