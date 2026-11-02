#!/usr/bin/env python3
"""Freeze equal-chance reference benchmarks. These are assumptions, not predictions."""
import datetime as dt
import hashlib
import json
from pathlib import Path
from enrich_horse_runners import stamp

ROOT=Path(__file__).resolve().parents[1]
FEED=Path('/tmp/horse-research/racing-research-data.json')
ARCHIVE=ROOT/'research/horse-reference-archive/v1'
MODEL='EQUAL_CHANCE_REFERENCE_V1'
UTC=dt.timezone.utc

def canonical(obj):return json.dumps(obj,sort_keys=True,separators=(',',':')).encode()
def digest(obj):return hashlib.sha256(canonical(obj)).hexdigest()

def build(data,now,archive=ARCHIVE):
 if data.get('research_only') is not True or data.get('publication_gate')!='BLOCKED' or data.get('model_validation')!='UNVALIDATED':raise ValueError('Unsafe feed')
 if not dt.timedelta(minutes=-5)<=now-stamp(data['generated_at_utc'])<=dt.timedelta(hours=2):raise ValueError('Stale/future feed')
 existing={};loaded=[]
 for path in archive.glob('*.json'):
  r=json.loads(path.read_text());unsigned=dict(r);saved=unsigned.pop('record_sha256')
  if saved!=path.stem or digest(unsigned)!=saved:raise ValueError('Reference archive integrity failure')
  if r.get('reference_only') is not True or r.get('publication_gate')!='BLOCKED' or r.get('challenge_eligible')!=0:raise ValueError('Unsafe reference archive')
  if stamp(r['generated_at_utc'])>=stamp(r['startUTC']):raise ValueError('Post-event archive')
  signature=(r['race_id'],r['startUTC'],tuple(sorted(x['horse_id'] for x in r['runners'])))
  if signature in existing:raise ValueError('Duplicate archived reference field')
  existing[signature]=r;loaded.append(r)
 records=[];new=[];skipped=[];seen=set()
 for race in data['races']:
  rid=race['race_id']
  if rid in seen:raise ValueError('Duplicate race ID')
  seen.add(rid)
  if race.get('runner_data_status')!='SINGLE_SOURCE_RUNNERS_OBSERVED':
   skipped.append({'race_id':rid,'reason':'RUNNER_DATA_UNAVAILABLE'});continue
  if race.get('capture_phase')!='PRE_EVENT' or race.get('race_stage') not in ('DORMANT','GOINGDOWN','ATTHEPOST') or stamp(race['startUTC'])<=now+dt.timedelta(minutes=5):
   skipped.append({'race_id':rid,'reason':'NOT_CONFIRMED_PRE_EVENT_WITH_5_MINUTE_BUFFER'});continue
  if not dt.timedelta(minutes=-5)<=now-stamp(race['runner_observed_at_utc'])<=dt.timedelta(minutes=30):
   skipped.append({'race_id':rid,'reason':'STALE_RUNNER_OBSERVATION'});continue
  runners=race['runners'];active=[r for r in runners if r['active_runner'] is True]
  if any(r.get('runner_status') not in ('RUNNER','NONRUNNER') or r['active_runner']!=(r['runner_status']=='RUNNER') for r in runners):raise ValueError('Inconsistent runner statuses')
  if len({r['horse_id'] for r in runners})!=len(runners) or len(active)!=race['active_runner_count']:raise ValueError('Invalid field identity/count')
  if len(active)<2:
   skipped.append({'race_id':rid,'reason':'FEWER_THAN_TWO_ACTIVE_RUNNERS'});continue
  values=[{'horse_id':r['horse_id'],'name':r['name'],'reference_probability':1/len(active)} for r in sorted(active,key=lambda r:r['horse_id'])]
  signature=(rid,race['startUTC'],tuple(r['horse_id'] for r in values))
  old=existing.get(signature)
  if old:records.append(old);continue
  earlier=sorted([r for r in loaded if r['race_id']==rid and r['startUTC']==race['startUTC']],key=lambda r:r['generated_at_utc'])
  record={'schema_version':1,'race_id':rid,'racecourse':race['racecourse'],'startUTC':race['startUTC'],
   'model':MODEL,'generated_at_utc':now.isoformat(),'reference_only':True,'research_only':True,
   'model_validation':'UNVALIDATED','publication_gate':'BLOCKED','challenge_eligible':0,
   'independent_timestamp_attested':False,'schedule_verification':race.get('verification','SINGLE_SOURCE_UNVERIFIED'),
   'runner_source_sha256':race['runner_source_sha256'],'runner_observed_at_utc':race['runner_observed_at_utc'],
   'active_runner_count':len(active),'non_runner_count':race['non_runner_count'],'runners':values,
   'odds':None,'expected_value':None,'supersedes_record_sha256':earlier[-1]['record_sha256'] if earlier else None,
   'limitation':'Uniform reference assumption only; ignores form and is not an estimated real-world winning probability.'}
  record['record_sha256']=digest(record);records.append(record);new.append(record)
 # Fail before writing any files if a later race is malformed.
 if new:archive.mkdir(parents=True,exist_ok=True)
 for record in new:
  with (archive/(record['record_sha256']+'.json')).open('x') as f:f.write(json.dumps(record,indent=2)+'\n')
 return records,{'status':'REFERENCE_BENCHMARKS_ONLY','model':MODEL,'available_references':len(records),
  'new_archived_records':len(new),'skipped':skipped,'reference_only':True,'publication_gate':'BLOCKED',
  'independent_schedule_verification':'NOT_CONNECTED','official_challenge':'0/100'}

def main():
 data=json.loads(FEED.read_text());records,report=build(data,dt.datetime.now(UTC))
 data['reference_baselines']=records;data['reference_baseline_audit']=report
 FEED.write_text(json.dumps(data,indent=2)+'\n')
 (FEED.parent/'reference-baseline-audit.json').write_text(json.dumps(report,indent=2)+'\n')
 print(json.dumps(report))
if __name__=='__main__':main()
