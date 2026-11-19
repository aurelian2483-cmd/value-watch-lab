#!/usr/bin/env python3
"""Evidence-only reconciliation queue for prospective Tennis/NFL event outcomes.

Never writes results-feed.json, awards betting eligibility, or marks matches independently
verified. Secondary evidence may inform human review but is not proof of authenticity.
"""
import hashlib
import json
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlsplit
from capture_prospective_research import ROOT, iso, utc

SUPPORTED={'tennis':'MATCH_WINNER','nfl':'GAME_RESULT_INCLUDING_OVERTIME'}
STATES=('AWAITING_EVENT','AWAITING_PRIMARY_FINAL','AWAITING_INDEPENDENT_SOURCE',
        'SECONDARY_CONFLICT','SECONDARY_INVALID','READY_FOR_HUMAN_REVIEW',
        'IDENTITY_CONFLICT','ARCHIVE_INVALID')

def source_ok(link, primary_host):
    if not isinstance(link,str) or not 0<len(link)<=1200:return False
    try:
        u=urlsplit(link)
        return (u.scheme=='https' and bool(u.netloc) and not u.username and
                not u.password and not u.fragment and u.hostname!=primary_host and
                u.port in (None,443))
    except ValueError:
        return False

def secondary_ok(e,p,now):
    if not isinstance(e,dict) or e.get('prediction_id')!=p['prediction_id'] or e.get('sport')!=p['sport'] or e.get('event_id')!=p['event_id'] or e.get('market')!=p['market']:
        return False
    if e.get('independently_verified') is not False or e.get('status')!='SECONDARY_UNVERIFIED':
        return False
    if e.get('actual_outcome') not in p['probabilities']:return False
    try:
        observed=utc(e['observed_at_utc'])
        started=utc(p['event_start_utc'])
        primary_host=urlsplit(p['source_url']).hostname
        if observed<=started or observed>now:return False
        if not source_ok(e['source_url'],primary_host):return False
        if len(e['response_sha256'])!=64 or any(x not in '0123456789abcdef' for x in e['response_sha256'].lower()):return False
        if not isinstance(e.get('participant_ids'),list) or set(e['participant_ids'])!=set(p['participant_ids']) or len(e['participant_ids'])!=2:return False
        return True
    except (KeyError,TypeError,ValueError,AttributeError):
        return False

def primary_ok(e,p,now):
    if not isinstance(e,dict) or e.get('prediction_id')!=p['prediction_id']:
        return False
    if e.get('sport')!=p['sport'] or e.get('event_id')!=p['event_id'] or e.get('market')!=p['market']:
        return False
    if e.get('status')!='SINGLE_PROVIDER_FINAL_UNVERIFIED' or e.get('independently_verified') is not False or e.get('betting_eligible') is not False:
        return False
    if e.get('actual_outcome') not in p['probabilities']:return False
    try:
        observed=utc(e['source_observed_at_utc'])
        start=utc(p['event_start_utc'])
        response=e['provider_response_sha256']
        return (start<observed<=now and e.get('source_url')==p.get('source_url')
                and isinstance(response,str) and len(response)==64
                and all(ch in '0123456789abcdef' for ch in response.lower()))
    except (KeyError,ValueError,TypeError):
        return False

def reconcile(ledger,primary,secondary,now):
    if not isinstance(ledger,dict) or ledger.get('schemaVersion')!=1 or ledger.get('kind')!='PROSPECTIVE_PREDICTION_LEDGER' or not isinstance(ledger.get('records'),list):
        raise ValueError('Invalid frozen prediction ledger')
    if not isinstance(primary,dict) or primary.get('schema_version')!=1 or primary.get('publication_gate')!='BLOCKED' or not isinstance(primary.get('observations'),list):
        raise ValueError('Invalid single-source observation archive')
    if not isinstance(secondary,dict) or secondary.get('schema_version')!=1 or secondary.get('publication_gate')!='BLOCKED' or not isinstance(secondary.get('observations'),list):
        raise ValueError('Invalid secondary-observation archive')
    primary_map={};secondary_map={};duplicates=set()
    for label,rows,dest in [('primary',primary['observations'],primary_map),('secondary',secondary['observations'],secondary_map)]:
        for item in rows:
            if not isinstance(item,dict) or not isinstance(item.get('prediction_id'),str):
                raise ValueError('Invalid '+label+' observation identity')
            key=item['prediction_id']
            if key in dest:duplicates.add((label,key))
            else:dest[key]=item
    states=Counter();items=[];seen=set()
    for p in ledger['records']:
        if not isinstance(p,dict) or not isinstance(p.get('prediction_id'),str):
            raise ValueError('Invalid prediction identity')
        key=p['prediction_id']
        if key in seen:raise ValueError('Duplicate frozen prediction ID')
        seen.add(key)
        if p.get('sport') not in SUPPORTED or p.get('market')!=SUPPORTED[p.get('sport')]:
            continue
        try: started=utc(p['event_start_utc'])
        except (TypeError,ValueError,KeyError):started=None
        a,b=primary_map.get(key),secondary_map.get(key)
        if started is None or not isinstance(p.get('probabilities'),dict) or p.get('research_only') is not True:
            state='ARCHIVE_INVALID'
        elif started>=now:
            state='AWAITING_EVENT'
        elif ('primary',key) in duplicates or ('secondary',key) in duplicates:
            state='IDENTITY_CONFLICT'
        elif not a:
            state='AWAITING_PRIMARY_FINAL'
        elif not primary_ok(a,p,now):
            state='IDENTITY_CONFLICT'
        elif not b:
            state='AWAITING_INDEPENDENT_SOURCE'
        elif not secondary_ok(b,p,now):
            state='SECONDARY_INVALID'
        elif b['actual_outcome']!=a['actual_outcome']:
            state='SECONDARY_CONFLICT'
        else:
            # Two matching claimed observations are NOT proof of independently
            # retrieved, authentic evidence. Manual inspection is still required.
            state='READY_FOR_HUMAN_REVIEW'
        states[state]+=1
        items.append({'prediction_id':key,'sport':p['sport'],'event_id':p['event_id'],
                      'event_start_utc':p.get('event_start_utc'),
                      'review_state':state,'auto_certified':False,'betting_eligible':False,
                      'observed_result':a.get('actual_outcome') if a and state not in ('IDENTITY_CONFLICT','ARCHIVE_INVALID') else None,
                      **({'source_game_id':b['source_event_id'],'observed_score':b['final_score']}
                          if state=='READY_FOR_HUMAN_REVIEW' and b['source_url']=='https://github.com/nflverse/nflverse-data/releases/download/schedules/games.csv'
                          and isinstance(b.get('source_event_id'),str) and isinstance(b.get('final_score'),dict) else {})})
    return {'schema_version':1,'research_only':True,'model_validation':'UNVALIDATED','publication_gate':'BLOCKED',
      'generated_at_utc':iso(now),'total_predictions_checked':len(items),
      'status_counts':dict(states),'items':items,'independently_verified_results_added':0,
      'notice':'Automated statuses are for review prioritisation only. A matching secondary claim does not verify provider authenticity. This process never modifies results-feed.json.'}

def run(root,now):
    frozen=json.loads((root/'prediction-ledger.json').read_text(encoding='utf-8'))
    primary_path=root/'research'/'provider-result-observations.json'
    primary=json.loads(primary_path.read_text(encoding='utf-8')) if primary_path.exists() else {
        'schema_version':1,'publication_gate':'BLOCKED','observations':[]}
    secondary_path=root/'research'/'secondary-result-evidence.json'
    secondary=json.loads(secondary_path.read_text(encoding='utf-8')) if secondary_path.exists() else {
        'schema_version':1,'publication_gate':'BLOCKED','observations':[]}
    output=reconcile(frozen,primary,secondary,now)
    dest=root/'research'/'result-review-status.json'
    dest.parent.mkdir(parents=True,exist_ok=True)
    dest.write_text(json.dumps(output,indent=2,ensure_ascii=False)+'\n',encoding='utf-8')
    return output

if __name__=='__main__':
    result=run(ROOT,datetime.now(timezone.utc))
    print(json.dumps({'reviewed':result['total_predictions_checked'],'states':result['status_counts'],
                     'independently_verified_results_added':0},indent=2))
