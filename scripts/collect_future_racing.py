#!/usr/bin/env python3
"""Seven-day UK/Irish racecard discovery. Future entries are schedule-only."""
import datetime as dt
import hashlib
import json
import urllib.request
from pathlib import Path
from zoneinfo import ZoneInfo
from discover_horse_races import discover

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
 records=[];days=[];seen=set()
 for offset in range(1,7):
  date=today+dt.timedelta(days=offset)
  url='https://www.sportinglife.com/racing/racecards/'+date.isoformat()
  try:
   raw=fetch(url)
   if not raw or len(raw)>3000000:raise ValueError('Invalid response size')
   parsed=discover(raw,now,target_date=date)
   rows=parsed['races']
   for race in rows:
    if race['race_id'] in seen:raise ValueError('Duplicate race ID across dates')
    seen.add(race['race_id'])
    records.append({k:race[k] for k in ('race_id','racecourse','name','startUTC','source','source_link_type','source_runner_count','observedAtUTC','verification')})
   days.append({'date':date.isoformat(),'status':'SOURCE_OBSERVED' if rows else 'NO_UK_IRELAND_RACES_IN_SOURCE','count':len(rows),'url':url,'sha256':hashlib.sha256(raw).hexdigest()})
  except Exception as exc:
   days.append({'date':date.isoformat(),'status':'COLLECTION_FAILED','count':0,'url':url,'error':str(exc)[:240]})
 return {'schema_version':1,'kind':'FUTURE_RACING_SCHEDULE_RESEARCH','generated_at_utc':now.isoformat(),'research_only':True,'publication_gate':'BLOCKED','model_validation':'UNVALIDATED','coverage_verified':False,'days':days,'races':records,'limitations':['Future races are source-observed schedules, not verified declarations, odds or predictions.','Missing source coverage does not mean no scheduled races.']}

if __name__=='__main__':
 data=collect()
 OUT.write_text(json.dumps(data,indent=2)+'\n')
 print(json.dumps({'future_races':len(data['races']),'failed_days':sum(x['status']=='COLLECTION_FAILED' for x in data['days'])}))
