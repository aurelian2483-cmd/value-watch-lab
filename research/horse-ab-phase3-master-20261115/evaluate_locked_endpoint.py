"""Fixed-horizon statistical view; never changes frozen models or observations.

The core ledger's all-observed summary is descriptive. This module applies the
registered endpoint without selecting a favourable date or dropping bad scores.
"""
import json
from datetime import timedelta
from pathlib import Path
import phase3_ab as ab

def select_endpoint(rows,registered,as_of):
    horizon=registered+timedelta(days=180)
    ordered=sorted(rows,key=lambda r:(ab.stamp(r['startUTC']),r['race_id']))
    inside=[r for r in ordered if registered<ab.stamp(r['startUTC'])<=horizon]
    excluded=[{'race_id':r['race_id'],'reason':'OUTSIDE_REGISTERED_180DAY_WINDOW'} for r in ordered if not registered<ab.stamp(r['startUTC'])<=horizon]
    dates=sorted({r['date'] for r in inside});stop=None
    for i,day in enumerate(dates):
        if i+1>=60 and sum(r['date']<=day for r in inside)>=500:
            stop=day;break
    selected=[r for r in inside if stop is None or r['date']<=stop]
    after=[{'race_id':r['race_id'],'reason':'AFTER_FIXED_ENDPOINT_DATE'} for r in inside if stop and r['date']>stop]
    return {'rows':selected,'stop_date':stop,'fixed_endpoint_reached':stop is not None,
            'horizon_end_utc':horizon.isoformat(),'horizon_elapsed':as_of>horizon,
            'excluded_from_confirmatory_window':excluded+after,
            'status':'FIXED_ENDPOINT_DESCRIPTIVE_PENDING_INDEPENDENT_REVIEW' if stop else 'INCOMPLETE_MAXIMUM_HORIZON' if as_of>horizon else 'ACCUMULATING_NOT_VALIDATED'}

def evaluate(root):
    root=ab.safe_root(root);now=ab.utcnow();_,observed=ab.analyze(root,now)
    fs=dict(ab.objects(root,'forecasts'))
    rows=[r|{'startUTC':fs[r['forecast_sha256']]['startUTC']} for r in observed['race_rows']]
    selected=select_endpoint(rows,ab.stamp(observed['registration']['registered_at_utc']),now)
    eligible=selected['rows']
    a=ab.summarize([r['A']|{'runners':r['runners']} for r in eligible]);b=ab.summarize([r['B']|{'runners':r['runners']} for r in eligible])
    result={'schema':1,'analysis_kind':'LOCKED_PRIMARY_WINDOW','as_of_utc':now.isoformat(),**selected,'A':a,'B':b,
       'mean_B_minus_A_log_loss':sum(r['delta_log_loss'] for r in eligible)/len(eligible) if eligible else None,
       'mean_B_minus_A_brier':sum(r['delta_brier'] for r in eligible)/len(eligible) if eligible else None,
       'log_loss_interval':ab.day_interval(eligible,'delta_log_loss'),'brier_interval':ab.day_interval(eligible,'delta_brier'),
       'promotion_review_ready':False,'decision':'KEEP_BASELINE_CONTINUE_RESEARCH',
       'note':'No automatic promotion; independently reviewed source truth, timestamp attestation, fixed-endpoint precision/calibration and external reviewer remain mandatory. All-observed ledger analysis is not the fixed-window primary analysis.',**ab.GUARDS}
    digest=ab.store_object(root,'analyses',result);return digest,result

if __name__=='__main__':
    digest,result=evaluate(ab.ROOT/'state');print(json.dumps({'analysis_sha256':digest,**result},indent=2))
