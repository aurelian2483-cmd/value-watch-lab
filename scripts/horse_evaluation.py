#!/usr/bin/env python3
"""Race-level paired model/reference evaluation. Never upgrades validation status."""
import hashlib
import json
import math
import random
import datetime as dt
import urllib.parse

def parameter_fingerprint(record):
 """Parameter identity is derived, never added to or changed in frozen records."""
 return hashlib.sha256(json.dumps(record.get('parameters'),sort_keys=True,separators=(',',':'),allow_nan=False).encode()).hexdigest()

def paired_interval(values,repeats=1000):
 if len(values)<30:return None
 # Input file ordering must not alter uncertainty for the same race deltas.
 values=sorted(values)
 seed=int(hashlib.sha256(json.dumps(values).encode()).hexdigest()[:16],16)
 rng=random.Random(seed);n=len(values);means=sorted(sum(values[rng.randrange(n)] for _ in range(n))/n for _ in range(repeats))
 return {'lower':means[int(.025*repeats)],'upper':means[int(.975*repeats)-1],
  'method':'Paired bootstrap resampling whole races; 1000 replicates',
  'limitation':'Exploratory descriptive interval; not independent model validation.'}

def evaluate(records,entries):
 frozen={};groups={};seen=set()
 for record in records:
  digest=record['record_sha256']
  if digest in frozen and frozen[digest]!=record:
   raise ValueError('Conflicting frozen records share an archive identity')
  frozen[digest]=record
 for e in entries:
  r=frozen.get(e['record_sha256'])
  if r is None:raise ValueError('Scored outcome lacks a frozen forecast')
  key=(r['model'],r['race_id'],r['startUTC'])
  if key in seen:raise ValueError('More than one scored revision per race/model')
  seen.add(key)
  if not all(type(e.get(k)) in (int,float) and math.isfinite(e[k]) and e[k]>=0 for k in ('multiclass_brier_score','log_loss','equal_chance_brier_score','equal_chance_log_loss')):raise ValueError('Invalid scored metric')
  ids=[str(row['horse_id']) for row in r['runners']]
  ps=[row['model_probability'] for row in r['runners']]
  winner=str(e['winner_horse_id'])
  if len(set(ids))!=len(ids) or winner not in ids or any(type(p) not in (int,float) or not math.isfinite(p) or not 0<p<1 for p in ps) or abs(sum(ps)-1)>1e-8:raise ValueError('Invalid evaluation vector or winner')
  expected_brier=sum((p-int(h==winner))**2 for h,p in zip(ids,ps))
  if abs(e['multiclass_brier_score']-expected_brier)>1e-10 or abs(e['log_loss']+math.log(ps[ids.index(winner)]))>1e-10:raise ValueError('Evaluation score does not match frozen vector')
  n=len(r['runners'])
  if n<2 or abs(e['equal_chance_brier_score']-(n-1)/n)>1e-10 or abs(e['equal_chance_log_loss']-math.log(n))>1e-10:raise ValueError('Uniform benchmark does not match frozen field')
  groups.setdefault((r['model'],parameter_fingerprint(r)),[]).append((r,e))
 result={}
 edges=[0,.05,.1,.15,.2,.3,.5,1.000000001]
 for (name,fingerprint),rows in groups.items():
  calibration=[]
  for lo,hi in zip(edges,edges[1:]):
   probabilities=[];wins=0
   for r,e in rows:
    for runner in r['runners']:
     p=runner['model_probability']
     if lo<=p<hi:probabilities.append(p);wins+=int(str(runner['horse_id'])==str(e['winner_horse_id']))
   if probabilities:calibration.append({'lower':lo,'upper':min(hi,1),'runner_observations':len(probabilities),
    'mean_model_probability':sum(probabilities)/len(probabilities),'observed_win_frequency':wins/len(probabilities)})
  n=len(rows);b=[e['multiclass_brier_score']-e['equal_chance_brier_score'] for _,e in rows];l=[e['log_loss']-e['equal_chance_log_loss'] for _,e in rows]
  key=name if sum(model==name for model,_ in groups)==1 else name+'@'+fingerprint
  result[key]={'model':name,'parameter_sha256':fingerprint,'scored_races':n,'status':'INSUFFICIENT_SAMPLE' if n<30 else 'DESCRIPTIVE_ONLY_NOT_MODEL_VALIDATION',
   'mean_brier_delta_vs_equal_chance':sum(b)/n,'mean_log_loss_delta_vs_equal_chance':sum(l)/n,
   'brier_delta_bootstrap_95_interval':paired_interval(b),'log_loss_delta_bootstrap_95_interval':paired_interval(l),
   'calibration_bins':calibration,'calibration_note':'Runner observations within a race are dependent. Calibration bins are descriptive; uncertainty resamples whole races.'}
 return {'protocol_version':'RACE_LEVEL_PAIRED_EVALUATION_V2','models':result,
  'minimum_races_for_exploratory_intervals':30,'prospective_review_target_races':100,
  'threshold_note':'30 and 100 are research review milestones, not validation or profitability guarantees.',
  'comparison':'Paired form-model minus equal-chance score on the same frozen field; negative values favour the form model.',
  'model_validation':'UNVALIDATED'}

def _instant(value):
 if not isinstance(value,str):raise ValueError('Timestamp string required')
 stamp=dt.datetime.fromisoformat(value.replace('Z','+00:00'))
 if stamp.tzinfo is None:raise ValueError('Timezone required')
 return stamp.astimezone(dt.timezone.utc)

def _validated_score(record,entry):
 """Comparison requires a source-backed, reproducible score, not a bare winner."""
 if record.get('research_only') is not True or record.get('publication_gate')!='BLOCKED' or record.get('model_validation')!='UNVALIDATED' or record.get('challenge_eligible')!=0:raise ValueError('Unsafe forecast')
 if entry.get('verification')!='SINGLE_SOURCE_PROVISIONAL' or entry.get('independently_verified') is not False or entry.get('publication_gate')!='BLOCKED' or entry.get('challenge_eligible')!=0:raise ValueError('Unsafe outcome')
 if any(entry.get(k)!=record[k] for k in ('record_sha256','race_id','racecourse','startUTC','model')):raise ValueError('Outcome identity mismatch')
 kickoff=_instant(record['startUTC']);frozen=_instant(record['generated_at_utc'])
 if frozen>=kickoff-dt.timedelta(minutes=5):raise ValueError('Late capture')
 receipt=entry['source_receipt'];url=urllib.parse.urlsplit(receipt['url'])
 digest=receipt.get('sha256','')
 if receipt['url']!=record['source'] or url.scheme!='https' or url.hostname!='www.sportinglife.com' or len(digest)!=64 or any(c not in '0123456789abcdef' for c in digest):raise ValueError('Invalid source receipt')
 observed=_instant(receipt['observed_at_utc']);scored=_instant(entry['scored_at_utc'])
 if observed<kickoff:raise ValueError('Outcome observed before start')
 if scored<observed:raise ValueError('Score precedes outcome observation')
 rows=record['runners'];ids=[str(r['horse_id']) for r in rows];ps=[r['model_probability'] for r in rows]
 if len(rows)<2 or len(set(ids))!=len(rows) or any(type(p) not in (int,float) or not math.isfinite(p) or not 0<p<1 for p in ps) or abs(sum(ps)-1)>1e-8:raise ValueError('Invalid vector')
 winner=str(entry['winner_horse_id'])
 if winner not in ids:raise ValueError('Winner outside field')
 brier=sum((p-int(h==winner))**2 for h,p in zip(ids,ps));loss=-math.log(ps[ids.index(winner)])
 for key,expected in [('multiclass_brier_score',brier),('log_loss',loss)]:
  value=entry.get(key)
  if type(value) not in (int,float) or not math.isfinite(value) or abs(value-expected)>1e-10:raise ValueError('Score mismatch')
 return set(ids),winner,brier,loss

def compare_models(context_records,context_entries,baseline_records,baseline_entries):
 """Latest scored revisions, paired on identical event, final field and winner.

 Freeze times may differ; this is not a controlled same-information experiment.
 Baseline archives lack surface/discipline fields: strata use the matched context
 observation, and the known AW-only baseline never supplies turf/jump evidence.
 """
 exclusions={};pairs=[];groups={}
 def exclude(reason):exclusions[reason]=exclusions.get(reason,0)+1
 def latest(records):
  out={}
  for r in records:
   key=(str(r['race_id']),_instant(r['startUTC']),str(r['racecourse']).casefold())
   if key not in out or _instant(r['generated_at_utc'])>_instant(out[key]['generated_at_utc']):out[key]=r
  return out
 contexts=latest(context_records);baselines=latest(baseline_records)
 def entries_by_id(entries):
  out={}
  for e in entries:
   if e['record_sha256'] in out:raise ValueError('Duplicate scored revision')
   out[e['record_sha256']]=e
  return out
 ce=entries_by_id(context_entries);be=entries_by_id(baseline_entries)
 for key,c in contexts.items():
  b=baselines.get(key)
  if b is None:exclude('NO_MATCHING_BASELINE_FORECAST');continue
  c_entry=ce.get(c['record_sha256']);b_entry=be.get(b['record_sha256'])
  if c_entry is None or b_entry is None:exclude('LATEST_REVISION_NOT_SCORED');continue
  try:
   ci,cw,cb,cl=_validated_score(c,c_entry);bi,bw,bb,bl=_validated_score(b,b_entry)
  except (ValueError,KeyError,TypeError,OverflowError):exclude('INVALID_OR_UNSUPPORTED_RESULT_EVIDENCE');continue
  if ci!=bi:exclude('FROZEN_FIELDS_DIFFER');continue
  if cw!=bw:exclude('RESULT_WINNERS_DISAGREE');continue
  if c.get('model')!='CONTEXT_FORM_RESEARCH_V1' or b.get('model')!='FORM_PERCENTILE_SOFTMAX_RESEARCH_V1':exclude('UNEXPECTED_MODEL_IDENTITY');continue
  surface=str(c.get('surface','')).upper().replace(' ','').replace('_','')
  if c.get('run_type')!='FLAT' or surface not in ('ALLWEATHER','AW','POLYTRACK','TAPETA','FIBRESAND'):exclude('BASELINE_OUTSIDE_RECORDED_SCOPE');continue
  cp,bp=parameter_fingerprint(c),parameter_fingerprint(b)
  pair={'race_id':c['race_id'],'racecourse':c['racecourse'],'startUTC':c['startUTC'],'discipline':c['run_type'],'surface':'ALL_WEATHER',
   'context_record_sha256':c['record_sha256'],'baseline_record_sha256':b['record_sha256'],
   'context_frozen_at_utc':c['generated_at_utc'],'baseline_frozen_at_utc':b['generated_at_utc'],
   'freeze_time_difference_seconds':abs((_instant(c['generated_at_utc'])-_instant(b['generated_at_utc'])).total_seconds()),
   'context_parameter_sha256':cp,'baseline_parameter_sha256':bp,'winner_horse_id':cw,
   'brier_delta_context_minus_baseline':cb-bb,'log_loss_delta_context_minus_baseline':cl-bl}
  pairs.append(pair);groups.setdefault((c['run_type'],'ALL_WEATHER',cp,bp),[]).append(pair)
 summaries=[]
 for (discipline,surface,cp,bp),rows in sorted(groups.items()):
  b=[r['brier_delta_context_minus_baseline'] for r in rows];l=[r['log_loss_delta_context_minus_baseline'] for r in rows]
  summaries.append({'discipline':discipline,'surface':surface,'context_parameter_sha256':cp,'baseline_parameter_sha256':bp,
   'paired_races':len(rows),'status':'INSUFFICIENT_SAMPLE' if len(rows)<30 else 'DESCRIPTIVE_ONLY_NOT_MODEL_VALIDATION',
   'mean_brier_delta_context_minus_baseline':sum(b)/len(b),'mean_log_loss_delta_context_minus_baseline':sum(l)/len(l),
   'brier_delta_bootstrap_95_interval':paired_interval(b),'log_loss_delta_bootstrap_95_interval':paired_interval(l)})
 return {'protocol_version':'CONTEXT_VS_FORM_PAIRED_V1','model_validation':'UNVALIDATED','research_only':True,'publication_gate':'BLOCKED',
  'status':'NO_ELIGIBLE_PAIRS' if not pairs else 'DESCRIPTIVE_ONLY_NOT_MODEL_VALIDATION','matched_races':len(pairs),
  'groups':summaries,'pairs':sorted(pairs,key=lambda r:(r['startUTC'],r['race_id'])),'exclusions':exclusions,
  'comparison':'Context minus original form baseline on identical frozen fields and observed winners; negative deltas favour context.',
  'limitations':['Different capture times and conditions may confound comparisons; freeze times are shown for each pair.',
   'The original baseline covers all-weather flat racing only. No paired turf or jump performance is available from it.',
   'Single-publisher provisional results may change. This is neither independent validation nor a market/odds/ROI comparison.',
   'Parameter fingerprints separate configurations. Small samples and selective full-field coverage limit conclusions.']}
