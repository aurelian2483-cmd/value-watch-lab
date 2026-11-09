#!/usr/bin/env python3
"""Source-observed national-team fixtures; schedule-only, no betting forecasts."""
import datetime as dt
import hashlib
import json
import pathlib
import urllib.parse
import urllib.request

ROOT=pathlib.Path(__file__).resolve().parents[1]
UTC=dt.timezone.utc
# ESPN competition identifiers. A feed with no events is not evidence of no fixtures.
COMPETITIONS={
    'fifa.worldq.uefa':'World Cup Qualifying · UEFA',
    'fifa.worldq.conmebol':'World Cup Qualifying · CONMEBOL',
    'fifa.worldq.concacaf':'World Cup Qualifying · CONCACAF',
    'fifa.worldq.caf':'World Cup Qualifying · CAF',
    'fifa.worldq.afc':'World Cup Qualifying · AFC',
    'uefa.nations':'UEFA Nations League',
    'fifa.friendly':'International Friendlies',
    'fifa.world':'FIFA World Cup',
    'uefa.euro':'UEFA European Championship',
}
def stamp(value):
    return value.astimezone(UTC).isoformat().replace('+00:00','Z')
def collect(now=None, fetch=None):
    now=now or dt.datetime.now(UTC)
    if fetch is None:
        def fetch(url):
            request=urllib.request.Request(url,headers={'User-Agent':'ValueWatchResearch/1.0'})
            with urllib.request.urlopen(request,timeout=20) as response:
                if response.status!=200:raise ValueError('HTTP status')
                raw=response.read(2000001)
                if not raw or len(raw)>2000000:raise ValueError('Missing or oversized source')
                return raw
    fixtures={}; audits={}; window_start=now+dt.timedelta(minutes=5)
    window_end=now+dt.timedelta(days=14)
    for code,label in COMPETITIONS.items():
        audit={'days_requested':15,'days_succeeded':0,'source_errors':[],'fixtures':0}
        for offset in range(15):
            date=(now+dt.timedelta(days=offset)).strftime('%Y%m%d')
            url='https://site.api.espn.com/apis/site/v2/sports/soccer/'+code+'/scoreboard?'+urllib.parse.urlencode({'dates':date,'limit':100})
            try:
                raw=fetch(url); doc=json.loads(raw)
                events=doc.get('events')
                if not isinstance(events,list) or len(events)>=100:raise ValueError('Invalid or possibly truncated events')
                audit['days_succeeded']+=1
                receipt={'url':url,'observed_at_utc':stamp(now),'sha256':hashlib.sha256(raw).hexdigest()}
                for event in events:
                    competition=event.get('competitions') or []
                    if len(competition)!=1:continue
                    sides=competition[0].get('competitors') or []
                    home=[p for p in sides if p.get('homeAway')=='home']
                    away=[p for p in sides if p.get('homeAway')=='away']
                    if len(home)!=1 or len(away)!=1:continue
                    h=home[0].get('team',{}).get('displayName','')
                    a=away[0].get('team',{}).get('displayName','')
                    if not h or not a or h==a:continue
                    if event.get('status',{}).get('type',{}).get('state')!='pre':continue
                    try:
                        start=dt.datetime.fromisoformat(event['date'].replace('Z','+00:00'))
                        if start.tzinfo is None or not window_start<=start<=window_end:continue
                        event_id=str(event['id'])
                        if not event_id or len(event_id)>100:continue
                    except (KeyError,TypeError,ValueError):continue
                    identity=code+':'+event_id
                    row={'league':'INT:'+code,'league_name':label,'international':True,
                         'home':h,'away':a,'home_team_id':str(home[0]['team'].get('id','')),'away_team_id':str(away[0]['team'].get('id','')),'kickoff_utc':stamp(start),
                         'espn_event_id':event_id,'forecast_status':'SCHEDULE_ONLY_NO_INTERNATIONAL_MODEL',
                         'forecast_eligible':False,'schedule_source_receipts':[receipt]}
                    if identity in fixtures and fixtures[identity]['kickoff_utc']!=row['kickoff_utc']:
                        audit['source_errors'].append({'date':date,'error':'Conflicting event time '+event_id})
                        fixtures.pop(identity,None)
                        continue
                    fixtures[identity]=row
            except Exception as error:
                audit['source_errors'].append({'date':date,'error':type(error).__name__})
        audit['fixtures']=sum(r['league']=='INT:'+code for r in fixtures.values())
        audits[code]=audit
    return {'schema_version':1,'generated_at_utc':stamp(now),'research_only':True,
            'model_validation':'UNVALIDATED','publication_gate':'BLOCKED',
            'upcoming_fixtures':sorted(fixtures.values(),key=lambda r:r['kickoff_utc']),
            'experimental_model_forecasts':[],'competition_audits':audits,
            'limitations':['Schedule-only international coverage. No international model, prices, probabilities or EV.',
                           'Only source-observed named national teams and times are displayed.',
                           'Source coverage is incomplete and fixtures may change.']}
if __name__=='__main__':
    result=collect()
    destination=ROOT/'international-football-data.json'
    if result['upcoming_fixtures']:
        destination.write_text(json.dumps(result,indent=2,ensure_ascii=False)+'\n')
        print('Published',len(result['upcoming_fixtures']),'international fixtures')
    else:
        print('No international fixtures confirmed in the next 14 days; existing snapshot retained')
