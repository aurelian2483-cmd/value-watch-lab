#!/usr/bin/env python3
"""Fail-closed rugby schedule collection; TheSportsDB free API has limited coverage."""
import datetime as dt
import hashlib
import json
import pathlib
import urllib.parse
import urllib.request
import urllib.error
import time

ROOT=pathlib.Path(__file__).resolve().parents[1]
UTC=dt.timezone.utc
SPORTS={'RU':'Rugby','RL':'Rugby League'}
LAST_REQUEST=0.0
def stamp(value):return value.astimezone(UTC).isoformat().replace('+00:00','Z')
def get(url):
    # Free plan: 30 requests/minute. Pacing applies across both rugby codes.
    global LAST_REQUEST
    delay=2.1-(time.monotonic()-LAST_REQUEST)
    if LAST_REQUEST and delay>0:time.sleep(delay)
    LAST_REQUEST=time.monotonic()
    req=urllib.request.Request(url,headers={'User-Agent':'ValueWatchResearch/1.0'})
    with urllib.request.urlopen(req,timeout=20) as response:
        if response.status!=200:raise ValueError('HTTP status')
        raw=response.read(2000001)
        if not raw or len(raw)>2000000:raise ValueError('Empty or oversized feed')
        return raw
def collect(now=None,fetch=get):
    now=now or dt.datetime.now(UTC)
    events={};audit={};conflicts=set()
    # Check every date, with paced requests. The free API can still truncate each
    # day's events: complete date checks do NOT mean complete event coverage.
    horizon_days=14
    offsets=tuple(range(horizon_days))
    for code,sport in SPORTS.items():
        health={'days_requested':len(offsets),'horizon_days':horizon_days,
                'sampled_offsets':list(offsets),'complete_horizon_coverage':False,
                'all_dates_checked':False,
                'days_succeeded':0,'source_errors':[],'free_api_may_truncate':True,
                'events':0,'rows_returned':0,'rows_matching_sport':0,'rows_without_confirmed_start':0}
        rate_limited=False
        for offset in offsets:
            date=(now+dt.timedelta(days=offset)).date().isoformat()
            if rate_limited:
                health['source_errors'].append({'day':date,'error':'SkippedAfterRateLimit','http_status':429})
                continue
            url='https://www.thesportsdb.com/api/v1/json/123/eventsday.php?'+urllib.parse.urlencode({'d':date,'s':sport})
            try:
                raw=fetch(url)
                payload=json.loads(raw)
                rows=payload.get('events')
                if rows is None:rows=[]
                if not isinstance(rows,list):raise ValueError('Invalid events schema')
                health['days_succeeded']+=1
                health['rows_returned']+=len(rows)
                receipt={'url':url,'sha256':hashlib.sha256(raw).hexdigest(),'observed_at_utc':stamp(now)}
                for row in rows:
                    if not isinstance(row,dict) or row.get('strSport')!=sport:continue
                    health['rows_matching_sport']+=1
                    home=row.get('strHomeTeam');away=row.get('strAwayTeam')
                    league=row.get('strLeague');league_id=row.get('idLeague')
                    event_id=row.get('idEvent')
                    if not all(isinstance(x,str) and x.strip() for x in (home,away,league,event_id,league_id)):continue
                    if home.strip()==away.strip():continue
                    # Date-only observations cannot establish a kick-off time.
                    start=row.get('strTimestamp')
                    if not isinstance(start,str) or not start.strip():
                        health['rows_without_confirmed_start']+=1
                        continue
                    try:
                        parsed=dt.datetime.fromisoformat(start.replace('Z','+00:00'))
                        if parsed.tzinfo is None or not now+dt.timedelta(minutes=5)<parsed<now+dt.timedelta(days=14):continue
                        if parsed.astimezone(UTC).date().isoformat()!=date:continue
                    except ValueError:continue
                    status=str(row.get('strStatus') or '').lower()
                    if any(x in status for x in ('cancel','postpon','abandon','finish','final')):continue
                    key=code+':'+event_id
                    if key in conflicts:continue
                    candidate={'code':code,'competition_code':code+':'+league_id,
                        'competition_name':league,'home':home,'away':away,'event_id':event_id,
                        'kickoff_utc':stamp(parsed),'source_receipts':[receipt],
                        'forecast_eligible':False,'forecast_status':'SCHEDULE_ONLY_NO_VALIDATED_MODEL'}
                    if key in events and any(events[key][field]!=candidate[field] for field in ('kickoff_utc','home','away','competition_code')):
                        health['source_errors'].append({'day':date,'error':'Conflicting fixture time'})
                        conflicts.add(key)
                        events.pop(key,None)
                    else:events[key]=candidate
            except Exception as exc:
                rate_limited=isinstance(exc,urllib.error.HTTPError) and exc.code==429
                health['source_errors'].append({'day':date,'error':type(exc).__name__,
                    'http_status':exc.code if isinstance(exc,urllib.error.HTTPError) else None})
        health['events']=sum(row['code']==code for row in events.values())
        health['all_dates_checked']=health['days_succeeded']==horizon_days
        health['collection_status']='SOURCE_UNAVAILABLE' if health['days_succeeded']==0 else 'PARTIAL_SOURCE_ERRORS' if health['days_succeeded']<health['days_requested'] else 'NO_CONFIRMED_FIXTURES_IN_SAMPLE' if health['events']==0 else 'CONFIRMED_FIXTURES_OBSERVED_IN_SAMPLE'
        audit[code]=health
    return {'schema_version':1,'generated_at_utc':stamp(now),'research_only':True,
        'model_validation':'UNVALIDATED','publication_gate':'BLOCKED',
        'upcoming_fixtures':sorted(events.values(),key=lambda e:e['kickoff_utc']),
        'rugby_union':{'model_validation':'UNVALIDATED','forecast_publication':'BLOCKED'},
        'rugby_league':{'model_validation':'UNVALIDATED','forecast_publication':'BLOCKED'},
        'source_health':audit,'limitations':['Free API day results may be incomplete.',
            'Rugby Union and Rugby League have separate identities and no shared predictions.',
            'No verified odds, probability, expected value or betting recommendations.']}
if __name__=='__main__':
    result=collect()
    (ROOT/'rugby-research-data.json').write_text(json.dumps(result,indent=2,ensure_ascii=False)+'\n',encoding='utf-8')
    print('Published current rugby source health and',len(result['upcoming_fixtures']),'confirmed fixtures; no probabilities or betting picks')
