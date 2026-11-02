#!/usr/bin/env python3
"""Exploratory racing form model and single-source provisional evaluation.
No verified betting probabilities, price recommendations or official challenge credit.
"""
import datetime as dt
import hashlib
import json
import math
from pathlib import Path
import urllib.parse
import urllib.request
from zoneinfo import ZoneInfo
from discover_horse_races import PageData
from enrich_horse_runners import stamp

ROOT=Path(__file__).resolve().parents[1]
WORK=Path('/tmp/horse-research')
MODEL='FORM_PERCENTILE_SOFTMAX_RESEARCH_V1'
PARAMETERS={'minimum_form_runs':3,'maximum_form_runs':6,'maximum_age_days':730,
 'recency_half_life_days':90,'neutral_prior_runs':5,'softmax_temperature_inverse':2,
 'capture_buffer_minutes':5,'maximum_runner_age_minutes':30}
UTC=dt.timezone.utc

def canon(x):return json.dumps(x,sort_keys=True,separators=(',',':')).encode()
def sha(x):return hashlib.sha256(canon(x)).hexdigest()
def check_feed(data,now):
 if data.get('research_only') is not True or data.get('publication_gate')!='BLOCKED' or data.get('model_validation')!='UNVALIDATED':raise ValueError('Unsafe racing feed')
 if not dt.timedelta(minutes=-5)<=now-stamp(data['generated_at_utc'])<=dt.timedelta(hours=2):raise ValueError('Stale/future feed')

def form_features(runner,cutoff):
 values=[];seen=set()
 for past in sorted(runner.get('previous_results',[]),key=lambda x:x.get('date',''),reverse=True):
  try:
   day=dt.date.fromisoformat(past['date']);age=(cutoff-day).days;pid=str(past['race_id'])
   place,count=past.get('position'),past.get('runner_count')
   if pid in seen or not 0<age<=PARAMETERS['maximum_age_days'] or past.get('run_type')!='FLAT':continue
   if type(place)!=int or type(count)!=int or not 1<=place<=count or count<2:continue
   seen.add(pid)
   weight=2**(-age/PARAMETERS['recency_half_life_days'])
   values.append({'race_id':pid,'date':past['date'],'position':place,'field_size':count,
    'finish_percentile':(count-place)/(count-1),'recency_weight':weight})
   if len(values)==PARAMETERS['maximum_form_runs']:break
  except (ValueError,KeyError,TypeError):continue
 if len(values)<PARAMETERS['minimum_form_runs']:return None
 total=sum(v['recency_weight'] for v in values)
 mean=sum(v['finish_percentile']*v['recency_weight'] for v in values)/total
 # Exploratory shrinkage towards a neutral finish percentile, not a calibrated win rate.
 reliability=total/(total+PARAMETERS['neutral_prior_runs'])
 return {'usable_runs':len(values),'weighted_finish_percentile':mean,
  'shrunk_form_strength':.5+reliability*(mean-.5),'history':values}

def forecast(race,now):
 if race.get('surface') not in ('ALLWEATHER','POLYTRACK','TAPETA','FIBRESAND'):return None,'OUTSIDE_ALL_WEATHER_SCOPE'
 if race.get('runner_data_status')!='SINGLE_SOURCE_RUNNERS_OBSERVED':return None,'RUNNER_DATA_UNAVAILABLE'
 kickoff=stamp(race['startUTC'])
 if race.get('capture_phase')!='PRE_EVENT' or race.get('race_stage') not in ('DORMANT','GOINGDOWN','ATTHEPOST') or kickoff<=now+dt.timedelta(minutes=5):return None,'NOT_PRE_EVENT_WITH_BUFFER'
 if not dt.timedelta(minutes=-5)<=now-stamp(race['runner_observed_at_utc'])<=dt.timedelta(minutes=30):return None,'STALE_RUNNER_DATA'
 runners=race['runners']
 if any(r.get('runner_status') not in ('RUNNER','NONRUNNER','WITHDRAWN') or r.get('active_runner')!=(r['runner_status']=='RUNNER') for r in runners):raise ValueError('Inconsistent runner status')
 if len({r['horse_id'] for r in runners})!=len(runners):raise ValueError('Duplicate horse identity')
 active=sorted([r for r in runners if r['active_runner']],key=lambda x:x['horse_id'])
 if len(active)<2 or len(active)!=race['active_runner_count']:return None,'INVALID_ACTIVE_FIELD'
 cutoff=min(now.astimezone(ZoneInfo('Europe/London')).date(),kickoff.astimezone(ZoneInfo('Europe/London')).date())
 rows=[]
 for runner in active:
  features=form_features(runner,cutoff)
  if features is None:return None,'INSUFFICIENT_FORM_FOR_FULL_FIELD'
  rows.append({'horse_id':runner['horse_id'],'name':runner['name'],'form_features':features})
 logits=[PARAMETERS['softmax_temperature_inverse']*r['form_features']['shrunk_form_strength'] for r in rows]
 top=max(logits);weights=[math.exp(v-top) for v in logits];total=sum(weights)
 for row,weight in zip(rows,weights):row['model_probability']=weight/total;row['equal_chance_reference']=1/len(rows)
 record={'schema_version':1,'model':MODEL,'race_id':race['race_id'],'racecourse':race['racecourse'],
  'race_name':race['name'],'startUTC':race['startUTC'],'source':race['source'],
  'generated_at_utc':now.isoformat(),'parameters':PARAMETERS,'runners':rows,
  'runner_source_sha256':race['runner_source_sha256'],'runner_observed_at_utc':race['runner_observed_at_utc'],
  'active_runner_count':len(rows),'research_only':True,'reference_only':False,
  'model_validation':'UNVALIDATED','publication_gate':'BLOCKED','challenge_eligible':0,
  'independent_timestamp_attested':False,'independent_schedule_verified':False,
  'historical_first_availability_verified':False,'odds':None,'expected_value':None,
  'limitation':'Untrained, uncalibrated form heuristic; parameters are exploratory. Ignores class, distance, going, weight, draw and trainer/jockey effects. Not verified betting value.'}
 return record,None

def validate_record(record,path=None):
 unsigned=dict(record);saved=unsigned.pop('record_sha256')
 if sha(unsigned)!=saved or (path and path.stem!=saved):raise ValueError('Forecast archive integrity failure')
 if record.get('model')!=MODEL or record.get('publication_gate')!='BLOCKED' or record.get('challenge_eligible')!=0 or record.get('model_validation')!='UNVALIDATED':raise ValueError('Unsafe archived forecast')
 if stamp(record['generated_at_utc'])>=stamp(record['startUTC'])-dt.timedelta(minutes=5):raise ValueError('Forecast captured too late')
 rows=record['runners'];ps=[r['model_probability'] for r in rows]
 if len(rows)<2 or len({r['horse_id'] for r in rows})!=len(rows) or any(type(p) not in (int,float) or not math.isfinite(p) or not 0<p<1 for p in ps) or abs(sum(ps)-1)>1e-8:raise ValueError('Invalid frozen probability vector')
 return record

def signature(record):
 return sha({k:record[k] for k in ('model','race_id','startUTC','parameters','runners')})

def archive_forecasts(data,now,directory):
 check_feed(data,now);existing=[validate_record(json.loads(p.read_text()),p) for p in sorted(directory.glob('*.json'))]
 known={signature(r):r for r in existing};seen=set();current=[];skipped=[];new=[]
 for race in data['races']:
  if race['race_id'] in seen:raise ValueError('Duplicate source race')
  seen.add(race['race_id']);record,reason=forecast(race,now)
  if reason:skipped.append({'race_id':race['race_id'],'reason':reason});continue
  key=signature(record)
  if key in known:current.append(known[key]);continue
  earlier=[r for r in existing if r['race_id']==record['race_id'] and r['startUTC']==record['startUTC']]
  record['revision_of']=max(earlier,key=lambda x:stamp(x['generated_at_utc']))['record_sha256'] if earlier else None
  record['record_sha256']=sha(record);validate_record(record);new.append(record);current.append(record)
 if new:directory.mkdir(parents=True,exist_ok=True)
 for record in new:
  with (directory/(record['record_sha256']+'.json')).open('x') as f:f.write(json.dumps(record,indent=2)+'\n')
 return current,existing+new,{'model':MODEL,'generated_forecasts':len(current),'new_archived_records':len(new),
  'archived_records':len(existing)+len(new),'skipped':skipped,'publication_gate':'BLOCKED','model_validation':'UNVALIDATED'}

def parse_final(raw,record):
 p=PageData();p.feed(raw.decode('utf-8'))
 if p.blocks!=1:raise ValueError('Structured final result missing/ambiguous')
 props=json.loads(''.join(p.parts))['props']['pageProps']
 if props.get('hasError') is not False:raise ValueError('Result page error')
 card=props['race'];s=card['race_summary']
 if str(s['race_summary_reference']['id'])!=record['race_id'] or s['course_name'].casefold()!=record['racecourse'].casefold():raise ValueError('Final result identity mismatch')
 start=dt.datetime.combine(dt.date.fromisoformat(s['date']),dt.time.fromisoformat(s['time']),ZoneInfo('Europe/London')).astimezone(UTC)
 if abs((start-stamp(record['startUTC'])).total_seconds())>60:raise ValueError('Final result kickoff mismatch')
 if s['race_stage']!='WEIGHEDIN':return None,'FINAL_RESULT_NOT_WEIGHED_IN'
 rides=card['rides'];ids=[str(r['horse']['horse_reference']['id']) for r in rides]
 if len(set(ids))!=len(ids):raise ValueError('Duplicate final horse identity')
 if any(r['ride_status'] not in ('RUNNER','NONRUNNER','WITHDRAWN') for r in rides):raise ValueError('Unknown final runner status')
 final_field={str(r['horse']['horse_reference']['id']) for r in rides if r['ride_status']=='RUNNER'}
 frozen_field={r['horse_id'] for r in record['runners']}
 if final_field!=frozen_field:return None,'VOID_FIELD_CHANGED_AFTER_CAPTURE'
 winners=[str(r['horse']['horse_reference']['id']) for r in rides if r['ride_status']=='RUNNER' and r.get('finish_position')==1]
 if len(winners)!=1:return None,'DEAD_HEAT_OR_WINNER_UNRESOLVED'
 return {'winner_horse_id':winners[0],'source_sha256':hashlib.sha256(raw).hexdigest()},None

def fetch_final(record):
 url=urllib.parse.urlsplit(record['source'])
 if url.scheme!='https' or url.hostname!='www.sportinglife.com' or '/racecard/'+record['race_id']+'/' not in url.path:raise ValueError('Unapproved result URL')
 req=urllib.request.Request(record['source'],headers={'User-Agent':'Mozilla/5.0 (compatible; ValueWatchResearch/1.0)'})
 with urllib.request.urlopen(req,timeout=20) as response:
  target=urllib.parse.urlsplit(response.geturl())
  if response.status!=200 or target.hostname!=url.hostname or target.path!=url.path:raise ValueError('Result page redirected or HTTP failure')
  raw=response.read(3000001)
 if not raw or len(raw)>3000000:raise ValueError('Empty/oversized final result')
 (WORK/'result-sources').mkdir(parents=True,exist_ok=True)
 (WORK/'result-sources'/(record['race_id']+'.html')).write_bytes(raw)
 return raw

def score_provisional(records,now,ledger_path,fetch=fetch_final):
 old=json.loads(ledger_path.read_text()) if ledger_path.exists() else {'schema_version':1,'research_only':True,'publication_gate':'BLOCKED','model_validation':'UNVALIDATED','entries':[]}
 if old.get('publication_gate')!='BLOCKED' or old.get('research_only') is not True or old.get('model_validation')!='UNVALIDATED':raise ValueError('Unsafe provisional ledger')
 frozen={r['record_sha256']:r for r in records}
 for entry in old['entries']:
  if entry.get('verification')!='SINGLE_SOURCE_PROVISIONAL' or entry.get('independently_verified') is not False or entry.get('publication_gate')!='BLOCKED' or entry.get('challenge_eligible')!=0:raise ValueError('Unsafe provisional result')
  record=frozen.get(entry['record_sha256'])
  if record is None:raise ValueError('Provisional result has no archived forecast')
  probability=next((x['model_probability'] for x in record['runners'] if x['horse_id']==entry['winner_horse_id']),None)
  if probability is None:raise ValueError('Winner not in frozen field')
  for metric in ('multiclass_brier_score','log_loss','equal_chance_brier_score','equal_chance_log_loss'):
   if type(entry.get(metric)) not in (int,float) or not math.isfinite(entry[metric]) or entry[metric]<0:raise ValueError('Invalid provisional metric')
  n=len(record['runners'])
  if abs(entry['equal_chance_brier_score']-(n-1)/n)>1e-10 or abs(entry['equal_chance_log_loss']-math.log(n))>1e-10:raise ValueError('Reference metric mismatch')
  expected=sum((x['model_probability']-int(x['horse_id']==entry['winner_horse_id']))**2 for x in record['runners'])
  if abs(entry['multiclass_brier_score']-expected)>1e-10 or abs(entry['log_loss']+math.log(probability))>1e-10:raise ValueError('Provisional metrics differ from frozen forecast')
 by_id={e['record_sha256']:e for e in old['entries']}
 if len(by_id)!=len(old['entries']):raise ValueError('Duplicate provisional ledger entries')
 latest={}
 for r in records:
  key=(r['model'],r['race_id'],r['startUTC'])
  if key not in latest or stamp(r['generated_at_utc'])>stamp(latest[key]['generated_at_utc']):latest[key]=r
 pending=[];attempts=0
 for r in latest.values():
  if r['record_sha256'] in by_id:continue
  if now<stamp(r['startUTC'])+dt.timedelta(minutes=30):pending.append({'race_id':r['race_id'],'reason':'WAITING_FOR_FINAL_RESULT'});continue
  if attempts>=30:pending.append({'race_id':r['race_id'],'reason':'DEFERRED_RESULT_BATCH_LIMIT'});continue
  attempts+=1
  try:
   result,reason=parse_final(fetch(r),r)
   if reason:pending.append({'race_id':r['race_id'],'reason':reason});continue
   winner=result['winner_horse_id'];rows=r['runners'];n=len(rows)
   brier=sum((x['model_probability']-int(x['horse_id']==winner))**2 for x in rows)
   probability=next(x['model_probability'] for x in rows if x['horse_id']==winner)
   by_id[r['record_sha256']]={'record_sha256':r['record_sha256'],'race_id':r['race_id'],'racecourse':r['racecourse'],
    'startUTC':r['startUTC'],'model':r['model'],'winner_horse_id':winner,'scored_at_utc':now.isoformat(),
    'multiclass_brier_score':brier,'log_loss':-math.log(probability),
    'equal_chance_brier_score':(n-1)/n,'equal_chance_log_loss':math.log(n),
    'source_receipt':{'url':r['source'],'sha256':result['source_sha256'],'observed_at_utc':now.isoformat()},
    'verification':'SINGLE_SOURCE_PROVISIONAL','independently_verified':False,'challenge_eligible':0,'publication_gate':'BLOCKED'}
  except Exception as exc:pending.append({'race_id':r['race_id'],'reason':'RESULT_SOURCE_UNAVAILABLE_OR_INVALID','error':str(exc)})
 old['entries']=sorted(by_id.values(),key=lambda e:(e['startUTC'],e['record_sha256']))
 ledger_path.parent.mkdir(parents=True,exist_ok=True);ledger_path.write_text(json.dumps(old,indent=2)+'\n')
 # One latest frozen forecast per race/model. Older revisions never add sample size.
 selected={r['record_sha256'] for r in latest.values()}
 entries=[e for e in old['entries'] if e['record_sha256'] in selected]
 metrics={}
 for field in ('multiclass_brier_score','log_loss','equal_chance_brier_score','equal_chance_log_loss'):
  metrics['mean_'+field]=sum(e[field] for e in entries)/len(entries) if entries else None
 return {'scored_forecasts':len(entries),'independently_verified_results':0,'verification':'SINGLE_SOURCE_PROVISIONAL',
  'metrics_status':'DESCRIPTIVE_ONLY_NOT_MODEL_VALIDATION','metrics':metrics,'entries':entries,'pending':pending,
  'selection_policy':'Latest archived forecast per race/model, captured at least five minutes before scheduled start.'}

def main():
 data=json.loads((WORK/'racing-research-data.json').read_text());now=dt.datetime.now(UTC)
 current,archived,audit=archive_forecasts(data,now,ROOT/'research/horse-form-archive/v1')
 performance=score_provisional(archived,now,ROOT/'research/horse-results/v1/provisional.json')
 public={'schema_version':1,'generated_at_utc':now.isoformat(),'research_only':True,'publication_gate':'BLOCKED',
  'model_validation':'UNVALIDATED','official_challenge':'0/100','independent_schedule_verification':'NOT_CONNECTED',
  'race_date_uk':data['race_date_uk'],'runner_audit':data.get('runner_audit'),
  'race_count':len(data['races']),'reference_baseline_audit':data.get('reference_baseline_audit'),
  'form_forecasts':current,'form_model_audit':audit,'performance':performance,
  'limitations':['Exploratory heuristic, not a trained or calibrated AI model.',
   'Restricted to all-weather races with at least three valid prior Flat finishes for every active runner.',
   'Parameters are unvalidated research choices; form alone omits major race factors.',
   'Independent schedule and result verification remain unconnected. Provisional metrics are not verified accuracy.',
   'No verified Sky Bet prices, betting EV, Grade A/B recommendations or official challenge credit.']}
 (WORK/'horse-model-data.json').write_text(json.dumps(public,indent=2)+'\n')
 (WORK/'horse-model-audit.json').write_text(json.dumps({'form_model_audit':audit,'performance':{k:v for k,v in performance.items() if k!='entries'}},indent=2)+'\n')
 print(json.dumps({'form_forecasts':len(current),'new_archived_records':audit['new_archived_records'],'provisional_scored':performance['scored_forecasts'],'independently_verified_results':0}))
if __name__=='__main__':main()
