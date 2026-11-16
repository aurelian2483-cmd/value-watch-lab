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
RESULT_RECHECK_POLICY={'window_hours':48,'cadence_hours':6,'maximum_fetches_per_run':30}

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
  'schedule_cross_checked':race.get('schedule_cross_checked') is True,'secondary_schedule_receipt':race.get('secondary_schedule_receipt'),
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
 latest={}
 for r in existing:
  key=(r['model'],r['race_id'],r['startUTC'])
  if key not in latest or stamp(r['generated_at_utc'])>stamp(latest[key]['generated_at_utc']):latest[key]=r
 seen=set();current=[];skipped=[];new=[]
 for race in data['races']:
  if race['race_id'] in seen:raise ValueError('Duplicate source race')
  seen.add(race['race_id']);record,reason=forecast(race,now)
  if reason:skipped.append({'race_id':race['race_id'],'reason':reason});continue
  previous=latest.get((record['model'],record['race_id'],record['startUTC']))
  if previous and signature(record)==signature(previous):current.append(previous);continue
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

def validate_scored_entries(scored_entries,frozen):
 for entry in scored_entries:
  if entry.get('verification')!='SINGLE_SOURCE_PROVISIONAL' or entry.get('independently_verified') is not False or entry.get('publication_gate')!='BLOCKED' or entry.get('challenge_eligible')!=0:raise ValueError('Unsafe provisional result')
  record=frozen.get(entry['record_sha256'])
  if record is None:raise ValueError('Provisional result has no archived forecast')
  if any(entry.get(k)!=record[k] for k in ('race_id','racecourse','startUTC','model')):raise ValueError('Provisional result identity mismatch')
  receipt=entry.get('source_receipt',{});url=urllib.parse.urlsplit(receipt.get('url',''))
  if receipt.get('url')!=record['source'] or url.scheme!='https' or url.hostname!='www.sportinglife.com' or len(receipt.get('sha256',''))!=64 or any(c not in '0123456789abcdef' for c in receipt.get('sha256','')):raise ValueError('Invalid provisional source receipt')
  probability=next((x['model_probability'] for x in record['runners'] if x['horse_id']==entry['winner_horse_id']),None)
  if probability is None:raise ValueError('Winner not in frozen field')
  for metric in ('multiclass_brier_score','log_loss','equal_chance_brier_score','equal_chance_log_loss'):
   if type(entry.get(metric)) not in (int,float) or not math.isfinite(entry[metric]) or entry[metric]<0:raise ValueError('Invalid provisional metric')
  n=len(record['runners'])
  if abs(entry['equal_chance_brier_score']-(n-1)/n)>1e-10 or abs(entry['equal_chance_log_loss']-math.log(n))>1e-10:raise ValueError('Reference metric mismatch')
  expected=sum((x['model_probability']-int(x['horse_id']==entry['winner_horse_id']))**2 for x in record['runners'])
  if abs(entry['multiclass_brier_score']-expected)>1e-10 or abs(entry['log_loss']+math.log(probability))>1e-10:raise ValueError('Provisional metrics differ from frozen forecast')

def result_entry(record,result,now):
 winner=result['winner_horse_id'];rows=record['runners'];n=len(rows)
 probability=next(x['model_probability'] for x in rows if x['horse_id']==winner)
 return {'record_sha256':record['record_sha256'],'race_id':record['race_id'],'racecourse':record['racecourse'],
  'startUTC':record['startUTC'],'model':record['model'],'winner_horse_id':winner,'scored_at_utc':now.isoformat(),
  'multiclass_brier_score':sum((x['model_probability']-int(x['horse_id']==winner))**2 for x in rows),
  'log_loss':-math.log(probability),'equal_chance_brier_score':(n-1)/n,'equal_chance_log_loss':math.log(n),
  'source_receipt':{'url':record['source'],'sha256':result['source_sha256'],'observed_at_utc':now.isoformat()},
  'verification':'SINGLE_SOURCE_PROVISIONAL','independently_verified':False,'challenge_eligible':0,'publication_gate':'BLOCKED'}

def apply_result_amendments(originals,amendments,frozen):
 current=dict(originals);last=None;last_observed=None
 for amendment in amendments:
  body=dict(amendment);digest=body.pop('amendment_sha256',None)
  if digest!=sha(body) or amendment.get('previous_amendment_sha256')!=last:raise ValueError('Result amendment chain integrity failure')
  key=amendment['record_sha256']
  if key not in originals or amendment.get('previous_entry')!=current.get(key):raise ValueError('Result amendment previous state mismatch')
  observed=stamp(amendment['observed_at_utc']);receipt=amendment.get('source_receipt',{})
  if observed<stamp(originals[key]['scored_at_utc']) or (last_observed and observed<last_observed):raise ValueError('Result amendment chronology failure')
  if receipt.get('url')!=frozen[key]['source'] or receipt.get('observed_at_utc')!=amendment['observed_at_utc'] or len(str(receipt.get('sha256','')))!=64 or any(c not in '0123456789abcdef' for c in str(receipt.get('sha256',''))):raise ValueError('Invalid result amendment receipt')
  last_observed=observed
  if amendment['action']=='WITHHOLD':
   if amendment.get('replacement_entry') is not None or not amendment.get('reason'):raise ValueError('Invalid withheld result amendment')
   current.pop(key,None)
  elif amendment['action']=='REPLACE':
   replacement=amendment['replacement_entry'];validate_scored_entries([replacement],frozen)
   if replacement['record_sha256']!=key or replacement['scored_at_utc']!=amendment['observed_at_utc'] or replacement['source_receipt']!=receipt:raise ValueError('Result amendment identity mismatch')
   current[key]=replacement
  else:raise ValueError('Unknown result amendment action')
  last=digest
 return current

def score_provisional(records,now,ledger_path,fetch=fetch_final):
 old=json.loads(ledger_path.read_text()) if ledger_path.exists() else {'schema_version':1,'research_only':True,'publication_gate':'BLOCKED','model_validation':'UNVALIDATED','entries':[]}
 if old.get('publication_gate')!='BLOCKED' or old.get('research_only') is not True or old.get('model_validation')!='UNVALIDATED':raise ValueError('Unsafe provisional ledger')
 frozen={r['record_sha256']:r for r in records}
 validate_scored_entries(old['entries'],frozen)
 originals={e['record_sha256']:e for e in old['entries']}
 if len(originals)!=len(old['entries']):raise ValueError('Duplicate provisional ledger entries')
 amendments=old.get('amendments',[])
 if not isinstance(amendments,list):raise ValueError('Invalid result amendments')
 by_id=apply_result_amendments(originals,amendments,frozen)
 latest={}
 for r in records:
  key=(r['model'],r['race_id'],r['startUTC'])
  if key not in latest or stamp(r['generated_at_utc'])>stamp(latest[key]['generated_at_utc']):latest[key]=r
 retry_counts=old.get('result_attempt_counts',{});rechecks=old.get('result_rechecks',{})
 if not isinstance(retry_counts,dict) or any(not isinstance(k,str) or type(v) is not int or v<0 for k,v in retry_counts.items()):raise ValueError('Invalid result retry counters')
 if not isinstance(rechecks,dict):raise ValueError('Invalid result recheck metadata')
 for key,check in rechecks.items():
  if key not in originals or not isinstance(check,dict):raise ValueError('Orphan result recheck')
  observed=stamp(check['checked_at_utc'])
  if observed>now+dt.timedelta(minutes=5) or observed<stamp(originals[key]['scored_at_utc']):raise ValueError('Invalid result recheck chronology')
 pending=[];attempts=0
 def amend(record,replacement,reason,source_hash):
  key=record['record_sha256'];body={'record_sha256':key,'observed_at_utc':now.isoformat(),
   'action':'REPLACE' if replacement else 'WITHHOLD','reason':reason,'previous_entry':by_id.get(key),
   'replacement_entry':replacement,'source_receipt':{'url':record['source'],'sha256':source_hash,'observed_at_utc':now.isoformat()},'previous_amendment_sha256':amendments[-1]['amendment_sha256'] if amendments else None}
  body['amendment_sha256']=sha(body);amendments.append(body)
  if replacement:by_id[key]=replacement
  else:by_id.pop(key,None)
 # Persisted fair ordering shares one bounded fetch budget between new results and due rechecks.
 for r in sorted(latest.values(),key=lambda r:(retry_counts.get(r['record_sha256'],0),r['startUTC'],r['record_sha256'])):
  key=r['record_sha256'];is_recheck=key in originals
  if is_recheck:
   if now>stamp(r['startUTC'])+dt.timedelta(hours=RESULT_RECHECK_POLICY['window_hours']):continue
   last=stamp(rechecks.get(key,{}).get('checked_at_utc',originals[key]['scored_at_utc']))
   if now-last<dt.timedelta(hours=RESULT_RECHECK_POLICY['cadence_hours']):continue
  elif now<stamp(r['startUTC'])+dt.timedelta(minutes=30):pending.append({'race_id':r['race_id'],'reason':'WAITING_FOR_FINAL_RESULT'});continue
  if attempts>=RESULT_RECHECK_POLICY['maximum_fetches_per_run']:pending.append({'race_id':r['race_id'],'reason':'DEFERRED_RESULT_BATCH_LIMIT'});continue
  attempts+=1;retry_counts[key]=retry_counts.get(key,0)+1
  try:raw=fetch(r)
  except Exception as exc:
   pending.append({'race_id':r['race_id'],'reason':'RESULT_SOURCE_UNAVAILABLE_OR_INVALID','error':str(exc)})
   if is_recheck:rechecks[key]={'checked_at_utc':now.isoformat(),'status':'SOURCE_UNAVAILABLE_PREVIOUS_PROVISIONAL_RETAINED' if key in by_id else 'SOURCE_UNAVAILABLE_RESULT_REMAINS_WITHHELD'}
   continue
  try:result,reason=parse_final(raw,r)
  except Exception as exc:result=None;reason='INVALID_RESULT_SOURCE';pending.append({'race_id':r['race_id'],'reason':reason,'error':str(exc)})
  if result is None:
   pending.append({'race_id':r['race_id'],'reason':reason})
   if is_recheck:
    rechecks[key]={'checked_at_utc':now.isoformat(),'status':'WITHHELD_LATEST_SOURCE_UNSUPPORTED','reason':reason}
    if key in by_id:amend(r,None,reason,hashlib.sha256(raw).hexdigest())
   continue
  entry=result_entry(r,result,now)
  if not is_recheck:
   originals[key]=entry;by_id[key]=entry
  else:
   previous=by_id.get(key)
   if previous is None or previous['winner_horse_id']!=entry['winner_horse_id']:amend(r,entry,'SOURCE_RESULT_CORRECTION' if previous else 'SOURCE_RESULT_RESTORED',result['source_sha256'])
   rechecks[key]={'checked_at_utc':now.isoformat(),'status':'LATEST_SOURCE_CONFIRMED','source_receipt':entry['source_receipt']}
 old['result_attempt_counts']=retry_counts;old['result_rechecks']=rechecks;old['amendments']=amendments
 # First scores are retained unchanged; corrections are append-only amendments.
 old['entries']=sorted(originals.values(),key=lambda e:(e['startUTC'],e['record_sha256']))
 ledger_path.parent.mkdir(parents=True,exist_ok=True);ledger_path.write_text(json.dumps(old,indent=2)+'\n')
 selected={r['record_sha256'] for r in latest.values()}
 entries=[{**e,'result_recheck_status':rechecks.get(key,{}).get('status','NOT_RECHECKED'),
  'result_last_checked_at_utc':rechecks.get(key,{}).get('checked_at_utc',e['scored_at_utc'])} for key,e in by_id.items() if key in selected]
 metrics={}
 for field in ('multiclass_brier_score','log_loss','equal_chance_brier_score','equal_chance_log_loss'):
  metrics['mean_'+field]=sum(e[field] for e in entries)/len(entries) if entries else None
 return {'scored_forecasts':len(entries),'independently_verified_results':0,'verification':'SINGLE_SOURCE_PROVISIONAL',
  'metrics_status':'DESCRIPTIVE_ONLY_NOT_MODEL_VALIDATION','metrics':metrics,'entries':entries,'pending':pending,
  'amendment_count':len(amendments),'withheld_results':sum(key in originals and key not in by_id for key in selected),
  'correction_policy':RESULT_RECHECK_POLICY,'source_unavailable_rechecks':sum(e['result_recheck_status']=='SOURCE_UNAVAILABLE_PREVIOUS_PROVISIONAL_RETAINED' for e in entries),
  'selection_policy':'Latest archived forecast per race/model, captured at least five minutes before scheduled start.'}

def settled_history(records,performance,limit=20):
 by_id={r['record_sha256']:r for r in records}
 corroborated={e['record_sha256'] for e in performance.get('cross_source_entries',[])}
 rows=[]
 for entry in sorted(performance['entries'],key=lambda e:(e['startUTC'],e['record_sha256']),reverse=True)[:limit]:
  record=by_id[entry['record_sha256']]
  runners=[{k:r[k] for k in ('horse_id','name','model_probability','equal_chance_reference')} for r in record['runners']]
  rows.append({**{k:record[k] for k in ('record_sha256','race_id','racecourse','race_name','startUTC','generated_at_utc','model')},
   'runners':runners,'winner_horse_id':entry['winner_horse_id'],
   'result_verification':'TWO_PUBLISHER_CORROBORATED' if entry['record_sha256'] in corroborated else 'SINGLE_SOURCE_PROVISIONAL',
   'result_recheck_status':entry.get('result_recheck_status','NOT_RECHECKED'),'result_last_checked_at_utc':entry.get('result_last_checked_at_utc',entry.get('scored_at_utc')),
   'publication_gate':'BLOCKED','model_validation':'UNVALIDATED','research_only':True})
 return rows

def race_cycle(data,current,now):
 upcoming=[r for r in data['races'] if stamp(r['startUTC'])>now]
 return {'checked_at_utc':now.isoformat(),'race_date_uk':data['race_date_uk'],'collection_scope':'CURRENT_UK_DAY_ONLY',
  'upcoming_observed_races':len(upcoming),'upcoming_form_forecasts':len(current),
  'next_observed_start_utc':min((r['startUTC'] for r in upcoming),default=None),
  'status':'UPCOMING_FORECASTS_AVAILABLE' if current else 'NO_SUPPORTED_UPCOMING_FORECASTS' if upcoming else 'COLLECTED_CARD_FINISHED'}

def current_field_checks(data,forecasts,now):
 races={r['race_id']:r for r in data['races']};checks={}
 for f in forecasts:
  r=races.get(f['race_id']);status='RUNNER_OBSERVATION_UNAVAILABLE';observed=None;ids=[]
  if r and r.get('runner_data_status')=='SINGLE_SOURCE_RUNNERS_OBSERVED':
   observed=r.get('runner_observed_at_utc');ids=sorted(x['horse_id'] for x in r['runners'] if x.get('active_runner') is True)
   age=now-stamp(observed)
   if not dt.timedelta(0)<=age<=dt.timedelta(minutes=PARAMETERS['maximum_runner_age_minutes']):status='STALE_RUNNER_OBSERVATION'
   elif ids!=sorted(x['horse_id'] for x in f['runners']):status='FIELD_DIFFERS_FROM_FROZEN_FORECAST'
   elif abs((stamp(r['startUTC'])-stamp(f['startUTC'])).total_seconds())>60:status='SCHEDULE_CHANGED'
   else:status='FRESH_MATCHING_FIELD'
  checks[f['record_sha256']]={'status':status,'runner_observed_at_utc':observed,'active_runner_ids':ids,'active_runner_count':len(ids),'checked_at_utc':now.isoformat()}
 return checks

def main():
 data=json.loads((WORK/'racing-research-data.json').read_text());now=dt.datetime.now(UTC)
 current,archived,audit=archive_forecasts(data,now,ROOT/'research/horse-form-archive/v1')
 performance=score_provisional(archived,now,ROOT/'research/horse-results/v1/provisional.json')
 from horse_secondary_source import corroborate
 from horse_evaluation import evaluate
 secondary_path=WORK/'secondary-result-cache.json'
 secondary_rows=json.loads(secondary_path.read_text()) if secondary_path.exists() else []
 by_id={r['record_sha256']:r for r in archived};corroborated=[];verification_pending=[]
 for entry in performance['entries']:
  evidence,reason=corroborate(by_id[entry['record_sha256']],entry,secondary_rows)
  if evidence:corroborated.append({**entry,'cross_source_evidence':evidence})
  else:verification_pending.append({'race_id':entry['race_id'],'reason':reason})
 performance['cross_source_verified_results']=len(corroborated)
 performance['cross_source_entries']=corroborated
 performance['cross_source_pending']=verification_pending
 performance['provisional_evaluation']=evaluate(archived,performance['entries'])
 performance['cross_source_evaluation']=evaluate(archived,corroborated)
 performance['verification_note']='Two publishers corroborate race identity, full final field and winner. Independent underlying data origin is not established.'
 public={'schema_version':1,'generated_at_utc':now.isoformat(),'research_only':True,'publication_gate':'BLOCKED',
  'model_validation':'UNVALIDATED','official_challenge':'0/100','independent_schedule_verification':'UNDERLYING_ORIGIN_NOT_ATTESTED',
  'secondary_source_audit':data.get('secondary_source_audit',{'connection_status':'NOT_CONFIGURED'}),
  'race_date_uk':data['race_date_uk'],'runner_audit':data.get('runner_audit'),
  'race_count':len(data['races']),'reference_baseline_audit':data.get('reference_baseline_audit'),
  'form_forecasts':current,'form_model_audit':audit,'performance':performance,
  'current_field_checks':current_field_checks(data,current,now),
  'settled_forecasts':settled_history(archived,performance),'settled_history_limit':20,'race_cycle_audit':race_cycle(data,current,now),
  'limitations':['Exploratory heuristic, not a trained or calibrated AI model.',
   'Restricted to all-weather races with at least three valid prior Flat finishes for every active runner.',
   'Parameters are unvalidated research choices; form alone omits major race factors.',
   'Second-publisher matches are reported separately; underlying data-origin independence and historical availability remain unattested. Provisional metrics are not verified accuracy.',
   'No verified Sky Bet prices, betting EV, Grade A/B recommendations or official challenge credit.']}
 (WORK/'horse-model-data.json').write_text(json.dumps(public,indent=2)+'\n')
 (WORK/'horse-model-audit.json').write_text(json.dumps({'form_model_audit':audit,'performance':{k:v for k,v in performance.items() if k!='entries'}},indent=2)+'\n')
 print(json.dumps({'form_forecasts':len(current),'new_archived_records':audit['new_archived_records'],'provisional_scored':performance['scored_forecasts'],'independently_verified_results':0}))
if __name__=='__main__':main()
