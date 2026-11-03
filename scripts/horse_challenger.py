"""Learned conditional-logit challenger; separate from immutable form baseline."""
import datetime as dt
import json
import math
import re
from pathlib import Path
from zoneinfo import ZoneInfo
from horse_model_pipeline import (ROOT, WORK, UTC, canon, sha, stamp, forecast,
 check_feed, score_provisional, current_field_checks, settled_history)

MODEL='AW_CONDITIONAL_LOGIT_PILOT_V1'
FEATURE_VERSION='AW_CONTEXT_FEATURES_V1'
FEATURES=['official_rating','weight_lbs','shrunk_form','last_finish','surface_form',
 'distance_form','course_form','class_change','log_days_since_run','rating_change']
AW={'newcastle','wolverhampton','southwell','lingfield','chelmsford city','kempton','dundalk'}

def number(x):
 try:
  v=float(x)
  return v if math.isfinite(v) else None
 except (TypeError,ValueError):return None
def yards(s):
 matches=re.findall(r'(\d+(?:\.\d+)?)\s*([mfy])',str(s).lower())
 return sum(float(v)*{'m':1760,'f':220,'y':1}[u] for v,u in matches) or None
def pounds(s):
 m=re.fullmatch(r'(\d+)-(\d+)',str(s).strip())
 return 14*int(m[1])+int(m[2]) if m and int(m[2])<14 else None
def history(r,day):
 out=[];seen=set()
 for p in sorted(r.get('previous_results',[]),key=lambda p:p.get('date',''),reverse=True):
  try:
   age=(day-dt.date.fromisoformat(p['date'])).days;pos=p['position'];n=p['runner_count'];rid=str(p['race_id'])
   if rid in seen or not 0<age<=730 or p.get('run_type')!='FLAT' or type(pos)!=int or type(n)!=int or not 1<=pos<=n or n<2:continue
   seen.add(rid);out.append((p,(n-pos)/(n-1),2**(-age/90),age))
   if len(out)==4:break
  except (KeyError,ValueError,TypeError):continue
 return out
def shrunk(rows):
 return sum(w*(v-.5) for _,v,w,_ in rows)/(5+sum(w for _,_,w,_ in rows))
def feature_rows(race):
 day=dt.date.fromisoformat(race.get('date') or stamp(race['startUTC']).astimezone(ZoneInfo('Europe/London')).date().isoformat())
 target=yards(race.get('distance'));cls=number(race.get('race_class'));rows=[]
 for r in race['runners']:
  h=history(r,day)
  if len(h)<3 or number(r.get('official_rating')) is None or pounds(r.get('weight')) is None or target is None or cls is None:return None
  previous_rating=number(h[0][0].get('bha'));prior_class=number(h[0][0].get('race_class'))
  # Missing previous rating/class is neutral, never borrowed from a later race.
  rows.append([number(r['official_rating'])/10,pounds(r['weight'])/10,shrunk(h),h[0][1]-.5,
   shrunk([p for p in h if str(p[0].get('going','')).casefold().startswith('standard')]),
   shrunk([p for p in h if yards(p[0].get('distance')) and abs(yards(p[0]['distance'])/target-1)<=.2]),
   shrunk([p for p in h if p[0].get('course_name','').casefold()==race['racecourse'].casefold()]),
   0 if prior_class is None else prior_class-cls,math.log1p(h[0][3])/5,
   0 if previous_rating is None else (number(r['official_rating'])-previous_rating)/10])
 # Race centering removes field-level constants without fitted global normalization.
 means=[sum(x[j] for x in rows)/len(rows) for j in range(len(FEATURES))]
 return [[v-means[j] for j,v in enumerate(x)] for x in rows]
def probabilities(rows,coefficients):
 if len(coefficients)!=len(FEATURES) or any(not math.isfinite(v) for v in coefficients):raise ValueError('Invalid model coefficients')
 z=[sum(a*b for a,b in zip(row,coefficients)) for row in rows];top=max(z)
 ex=[math.exp(x-top) for x in z];return [v/sum(ex) for v in ex]
def validate_model(model):
 unsigned=dict(model);digest=unsigned.pop('artifact_sha256',None)
 if digest!=sha(unsigned) or model['model']!=MODEL or model['feature_version']!=FEATURE_VERSION or model['features']!=FEATURES:raise ValueError('Model artifact mismatch')
 if model.get('publication_gate')!='BLOCKED' or model.get('model_validation')!='UNVALIDATED':raise ValueError('Unsafe challenger artifact')
 probabilities([[0]*len(FEATURES)],model['coefficients'])
 return model
def validate_record(record,path=None):
 unsigned=dict(record);digest=unsigned.pop('record_sha256',None)
 if digest!=sha(unsigned) or (path and path.stem!=digest):raise ValueError('Challenger archive integrity failure')
 if record.get('model')!=MODEL or record.get('publication_gate')!='BLOCKED' or record.get('model_validation')!='UNVALIDATED' or record.get('challenge_eligible')!=0:raise ValueError('Unsafe challenger record')
 if stamp(record['generated_at_utc'])>=stamp(record['startUTC'])-dt.timedelta(minutes=5):raise ValueError('Challenger captured too late')
 ps=[r['model_probability'] for r in record['runners']]
 if len(ps)<2 or len(set(r['horse_id'] for r in record['runners']))!=len(ps) or any(not math.isfinite(p) or not 0<p<1 for p in ps) or abs(sum(ps)-1)>1e-8:raise ValueError('Invalid challenger vector')
 return record
def main():
 data=json.loads((WORK/'racing-research-data.json').read_text());now=dt.datetime.now(UTC);check_feed(data,now)
 model=validate_model(json.loads((ROOT/'research/horse-challenger/model-v1.json').read_text()))
 directory=ROOT/'research/horse-challenger/archive/v1';directory.mkdir(parents=True,exist_ok=True)
 records=[validate_record(json.loads(p.read_text()),p) for p in sorted(directory.glob('*.json'))]
 latest={}
 for r in records:
  key=(r['race_id'],r['startUTC'],r['model_artifact_sha256'])
  if key not in latest or stamp(r['generated_at_utc'])>stamp(latest[key]['generated_at_utc']):latest[key]=r
 current=[];skipped=[]
 for race in data['races']:
  if race.get('racecourse','').casefold() not in AW-{'dundalk'} or 'handicap' not in race.get('name','').casefold():
   skipped.append({'race_id':race['race_id'],'reason':'OUTSIDE_GB_AW_HANDICAP_TRAINING_SCOPE'});continue
  base,reason=forecast(race,now)
  if reason:skipped.append({'race_id':race['race_id'],'reason':reason});continue
  if stamp(base['startUTC']).date().isoformat()<=model['training_data_last_date']:raise ValueError('Training overlaps live forecast')
  active={r['horse_id']:r for r in race['runners'] if r['active_runner']}
  ordered=[active[r['horse_id']] for r in base['runners']]
  rows=feature_rows({**race,'runners':ordered})
  if rows is None:skipped.append({'race_id':race['race_id'],'reason':'CONTEXT_FEATURES_INCOMPLETE'});continue
  ps=probabilities(rows,model['coefficients'])
  r={**base,'model':MODEL,'parameters':{'feature_version':FEATURE_VERSION,'model_artifact_sha256':model['artifact_sha256']},
   'model_artifact_sha256':model['artifact_sha256'],'training_data_last_date':model['training_data_last_date'],
   'limitation':'Trained retrospective pilot; calibration and prospective improvement are unproven. No market prices, trainer/jockey effects or learned draw bias. Not verified betting value.'}
  r['runners']=[{**v,'model_probability':p,'baseline_form_weight':v['model_probability'],'context_features':x} for v,p,x in zip(base['runners'],ps,rows)]
  key=(r['race_id'],r['startUTC'],model['artifact_sha256']);previous=latest.get(key)
  signature=lambda v:sha({k:v[k] for k in ('parameters','runners')})
  if previous and signature(previous)==signature(r):r=previous
  else:
   r['revision_of']=previous['record_sha256'] if previous else None;r['record_sha256']=sha(r);validate_record(r)
   with (directory/(r['record_sha256']+'.json')).open('x') as f:f.write(json.dumps(r,indent=2)+'\n')
   records.append(r)
  current.append(r)
 performance=score_provisional(records,now,ROOT/'research/horse-challenger/results-v1.json')
 public={'schema_version':1,'generated_at_utc':now.isoformat(),'research_only':True,'model_validation':'UNVALIDATED','publication_gate':'BLOCKED','official_challenge':'0/100','model':model,'forecasts':current,'skipped':skipped,'current_field_checks':current_field_checks(data,current,now),'performance':performance,'settled_forecasts':settled_history(records,performance)}
 (WORK/'horse-challenger-data.json').write_text(json.dumps(public,indent=2)+'\n')
 print(json.dumps({'challenger_forecasts':len(current),'archived':len(records),'scored':performance['scored_forecasts']}))
if __name__=='__main__':main()
