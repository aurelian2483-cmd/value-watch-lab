#!/usr/bin/env python3
"""Read-only retrospective price-reference diagnostic, never a promotion gate."""
import collections
import json
import math
from pathlib import Path
from archive_horse_markets import digest, stamp
from horse_context_pipeline import validate_record
from horse_evaluation import _validated_score


def compare(records, entries, markets):
    frozen = {r['record_sha256']: validate_record(r) for r in records}
    indexed = collections.defaultdict(list)
    for m in markets:
        body = {k: v for k, v in m.items() if k != 'record_sha256'}
        if digest(body) != m.get('record_sha256'):
            raise ValueError('Market integrity failure')
        quotes = m['quotes']; ids = [str(q['horse_id']) for q in quotes]
        if (len(ids) < 2 or len(set(ids)) != len(ids)
                or sorted(ids) != sorted(m['active_runner_ids'])
                or any(type(q['decimal']) not in (int, float)
                       or not math.isfinite(q['decimal']) or q['decimal'] <= 1 for q in quotes)
                or stamp(m['observed_at_utc']) >= stamp(m['startUTC'])):
            raise ValueError('Invalid market field, price or chronology')
        if m.get('bookmaker') != 'Sky Bet' or m.get('publisher') != 'Sporting Life':
            continue
        indexed[str(m['race_id'])].append(m)
    pairs = []; excluded = collections.Counter(); seen = set()
    for e in entries:
        f = frozen[e['record_sha256']]
        key = (str(f['race_id']), stamp(f['startUTC']))
        if key in seen:
            raise ValueError('Duplicate scored event')
        seen.add(key)
        ids, winner, brier, loss = _validated_score(f, e)
        cutoff = stamp(f['generated_at_utc'])
        eligible = [m for m in indexed[str(f['race_id'])]
                    if stamp(m['startUTC']) == key[1]
                    and m['racecourse'].casefold() == f['racecourse'].casefold()
                    and set(m['active_runner_ids']) == ids
                    and 0 <= (cutoff-stamp(m['observed_at_utc'])).total_seconds() <= 1800]
        if not eligible:
            excluded['NO_MATCHING_PRE_FREEZE_PRICE_WITHIN_30_MINUTES'] += 1
            continue
        latest = max(stamp(m['observed_at_utc']) for m in eligible)
        eligible = {m['record_sha256']: m for m in eligible if stamp(m['observed_at_utc']) == latest}
        if len(eligible) != 1:
            excluded['AMBIGUOUS_LATEST_CAPTURE'] += 1
            continue
        m = next(iter(eligible.values()))
        inverse = {str(q['horse_id']): 1/q['decimal'] for q in m['quotes']}
        total = sum(inverse.values()); probabilities = {h: p/total for h, p in inverse.items()}
        market_brier = sum((p-int(h == winner))**2 for h, p in probabilities.items())
        pairs.append({'race_id': f['race_id'], 'forecast_sha256': f['record_sha256'],
                      'market_sha256': m['record_sha256'], 'market_observed_at_utc': m['observed_at_utc'],
                      'brier_context_minus_market': brier-market_brier,
                      'log_loss_context_minus_market': loss+math.log(probabilities[winner])})
    return {'status': 'RETROSPECTIVE_DIAGNOSTIC_ONLY', 'model_validation': 'UNVALIDATED',
            'publication_gate': 'BLOCKED', 'matched_races': len(pairs), 'exclusions': dict(excluded),
            'mean_brier_context_minus_market': sum(p['brier_context_minus_market'] for p in pairs)/len(pairs) if pairs else None,
            'mean_log_loss_context_minus_market': sum(p['log_loss_context_minus_market'] for p in pairs)/len(pairs) if pairs else None,
            'pairs': sorted(pairs, key=lambda p: str(p['race_id'])),
            'limitations': ['Selection rule chosen retrospectively; not an untouched evaluation.',
                            'Proportional inverse-odds normalization is an assumption, not true probabilities.',
                            'Source observations are not verified executable or closing prices.',
                            'Provisional results, selected coverage and different information times limit inference.']}


if __name__ == '__main__':
    root = Path(__file__).resolve().parents[1]
    records = [json.loads(p.read_text()) for p in (root/'research/horse-context-archive/v1').glob('*.json')]
    markets = [json.loads(p.read_text()) for p in (root/'research/horse-market-archive').rglob('*.json')]
    entries = json.loads((root/'horse-context-data.json').read_text())['performance']['entries']
    print(json.dumps(compare(records, entries, markets), indent=2, allow_nan=False))
