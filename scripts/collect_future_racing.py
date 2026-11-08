#!/usr/bin/env python3
"""Seven-day UK/Irish racecard discovery. Future entries are schedule-only."""
import datetime as dt
import hashlib
import json
import os
import urllib.request
from pathlib import Path
from zoneinfo import ZoneInfo
from discover_horse_races import discover, PageData
from collections import Counter
from free_racing_sources import collect_free

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'racing-future-data.json'
UTC=dt.timezone.utc

def collect(fetch=None, now=None):
 now=now or dt.datetime.now(UTC)
 today=now.astimezone(ZoneInfo('Europe/London')).date()
 if fetch is None:
  def fetch(url):
   request=urllib.request.Request(url,headers={'User-Agent':'Mozilla/5.0 (compatible; ValueWatchResearch/1.0)'})
   with urllib.request.urlopen(request,timeout=30) as response:
    if response.status!=200:raise ValueError('Non-200 future racecard source')
    return response.read(3000001)
 records=[];days=[];seen=set();response_hashes={}
 for offset in range(1,8):
  date=today+dt.timedelta(days=offset)
  url='https://www.sportinglife.com/racing/racecards?date='+date.isoformat()
  try:
   raw=fetch(url)
   if not raw or len(raw)>3000000:raise ValueError('Invalid response size')
   digest=hashlib.sha256(raw).hexdigest()
   if digest in response_hashes:
    raise ValueError('Identical response to '+response_hashes[digest]+'; date selector ignored by source')
   response_hashes[digest]=date.isoformat()
   parser=PageData();parser.feed(raw.decode('utf-8'))
   props=json.loads(''.join(parser.parts))['props']['pageProps']
   source_dates=Counter(str(m.get('meeting_summary',{}).get('date','UNKNOWN')) for m in props.get('meetings',[]))
   parsed=discover(raw,now,target_date=date)
   rows=parsed['races']
   for race in rows:
    if race['race_id'] in seen:raise ValueError('Duplicate race ID across dates')
    seen.add(race['race_id'])
    records.append({**{k:race[k] for k in ('race_id','racecourse','name','startUTC','source','source_link_type','source_runner_count','observedAtUTC','verification')}, 'venue':race['racecourse'], 'race_name':race['name'], 'scheduled_start_time_utc':race['startUTC'], 'source_url':race['source'], 'observation_timestamp_utc':race['observedAtUTC'], 'declaration_stage':'NOT_VERIFIED', 'runners':[]})
   days.append({'date':date.isoformat(),'status':'SOURCE_OBSERVED' if rows else 'NO_MATCHING_RACES_OBSERVED','count':len(rows),'url':url,'sha256':digest,'source_meeting_dates':dict(source_dates),'source_meeting_count':len(props.get('meetings',[]))})
  except Exception as exc:
   days.append({'date':date.isoformat(),'status':'COLLECTION_FAILED','count':0,'url':url,'error':str(exc)[:240]})
 return {'schema_version':1,'kind':'FUTURE_RACING_SCHEDULE_RESEARCH','generated_at_utc':now.isoformat(),'research_only':True,'publication_gate':'BLOCKED','model_validation':'UNVALIDATED','coverage_verified':False,'days':days,'races':records,'limitations':['Future races are source-observed schedules, not verified declarations, odds or predictions.','Missing source coverage does not mean no scheduled races.']}


def collect_api(now=None, fetch_json=None):
 """Optional authenticated date-specific UK/Northern Ireland racecards; no inferred runners."""
 now=now or dt.datetime.now(UTC)
 key=os.environ.get('HORSE_RACING_API_KEY','').strip()
 if not key and fetch_json is None:
  raise RuntimeError('HORSE_RACING_API_KEY missing: configure repository Actions secret; do not publish sample fixtures')
 if fetch_json is None:
  def fetch_json(url):
   req=urllib.request.Request(url,headers={'X-API-Key':key,'Accept':'application/json','User-Agent':'ValueWatchResearch/1.0'})
   with urllib.request.urlopen(req,timeout=30) as response:
    if response.status!=200:raise ValueError('Racecard API HTTP '+str(response.status))
    return json.load(response)
 today=now.astimezone(ZoneInfo('Europe/London')).date()
 days=[];records=[];seen=set()
 for offset in range(1,8):
  date=today+dt.timedelta(days=offset)
  day=date.isoformat()
  url='https://api.horseracingapi.co.uk/v1/racecards/'+day
  try:
   payload=fetch_json(url)
   meetings=payload.get('data')
   if not isinstance(meetings,list):raise ValueError('Missing meetings data array')
   count=0
   for meeting in meetings:
    if meeting.get('date')!=day:raise ValueError('Provider meeting date differs from requested date')
    course=meeting.get('course')
    if not isinstance(course,str) or not course.strip():raise ValueError('Missing course')
    for race in meeting.get('races',[]):
     rid=str(race.get('race_id') or '')
     clock=race.get('time')
     if not rid or rid in seen or not isinstance(clock,str):raise ValueError('Invalid or repeated race ID/time')
     start=dt.datetime.combine(date,dt.time.fromisoformat(clock),ZoneInfo('Europe/London')).astimezone(UTC)
     if start<=now:continue
     seen.add(rid)
     records.append({'race_id':rid,'venue':course,'racecourse':course,'race_name':race.get('name') or 'Race name unavailable',
       'name':race.get('name') or 'Race name unavailable','scheduled_start_time_utc':start.isoformat(),
       'startUTC':start.isoformat(),'source_url':url,'source':url,
       'observation_timestamp_utc':now.isoformat(),'observedAtUTC':now.isoformat(),
       'declaration_stage':'NOT_VERIFIED','source_runner_count':race.get('runners'),
       'verification':'SINGLE_SOURCE_UNVERIFIED','runners':[]})
     count+=1
   days.append({'date':day,'status':'SOURCE_OBSERVED' if count else 'NO_MATCHING_RACES_OBSERVED','count':count,'url':url})
  except Exception as exc:
   days.append({'date':day,'status':'COLLECTION_FAILED','count':0,'url':url,'error':str(exc)[:240]})
 return {'schema_version':1,'kind':'FUTURE_RACING_SCHEDULE_RESEARCH','generated_at_utc':now.isoformat(),
   'research_only':True,'publication_gate':'BLOCKED','model_validation':'UNVALIDATED','coverage_verified':False,
   'days':days,'races':records,'source_provider':'HORSE_RACING_API_UK','failed_dates':[d['date'] for d in days if d['status']=='COLLECTION_FAILED'],
   'limitations':['UK and Northern Ireland coverage only; Republic of Ireland not included.',
   'Date-specific API source observations are not independent verification of declarations or odds.',
   'Provider plan may not cover all seven future days. Missing coverage must not be represented as no races.']}

def validate_publishable_snapshot(data):
 """Fail closed before overwriting the existing research snapshot."""
 if data.get('schema_version')!=1 or data.get('research_only') is not True:
  raise ValueError('Invalid research schema')
 if data.get('publication_gate')!='BLOCKED' or data.get('model_validation')!='UNVALIDATED':
  raise ValueError('Research safety gates are missing')
 days=data.get('days')
 if not isinstance(days,list) or len(days)!=7:
  raise ValueError('Seven date-scoped collection results required')
 dates=[day.get('date') for day in days if isinstance(day,dict)]
 if len(set(dates))!=7 or any(not isinstance(day,str) for day in dates):
  raise ValueError('Invalid or duplicate coverage dates')
 races=data.get('races')
 fixtures=data.get('fixture_meetings')
 if not isinstance(races,list) or not isinstance(fixtures,list) or not (races or fixtures):
  raise ValueError('Refusing to replace snapshot with no observed records')
 if fixtures and data.get('fixture_source_status')!='SOURCE_OBSERVED':
  raise ValueError('Fixture records require observed source status')
 for race in races:
  if not isinstance(race,dict) or race.get('verification')!='SINGLE_SOURCE_UNVERIFIED':
   raise ValueError('Race provenance invalid')
 for meeting in fixtures:
  if not isinstance(meeting,dict) or meeting.get('date') not in dates:
   raise ValueError('Fixture date outside collection window')
  if meeting.get('record_type')!='MEETING_FIXTURE' or meeting.get('race_times_status')!='NOT_SUPPLIED' or meeting.get('declarations_status')!='NOT_VERIFIED':
   raise ValueError('Fixture status invalid')
  source=meeting.get('source_url')
  if not isinstance(source,str) or not source.startswith('https://www.sportinglife.com/racing/meeting/'+meeting['date']+'/'):
   raise ValueError('Fixture source URL is not an observed dated Sporting Life meeting')
  if any(field in meeting for field in ('startUTC','runners','odds')):
   raise ValueError('Fixture contains unsupported race details')
 return True

if __name__=='__main__':
 data=collect_api() if os.environ.get('HORSE_RACING_API_KEY') else collect()
 target_dates=[x['date'] for x in data['days']]
 fixture_result=collect_free(target_dates,dt.datetime.now(UTC))
 data['fixture_meetings']=fixture_result['meetings']
 data['fixture_source_status']=fixture_result['status']
 data['fixture_provider_results']=fixture_result['provider_results']
 if fixture_result.get('error'):data['fixture_source_error']=fixture_result['error']
 data['limitations'].append('Meeting fixtures are not individual races and have no inferred post times or runners.')
 print(json.dumps({'generated_at_utc':data['generated_at_utc'],'races_discovered':len(data['races']),'daily_source_results':data['days']},indent=2),flush=True)
 try:
  validate_publishable_snapshot(data)
 except ValueError as exc:
  raise SystemExit('Preserving existing published snapshot: '+str(exc))
 data['failed_dates']=[day['date'] for day in data['days'] if day['status']=='COLLECTION_FAILED']
 data['collection_status']='PARTIAL_SOURCE_COVERAGE' if data['failed_dates'] or data['fixture_source_status']!='SOURCE_OBSERVED' else 'SOURCE_OBSERVED_NOT_COMPLETE'
 data['limitations'].append('A successful source request is not proof of complete racing coverage. Failed dates are explicitly reported.')
 OUT.write_text(json.dumps(data,indent=2)+'\n')
 print(json.dumps({'future_races':len(data['races']),'fixture_meetings':len(data['fixture_meetings']),'fixture_source_status':data['fixture_source_status'],'failed_days':sum(x['status']=='COLLECTION_FAILED' for x in data['days'])}))
