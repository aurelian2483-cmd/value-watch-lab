#!/usr/bin/env python3
"""Source-attributed runner and form observations; no predictions or verified prices."""
import concurrent.futures
import datetime as dt
import hashlib
import json
from pathlib import Path
import urllib.parse
import urllib.request
from zoneinfo import ZoneInfo
from discover_horse_races import PageData
from horse_market import quoted_market

ROOT=Path('/tmp/horse-research')
UTC=dt.timezone.utc

def stamp(value):
 value=dt.datetime.fromisoformat(value.replace('Z','+00:00'))
 if value.tzinfo is None:raise ValueError('Timezone required')
 return value.astimezone(UTC)

def parse_card(raw,race,observed):
 p=PageData();p.feed(raw.decode('utf-8'))
 if p.blocks!=1:raise ValueError('Structured racecard missing or ambiguous')
 props=json.loads(''.join(p.parts))['props']['pageProps']
 if props.get('hasError') is not False:raise ValueError('Racecard source reports an error')
 card=props['race'];summary=card['race_summary']
 if str(summary['race_summary_reference']['id'])!=race['race_id']:raise ValueError('Race ID mismatch')
 if summary['course_name'].strip().casefold()!=race['racecourse'].strip().casefold():raise ValueError('Course mismatch')
 kickoff=dt.datetime.combine(dt.date.fromisoformat(summary['date']),dt.time.fromisoformat(summary['time']),ZoneInfo('Europe/London')).astimezone(UTC)
 if abs((kickoff-stamp(race['startUTC'])).total_seconds())>60:raise ValueError('Racecard kickoff mismatch')
 rides=card.get('rides')
 if not isinstance(rides,list) or not rides:raise ValueError('Runner list unavailable')
 runners=[];seen=set();excluded_history=0
 cutoff=min(kickoff.astimezone(ZoneInfo('Europe/London')).date(),observed.astimezone(ZoneInfo('Europe/London')).date())
 for ride in rides:
  horse=ride['horse'];horse_id=str(horse['horse_reference']['id']);name=horse['name'].strip()
  if not name or not horse_id or horse_id in seen:raise ValueError('Missing or duplicate horse identity')
  seen.add(horse_id)
  status=ride['ride_status']
  if status not in ('RUNNER','NONRUNNER','WITHDRAWN','DOUBTFUL'):raise ValueError('Unknown runner status: '+str(status))
  histories=[];past_seen=set()
  for past in horse.get('previous_results',[]):
   try:
    date=dt.date.fromisoformat(past['date']);past_id=str(past['race_id'])
    if date>=cutoff or past_id==race['race_id'] or past_id in past_seen:
     excluded_history+=1;continue
    past_seen.add(past_id)
    histories.append({k:past.get(k) for k in ('race_id','date','course_name','distance','run_type','weight','position','runner_count','bha','race_class','going')})
   except (KeyError,ValueError,TypeError):excluded_history+=1
  runners.append({'horse_id':horse_id,'name':name,'ride_id':str(ride['ride_reference']['id']),
   'runner_status':status,'active_runner':status=='RUNNER','cloth_number':ride.get('cloth_number'),
   'draw':ride.get('draw_number'),'age':horse.get('age'),'weight':ride.get('handicap'),
   'official_rating':ride.get('official_rating'),'jockey':(ride.get('jockey') or {}).get('name'),
   'trainer':(ride.get('trainer') or {}).get('name'),'days_since_last_run':horse.get('last_ran_days'),
   'previous_results':sorted(histories,key=lambda h:h['date'],reverse=True),
   'historical_first_availability_verified':False,'win_probability':None,'odds':None,'expected_value':None})
 uncertain=any(r['runner_status']=='DOUBTFUL' for r in runners)
 active=sum(r['active_runner'] for r in runners)
 if type(summary.get('ride_count')) is not int or (not uncertain and active!=summary['ride_count']) or (uncertain and not active<=summary['ride_count']<=len(runners)):raise ValueError('Active runner count differs from racecard summary')
 pre_event=observed<kickoff and summary['race_stage'] in ('DORMANT','GOINGDOWN','ATTHEPOST')
 return {'runners':runners,'runner_data_status':'RUNNER_FIELD_UNCONFIRMED' if uncertain else 'SINGLE_SOURCE_RUNNERS_OBSERVED',
  'market_observation':quoted_market(rides,observed,race['source'],hashlib.sha256(raw).hexdigest(),pre_event,not uncertain),
  'doubtful_runner_count':sum(r['runner_status']=='DOUBTFUL' for r in runners),
  'active_runner_count':active,'non_runner_count':sum(r['runner_status'] in ('NONRUNNER','WITHDRAWN') for r in runners),'withdrawn_count':sum(r['runner_status']=='WITHDRAWN' for r in runners),
  'runner_count_changed_since_discovery':active!=race['source_runner_count'],
  'race_stage':summary['race_stage'],'capture_phase':'PRE_EVENT' if pre_event else 'NOT_PRE_EVENT',
  'runner_observed_at_utc':observed.isoformat(),'runner_source':race['source'],
  'runner_source_sha256':hashlib.sha256(raw).hexdigest(),'excluded_history_rows':excluded_history,
  'forecast_status':'SEPARATE_MODEL_FEED_REQUIRED' if pre_event else 'POST_EVENT_OR_NOT_CONFIRMED_PRE_EVENT',
  'forecast_eligible':False}

def collect(race):
 url=urllib.parse.urlsplit(race['source'])
 if url.scheme!='https' or url.hostname!='www.sportinglife.com' or '/racecard/'+race['race_id']+'/' not in url.path:
  raise ValueError('Unapproved racecard URL')
 req=urllib.request.Request(race['source'],headers={'User-Agent':'Mozilla/5.0 (compatible; ValueWatchResearch/1.0)'})
 with urllib.request.urlopen(req,timeout=20) as response:
  if response.status!=200:raise ValueError('Racecard HTTP failure')
  final=urllib.parse.urlsplit(response.geturl())
  if final.hostname!=url.hostname or final.path!=url.path:raise ValueError('Racecard redirected to different page')
  raw=response.read(3000001)
 if not raw or len(raw)>3000000:raise ValueError('Missing or oversized racecard')
 fields=parse_card(raw,race,dt.datetime.now(UTC))
 (ROOT/'runner-sources').mkdir(parents=True,exist_ok=True)
 (ROOT/'runner-sources'/(race['race_id']+'.html')).write_bytes(raw)
 return fields

def main():
 path=ROOT/'racing-research-data.json';data=json.loads(path.read_text())
 if data.get('research_only') is not True or data.get('publication_gate')!='BLOCKED' or data.get('model_validation')!='UNVALIDATED':raise ValueError('Unsafe racing feed')
 now=dt.datetime.now(UTC)
 if not dt.timedelta(minutes=-5)<=now-stamp(data['generated_at_utc'])<=dt.timedelta(hours=2):raise ValueError('Stale/future discovery feed')
 races=data['races']
 if len(races)>100:raise ValueError('Unexpected race count')
 errors=[];connected=0
 with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
  futures={pool.submit(collect,r):r for r in races}
  for future in concurrent.futures.as_completed(futures):
   race=futures[future]
   try:race.update(future.result());connected+=1
   except Exception as exc:
    race['runner_data_status']='RUNNER_SOURCE_UNAVAILABLE_OR_INVALID'
    errors.append({'race_id':race['race_id'],'error':str(exc)})
 report={'status':'RUNNER_OBSERVATIONS_COLLECTED' if not errors else 'PARTIAL_RUNNER_OBSERVATIONS',
  'races_received':len(races),'races_enriched':connected,
  'active_runner_observations':sum(r.get('active_runner_count',0) for r in races),
  'non_runner_observations':sum(r.get('non_runner_count',0) for r in races),
  'pre_event_races':sum(r.get('capture_phase')=='PRE_EVENT' for r in races),
  'errors':errors,'publication_gate':'BLOCKED','model_validation':'UNVALIDATED'}
 data['runner_audit']=report;data['status']=report['status']
 data['limitations']=[s for s in data['limitations'] if not s.startswith('Source runner counts')]
 data['limitations']+=['Runner status and form are single-source observations, not independent verification.',
  'Doubtful runners remain visible but block full-field forecasts and quoted favourites.',
  'Separately displayed market observations are third-party quotes, not verified executable bookmaker prices.',
  'Historical rows are date-filtered before race/capture day; their historical availability is not attested.',
  'Tips, commentary, current-race finishing positions and bookmaker prices are excluded from runner features.']
 path.write_text(json.dumps(data,indent=2)+'\n')
 (ROOT/'runner-audit.json').write_text(json.dumps(report,indent=2)+'\n')
 print(json.dumps(report))
 if not connected:raise SystemExit('No usable runner cards; retain last published feed')

if __name__=='__main__':main()

