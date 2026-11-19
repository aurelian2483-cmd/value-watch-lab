#!/usr/bin/env python3
"""Read-only two-provider NFL research corroboration, not independent certification.

ESPN is used ONLY to resolve an already-frozen ESPN participant ID to its team
name and home/away slot. TheSportsDB and nflverse supply separate result observations.
No scores are copied from ESPN into this source. Neither results-feed.json nor
betting status is ever written. Missing/ambiguous/partial results fail closed.
"""
import csv
import hashlib
import io
import json
import re
import urllib.request
from collections import defaultdict
from datetime import datetime, timedelta, timezone
from pathlib import Path
from urllib.parse import urlencode, urlsplit
from zoneinfo import ZoneInfo

from capture_prospective_research import ROOT, iso, utc

NFLVERSE='https://github.com/nflverse/nflverse-data/releases/download/schedules/games.csv'
EASTERN=ZoneInfo('America/New_York')
TEAM_ALIASES={'LAR':'LA','WSH':'WAS','JAC':'JAX'}
API='https://www.thesportsdb.com/api/v1/json/123/eventsday.php'
MAX_BYTES=3_000_000
MAX_DAYS=7
MAX_ESPN_URLS=12
STATUSES={'Match Finished','FT','Final','Finished','After OT','AOT'}

def canon(name):
    if not isinstance(name,str):return ''
    return ' '.join(re.sub(r'[^a-z0-9]+',' ',name.casefold()).split())

def allowed_espn(url):
    try:
        u=urlsplit(url)
        return (u.scheme=='https' and u.netloc=='site.api.espn.com'
                and u.path=='/apis/site/v2/sports/football/nfl/scoreboard'
                and not u.username and not u.password and not u.fragment
                and len(url)<1200)
    except (TypeError,ValueError):
        return False

def read_json(url):
    request=urllib.request.Request(url,headers={'Accept':'application/json','User-Agent':'ValueWatchResearch/1.0'})
    with urllib.request.urlopen(request,timeout=18) as response:
        if response.geturl()!=url:raise ValueError('Redirect not permitted')
        raw=response.read(MAX_BYTES+1)
    if len(raw)>MAX_BYTES:raise ValueError('Provider payload too large')
    return json.loads(raw),hashlib.sha256(raw).hexdigest()

def espn_identity(doc,p):
    if not isinstance(doc,dict) or not isinstance(doc.get('events'),list):return None
    key=p.get('event_id','').removeprefix('nfl-')
    if not key.isdecimal():return None
    found=[]
    for event in doc['events']:
        for c in event.get('competitions',[]):
            if str(c.get('id'))!=key:continue
            ps=c.get('competitors')
            if not isinstance(ps,list) or len(ps)!=2:continue
            home=next((x for x in ps if x.get('homeAway')=='home'),None)
            away=next((x for x in ps if x.get('homeAway')=='away'),None)
            if home is None or away is None:continue
            ids={str(home.get('id')),str(away.get('id'))}
            if ids!=set(p.get('participant_ids',[])):continue
            try:
                if abs((utc(c['date'])-utc(p['event_start_utc'])).total_seconds())>3600:continue
            except (KeyError,TypeError,ValueError):continue
            names=[home.get('team',{}).get('displayName'),away.get('team',{}).get('displayName')]
            if not all(canon(x) for x in names) or canon(names[0])==canon(names[1]):continue
            found.append({'home_id':str(home['id']),'away_id':str(away['id']),
                          'home_name':names[0],'away_name':names[1],
                          'home_code':home.get('team',{}).get('abbreviation'),'away_code':away.get('team',{}).get('abbreviation')})
    return found[0] if len(found)==1 else None

def sportsdb_observation(doc,identity,p,now,source_url,receipt):
    if not isinstance(doc,dict) or not isinstance(doc.get('events'),list):return None
    matches=[]
    expected_home=canon(identity['home_name']);expected_away=canon(identity['away_name'])
    for e in doc['events']:
        if not isinstance(e,dict) or e.get('strSport')!='American Football' or e.get('strLeague')!='NFL':
            continue
        if canon(e.get('strHomeTeam'))!=expected_home or canon(e.get('strAwayTeam'))!=expected_away:
            continue
        if str(e.get('strStatus')) not in STATUSES:continue
        timestamp=e.get('strTimestamp')
        if not isinstance(timestamp,str):continue
        try:
            scheduled=utc(timestamp)
            event_time=utc(p['event_start_utc'])
        except (ValueError,TypeError,KeyError):continue
        if abs((scheduled-event_time).total_seconds())>2*3600:continue
        home=e.get('intHomeScore');away=e.get('intAwayScore')
        if any(isinstance(x,bool) or not re.fullmatch(r'\d{1,3}',str(x)) for x in (home,away)):continue
        if not isinstance(e.get('idEvent'),str) or not e['idEvent'].isdigit():continue
        h=int(home);a=int(away)
        winner='tie' if h==a else (identity['home_id'] if h>a else identity['away_id'])
        if winner not in p['probabilities']:continue
        matches.append({'prediction_id':p['prediction_id'],'sport':'nfl','event_id':p['event_id'],
             'market':p['market'],'actual_outcome':winner,'status':'SECONDARY_UNVERIFIED',
             'independently_verified':False,'betting_eligible':False,
             'participant_ids':list(p['participant_ids']),'observed_at_utc':iso(now),
             'source_url':source_url,'response_sha256':receipt,
             'source_event_id':e['idEvent'],'source_match_status':e['strStatus'],
             'final_score':{'home':h,'away':a}})
    return matches[0] if len(matches)==1 else None

def read_nflverse():
    request=urllib.request.Request(NFLVERSE,headers={'Accept':'text/csv','User-Agent':'ValueWatchResearch/1.0'})
    with urllib.request.urlopen(request,timeout=18) as response:
        endpoint=urlsplit(response.geturl())
        if endpoint.scheme!='https' or endpoint.hostname not in {'github.com','release-assets.githubusercontent.com','objects.githubusercontent.com'}:
            raise ValueError('Unknown schedule asset host')
        raw=response.read(MAX_BYTES+1)
    if len(raw)>MAX_BYTES:
        raise ValueError('Schedule asset exceeds the size limit')
    reader=csv.DictReader(io.StringIO(raw.decode('utf-8-sig')))
    required={'espn','game_id','game_type','gameday','gametime','home_team','away_team','home_score','away_score'}
    if not required.issubset(reader.fieldnames or []):
        raise ValueError('NFL schedule fields missing')
    indexed=defaultdict(list)
    for row in reader:
        if row['espn'] and row['espn'].isdecimal():
            indexed[row['espn']].append(row)
    return indexed,hashlib.sha256(raw).hexdigest()


def nflverse_observation(index,identity,p,now,receipt):
    rows=index.get(p['event_id'].removeprefix('nfl-'),[])
    if len(rows)!=1 or not re.fullmatch('[0-9a-f]{64}',receipt):
        return None
    row=rows[0]
    home_code=identity.get('home_code')
    away_code=identity.get('away_code')
    if row['game_type']!='REG' or row['home_team']!=TEAM_ALIASES.get(home_code,home_code) or row['away_team']!=TEAM_ALIASES.get(away_code,away_code):
        return None
    try:
        kickoff=datetime.strptime(row['gameday']+' '+row['gametime'],'%Y-%m-%d %H:%M').replace(tzinfo=EASTERN)
        if kickoff!=utc(p['event_start_utc']) or kickoff>now-timedelta(hours=6):
            return None
    except (KeyError,TypeError,ValueError):
        return None
    if not re.fullmatch(r'\d{4}_\d{2}_[A-Z]{2,3}_[A-Z]{2,3}',row['game_id'] or ''):
        return None
    if not all(re.fullmatch(r'\d{1,3}',row.get(k) or '') for k in ('home_score','away_score')):
        return None
    home,away=int(row['home_score']),int(row['away_score'])
    winner='tie' if home==away else identity['home_id'] if home>away else identity['away_id']
    if winner not in p['probabilities']:
        return None
    return {'prediction_id':p['prediction_id'],'sport':'nfl','event_id':p['event_id'],'market':p['market'],
        'actual_outcome':winner,'status':'SECONDARY_UNVERIFIED','independently_verified':False,'betting_eligible':False,
        'participant_ids':list(p['participant_ids']),'observed_at_utc':iso(now),'source_url':NFLVERSE,
        'response_sha256':receipt,'source_event_id':row['game_id'],'source_match_status':'SCHEDULE_SCORED',
        'final_score':{'home':home,'away':away}}


def collect(ledger,previous,now,fetcher=read_json,schedules_fetcher=None):
    if ledger.get('schemaVersion')!=1 or ledger.get('kind')!='PROSPECTIVE_PREDICTION_LEDGER' or not isinstance(ledger.get('records'),list):
        raise ValueError('Invalid forecast ledger')
    if previous.get('schema_version')!=1 or previous.get('publication_gate')!='BLOCKED' or not isinstance(previous.get('observations'),list):
        raise ValueError('Invalid secondary archive')
    stored={}
    for r in previous['observations']:
        if not isinstance(r,dict) or not isinstance(r.get('prediction_id'),str) or r['prediction_id'] in stored:
            raise ValueError('Duplicate existing secondary observation')
        stored[r['prediction_id']]=r
    pending=[]
    for p in ledger['records']:
        try:
            if p['prediction_id'] in stored or p['sport']!='nfl' or p['market']!='GAME_RESULT_INCLUDING_OVERTIME':continue
            if utc(p['event_start_utc'])>now-timedelta(hours=6):continue
            if not allowed_espn(p['source_url']) or len(p['participant_ids'])!=2:continue
            if not isinstance(p['probabilities'],dict) or len(p['probabilities'])!=3:continue
            pending.append(p)
        except (TypeError,ValueError,KeyError):continue
    by_source=defaultdict(list)
    for p in pending:by_source[p['source_url']].append(p)
    # Budgeted, deterministic scheduling; omitted feeds remain pending.
    docs={};errors=0
    for url in sorted(by_source)[:MAX_ESPN_URLS]:
        try:docs[url]=fetcher(url)[0]
        except (ValueError,OSError,TimeoutError,TypeError):errors+=1
    by_day=defaultdict(list)
    for p in pending:
        doc=docs.get(p['source_url'])
        if not doc:continue
        identity=espn_identity(doc,p)
        if identity:by_day[utc(p['event_start_utc']).date().isoformat()].append((p,identity))
    appended=0;days_scanned=0
    for day,items in sorted(by_day.items())[:MAX_DAYS]:
        url=API+'?'+urlencode({'d':day,'s':'American Football','l':'NFL'})
        try:
            result,hash_value=fetcher(url)
            if not re.fullmatch('[0-9a-f]{64}',hash_value):raise ValueError('Missing provider receipt')
            days_scanned+=1
        except (ValueError,OSError,TimeoutError,TypeError):
            errors+=1;continue
        for p,identity in items:
            evidence=sportsdb_observation(result,identity,p,now,url,hash_value)
            if not evidence:continue
            previous['observations'].append(evidence)
            stored[p['prediction_id']]=evidence
            appended+=1
    remaining=[(p,identity) for rows in by_day.values() for p,identity in rows
               if p['prediction_id'] not in stored]
    nflverse_claims=0
    if remaining and schedules_fetcher:
        try:
            index,receipt=schedules_fetcher()
            for p,identity in remaining:
                evidence=nflverse_observation(index,identity,p,now,receipt)
                if evidence:
                    previous['observations'].append(evidence)
                    nflverse_claims+=1
        except (ValueError,OSError,TimeoutError,TypeError,csv.Error):
            errors+=1
    previous['observations'].sort(key=lambda x:x['prediction_id'])
    return {'candidate_records':len(pending),'first_provider_requests':min(len(by_source),MAX_ESPN_URLS),
            'second_provider_days_scanned':days_scanned,'new_secondary_claims':appended+nflverse_claims,'nflverse_claims':nflverse_claims,
            'total_secondary_claims':len(previous['observations']),
            'unmatched_events':len(remaining)-nflverse_claims,'source_errors':errors,
            'status':'SECONDARY_PROVIDER_OBSERVATIONS_ONLY_UNVERIFIED'}

def run(root,now):
    ledger=json.loads((root/'prediction-ledger.json').read_text(encoding='utf-8'))
    path=root/'research'/'secondary-result-evidence.json'
    previous=json.loads(path.read_text(encoding='utf-8')) if path.exists() else {
       'schema_version':1,'research_only':True,'model_validation':'UNVALIDATED',
       'publication_gate':'BLOCKED','observations':[],
       'notice':'Separate public sports provider claims only; no automatic independent verification'}
    if previous.get('research_only') is not True or previous.get('publication_gate')!='BLOCKED':
        raise ValueError('Unsafe secondary source archive')
    status=collect(ledger,previous,now,schedules_fetcher=read_nflverse)
    previous['generated_at_utc']=iso(now)
    path.parent.mkdir(parents=True,exist_ok=True)
    path.write_text(json.dumps(previous,indent=2,ensure_ascii=False)+'\n',encoding='utf-8')
    return status

if __name__=='__main__':
    print(json.dumps(run(ROOT,datetime.now(timezone.utc)),indent=2))
