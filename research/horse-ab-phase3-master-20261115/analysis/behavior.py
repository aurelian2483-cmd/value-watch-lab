"""Bounded descriptive diagnostics; frozen vectors, no fitting or optimisation."""
import json,math,re,statistics as st
from pathlib import Path
from datetime import date
from collections import defaultdict
ROOT=Path(__file__).resolve().parents[1]
SRC=ROOT/'reproduction'/'phase2_snapshot'
OUT=Path(__file__).parent
STAGES=['A0_FULL','A1_NO_DISTANCE','E_NODIST_half_life','E_NODIST_half_life_inverse_temperature']
pred=defaultdict(dict)
for line in (SRC/'results/runner_predictions.jsonl').read_text().splitlines():
 x=json.loads(line)
 if x['candidate'] in STAGES:pred[x['candidate']][x['race_id']]=x
manifest=json.loads((ROOT/'audit/raw76_manifest.json').read_text())['records']
raw={x['race_id']:json.loads((ROOT/'audit/raw76'/f"{x['forecast_sha']}.json").read_text()) for x in manifest}
assert len(raw)==76 and all(set(pred[s])==set(raw) for s in STAGES)
def yardage(s):
 tokens=re.findall(r'(\d+(?:\.\d+)?)\s*([mfy])',s.lower())
 residue=re.sub(r'\d+(?:\.\d+)?\s*[mfy]','',s.lower()).strip()
 return sum(float(n)*{'m':1760,'f':220,'y':1}[u] for n,u in tokens) if tokens and not residue else None
def metrics(x):
 p=x['probabilities'];y=x['outcomes'];win=y.index(1)
 order=sorted(range(len(p)),key=lambda i:(-p[i],i))
 return {'ll':-math.log(p[win]),'brier':sum((a-b)**2 for a,b in zip(p,y)),
         'correct':order[0]==win,'top':order[0],'order':order,'confidence':max(p)}
rows=[]
for rid,x in raw.items():
 assert all(pred[s][rid]['horse_ids']==[r['horse_id'] for r in x['runners']] for s in STAGES)
 assert all(pred[s][rid]['outcomes']==pred[STAGES[0]][rid]['outcomes'] for s in STAGES)
 stage={s:metrics(pred[s][rid]) for s in STAGES}
 y=yardage(x['distance']);surface=str(x.get('surface','')).upper();going=str(x.get('going','')).lower()
 gb='AW' if surface in ['POLYTRACK','TAPETA','FIBRESAND','ALLWEATHER'] else 'soft_heavy_label' if any(w in going for w in ['soft','heavy']) else 'other' if going else 'unmapped'
 cls=str(x['race_class']).strip();cl=int(cls) if cls.isdigit() else None
 histories=[r['context_features']['history'] for r in x['runners']]
 ages=[(date.fromisoformat(x['startUTC'][:10])-max(date.fromisoformat(h['date']) for h in hs)).days for hs in histories]
 med=st.median(ages)
 course=any(h['similarities']['course']==1 for hs in histories for h in hs)
 confidence=stage['A0_FULL']['confidence'];edges=[0,.1,.2,.3,.5,1]
 cb=next(f'{lo:g}to{hi:g}' for lo,hi in zip(edges,edges[1:]) if lo<=confidence<hi or confidence==hi==1)
 rows.append({'race_id':rid,'date':x['startUTC'][:10],'current_distance':x['distance'],'distance_yards':y,
 'distance_bin':'unmapped' if y is None else 'under1mile' if y<1760 else '1to_under2miles' if y<3520 else 'atleast2miles',
 'going_label':x['going'],'surface':surface,'going_bin':gb,'race_class':cls,
 'class_bin':'unknown' if cl is None else 'atmost3' if cl<=3 else '4to5' if cl<=5 else 'atleast6',
 'any_same_course_history':course,'median_latest_history_age_days':med,
 'last_run_bin':'under30days' if med<30 else '30to90days' if med<=90 else 'over90days',
 'A_confidence_bin':cb,'stages':stage})
def summary(rs):
 a='A0_FULL';b=STAGES[-1]
 return {'races':len(rs),'dates':len({r['date'] for r in rs}),'small_bin_below10':len(rs)<10,
 'a_winners':sum(r['stages'][a]['correct'] for r in rs),'b_winners':sum(r['stages'][b]['correct'] for r in rs),
 'a_log_loss':st.mean(r['stages'][a]['ll'] for r in rs) if rs else None,
 'b_log_loss':st.mean(r['stages'][b]['ll'] for r in rs) if rs else None,
 'b_minus_a_ll':st.mean(r['stages'][b]['ll']-r['stages'][a]['ll'] for r in rs) if rs else None,
 'b_minus_a_brier':st.mean(r['stages'][b]['brier']-r['stages'][a]['brier'] for r in rs) if rs else None}
fixed_bins={'distance_bin':['under1mile','1to_under2miles','atleast2miles','unmapped'],
 'going_bin':['AW','soft_heavy_label','other','unmapped'],
 'class_bin':['atmost3','4to5','atleast6','unknown'],
 'any_same_course_history':[False,True],
 'last_run_bin':['under30days','30to90days','over90days'],
 'A_confidence_bin':['0to0.1','0.1to0.2','0.2to0.3','0.3to0.5','0.5to1']}
groups={axis:{str(v):summary([r for r in rows if r[axis]==v]) for v in values} for axis,values in fixed_bins.items()}
decomposition=[]
for a,b in zip(STAGES,STAGES[1:]):
 changed=[r for r in rows if r['stages'][a]['top']!=r['stages'][b]['top']]
 reorder=[r for r in rows if r['stages'][a]['order']!=r['stages'][b]['order']]
 ll=st.mean(r['stages'][b]['ll']-r['stages'][a]['ll'] for r in rows)
 decomposition.append({'from':a,'to':b,'races':76,'firstchoice_changes':len(changed),
 'full_order_changes':len(reorder),'a_winners':sum(r['stages'][a]['correct'] for r in rows),
 'b_winners':sum(r['stages'][b]['correct'] for r in rows),'mean_incremental_ll':ll,
 'mean_incremental_brier':st.mean(r['stages'][b]['brier']-r['stages'][a]['brier'] for r in rows),
 'firstchoice_changed_ids':[r['race_id'] for r in changed]})
assert decomposition[-1]['firstchoice_changes']==decomposition[-1]['full_order_changes']==0
out={'status':'RETROSPECTIVE_DESCRIPTIVE_NO_OPTIMISATION','prospective_scored_races':0,
 'all':summary(rows),'fixed_groups':groups,'ordered_change_decomposition':decomposition,
 'definitions':{'going':'AW by explicit surface first; otherwise any soft/heavy substring including in-places labels; other nonempty or unmapped empty. Not a severity measure.',
 'course':'Any runner has any used history with course similarity exactly1; not every runner or a measured course advantage.',
 'last_run':'Median across runners of days between target date and most recent used historic date; not an independent fitness measurement.',
 'ranking':'Descending frozen probability; archive runner order breaks exact ties. Beta stage invariant.',
 'scope':'All bins partition exact same76races per axis; overlaps between axes are confounded. Small-bin flag n<10 is descriptive. No p-values or subgroup retuning.'},'rows':rows}
(OUT/'behavior.json').write_text(json.dumps(out,indent=2)+'\n')
md='# Frozen A/B behaviour and subgroup diagnostics\n\nRetrospective only: same76 previously inspected races; **zero prospective scored races**. No parameters or subgroup rules were fitted.\n\n'
md+='## Ordered changes\n\n| Change | First-choice changes | Full ranking changes | Winners before/after | Incremental log loss | Incremental Brier |\n|---|---:|---:|---:|---:|---:|\n'
for d in decomposition:md+=f"|{d['from']} to {d['to']}|{d['firstchoice_changes']}|{d['full_order_changes']}|{d['a_winners']}/{d['b_winners']}|{d['mean_incremental_ll']:.7f}|{d['mean_incremental_brier']:.7f}|\n"
md+='\nThis is an order-dependent arithmetic decomposition, not causal attribution. Distance removal and recency changes interact; the selected beta changes confidence and scores while preserving ranks. Previous outcome-based selection remains.\n\n## Fixed descriptive bins\n\n'
for axis,bins in groups.items():
 md+=f'### {axis}\n\n| Bin | Races | Dates | A/B winners | B minus A log loss | B minus A Brier | Small bin |\n|---|---:|---:|---:|---:|---:|---|\n'
 for name,d in bins.items():
  ll='empty' if d['b_minus_a_ll'] is None else format(d['b_minus_a_ll'],'.7f')
  br='empty' if d['b_minus_a_brier'] is None else format(d['b_minus_a_brier'],'.7f')
  md+=f"|{name}|{d['races']}|{d['dates']}|{d['a_winners']}/{d['b_winners']}|{ll}|{br}|{'yes' if d['small_bin_below10'] else 'no'}|\n"
 md+='\n'
md+='## Definitions and limits\n\n'+'\n\n'.join(f'{k}: {v}' for k,v in out['definitions'].items())+'\n\nThe evidence does not establish causality, independently calibrated probabilities, a subgroup advantage, betting EV or profitability. No deployment or promotion follows. Exact raw labels, row identities and all frozen-stage scores are retained in behavior.json.\n'
(OUT/'BEHAVIOR_REPORT.md').write_text(md,encoding='utf-8')
print(json.dumps({k:v for k,v in out.items() if k not in ['rows','definitions']},indent=2))
