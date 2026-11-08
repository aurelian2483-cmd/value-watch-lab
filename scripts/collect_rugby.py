#!/usr/bin/env python3
"""Fail-closed rugby schedule collection; TheSportsDB free API has limited coverage."""
import datetime as dt
import hashlib
import json
import pathlib
import urllib.parse
import urllib.request

ROOT=pathlib.Path(__file__).resolve().parents[1]
UTC=dt.timezone.utc
SPORTS={'RU':'Rugby','RL':'Rugby League'}
def stamp(value):return value.astimezone(UTC).isoformat().replace('+00:00','Z')
def get(url):
    req=urllib.request.Request(url,headers={'User-Agent':'ValueWatchResearch/1.0'})
    with urllib.request.urlopen(req,timeout=20) as response:
        if response.status!=200:raise ValueError('HTTP status')
        raw=response.read(2000001)
        if not raw or len(raw)>2000000:raise ValueError('Empty or oversized feed')
        return raw
def collect(now=None,fetch=get):
    now=now or dt.datetime.now(UTC)
    events={};audit={}
    for code,sport in SPORTS.items():
        health={'days_requested':14,'days_succeeded':0,'source_errors':[],'free_api_may_truncate':True,'events':0}
        for offset in range(14):
            date=(now+dt.timedelta(days=offset)).date().isoformat()
            url='https://www.thesportsdb.com/api/v1/json/123/eventsday.php?'+urllib.parse.urlencode({'d':date,'s':sport})
            try:
                raw=fetch(url)
                payload=json.loads(raw)
                rows=payload.get('events')
                if rows is None:rows=[]
                if not isinstance(rows,list):raise ValueError('Invalid events schema')
                health['days_succeeded']+=1
                receipt={'url':url,'sha256':hashlib.sha256(raw).hexdigest(),'observed_at_utc':stamp(now)}
                for row in rows:
                    if row.get('strSport')!=sport:continue
                    home=row.get('strHomeTeam');away=row.get('strAwayTeam')
                    league=row.get('strLeague');league_id=row.get('idLeague')
                    event_id=row.get('idEvent')
                    if not all(isinstance(x,str) and x.strip() for x in (home,away,league,event_id,league_id)):continue
                    if home.strip()==away.strip():continue
                    # Date-only observations cannot establish a kick-off time.
                    start=row.get('strTimestamp')
                    if not isinstance(start,str) or not start.strip():continue
                    try:
                        parsed=dt.datetime.fromisoformat(start.replace('Z','+00:00'))
                        if parsed.tzinfo is None or not now+dt.timedelta(minutes=5)<parsed<now+dt.timedelta(days=14):continue
                    except ValueError:continue
                    status=str(row.get('strStatus') or '').lower()
                    if any(x in status for x in ('cancel','postpon','abandon','finish','final')):continue
                    key=code+':'+event_id
                    candidate={'code':code,'competition_code':code+':'+league_id,
                        'competition_name':league,'home':home,'away':away,'event_id':event_id,
                        'kickoff_utc':stamp(parsed),'source_receipts':[receipt],
                        'forecast_eligible':False,'forecast_status':'SCHEDULE_ONLY_NO_VALIDATED_MODEL'}
                    if key in events and events[key]['kickoff_utc']!=candidate['kickoff_utc']:
                        health['source_errors'].append({'day':date,'error':'Conflicting fixture time'})
                        events.pop(key,None)
                    else:events[key]=candidate
            except Exception as exc:
                health['source_errors'].append({'day':date,'error':type(exc).__name__})
        health['events']=sum(row['code']==code for row in events.values())
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
    if result['upcoming_fixtures']:
        (ROOT/'rugby-research-data.json').write_text(json.dumps(result,indent=2,ensure_ascii=False)+'\n')
        print('Published',len(result['upcoming_fixtures']),'rugby fixtures')
    else:print('No source-confirmed rugby fixtures; retained existing published snapshot')
