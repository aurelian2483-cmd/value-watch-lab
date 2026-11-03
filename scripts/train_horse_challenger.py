"""Chronological pilot training. Test outcomes never select hyperparameters."""
import argparse
import datetime as dt
import json
from pathlib import Path
import numpy as np
from scipy.optimize import minimize
from horse_challenger import FEATURES,FEATURE_VERSION,MODEL,feature_rows,probabilities,sha
from horse_model_pipeline import form_features,PARAMETERS

def loss(beta,races,l2=0,gradient=False):
 beta=np.asarray(beta,dtype=float)
 value=0.;grad=np.zeros(len(beta))
 for r in races:
  x=np.asarray(r['features']);z=x@beta;m=z.max();ex=np.exp(z-m);p=ex/ex.sum();y=r['winner_index']
  value+=m+np.log(ex.sum())-z[y];grad+=x.T@p-x[y]
 value=(value+l2*np.dot(beta,beta)/2)/len(races);grad=(grad+l2*beta)/len(races)
 return (value,grad) if gradient else value
def fit(rows,l2):
 result=minimize(lambda b:loss(b,rows,l2,True),np.zeros(len(FEATURES)),jac=True,method='L-BFGS-B',options={'maxiter':1000,'ftol':1e-12})
 if not result.success:raise ValueError('Optimization failed: '+result.message)
 return result.x.tolist()
def metrics(rows,beta):
 result={}
 for method in ('challenger','form_baseline','uniform'):
  scores=[]
  for r in rows:
   n=len(r['features']);y=r['winner_index'];p=probabilities(r['features'],beta) if method=='challenger' else r['baseline'] if method=='form_baseline' else [1/n]*n
   scores.append({'race_id':r['race_id'],'date':r['date'],'log_loss':float(-np.log(p[y])),'brier':sum((v-int(i==y))**2 for i,v in enumerate(p)),'winner_probability':p[y]})
  result[method]={'races':len(scores),'mean_log_loss':float(np.mean([v['log_loss'] for v in scores])),'mean_brier':float(np.mean([v['brier'] for v in scores])),'race_scores':scores}
 return result
def main():
 p=argparse.ArgumentParser();p.add_argument('--input',required=True);p.add_argument('--output',required=True);a=p.parse_args()
 data=json.loads(Path(a.input).read_text());rows=[];excluded=[]
 for r in data['races']:
  x=feature_rows(r);h=[form_features(v,dt.date.fromisoformat(r['date'])) for v in r['runners']]
  if x is None or any(v is None for v in h):excluded.append(r['race_id']);continue
  baseline=probabilities([[v['shrunk_form_strength']]+[0]*(len(FEATURES)-1) for v in h],[2]+[0]*(len(FEATURES)-1))
  rows.append({'race_id':r['race_id'],'date':r['date'],'course':r['racecourse'],'source':r['source'],'source_sha256':r['source_sha256'],'observed_at_utc':r['observed_at_utc'],'horse_ids':[v['horse_id'] for v in r['runners']],'features':x,'baseline':baseline,'winner_index':next(i for i,v in enumerate(r['runners']) if v['finish_position']==1)})
 train=[r for r in rows if r['date']<'2026-10-01'];validation=[r for r in rows if '2026-10-01'<=r['date']<'2026-10-16'];test=[r for r in rows if r['date']>='2026-10-16']
 if min(len(train),len(validation),len(test))<10:raise ValueError(f'Insufficient complete races: {len(train)}/{len(validation)}/{len(test)}')
 tuning=[]
 for l2 in (.1,1,10,100):
  b=fit(train,l2);tuning.append({'l2':l2,'validation_log_loss':loss(b,validation)})
 chosen=min(tuning,key=lambda r:r['validation_log_loss'])['l2'];beta=fit(train+validation,chosen)
 output=Path(a.output);output.mkdir(parents=True,exist_ok=True)
 dataset={'schema_version':1,'feature_version':FEATURE_VERSION,'features':FEATURES,'sampling_design':data['design'],'evidence_type':data['evidence_type'],'source_limitations':data['limitations'],'requested_dates':data['requested_dates'],'collection_errors':data['errors'],'excluded_incomplete_race_ids':excluded,'races':rows}
 dataset['dataset_sha256']=sha(dataset);(output/'features-v1.json').write_text(json.dumps(dataset,indent=2)+'\n')
 report=metrics(test,beta)
 model={'schema_version':1,'model':MODEL,'feature_version':FEATURE_VERSION,'features':FEATURES,'coefficients':beta,'l2':chosen,'training_data_last_date':max(r['date'] for r in train+validation),'dataset_sha256':dataset['dataset_sha256'],'training_design':{'train_before':'2026-10-01','validation_before':'2026-10-16','test_from':'2026-10-16','train_races':len(train),'validation_races':len(validation),'test_races':len(test),'tuning':tuning,'refit':'Train plus validation only after L2 selection; test never used in fitting.'},'retrospective_test':report,'model_validation':'UNVALIDATED','publication_gate':'BLOCKED','research_only':True,'limitations':data['limitations']+['Small fixed-date sample; no calibration claim or evidence of betting profitability.','Final-field reconstruction is not a prospective test. Test is single-publisher and exploratory.','Feature definitions and L2 grid fixed before inspecting test metrics. Further tuning requires a new untouched test period.','No SP/odds, editorial ratings or target-race results are used as features.','No going-specific, trainer/jockey or draw model. Course is a sparse past-performance feature only.']}
 model['promotion_status']='NOT_PROMOTED_FAILED_RETROSPECTIVE_COMPARISON' if any(report['challenger'][metric]>=report['form_baseline'][metric] or report['challenger'][metric]>=report['uniform'][metric] for metric in ('mean_log_loss','mean_brier')) else 'RESEARCH_ONLY_PENDING_PROSPECTIVE_VALIDATION'
 model['artifact_sha256']=sha(model);(output/'model-v1.json').write_text(json.dumps(model,indent=2)+'\n')
 print(json.dumps({'collected':len(data['races']),'eligible':len(rows),'split':model['training_design'],'test':{k:{a:b for a,b in v.items() if a!='race_scores'} for k,v in report.items()}}))
if __name__=='__main__':main()
