#!/usr/bin/env python3
"""Leakage-safe Market Rasen 948193 research replay: baseline, market and audit only.
No invented V7 probabilities, no betting recommendation, no source mutation.
"""
import json, math
from datetime import datetime
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
REFERENCE=ROOT/'research/horse-reference-archive/v1/d45342cf1378b0692bf7c23b9ea933d79280dbc361002ef915dad958ffcef191.json'
MARKET=ROOT/'research/horse-market-archive/2026-11-12/948193/4f7d82d5b5d32806b30ead66f74696d1f6f3b1e16122ec1179bb3c2cad8e3d07.json'
RESULT=ROOT/'research/horse-secondary-results/v1/866d60d23bcc3026f2e5daa7b2efcc616fc3170beaefeb3604d7f618192248dd.json'
def utc(value): return datetime.fromisoformat(value.replace('Z','+00:00'))
def replay():
    reference=json.loads(REFERENCE.read_text());market=json.loads(MARKET.read_text());result=json.loads(RESULT.read_text())
    assert reference['race_id']==market['race_id']=='948193'
    start=utc(reference['startUTC'])
    assert utc(reference['generated_at_utc'])<start and utc(market['observed_at_utc'])<start
    assert utc(result['receipt']['observed_at_utc'])>start
    assert reference['model_validation']=='UNVALIDATED' and reference['publication_gate']=='BLOCKED'
    assert market['executable_verified'] is False
    horses={str(r['horse_id']):r for r in reference['runners']}
    quotes={str(q['horse_id']):q for q in market['quotes']}
    assert len(horses)==len(quotes)==7 and set(horses)==set(quotes)
    observed={r['horse'].split(' (')[0].casefold():r for r in result['row']['runners']}
    assert len(observed)==7
    margin=sum(1/q['decimal'] for q in quotes.values())
    assert math.isfinite(margin) and margin>0
    rows=[]
    for hid,horse in horses.items():
        q=quotes[hid]
        assert q['decimal']>1
        match=observed[horse['name'].casefold()]
        rows.append({'horse':horse['name'],'source_decimal':q['decimal'],
          'market_margin_adjusted_reference':round((1/q['decimal'])/margin,6),
          'equal_chance_reference':horse['reference_probability'],
          'v7_probability':None,'v7_fair_odds':None,
          'result_for_evaluation_only':match['position']})
    rows.sort(key=lambda x:x['source_decimal'])
    return {'race_id':'948193','research_only':True,'model_validation':'UNVALIDATED',
      'publication_gate':'BLOCKED','source_market_observed_at_utc':market['observed_at_utc'],
      'source_prices_executable_verified':False,'result_observed_at_utc':result['receipt']['observed_at_utc'],
      'market_overround':round(margin,6),'market_reference_not_calibrated':True,
      'v7_status':'PENDING_PRE_RACE_FEATURES_AND_FITTED_COEFFICIENTS',
      'historical_result_excluded_from_model_inputs':True,'runners':rows}
if __name__=='__main__':print(json.dumps(replay(),indent=2))
