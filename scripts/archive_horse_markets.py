#!/usr/bin/env python3
"""Append source-observed quote captures; compare only matching fields/markets.
These are neither verified executable prices nor independently attested odds history.
"""
import datetime as dt
import hashlib
import json
import math
import re
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
FEED=Path('/tmp/horse-research/racing-research-data.json')
ARCHIVE=ROOT/'research/horse-market-archive'
UTC=dt.timezone.utc

def canonical(value):return json.dumps(value,sort_keys=True,separators=(',',':')).encode()
def digest(value):return hashlib.sha256(canonical(value)).hexdigest()
def stamp(value):
 parsed=dt.datetime.fromisoformat(value.replace('Z','+00:00'))
 if parsed.tzinfo is None:raise ValueError('Timezone required')
 return parsed.astimezone(UTC)

def snapshot(race):
 market=race.get('market_observation') or {}
 if market.get('status')!='COMPLETE_SOURCE_OBSERVATION' or race.get('runner_data_status')!='SINGLE_SOURCE_RUNNERS_OBSERVED' or market.get('bookmaker')!='Sky Bet' or market.get('executable_verified') is not False or market.get('source_sha256')!=race.get('runner_source_sha256') or market.get('source')!=race.get('runner_source') or not re.fullmatch(r'[a-f0-9]{64}',str(market.get('source_sha256',''))):return None
 active=sorted(str(h['horse_id']) for h in race.get('runners',[]) if h.get('active_runner') is True and h.get('runner_status')=='RUNNER')
 quotes=market.get('quotes',[])
 if len(active)<2 or len(active)!=len(set(active)) or sorted(str(q['horse_id']) for q in quotes)!=active or any(type(q.get('decimal')) not in (int,float) or not math.isfinite(q['decimal']) or q['decimal']<=1 for q in quotes):return None
 if stamp(market['observed_at_utc'])>=stamp(race['startUTC']):return None
 record={'schema_version':1,'kind':'HORSE_SOURCE_MARKET_CAPTURE','race_id':str(race['race_id']),'racecourse':race['racecourse'],
  'startUTC':race['startUTC'],'observed_at_utc':market['observed_at_utc'],'bookmaker':market['bookmaker'],
  'publisher':market['publisher'],'bookmaker_race_id':market['bookmaker_race_id'],'bookmaker_market_id':market['bookmaker_market_id'],
  'active_runner_ids':active,'quotes':sorted(quotes,key=lambda q:str(q['horse_id'])),
  'source':market['source'],'source_sha256':market['source_sha256'],'executable_verified':False,
  'research_only':True,'model_validation':'UNVALIDATED','publication_gate':'BLOCKED','challenge_eligible':0,
  'limitation':'Third-party observation only. Neither opening/closing/SP/BSP coverage nor independently attested capture time is established.'}
 record['record_sha256']=digest(record)
 return record

def comparison(current,previous):
 base={'previous_observation':None,'movements':[],'history_status':'FIRST_RECORDED_OBSERVATION'}
 if previous is None:return base
 base['previous_observation']={k:previous[k] for k in ('record_sha256','observed_at_utc','startUTC','bookmaker','publisher','bookmaker_race_id','bookmaker_market_id','active_runner_ids','quotes','source','source_sha256')}
 if stamp(current['startUTC'])!=stamp(previous['startUTC']):return {**base,'history_status':'SCHEDULE_CHANGED'}
 if current['active_runner_ids']!=previous['active_runner_ids']:return {**base,'history_status':'FIELD_CHANGED'}
 if any(current[k]!=previous[k] for k in ('bookmaker','bookmaker_race_id','bookmaker_market_id')):return {**base,'history_status':'MARKET_CHANGED'}
 old={str(q['horse_id']):q for q in previous['quotes']}
 movements=[]
 for q in current['quotes']:
  p=old[str(q['horse_id'])]
  direction='SHORTENED' if q['decimal']<p['decimal'] else 'DRIFTED' if q['decimal']>p['decimal'] else 'UNCHANGED'
  movements.append({'horse_id':str(q['horse_id']),'previous_decimal':p['decimal'],'current_decimal':q['decimal'],
   'previous_fractional':p['fractional'],'current_fractional':q['fractional'],'direction':direction})
 return {**base,'history_status':'COMPARABLE_SOURCE_OBSERVATIONS','movements':movements}

def update(data,archive=ARCHIVE):
 now=dt.datetime.now(UTC);count=0
 for race in data['races']:
  current=snapshot(race)
  if current is None:continue
  if stamp(current['observed_at_utc'])>now+dt.timedelta(minutes=5):raise ValueError('Future market observation')
  day=stamp(race['startUTC']).date().isoformat();folder=archive/day/str(race['race_id']);folder.mkdir(parents=True,exist_ok=True)
  previous=[]
  for path in folder.glob('*.json'):
   item=json.loads(path.read_text());body={k:v for k,v in item.items() if k!='record_sha256'}
   if item.get('record_sha256')!=path.stem or digest(body)!=path.stem:raise ValueError('Market capture integrity mismatch')
   if str(item['race_id'])!=str(race['race_id']) or stamp(item['startUTC']).date().isoformat()!=day:raise ValueError('Market capture race identity mismatch')
   if stamp(item['observed_at_utc'])>=stamp(item['startUTC']) or stamp(item['observed_at_utc'])>now+dt.timedelta(minutes=5):raise ValueError('Invalid market archive chronology')
   if stamp(item['observed_at_utc'])<stamp(current['observed_at_utc']):previous.append(item)
  path=folder/(current['record_sha256']+'.json');raw=json.dumps(current,indent=2)+'\n'
  if path.exists():
   if json.loads(path.read_text())!=current:raise ValueError('Refusing to overwrite market capture')
  else:
   with path.open('x') as out:out.write(raw)
   count+=1
  prior=max(previous,key=lambda p:stamp(p['observed_at_utc'])) if previous else None
  race['market_observation'].update(comparison(current,prior))
  race['market_observation']['record_sha256']=current['record_sha256']
  race['market_observation']['archive_path']=str(path.relative_to(ROOT)) if path.is_relative_to(ROOT) else str(path)
 data['market_history_status']={'new_captures':count,'kind':'APPEND_ONLY_SOURCE_OBSERVATIONS','executable_prices_verified':False,
  'limitation':'Source capture changes do not establish value or win probability. Changed fields/markets are not directly compared.'}
 return count

def main():
 data=json.loads(FEED.read_text())
 if data.get('research_only') is not True or data.get('publication_gate')!='BLOCKED' or data.get('model_validation')!='UNVALIDATED':raise ValueError('Unsafe source feed')
 count=update(data)
 FEED.write_text(json.dumps(data,indent=2)+'\n')
 print(json.dumps({'market_captures_added':count,'publication_gate':'BLOCKED','executable_prices_verified':False}))

if __name__=='__main__':main()
