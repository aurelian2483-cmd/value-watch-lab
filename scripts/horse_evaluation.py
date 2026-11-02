#!/usr/bin/env python3
"""Race-level paired model/reference evaluation. Never upgrades validation status."""
import hashlib
import json
import math
import random

def paired_interval(values,repeats=1000):
 if len(values)<30:return None
 seed=int(hashlib.sha256(json.dumps(values).encode()).hexdigest()[:16],16)
 rng=random.Random(seed);n=len(values);means=sorted(sum(values[rng.randrange(n)] for _ in range(n))/n for _ in range(repeats))
 return {'lower':means[int(.025*repeats)],'upper':means[int(.975*repeats)-1],
  'method':'Paired bootstrap resampling whole races; 1000 replicates',
  'limitation':'Exploratory descriptive interval; not independent model validation.'}

def evaluate(records,entries):
 frozen={r['record_sha256']:r for r in records};groups={};seen=set()
 for e in entries:
  r=frozen.get(e['record_sha256'])
  if r is None:raise ValueError('Scored outcome lacks a frozen forecast')
  key=(r['model'],r['race_id'],r['startUTC'])
  if key in seen:raise ValueError('More than one scored revision per race/model')
  seen.add(key)
  if not all(type(e.get(k)) in (int,float) and math.isfinite(e[k]) and e[k]>=0 for k in ('multiclass_brier_score','log_loss','equal_chance_brier_score','equal_chance_log_loss')):raise ValueError('Invalid scored metric')
  groups.setdefault(r['model'],[]).append((r,e))
 result={}
 edges=[0,.05,.1,.15,.2,.3,.5,1.000000001]
 for name,rows in groups.items():
  calibration=[]
  for lo,hi in zip(edges,edges[1:]):
   probabilities=[];wins=0
   for r,e in rows:
    for runner in r['runners']:
     p=runner['model_probability']
     if lo<=p<hi:probabilities.append(p);wins+=int(runner['horse_id']==e['winner_horse_id'])
   if probabilities:calibration.append({'lower':lo,'upper':min(hi,1),'runner_observations':len(probabilities),
    'mean_model_probability':sum(probabilities)/len(probabilities),'observed_win_frequency':wins/len(probabilities)})
  n=len(rows);b=[e['multiclass_brier_score']-e['equal_chance_brier_score'] for _,e in rows];l=[e['log_loss']-e['equal_chance_log_loss'] for _,e in rows]
  result[name]={'scored_races':n,'status':'INSUFFICIENT_SAMPLE' if n<30 else 'DESCRIPTIVE_ONLY_NOT_MODEL_VALIDATION',
   'mean_brier_delta_vs_equal_chance':sum(b)/n,'mean_log_loss_delta_vs_equal_chance':sum(l)/n,
   'brier_delta_bootstrap_95_interval':paired_interval(b),'log_loss_delta_bootstrap_95_interval':paired_interval(l),
   'calibration_bins':calibration,'calibration_note':'Runner observations within a race are dependent. Calibration bins are descriptive; uncertainty resamples whole races.'}
 return {'protocol_version':'RACE_LEVEL_PAIRED_EVALUATION_V1','models':result,
  'minimum_races_for_exploratory_intervals':30,'prospective_review_target_races':100,
  'threshold_note':'30 and 100 are research review milestones, not validation or profitability guarantees.',
  'comparison':'Paired form-model minus equal-chance score on the same frozen field; negative values favour the form model.',
  'model_validation':'UNVALIDATED'}
