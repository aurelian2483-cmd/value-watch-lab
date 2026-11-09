#!/usr/bin/env python3
"""Seven-day UK/Irish racecard discovery. Future entries are schedule-only."""
import datetime as dt
import concurrent.futures
import hashlib
import json
import os
import re
import tempfile
import urllib.request
from pathlib import Path
from urllib.parse import urlparse
from zoneinfo import ZoneInfo
from discover_horse_races import discover, PageData
from collections import Counter
from free_racing_sources import collect_free
from enrich_horse_runners import parse_card_data, parse_card

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'racing-future-data.json'
UTC=dt.timezone.utc

def collect_meeting_cards(fixtures, now, fetch=None):
 """Follow observed dated meeting links when the index ignores its date selector."""
 if fetch is None:
  def fetch(url):
   req=urllib.request.Request(url,headers={'User-Agent':'Mozilla/5.0 (compatible; ValueWatchResearch/1.0)'})
   with urllib.request.urlopen(req,timeout=30) as response:
    if response.geturl()!=url:raise ValueError('Meeting redirected to different source')
    return response.read(3000001)
 def one(meeting):
  url=meeting['source_url']
  parsed=urlparse(url)
  if parsed.scheme!='https' or parsed.hostname!='www.sportinglife.com' or not parsed.path.startswith('/racing/meeting/'+meeting['date']+'/'):
   return [],{'url':url,'status':'UNSUPPORTED_MEETING_SOURCE','races':0}
  raw=fetch(url)
  if not raw or len(raw)>3000000:raise ValueError('Invalid meeting response size')
  parser=PageData();parser.feed(raw.decode('utf-8'))
  if parser.blocks!=1:raise ValueError('Missing structured meeting page')
  props=json.loads(''.join(parser.parts))['props']['pageProps']
  if props.get('hasError') is not False:raise ValueError('Meeting source error')
  data=props['fastResults'];summary=data['meeting_summary']
  course_key=lambda value:re.sub(r'[^a-z0-9]','',value.casefold())
  if (summary['date']!=meeting['date'] or course_key(summary['course']['name'])!=course_key(meeting['course'])
      or str(summary['meeting_reference']['id'])!=parsed.path.rstrip('/').split('/')[-1]):
   raise ValueError('Meeting date/course mismatch')
  cards=[r['race'] for r in data['fast_results']]
  discovered=discover(raw,now,target_date=dt.date.fromisoformat(meeting['date']),page_props={
   'hasError':False,'meetings':[{'meeting_summary':summary,'races':[c['race_summary'] for c in cards]}]})
  card_by_id={str(c['race_summary']['race_summary_reference']['id']):c for c in cards}
  rows=[];runner_errors=[]
  for row in discovered['races']:
   if dt.datetime.fromisoformat(row['startUTC'])<=now:continue
   row.update(venue=row['racecourse'],race_name=row['name'],scheduled_start_time_utc=row['startUTC'],
              source_url=row['source'],observation_timestamp_utc=row['observedAtUTC'],declaration_stage='NOT_VERIFIED',
              meeting_source=url,meeting_source_sha256=hashlib.sha256(raw).hexdigest())
   try:
    row.update(parse_card_data(card_by_id[row['race_id']],{**row,'source':url},now,raw))
   except (ValueError,KeyError,TypeError) as exc:
    runner_errors.append({'race_id':row['race_id'],'error':str(exc)[:240]})
    row['runner_data_status']='RUNNER_SOURCE_UNAVAILABLE_OR_INVALID'
   rows.append(row)
  return rows,{'url':url,'date':meeting['date'],'status':'SOURCE_OBSERVED','sha256':hashlib.sha256(raw).hexdigest(),
               'races':len(rows),'runner_errors':runner_errors,'runners':sum(len(r['runners']) for r in rows)}
 rows=[];receipts=[];seen=set()
 with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
  futures=[(m,pool.submit(one,m)) for m in fixtures]
  for meeting,future in futures:
   try:
    found,receipt=future.result()
    for row in found:
     if row['race_id'] in seen:raise ValueError('Duplicate race across meeting sources')
     seen.add(row['race_id']);rows.append(row)
    receipts.append(receipt)
   except Exception as exc:
    receipts.append({'url':meeting['source_url'],'date':meeting['date'],'status':'COLLECTION_FAILED','error':str(exc)[:240]})
 return rows,receipts

def collect_individual_cards(races,now,fetch=None):
 """Bounded 48-hour refresh; retain discovered rows on individual source failure."""
 if fetch is None:
  def fetch(url):
   req=urllib.request.Request(url,headers={'User-Agent':'Mozilla/5.0 (compatible; ValueWatchResearch/1.0)'})
   with urllib.request.urlopen(req,timeout=20) as response:
    if response.status!=200 or response.geturl()!=url:raise ValueError('Racecard HTTP failure or redirect')
    return response.read(3000001)
 selected=sorted((r for r in races if now<dt.datetime.fromisoformat(r['startUTC'])<=now+dt.timedelta(days=2)),key=lambda r:(r['startUTC'],r['race_id']))[:64]
 def one(row):
  url=row['source'];u=urlparse(url)
  day=dt.datetime.fromisoformat(row['startUTC']).astimezone(ZoneInfo('Europe/London')).date().isoformat()
  if u.scheme!='https' or u.netloc!='www.sportinglife.com' or not u.path.startswith('/racing/racecards/'+day+'/') or '/racecard/'+str(row['race_id'])+'/' not in u.path:raise ValueError('Unapproved dated racecard URL')
  raw=fetch(url)
  if not raw or len(raw)>3000000:raise ValueError('Missing or oversized racecard')
  fields=parse_card(raw,row,now)
  return fields,{'race_id':row['race_id'],'url':url,'status':'SOURCE_OBSERVED','sha256':hashlib.sha256(raw).hexdigest(),'observed_at_utc':now.isoformat(),'market_status':fields['market_observation']['status'],'verdict_status':fields['publisher_verdict']['status']}
 receipts=[]
 with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
  for row,future in [(r,pool.submit(one,r)) for r in selected]:
   try:
    fields,receipt=future.result();row.update(fields);receipts.append(receipt)
   except Exception as exc:receipts.append({'race_id':row['race_id'],'url':row['source'],'status':'COLLECTION_FAILED','error':str(exc)[:240]})
 return receipts


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
   if source_dates and date.isoformat() not in source_dates:
    days.append({'date':date.isoformat(),'status':'SOURCE_DATE_MISMATCH','count':0,'url':url,
                 'sha256':digest,'source_meeting_dates':dict(source_dates),
                 'source_meeting_count':len(props['meetings']),
                 'error':'Requested date absent from source meeting dates; date selector ignored or unavailable'})
    continue
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
 try:
  parsed_dates=[dt.date.fromisoformat(day) for day in dates]
 except ValueError as exc:
  raise ValueError('Invalid calendar date in coverage') from exc
 if parsed_dates!=[parsed_dates[0]+dt.timedelta(days=i) for i in range(7)]:
  raise ValueError('Coverage must contain seven consecutive dates')
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
  if not isinstance(source,str):
   raise ValueError('Fixture source URL missing')
  parsed=urlparse(source)
  approved={'www.sportinglife.com','www.racingpost.com','racingpost.com','www.attheraces.com'}
  if parsed.scheme!='https' or parsed.hostname not in approved or not parsed.path.startswith('/'):
   raise ValueError('Fixture source URL is not from an approved provider')
  if parsed.hostname in ('www.sportinglife.com','www.racingpost.com','racingpost.com') and meeting['date'] not in parsed.path:
   raise ValueError('Dated fixture URL does not match observed meeting date')
  if any(field in meeting for field in ('startUTC','runners','odds')):
   raise ValueError('Fixture contains unsupported race details')
 return True

def write_validated_snapshot(data,target=OUT):
 """Publish only after the same validation used by the scheduled collector."""
 validate_publishable_snapshot(data)
 target=Path(target)
 payload=json.dumps(data,indent=2)+'\n'
 temporary=None
 try:
  with tempfile.NamedTemporaryFile(mode='w',encoding='utf-8',dir=target.parent,prefix='.'+target.name+'.',suffix='.tmp',delete=False) as stream:
   temporary=Path(stream.name)
   stream.write(payload)
   stream.flush()
   os.fsync(stream.fileno())
  os.replace(temporary,target)
 except BaseException:
  if temporary is not None:
   temporary.unlink(missing_ok=True)
  raise
 return target

if __name__=='__main__':
 data=collect_api() if os.environ.get('HORSE_RACING_API_KEY') else collect()
 target_dates=[x['date'] for x in data['days']]
 fixture_result=collect_free(target_dates,dt.datetime.now(UTC))
 data['fixture_meetings']=fixture_result['meetings']
 data['fixture_source_status']=fixture_result['status']
 data['fixture_provider_results']=fixture_result['provider_results']
 recovered,receipts=collect_meeting_cards(data['fixture_meetings'],dt.datetime.now(UTC))
 existing={r['race_id']:r for r in data['races']}
 existing.update({r['race_id']:r for r in recovered})
 data['races']=sorted(existing.values(),key=lambda r:(r['startUTC'],r['race_id']))
 data['individual_card_results']=collect_individual_cards(data['races'],dt.datetime.now(UTC))
 data['meeting_card_results']=receipts
 data['collection_started_at_utc']=data['generated_at_utc']
 data['generated_at_utc']=dt.datetime.now(UTC).isoformat()
 for day in data['days']:
  rows=[r for r in recovered if dt.datetime.fromisoformat(r['startUTC']).astimezone(ZoneInfo('Europe/London')).date().isoformat()==day['date']]
  day['meeting_page_races']=len(rows)
  day['meeting_page_runner_observations']=sum(len(r['runners']) for r in rows)
 data['limitations'].append('Dated meeting pages can supply single-source racecards and runners; these are not independently verified declarations or executable odds.')
 if fixture_result.get('error'):data['fixture_source_error']=fixture_result['error']
 data['limitations'].append('Meeting fixtures are not individual races and have no inferred post times or runners.')
 print(json.dumps({'generated_at_utc':data['generated_at_utc'],'races_discovered':len(data['races']),'daily_source_results':data['days']},indent=2),flush=True)
 try:
  validate_publishable_snapshot(data)
 except ValueError as exc:
  raise SystemExit('Preserving existing published snapshot: '+str(exc))
 data['failed_dates']=[day['date'] for day in data['days'] if day['status'] in ('COLLECTION_FAILED','SOURCE_DATE_MISMATCH')]
 data['collection_status']='PARTIAL_SOURCE_COVERAGE' if data['failed_dates'] or data['fixture_source_status']!='SOURCE_OBSERVED' else 'SOURCE_OBSERVED_NOT_COMPLETE'
 data['limitations'].append('A successful source request is not proof of complete racing coverage. Failed dates are explicitly reported.')
 write_validated_snapshot(data)
 print(json.dumps({'future_races':len(data['races']),'publisher_forecasts':sum(r.get('publisher_forecast',{}).get('status')=='COMPLETE_PUBLISHER_FORECAST' for r in data['races']),'fixture_meetings':len(data['fixture_meetings']),'fixture_source_status':data['fixture_source_status'],'failed_index_days':len(data['failed_dates']),'meeting_page_failures':sum(x['status']=='COLLECTION_FAILED' for x in receipts)}))
