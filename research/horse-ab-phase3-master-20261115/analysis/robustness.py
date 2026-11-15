"""Frozen retrospective A/B diagnostics only; no model selection or future scoring."""
import json,math,statistics as st
from pathlib import Path
from collections import defaultdict
P=Path(__file__).resolve().parents[1]
OUT=Path(__file__).parent
src=P/'reproduction'/'phase2_snapshot'
B=json.loads((src/'results/selection.json').read_text())['development_selected_final_candidate']
pred=defaultdict(dict)
for line in (src/'results/runner_predictions.jsonl').read_text().splitlines():
 x=json.loads(line)
 if x['candidate'] in ['A0_FULL',B]:pred[x['candidate']][x['race_id']]=x
raw=json.loads((src/'inputs/derived_inputs.json').read_text())['races']
types=json.loads((src/'inputs/race_types.json').read_text())
rows=[]
for race in raw:
 rid=race['race_id'];a=pred['A0_FULL'][rid];b=pred[B][rid]
 assert a['horse_ids']==b['horse_ids'] and a['outcomes']==b['outcomes']
 win=a['outcomes'].index(1);ia=a['probabilities'].index(max(a['probabilities']));ib=b['probabilities'].index(max(b['probabilities']))
 def metric(x):
  return -math.log(x['probabilities'][win]),sum((p-y)**2 for p,y in zip(x['probabilities'],x['outcomes']))
 la,ba=metric(a);lb,bb=metric(b)
 h=[h for r in race['runners'] for h in r['history']]
 missing=sum(x['similarities']['going'] is None for x in h)/len(h)
 evidence=[d['recency_evidence'] for d in a['diagnostics']]
 rows.append(dict(race_id=rid,date=race['startUTC'][:10],discipline=types[rid],field_size=len(a['horse_ids']),
   field_bin='under8' if len(a['horse_ids'])<8 else '8to12' if len(a['horse_ids'])<=12 else 'over12',
   disagree=ia!=ib,a_correct=ia==win,b_correct=ib==win,a_log_loss=la,b_log_loss=lb,
   ll_delta=lb-la,a_brier=ba,b_brier=bb,brier_delta=bb-ba,
   a_top=max(a['probabilities']),b_top=max(b['probabilities']),
   any_a_evidence_below1=any(e<1 for e in evidence),mean_a_evidence=st.mean(evidence),
   missing_going_fraction=missing,missing_going_bin='none' if missing==0 else 'some_to_half' if missing<=.5 else 'over_half'))
def summary(rs):
 return {'races':len(rs),'dates':len({r['date'] for r in rs}),
   'a_winners':sum(r['a_correct'] for r in rs),'b_winners':sum(r['b_correct'] for r in rs),
   'a_log_loss':st.mean(r['a_log_loss'] for r in rs) if rs else None,
   'b_log_loss':st.mean(r['b_log_loss'] for r in rs) if rs else None,
   'mean_b_minus_a_log_loss':st.mean(r['ll_delta'] for r in rs) if rs else None,
   'a_brier':st.mean(r['a_brier'] for r in rs) if rs else None,
   'b_brier':st.mean(r['b_brier'] for r in rs) if rs else None,
   'mean_b_minus_a_brier':st.mean(r['brier_delta'] for r in rs) if rs else None,
   'mean_going_missing_fraction':st.mean(r['missing_going_fraction'] for r in rs) if rs else None,
   'a_mean_top_probability':st.mean(r['a_top'] for r in rs) if rs else None,
   'b_mean_top_probability':st.mean(r['b_top'] for r in rs) if rs else None}
groups={}
for axis in ['disagree','field_bin','discipline','any_a_evidence_below1','missing_going_bin']:
 groups[axis]={str(v):summary([r for r in rows if r[axis]==v]) for v in sorted({r[axis] for r in rows},key=str)}
byday=defaultdict(list)
for r in rows:byday[r['date']].append(r['ll_delta'])
delta=st.mean(r['ll_delta'] for r in rows);sd=st.stdev(r['ll_delta'] for r in rows)
# Intercept-only cluster-robust SE of race-weighted mean; small-G caution applies.
g=len(byday);n=len(rows)
clusterse=math.sqrt(g/(g-1)*sum((sum(v)-len(v)*delta)**2 for v in byday.values())/n**2)
iidse=sd/math.sqrt(n)
design=(clusterse/iidse)**2
target=abs(delta)
planning={'observed_retrospective_paired_ll_sd':sd,'observed_mean_b_minus_a':delta,
 'iid_standard_error_76':iidse,'date_cluster_standard_error_76':clusterse,
 'estimated_design_effect':design,
 'iid_95_halfwidth_at500':1.96*sd/math.sqrt(500),
 'cluster_scaled_95_halfwidth_at500':1.96*sd*math.sqrt(design/500),
 'iid_80pct_power_detectable_difference_at500':(1.96+.841621)*sd/math.sqrt(500),
 'cluster_scaled_80pct_power_detectable_difference_at500':(1.96+.841621)*sd*math.sqrt(design/500),
 'conservative_planning_design_effect':max(1,design),
 'design_effect_scenarios':{str(de):{'iid_scaled95_halfwidth500':1.96*sd*math.sqrt(de/500),'scaled80pct_MDE500':(1.96+.841621)*sd*math.sqrt(de/500)} for de in [1,2,4]},
 'iid_n_for_observed_effect_80pct_power':((1.96+.841621)*sd/target)**2,
 'formula':'n ~= ((z_(1-alpha/2)+z_power)*sigma_delta/delta_target)^2; precision ~= z*sigma_delta/sqrt(n)',
 'assumptions':'Normal approximation, stable paired variance, independent races for iid; cluster scaling assumes historical dependence carries forward. Only12 dates and post-selection sample, so not a validated power calculation.',
 'planning_target_races':500,'planning_target_distinct_dates':60,'prospective_scored_races':0,
 'planning_target_is_proof':False}
out={'status':'RETROSPECTIVE_DESCRIPTIVE_ONLY','A':'A0_FULL','B':B,'all':summary(rows),'groups':groups,
 'firstchoice_outcome_table':{'both_correct':sum(r['a_correct'] and r['b_correct'] for r in rows),
 'only_a_correct':sum(r['a_correct'] and not r['b_correct'] for r in rows),
 'only_b_correct':sum(not r['a_correct'] and r['b_correct'] for r in rows),
 'neither_correct':sum(not r['a_correct'] and not r['b_correct'] for r in rows)},
 'planning':planning,'market_comparison':{'performed':False,'reason':'Old32race benchmark is distinct V1, not A/B; exact AB/odds row matching not verified. No identified paired eligible odds; no EV or ROI.'},
 'rows':rows}
existing=json.loads((src/'results/metrics_and_uncertainty.json').read_text())['all_exploratory']
out['frozen_calibration']={c:{k:existing[c][k] for k in ['top_label_calibration','pooled_runner_calibration','race_balanced_runner_bins']} for c in ['A0_FULL',B]}
(OUT/'robustness.json').write_text(json.dumps(out,indent=2)+'\n')
print(json.dumps({k:v for k,v in out.items() if k!='rows'},indent=2))
