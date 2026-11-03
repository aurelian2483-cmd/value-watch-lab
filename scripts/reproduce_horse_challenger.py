"""Offline reproduction from the committed feature matrix (numpy/scipy required)."""
import json
from pathlib import Path
from horse_challenger import ROOT,FEATURE_VERSION,sha,validate_model
from train_horse_challenger import fit,loss,metrics

def main():
 root=ROOT/'research/horse-challenger';d=json.loads((root/'features-v1.json').read_text());unsigned=dict(d);digest=unsigned.pop('dataset_sha256')
 if sha(unsigned)!=digest or d['feature_version']!=FEATURE_VERSION:raise ValueError('Feature data integrity failure')
 m=validate_model(json.loads((root/'model-v1.json').read_text()))
 if m['dataset_sha256']!=digest:raise ValueError('Model/dataset mismatch')
 rows=d['races'];train=[r for r in rows if r['date']<'2026-10-01'];val=[r for r in rows if '2026-10-01'<=r['date']<'2026-10-16'];test=[r for r in rows if r['date']>='2026-10-16']
 choices=[(loss(fit(train,l2),val),l2) for l2 in (.1,1,10,100)];chosen=min(choices)[1]
 if chosen!=m['l2']:raise ValueError('Tuning result differs')
 beta=fit(train+val,chosen)
 if max(abs(a-b) for a,b in zip(beta,m['coefficients']))>1e-6:raise ValueError('Learned coefficients differ')
 scores=metrics(test,beta)
 for method in scores:
  for key in ('mean_brier','mean_log_loss'):
   if abs(scores[method][key]-m['retrospective_test'][method][key])>1e-7:raise ValueError('Test scores differ')
 print(json.dumps({'status':'REPRODUCED','feature_races':len(rows),'test_races':len(test),'promotion_status':m['promotion_status']}))
if __name__=='__main__':main()
