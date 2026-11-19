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
import re

ROOT=pathlib.Path(__file__).resolve().parents[1]
UTC=dt.timezone.utc
SPORTS={'RU':'Rugby','RL':'Rugby League'}
LAST_REQUEST=0.0
def stamp(value):return value.astimezone(UTC).isoformat().replace('+00:00','Z')
def get(url):
    # Published free limit is 30/minute, but observed shared-key throttling is
    # tighter. Stay below 10/minute across both rugby codes.
    global LAST_REQUEST
    delay=6.1-(time.monotonic()-LAST_REQUEST)
    if LAST_REQUEST and delay>0:time.sleep(delay)
    LAST_REQUEST=time.monotonic()
    req=urllib.request.Request(url,headers={'User-Agent':'ValueWatchResearch/1.0'})
    with urllib.request.urlopen(req,timeout=20) as response:
        if response.status!=200:raise ValueError('HTTP status')
        raw=response.read(2000001)
        if not raw or len(raw)>2000000:raise ValueError('Empty or oversized feed')
        return raw
def source_start(value):
    if not isinstance(value,str):raise ValueError('Missing timestamp')
    # The provider documents strTimestamp as UTC and normalised it to this
    # timezone-less format. This is NOT a guessed kickoff or local-time field.
    # https://www.thesportsdb.com/forum_topic.php?t=6173
    # https://www.thesportsdb.com/forum_topic.php?s=476&t=1802
    if re.fullmatch(r'\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}',value):
        return dt.datetime.fromisoformat(value).replace(tzinfo=UTC)
    parsed=dt.datetime.fromisoformat(value.replace('Z','+00:00'))
    if parsed.tzinfo is None:raise ValueError('Timestamp has no documented timezone')
    return parsed.astimezone(UTC)
def collect(now=None,fetch=get):
    now=now or dt.datetime.now(UTC)
    events={};audit={};conflicts=set()
    # Check every date, with paced requests. The free API can still truncate each
    # day's events: complete date checks do NOT mean complete event coverage.
    horizon_days=14
    offsets=tuple(range(horizon_days))
    # Interleave Union and League so a source limit cannot starve the second code.
    observations={};rate_limited=False
    for offset in offsets:
        date=(now+dt.timedelta(days=offset)).date().isoformat()
        for code,sport in SPORTS.items():
            url='https://www.thesportsdb.com/api/v1/json/123/eventsday.php?'+urllib.parse.urlencode({'d':date,'s':sport})
            if rate_limited:
                observations[(code,date)]=(url,None,None)
                continue
            try:observations[(code,date)]=(url,fetch(url),None)
            except Exception as exc:
                observations[(code,date)]=(url,None,exc)
                if isinstance(exc,urllib.error.HTTPError) and exc.code==429:rate_limited=True
    for code,sport in SPORTS.items():
        health={'days_requested':len(offsets),'horizon_days':horizon_days,
                'sampled_offsets':list(offsets),'complete_horizon_coverage':False,
                'all_dates_checked':False,
                'rows_outside_requested_day':0,
                'days_succeeded':0,'source_errors':[],'free_api_may_truncate':True,
                'events':0,'rows_returned':0,'rows_matching_sport':0,'rows_without_confirmed_start':0}
        for offset in offsets:
            date=(now+dt.timedelta(days=offset)).date().isoformat()
            url,raw,error=observations[(code,date)]
            if raw is None and error is None:
                health['source_errors'].append({'day':date,'error':'SkippedAfterRateLimit','http_status':429})
                continue
            try:
                if error:raise error
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
                        parsed=source_start(start)
                        if parsed.date().isoformat()!=date:
                            health['rows_outside_requested_day']+=1
                            continue
                        if not now+dt.timedelta(minutes=5)<parsed<now+dt.timedelta(days=14):continue
                    except ValueError:
                        health['rows_without_confirmed_start']+=1
                        continue
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
NRL_CALENDAR='https://raw.githubusercontent.com/jordthedan/NRL-calendar/main/nrl-calendar.ics'
NRL_TEAMS={
    'Broncos':'Brisbane Broncos','Raiders':'Canberra Raiders','Bulldogs':'Canterbury-Bankstown Bulldogs',
    'Sharks':'Cronulla-Sutherland Sharks','Dolphins':'Dolphins','Titans':'Gold Coast Titans',
    'Sea Eagles':'Manly Warringah Sea Eagles','Storm':'Melbourne Storm','Knights':'Newcastle Knights',
    'Warriors':'New Zealand Warriors','Cowboys':'North Queensland Cowboys','Eels':'Parramatta Eels',
    'Panthers':'Penrith Panthers','Bears':'Perth Bears','Rabbitohs':'South Sydney Rabbitohs',
    'Dragons':'St George Illawarra Dragons','Roosters':'Sydney Roosters','Wests Tigers':'Wests Tigers'
}

def calendar_time(value):
    if not re.fullmatch(r'\d{8}T\d{6}Z',value or ''):raise ValueError('Calendar time must be explicitly UTC')
    return dt.datetime.strptime(value,'%Y%m%dT%H%M%SZ').replace(tzinfo=UTC)

def parse_nrl_calendar(raw, now):
    """Import dated fixtures from the maintained GitHub feed, with NRL match links."""
    if not isinstance(raw,bytes) or not 0<len(raw)<=2_000_000:raise ValueError('Invalid calendar response size')
    ical=re.sub(r'\r?\n[ \t]','',raw.decode('utf-8')).splitlines()
    if ical[:2]!=['BEGIN:VCALENDAR','VERSION:2.0'] or ical[-1:]!=['END:VCALENDAR']:
        raise ValueError('Incomplete calendar envelope')
    fixtures=[];seen=set();all_starts=[];updated=[];event=None;in_alarm=False;withheld=0
    digest=hashlib.sha256(raw).hexdigest()
    for line in ical[2:-1]:
        if line=='BEGIN:VEVENT':
            if event is not None:raise ValueError('Nested calendar event')
            event={};continue
        if event is None:continue
        if line=='BEGIN:VALARM':in_alarm=True;continue
        if line=='END:VALARM':in_alarm=False;continue
        if line=='END:VEVENT':
            if in_alarm:raise ValueError('Unclosed calendar alarm')
            uid=event['UID'];start=calendar_time(event['DTSTART']);published=calendar_time(event['DTSTAMP'])
            if not re.fullmatch(r'nrl-\d{4}-[a-z0-9_-]+@jordthedan\.github\.io',uid) or uid in seen:
                raise ValueError('Unknown or duplicate NRL calendar identity')
            seen.add(uid);updated.append(published);all_starts.append(start)
            if start>now and event.get('STATUS','CONFIRMED')=='CONFIRMED':
                address=event.get('URL','')
                match=re.fullmatch(r'https://www\.nrl\.com/draw/nrl-premiership/(\d{4})/[^/]+/[a-z0-9-]+/?',address)
                home,sep,away=event.get('SUMMARY','').partition(' vs ')
                if match and int(match[1])==start.astimezone(dt.timezone(dt.timedelta(hours=10))).year and sep and home in NRL_TEAMS and away in NRL_TEAMS and home!=away:
                    fixtures.append({'code':'RL','competition_code':'RL:NRL','competition_name':'NRL Premiership',
                        'home':NRL_TEAMS[home],'away':NRL_TEAMS[away],'event_id':uid,
                        'kickoff_utc':stamp(start),'source_receipts':[{'url':NRL_CALENDAR,'sha256':digest,
                            'observed_at_utc':stamp(now)},{'url':address}],
                        'forecast_eligible':False,'forecast_status':'SCHEDULE_ONLY_NO_VALIDATED_MODEL'})
                else:withheld+=1
            event=None;continue
        if in_alarm:continue
        key,sep,value=line.partition(':')
        if sep and key in ('UID','DTSTART','DTSTAMP','SUMMARY','URL','STATUS'):
            if key in event:raise ValueError('Duplicate calendar event property')
            event[key]=value
    if event is not None or not all_starts:raise ValueError('Missing or incomplete calendar events')
    if max(updated)>now+dt.timedelta(minutes=5):raise ValueError('Calendar has an invalid publication timestamp')
    stale=now-max(updated)>dt.timedelta(hours=72)
    return {'source_url':NRL_CALENDAR,'checked_at_utc':stamp(now),'published_at_utc':stamp(max(updated)),
            'latest_listed_kickoff_utc':stamp(max(all_starts)),'sha256':digest,'withheld_fixtures':withheld,
            'status':'STALE' if stale else 'FUTURE_FIXTURES_OBSERVED' if fixtures else 'NO_FUTURE_FIXTURES_OBSERVED',
            'fixtures':[] if stale else sorted(fixtures,key=lambda row:row['kickoff_utc'])}

def collect_nrl_calendar(now, previous=None):
    try:
        return parse_nrl_calendar(get(NRL_CALENDAR),now)
    except (OSError,ValueError,KeyError):
        return {**(previous or {}),'source_url':NRL_CALENDAR,'checked_at_utc':stamp(now),
                'status':'SOURCE_UNAVAILABLE','fixtures':[]}

if __name__=='__main__':
    target=ROOT/'rugby-research-data.json'
    previous=json.loads(target.read_text()).get('nrl_calendar') if target.exists() else None
    result=collect()
    result['nrl_calendar']=collect_nrl_calendar(dt.datetime.now(UTC),previous)
    target.write_text(json.dumps(result,indent=2,ensure_ascii=False)+'\n',encoding='utf-8')
    print('Rugby provider fixtures:',len(result['upcoming_fixtures']),'· GitHub NRL calendar:',result['nrl_calendar']['status'])
