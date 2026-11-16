#!/usr/bin/env python3
"""Collect single-provider final observations for frozen Tennis/NFL forecasts.

Never writes results-feed.json or marks any outcome independently verified.
Never infers a result from an old schedule, unknown player, walkover or reschedule.
"""
import hashlib
import json
import re
import urllib.request
from datetime import datetime, timedelta, timezone
from pathlib import Path
from urllib.parse import urlsplit
from capture_prospective_research import ROOT, utc, iso

MAX_CALLS=20
MAX_RESPONSE=12_000_000

def safe_url(value,sport):
    if not isinstance(value,str) or len(value)>1200:return False
    u=urlsplit(value)
    if u.scheme!='https' or u.netloc!='site.api.espn.com' or u.username or u.password or u.fragment:return False
    path=u.path
    if sport=='tennis':
        return path in ('/apis/site/v2/sports/tennis/atp/scoreboard','/apis/site/v2/sports/tennis/wta/scoreboard')
    return sport=='nfl' and path=='/apis/site/v2/sports/football/nfl/scoreboard'

def fetch(url):
    request=urllib.request.Request(url,headers={'User-Agent':'ValueWatchResearch/1.0','Accept':'application/json'})
    with urllib.request.urlopen(request,timeout=20) as response:
        raw=response.read(MAX_RESPONSE+1)
    if len(raw)>MAX_RESPONSE:raise ValueError('Source too large')
    return json.loads(raw),hashlib.sha256(raw).hexdigest()

def competitions(doc,sport,identity):
    if not isinstance(doc,dict) or not isinstance(doc.get('events'),list):return []
    result=[]
    for event in doc['events']:
        if not isinstance(event,dict):continue
        if sport=='nfl':
            rows=event.get('competitions',[])
        else:
            tour=identity.split('-',1)[0]
            slug='mens-singles' if tour=='atp' else 'womens-singles'
            rows=[]
            for group in event.get('groupings',[]):
                if isinstance(group,dict) and (group.get('grouping') or {}).get('slug')==slug:
                    rows.extend(group.get('competitions') or [])
        for c in rows:
            if isinstance(c,dict) and str(c.get('id'))==identity.split('-',1)[1]:result.append(c)
    return result

def observe(record,document,source_hash,now):
    sport=record.get('sport')
    event_id=record.get('event_id')
    if sport not in ('tennis','nfl') or not isinstance(event_id,str) or not re.fullmatch(r'(atp|wta|nfl)-[0-9]+',event_id) or not event_id.startswith(('nfl-' if sport=='nfl' else ('atp-','wta-'))):
        return None
    try:
        start=utc(record['event_start_utc'])
        if start>=now-timedelta(hours=6):return None
        participants=record['participant_ids']
        if not isinstance(participants,list) or len(participants)!=2 or any(not isinstance(x,str) for x in participants) or len(set(participants))!=2:return None
        rows=competitions(document,sport,event_id)
        if len(rows)!=1:return None
        c=rows[0]
        kind='athlete' if sport=='tennis' else 'team'
        ps=c.get('competitors')
        if not isinstance(ps,list) or len(ps)!=2 or any(p.get('type')!=kind or str(p.get('id')) not in participants for p in ps) or {str(p['id']) for p in ps}!=set(participants):return None
        status=c.get('status',{}).get('type',{})
        if status.get('name')!='STATUS_FINAL' or status.get('completed') is not True:return None
        source_start=utc(c['date'])
        if abs((source_start-start).total_seconds())>3*3600:return None
        if sport=='tennis':
            notes=' '.join(str(n.get('text','')) for n in c.get('notes',[]) if isinstance(n,dict))
            if re.search(r'\b(retired|retirement|walkover|walk-over|w/o|ret)\b',notes,re.I):return None
            winners=[p for p in ps if p.get('winner') is True]
            if len(winners)!=1:return None
            winner=str(winners[0]['id'])
        else:
            scores=[]
            for p in ps:
                score=p.get('score')
                if isinstance(score,bool) or not re.fullmatch(r'\d{1,3}',str(score)):return None
                scores.append(int(score))
            winner='tie' if scores[0]==scores[1] else str(ps[0]['id'] if scores[0]>scores[1] else ps[1]['id'])
        if winner not in record.get('probabilities',{}):return None
        return {'prediction_id':record['prediction_id'],'sport':sport,'event_id':event_id,'market':record['market'],
                'actual_outcome':winner,'source_observed_at_utc':iso(now),
                'provider_response_sha256':source_hash,'source_url':record['source_url'],
                'status':'SINGLE_PROVIDER_FINAL_UNVERIFIED','independently_verified':False,
                'betting_eligible':False}
    except (KeyError,ValueError,TypeError,AttributeError):
        return None

def collect(ledger,previous,now,fetcher=fetch,max_calls=MAX_CALLS):
    if ledger.get('schemaVersion')!=1 or ledger.get('kind')!='PROSPECTIVE_PREDICTION_LEDGER' or not isinstance(ledger.get('records'),list):
        raise ValueError('Invalid prediction archive')
    if previous.get('schema_version')!=1 or not isinstance(previous.get('observations'),list):
        raise ValueError('Invalid source-observation archive')
    originals={}
    for r in previous['observations']:
        key=r.get('prediction_id')
        if not isinstance(key,str) or key in originals:raise ValueError('Duplicate original result observation')
        originals[key]=r
    pending=[]
    for p in ledger['records']:
        try:
            if p['prediction_id'] in originals or utc(p['event_start_utc'])>=now-timedelta(hours=6) or not safe_url(p['source_url'],p['sport']):continue
            if p['sport'] not in ('tennis','nfl') or not isinstance(p.get('participant_ids'),list):continue
            pending.append(p)
        except (KeyError,TypeError,ValueError):
            continue
    pending.sort(key=lambda p:(p['event_start_utc'],p['prediction_id']))
    grouped={}
    for p in pending:
        grouped.setdefault(p['source_url'],[]).append(p)
    added=0;failures=0;unconfirmed=0;revisions=0
    for url,rows in list(grouped.items())[:max_calls]:
        try:
            document,source_hash=fetcher(url)
            if not re.fullmatch(r'[a-f0-9]{64}',source_hash):raise ValueError('Missing content receipt')
            for p in rows:
                new=observe(p,document,source_hash,now)
                if not new:unconfirmed+=1;continue
                old=originals.get(new['prediction_id'])
                if old:
                    if old!=new:revisions+=1
                    continue
                previous['observations'].append(new);originals[new['prediction_id']]=new;added+=1
        except (OSError,ValueError,TypeError,KeyError,TimeoutError):
            failures+=1
    previous['observations'].sort(key=lambda x:x['prediction_id'])
    return {'new_observations':added,'total_observations':len(previous['observations']),
            'groups_eligible':len(grouped),'source_requests':min(len(grouped),max_calls),
            'unconfirmed':unconfirmed,'source_errors':failures,'conflicting_revisions_withheld':revisions,
            'source_status':'SINGLE_PROVIDER_ONLY_NOT_INDEPENDENTLY_VERIFIED'}

def run(root,now):
    ledger=json.loads((root/'prediction-ledger.json').read_text(encoding='utf-8'))
    path=root/'research'/'provider-result-observations.json'
    archive=json.loads(path.read_text(encoding='utf-8')) if path.exists() else {
        'schema_version':1,'research_only':True,'model_validation':'UNVALIDATED','publication_gate':'BLOCKED',
        'observations':[],'notice':'Single-source results are not independent outcome verification'}
    if archive.get('research_only') is not True or archive.get('publication_gate')!='BLOCKED':raise ValueError('Unsafe results archive')
    audit=collect(ledger,archive,now)
    archive['generated_at_utc']=iso(now)
    path.parent.mkdir(parents=True,exist_ok=True)
    path.write_text(json.dumps(archive,indent=2,ensure_ascii=False)+'\n',encoding='utf-8')
    return audit

if __name__=='__main__':
    print(json.dumps(run(ROOT,datetime.now(timezone.utc)),indent=2))
