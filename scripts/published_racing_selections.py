"""Public publisher selections, matched to captured racecards; not forum consensus."""
import datetime as dt
import hashlib
import json
import re
import urllib.request
from html import unescape
from zoneinfo import ZoneInfo
from discover_horse_races import PageData

SOURCES={'timeform':'https://www.sportinglife.com/racing/timeform-racing-tips-today',
         'naps':'https://www.sportinglife.com/racing/naps-table'}
UTC=dt.timezone.utc

def key(value):
    return re.sub(r'[^a-z0-9]','',re.sub(r'\s*\((?:IRE|GB|FR|USA|GER|AUS|NZ)\)\s*$','',str(value),flags=re.I).casefold())

def collect(races,now,fetch=None):
    if fetch is None:
        def fetch(url):
            req=urllib.request.Request(url,headers={'User-Agent':'ValueWatchResearch/1.0 (public publisher selections)'})
            with urllib.request.urlopen(req,timeout=20) as response:
                if response.geturl()!=url:raise ValueError('Selection source redirected')
                return response.read(3_000_001)
    upcoming=[r for r in races if now<dt.datetime.fromisoformat(r['startUTC'].replace('Z','+00:00'))<=now+dt.timedelta(days=2)]
    entries=[];health=[]
    native=0
    for race in upcoming:
        v=race.get('publisher_verdict') or {}
        if v.get('status')!='EXPLICIT_FIRST_CHOICE_OBSERVED' or v.get('rank')!=1:continue
        if v.get('race_id')!=str(race['race_id']) or v.get('startUTC')!=race['startUTC'] or v.get('url')!=race.get('runner_source') or v.get('sha256')!=race.get('runner_source_sha256'):continue
        horses=[h for h in race.get('runners',[]) if h.get('active_runner') and str(h['horse_id'])==v.get('horse_id') and h['name']==v.get('horse')]
        if len(horses)!=1 or not re.fullmatch('[a-f0-9]{64}',v.get('sha256','')):continue
        seen=dt.datetime.fromisoformat(v['observed_at_utc'])
        if not seen<=now<dt.datetime.fromisoformat(race['startUTC']):continue
        identity='verdict-'+hashlib.sha256('|'.join([str(race['race_id']),race['startUTC'],v['horse_id'],'timeform']).encode()).hexdigest()[:24]
        entries.append({'id':identity,'group':'tipster','author':'Timeform','publisher':'Timeform via Sporting Life',
            'source_identity':'publisher:timeform','race_id':str(race['race_id']),'startUTC':race['startUTC'],
            'horse':v['horse'],'market':'WIN','stance':'support','url':v['url'],'source_feed':v['url'],
            'publication_date':None,'published_at_utc':None,'observed_at_utc':v['observed_at_utc'],
            'verification':'PUBLIC_SELECTION_OBSERVED','extraction_method':'RANKED_RACECARD_VERDICT_V1',
            'summary':'Explicit first ranked racecard verdict observed before the race; original publication time unknown. Experimental source support only.',
            'selection_receipt':v})
        native+=1
    if any(r.get('publisher_verdict') for r in upcoming):health.append({'publisher':'Timeform race-specific verdicts','source_type':'tipster','status':'fetched','items_scanned':len(upcoming),'matched_selections':native,'explicit_tip_observations':native,'url':'https://www.sportinglife.com/racing/racecards'})

    def add(race,horse,publisher,author,url,raw,day):
        identity='publisher-'+hashlib.sha256('|'.join([url,race['race_id'],race['startUTC'],str(horse['horse_id']),publisher,author,day]).encode()).hexdigest()[:24]
        source_identity='publisher:'+('timeform' if publisher.casefold().startswith('timeform') else re.sub(r'[^a-z0-9]','',publisher.casefold()))
        entries.append({'id':identity,'group':'tipster','author':author,'publisher':publisher,'source_identity':source_identity,'race_id':str(race['race_id']),
            'event':race.get('name',''),'startUTC':race['startUTC'],'horse':horse['name'],'market':'WIN','stance':'support',
            'url':url,'source_feed':url,'publication_date':day,'observed_at_utc':now.isoformat(),
            'verification':'PUBLIC_SELECTION_OBSERVED','extraction_method':'PUBLISHER_STRUCTURED_SELECTION_V1',
            'summary':'Publisher selection observed for this source date; publication time and opinion not independently verified.',
            'selection_receipt':{'url':url,'sha256':hashlib.sha256(raw).hexdigest(),'observed_at_utc':now.isoformat(),
                'race_id':str(race['race_id']),'horse_id':str(horse['horse_id']),'source_date':day}})
    for kind,url in SOURCES.items():
        count=0;before=len(entries)
        try:
            raw=fetch(url)
            if not raw or len(raw)>3_000_000:raise ValueError('Selection page missing or oversized')
            html=raw.decode('utf-8');parser=PageData();parser.feed(html)
            if parser.blocks!=1:raise ValueError('Missing unique structured selection page')
            props=json.loads(''.join(parser.parts))['props']['pageProps']
            if props.get('hasError') is not False:raise ValueError('Selection source error')
            if kind=='timeform':
                for meeting in props['meetings']:
                    summary=meeting['meeting_summary']
                    for row in meeting['races']:
                        tip=row.get('top_rated_horse');count+=1
                        if not tip or tip.get('horse_status')!='RUNNER':continue
                        rid=str(row['race_summary_reference']['id']);day=row['date']
                        matches=[r for r in upcoming if str(r['race_id'])==rid and r['startUTC'][:10]==day==summary['date'] and key(r['racecourse'])==key(summary['course']['name']) and dt.datetime.fromisoformat(r['startUTC']).astimezone(ZoneInfo('Europe/London')).strftime('%H:%M')==row['time']]
                        if len(matches)!=1:continue
                        race=matches[0];horses=[h for h in race['runners'] if h.get('active_runner') is True and h.get('runner_status')=='RUNNER' and str(h['horse_id'])==str(tip['horse_reference']['id']) and key(h['name'])==key(tip['horse_name'])]
                        if len(horses)==1:add(race,horses[0],'Timeform via Sporting Life','Timeform',url,raw,day)
            else:
                headings=re.findall(r'<h2[^>]*>(.*?)</h2>',html,re.S)
                dates=[]
                for heading in headings:
                    try:dates.append(dt.datetime.strptime(unescape(re.sub('<[^>]+>','',heading)).strip(),'%a %d %B %Y').date())
                    except ValueError:pass
                if len(dates)!=1:raise ValueError('Missing unique source tips date')
                day=dates[0].isoformat()
                aliases={'carl':'carlisle','strf':'stratford','punc':'punchestown','ffos':'ffoslas','sand':'sandown'}
                for row in props['naps']:
                    count+=1;m=re.fullmatch(r'(\d{2}:\d{2})\s+(.+)',row.get('race',''))
                    if not m:continue
                    course=aliases.get(key(m[2]),key(m[2]));matches=[]
                    for race in upcoming:
                        if race['startUTC'][:10]!=day or key(race['racecourse'])!=course or dt.datetime.fromisoformat(race['startUTC']).astimezone(ZoneInfo('Europe/London')).strftime('%H:%M')!=m[1]:continue
                        for horse in race['runners']:
                            if horse.get('active_runner') is True and horse.get('runner_status')=='RUNNER' and key(horse['name'])==key(row['horseName']):matches.append((race,horse))
                    publisher=str(row.get('tipsterSource') or '').strip();author=str(row.get('tipster') or publisher).strip()
                    if len(matches)==1 and publisher and author:add(*matches[0],publisher,author,url,raw,day)
            health.append({'publisher':'Sporting Life '+kind,'source_type':'tipster','status':'fetched','items_scanned':count,'matched_selections':len(entries)-before,'explicit_tip_observations':len(entries)-before,'url':url})
        except Exception as exc:
            health.append({'publisher':'Sporting Life '+kind,'source_type':'tipster','status':'error','error':str(exc)[:180],'url':url})
    return entries,health
