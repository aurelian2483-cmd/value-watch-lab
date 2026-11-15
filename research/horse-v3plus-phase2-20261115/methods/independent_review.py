"""Independent score recomputation from frozen probabilities and date sensitivity."""
import csv,json,math,statistics,hashlib
from collections import defaultdict
from pathlib import Path
P=Path(__file__).resolve().parents[1]
R=P/'results'
data=defaultdict(dict)
for line in (R/'runner_predictions.jsonl').read_text().splitlines():
    x=json.loads(line);c=x['candidate'];rid=x['race_id']
    assert rid not in data[c]
    ps=x['probabilities'];ys=x['outcomes']
    assert len(ps)==len(ys)==len(x['horse_ids'])
    assert sum(ys)==1 and abs(sum(ps)-1)<1e-12 and all(0<p<1 for p in ps)
    win=ys.index(1);top=ps.index(max(ps))
    data[c][rid]={'date':x['date'],'ll':-math.log(ps[win]),
        'brier':sum((p-y)**2 for p,y in zip(ps,ys)), 'top1':int(top==win),
        'top_index':top,'probabilities':ps}
assert all(set(v)==set(data['A0_FULL']) and len(v)==76 for v in data.values())
summary=json.loads((R/'metrics_and_uncertainty.json').read_text())
maxerr=0.
for split,items in summary.items():
    for c,m in items.items():
        rows=list(data[c].values())
        if split=='development':rows=[r for r in rows if r['date']<='2026-11-10']
        elif split=='later_diagnostic_not_untouched':rows=[r for r in rows if r['date']>'2026-11-10']
        for k,z in [('log_loss','ll'),('brier','brier')]:
            err=abs(statistics.mean(r[z] for r in rows)-m[k]);maxerr=max(err,maxerr);assert err<1e-12
        assert sum(r['top1'] for r in rows)==m['first_winners']
for row in csv.DictReader((R/'race_comparisons.csv').open()):
    check=data[row['candidate']][row['race_id']]
    assert abs(float(row['log_loss'])-check['ll'])<1e-12
    assert abs(float(row['brier'])-check['brier'])<1e-12
    assert int(row['first_winner'])==check['top1']
defs=json.loads((R/'candidate_definitions.json').read_text())
baseline=defs['A0_FULL']
invariant=[]
for c,cfg in defs.items():
    changed=[k for k,v in cfg.items() if v!=baseline[k]]
    if changed in [['inverse_temperature'],['link']]:
        assert all(r['top_index']==data['A0_FULL'][rid]['top_index'] for rid,r in data[c].items())
        invariant.append(c)
selection=json.loads((R/'selection.json').read_text())
dev=lambda c:statistics.mean(r['ll'] for r in data[c].values() if r['date']<='2026-11-10')
expected=min(data,key=lambda c:(dev(c),c!='A0_FULL',list(data).index(c)))
assert expected==selection['development_selected_final_candidate']
walk=json.loads((R/'walk_forward_diagnostic.json').read_text())
for fold in walk['folds']:
    day=fold['date'];fixed=selection['fixed_candidates']
    previous=lambda c:statistics.mean(r['ll'] for r in data[c].values() if r['date']<day)
    assert min(fixed,key=lambda c:(previous(c),c!='A0_FULL',fixed.index(c)))==fold['selected']
lodo={}
days=sorted(set(r['date'] for r in data['A0_FULL'].values()))
for c,rows in data.items():
    deltas={rid:r['ll']-data['A0_FULL'][rid]['ll'] for rid,r in rows.items()}
    dropped={day:statistics.mean(d for rid,d in deltas.items() if rows[rid]['date']!=day) for day in days}
    full=statistics.mean(deltas.values())
    lodo[c]={'full_delta':full,'leave_one_date_out':dropped,
        'min':min(dropped.values()),'max':max(dropped.values()),
        'conclusion_sign_reverses':any(x*full<0 for x in dropped.values()),
        'worst_date_mean_delta':max(statistics.mean(d for rid,d in deltas.items() if rows[rid]['date']==day) for day in days),
        'best_date_mean_delta':min(statistics.mean(d for rid,d in deltas.items() if rows[rid]['date']==day) for day in days)}
(P/'methods'/'leave_one_date_out.json').write_text(json.dumps(lodo,indent=2)+'\n')
receipt={'status':'PASS','candidates':len(data),'race_predictions_checked':sum(map(len,data.values())),
    'maximum_mean_metric_error':maxerr,'rank_invariance_candidates':invariant,
    'development_winner_independently_confirmed':expected,
    'walk_forward_choices_independently_confirmed':len(walk['folds']),
    'probability_file_sha256':hashlib.sha256((R/'runner_predictions.jsonl').read_bytes()).hexdigest(),
    'scope':'Independent scoring/normalization/selection/timeline check, not independent data provenance or outcome validation.'}
(P/'methods'/'independent_review_receipt.json').write_text(json.dumps(receipt,indent=2)+'\n')
print(json.dumps(receipt,indent=2))
print(json.dumps({c:lodo[c] for c in [expected,'S1_MIDPOINT','S2_CENTERED_LOGIT']},indent=2))
