"""Value Watch Phase2; standard-library Python; retrospective research only.

python run_phase2.py --root . --bootstrap 10000
Reuses Phase1 results; does NOT execute the16-mask ablation.
"""
import argparse
import csv
import hashlib
import itertools
import json
import math
import random
import statistics as st
from collections import Counter, defaultdict
from datetime import datetime, timezone
from pathlib import Path

SEED = 20261115
BASE = dict(distance=True, half_life=90, prior=5, inverse_temperature=2,
            percentile='original', link='linear')

def mean(x):
    x = list(x)
    return sum(x)/len(x) if x else None

def write_json(p, obj):
    p.write_text(json.dumps(obj, indent=2, allow_nan=False)+'\n', encoding='utf-8')

def digest(p):
    return hashlib.sha256(p.read_bytes()).hexdigest()

def quantile(a, q):
    a = sorted(a)
    t = (len(a)-1)*q
    i = int(t)
    return a[i] + (a[min(i+1,len(a)-1)]-a[i])*(t-i)

def predict(race, cfg, original_outcomes):
    logits=[]
    diagnostics=[]
    for runner in race['runners']:
        history=runner['history']
        recency=[]
        weights=[]
        values=[]
        for h in history:
            age=(datetime.fromisoformat(race['startUTC']).date()-datetime.fromisoformat(h['date']).date()).days
            r=1.0 if cfg['half_life'] is None else 2**(-age/cfg['half_life'])
            bonuses={'distance':1.0 if cfg['distance'] else 0.0, 'going':1.0,'class':.5,'course':.5}
            c=1+sum(a*(h['similarities'][k] or 0) for k,a in bonuses.items())
            y=h['finish_percentile']
            if cfg['percentile']=='midpoint':
                o=original_outcomes[(race['race_id'],runner['horse_id'],h['race_id'])]
                if o['outcome']=='NUMERIC_FINISH':
                    y=(o['field_size']-o['position']+.5)/o['field_size']
            recency.append(r)
            weights.append(r*c)
            values.append(y)
        weighted_mean=sum(w*y for w,y in zip(weights,values))/sum(weights)
        evidence=sum(recency)
        q=.5+evidence/(evidence+cfg['prior'])*(weighted_mean-.5)
        if cfg['link']=='centered_logit':
            bounded=max(1e-12,min(1-1e-12,q))
            z=.5*math.log(bounded/(1-bounded))
        else:
            z=cfg['inverse_temperature']*q
        logits.append(z)
        diagnostics.append({'horse_id':runner['horse_id'],'history_count':len(history),
                            'recency_evidence':evidence,'weighted_mean':weighted_mean,
                            'strength':q,'shrinkage_factor':evidence/(evidence+cfg['prior'])})
    exps=[math.exp(z-max(logits)) for z in logits]
    return [e/sum(exps) for e in exps],diagnostics

def score(race, cfg, history, race_type):
    ps,diags=predict(race,cfg,history)
    win=next(i for i,r in enumerate(race['runners']) if r['horse_id']==race['entry']['winner_horse_id'])
    first=ps.index(max(ps))
    ties=[i for i,p in enumerate(ps) if abs(p-max(ps))<1e-12]
    return {'race_id':race['race_id'],'date':race['startUTC'][:10],
            'race_type':race_type,'runners':len(ps), 'log_loss':-math.log(ps[win]),
            'brier':sum((p-int(i==win))**2 for i,p in enumerate(ps)),
            'first_winner':int(first==win),'top_tie_count':len(ties),
            'tie_fractional_winner':1/len(ties) if win in ties else 0,
            'top_probability':max(ps),'winner_horse_id':race['entry']['winner_horse_id'],
            'predicted_horse_id':race['runners'][first]['horse_id'],
            'horse_ids':[r['horse_id'] for r in race['runners']],
            'probabilities':ps,'outcomes':[int(i==win) for i in range(len(ps))],
            'diagnostics':diags}

def reliability(pys, edges):
    # Pooled runner bins use one unit per runner; no independence claim.
    bins=[]
    total=len(pys)
    for lo,hi in zip(edges,edges[1:]):
        b=[(p,y) for p,y in pys if lo<=p<hi or (hi==1 and p==1)]
        bins.append({'lower':lo,'upper':hi,'count':len(b),
                     'mean_probability':mean(p for p,y in b), 'observed_frequency':mean(y for p,y in b)})
    ece=sum(b['count']*abs(b['mean_probability']-b['observed_frequency']) for b in bins if b['count'])/total if total else None
    return {'bins':bins,'ece':ece,'weighting':'equal observations within diagnostic; runners are not independent'}

def summarize(rows):
    top=reliability([(r['top_probability'],r['first_winner']) for r in rows],[0,.1,.2,.3,.5,1])
    pooled=reliability([(p,y) for r in rows for p,y in zip(r['probabilities'],r['outcomes'])],[0,.05,.1,.2,.3,.5,1])
    # Also race-balanced runner-bin summaries, each runner weight1/fieldsize.
    weighted_bins=[]
    for lo,hi in zip([0,.05,.1,.2,.3,.5],[.05,.1,.2,.3,.5,1]):
        pairs=[(p,y,1/r['runners']) for r in rows for p,y in zip(r['probabilities'],r['outcomes']) if lo<=p<hi or (hi==1 and p==1)]
        w=sum(z for p,y,z in pairs)
        weighted_bins.append({'lower':lo,'upper':hi,'runner_count':len(pairs),'weight':w,
            'mean_probability':sum(p*z for p,y,z in pairs)/w if w else None,
            'observed_frequency':sum(y*z for p,y,z in pairs)/w if w else None})
    return {'races':len(rows),'runners':sum(r['runners'] for r in rows),
            'log_loss':mean(r['log_loss'] for r in rows),'brier':mean(r['brier'] for r in rows),
            'first_winners':sum(r['first_winner'] for r in rows),
            'fractional_tie_credit':sum(r['tie_fractional_winner'] for r in rows),
            'mean_top_probability':mean(r['top_probability'] for r in rows),
            'top_accuracy':mean(r['first_winner'] for r in rows),
            'top_overconfidence':mean(r['top_probability']-r['first_winner'] for r in rows),
            'top_label_calibration':top,'pooled_runner_calibration':pooled,
            'race_balanced_runner_bins':weighted_bins}

def select(ids, evaluations, indices):
    return min(ids,key=lambda k:(mean(evaluations[k][i]['log_loss'] for i in indices), k!='A0_FULL',ids.index(k)))

def paired_bands(evaluations, indices, nboot):
    ids=list(evaluations)
    groups=defaultdict(list)
    for i in indices:
        groups[evaluations['A0_FULL'][i]['date']].append(i)
    days=sorted(groups)
    result={k:{} for k in ids}
    for metric in ['log_loss','brier']:
        delta={k:[evaluations[k][i][metric]-evaluations['A0_FULL'][i][metric] for i in indices] for k in ids}
        original={k:mean(delta[k]) for k in ids}
        cluster_sums={k:[sum(evaluations[k][i][metric]-evaluations['A0_FULL'][i][metric] for i in groups[d]) for d in days] for k in ids}
        counts=[len(groups[d]) for d in days]
        rng=random.Random(SEED)
        boots={k:[] for k in ids}
        maxdev=[]
        for b in range(nboot):
            draws=Counter(rng.randrange(len(days)) for _ in days)
            denom=sum(counts[j]*c for j,c in draws.items())
            now={k:sum(cluster_sums[k][j]*c for j,c in draws.items())/denom for k in ids}
            for k,v in now.items():
                boots[k].append(v)
            maxdev.append(max(abs(now[k]-original[k]) for k in ids if k!='A0_FULL'))
        critical=quantile(maxdev,.95)
        for k in ids:
            ds=delta[k]
            result[k][metric]={'candidate_minus_baseline':original[k],
                'improvement_baseline_minus_candidate':-original[k],
                'improved_races':sum(d < -1e-12 for d in ds),
                'worsened_races':sum(d > 1e-12 for d in ds),
                'tied_races':sum(abs(d)<=1e-12 for d in ds),
                'cluster_bootstrap_percentile_95':[quantile(boots[k],.025),quantile(boots[k],.975)],
                'exploratory_simultaneous_max_deviation_95':[original[k]-critical,original[k]+critical] if k!='A0_FULL' else [0,0],
                'date_clusters':len(days),'resamples':nboot,'seed':SEED,
                'family_nonbaseline_candidates':len(ids)-1,
                'limitation':'Small-date-cluster exploratory interval. Max-deviation band is an approximate familywise descriptive adjustment, not valid untouched/post-selection confirmation.'}
    return result

def run(root, nboot):
    out=root/'results';out.mkdir(parents=True,exist_ok=True)
    inputs=root/'inputs'
    races=json.loads((inputs/'derived_inputs.json').read_text())['races']
    races=sorted(races,key=lambda r:(r['startUTC'],r['race_id']))
    types=json.loads((inputs/'race_types.json').read_text())
    outcomes=json.loads((inputs/'history_outcomes.json').read_text())
    history={(r['race_id'],h['horse_id'],x['race_id']):x for r in outcomes for h in r['runners'] for x in h['history']}
    dev=[i for i,r in enumerate(races) if r['startUTC'][:10]<='2026-11-10']
    later=[i for i in range(len(races)) if i not in dev]
    assert (len(races),len(dev),len(later))==(76,58,18)
    assert len({r['race_id'] for r in races})==76
    assert sum(len(r['runners']) for r in races)==730
    definitions={}
    aliases={}
    evaluations={}
    def add(name, **changes):
        cfg=BASE|changes
        for old,v in definitions.items():
            if v==cfg:
                aliases[name]=old
                return old
        definitions[name]=cfg
        evaluations[name]=[score(r,cfg,history,types[r['race_id']]) for r in races]
        return name
    add('A0_FULL')
    add('A1_NO_DISTANCE',distance=False)
    halfs=[90,45,180,365,None]
    priors=[5,0,2,10]
    betas=[2,1,3,4]
    b=[add('B_HALF_'+str(h),half_life=h) for h in halfs]
    c=[add('C_PRIOR_'+str(k),prior=k) for k in priors]
    d=[add('D_BETA_'+str(t),inverse_temperature=t) for t in betas]
    add('S1_MIDPOINT',percentile='midpoint')
    add('S2_CENTERED_LOGIT',link='centered_logit')
    fixed=list(definitions)
    # Select settings exclusively using development rows before later summaries.
    choices={'half_life':select(b,evaluations,dev),'prior':select(c,evaluations,dev),
             'inverse_temperature':select(d,evaluations,dev)}
    settings={axis:definitions[cid][axis] for axis,cid in choices.items()}
    for size in [1,2,3]:
        for axes in itertools.combinations(settings,size):
            add('E_NODIST_'+'_'.join(axes),distance=False,**{a:settings[a] for a in axes})
    assert len(definitions)<=21
    chosen=select(list(definitions),evaluations,dev)
    selection={'development_dates':'2026-11-04 to 2026-11-10',
               'later_diagnostic_dates':'2026-11-11 to 2026-11-15',
               'settings_selected_on_development':settings,'family_winners':choices,
               'development_selected_final_candidate':chosen,'aliases':aliases,
               'unique_candidates':len(definitions),'fixed_candidates':fixed,
               'untouched_evaluation_races':0,'status':'ALL_76_PREVIOUSLY_EXAMINED; NO_UNTOUCHED_VALIDATION'}
    write_json(out/'selection.json',selection)
    write_json(out/'candidate_definitions.json',definitions)
    # Archive identity and input integrity checks; no sixteen-mask recomputation.
    phase1=json.loads((inputs/'phase1_ablation_results.json').read_text())
    orig={x['race_id']:x for x in next(v for v in phase1['variants'] if v['mask']==15)['rows']}
    nodist={x['race_id']:x for x in next(v for v in phase1['variants'] if v['mask']==14)['rows']}
    maxprob=max(abs(p-h['model_probability']) for row,r in zip(evaluations['A0_FULL'],races) for p,h in zip(row['probabilities'],r['runners']))
    maxll=max(abs(row['log_loss']-orig[row['race_id']]['log_loss']) for row in evaluations['A0_FULL'])
    maxa1=max(abs(row['log_loss']-nodist[row['race_id']]['log_loss']) for row in evaluations['A1_NO_DISTANCE'])
    timing=[]
    anomalies=[]
    histories=0
    missing_sim=Counter()
    maxpercentile=0
    maxrecency=0
    all_evidence=[]
    ids=[]
    for race in races:
        start=datetime.fromisoformat(race['startUTC'])
        gen=datetime.fromisoformat(race['generated_at_utc'])
        scored=datetime.fromisoformat(race['entry']['scored_at_utc'])
        assert (start-gen).total_seconds()>=300
        assert scored>start
        assert race['forecast_sha']==race['entry']['record_sha256']
        assert len({h['horse_id'] for h in race['runners']})==len(race['runners'])
        assert sum(h['horse_id']==race['entry']['winner_horse_id'] for h in race['runners'])==1
        ids.append({'race_id':race['race_id'],'date':race['startUTC'][:10],'race_type':types[race['race_id']],
            'startUTC':race['startUTC'],'capture':race['generated_at_utc'],'scored':race['entry']['scored_at_utc'],
            'forecast_sha256':race['forecast_sha'],'git_blob':race['git_blob'],
            'runners':len(race['runners']),'split':'development' if race['startUTC'][:10]<='2026-11-10' else 'later_diagnostic',
            'verification':race['entry']['verification'],'independently_verified':race['entry']['independently_verified']})
        for runner in race['runners']:
            assert 3<=len(runner['history'])<=6
            for h in runner['history']:
                histories+=1
                age=(start.date()-datetime.fromisoformat(h['date']).date()).days
                assert 0<age<=730
                maxrecency=max(maxrecency,abs(h['recency_weight']-2**(-age/90)))
                o=history[(race['race_id'],runner['horse_id'],h['race_id'])]
                expected=(o['field_size']-o['position'])/(o['field_size']-1) if o['outcome']=='NUMERIC_FINISH' else 0
                maxpercentile=max(maxpercentile,abs(expected-h['finish_percentile']))
                for k,v in h['similarities'].items():
                    if v is None:missing_sim[k]+=1
                    else: assert 0<=v<=1
    for row in evaluations['A0_FULL']:
        for diag in row['diagnostics']:
            all_evidence.append(diag['recency_evidence'])
    assert max(maxprob,maxll,maxa1,maxrecency,maxpercentile)<1e-12
    audit={'races':len(races),'runners':730,'historical_rows':histories,
           'race_type_counts':dict(Counter(types[r['race_id']] for r in races)),
           'max_published_probability_error':maxprob,'max_phase1_full_log_loss_error':maxll,
           'max_phase1_no_distance_log_loss_error':maxa1,'max_percentile_error':maxpercentile,
           'max_recency_error':maxrecency,'missing_similarities':dict(missing_sim),
           'all_capture_at_least_5min_prestart':True,'all_history_dates_before_race':True,
           'evidence_mass_min_median_max':[min(all_evidence),st.median(all_evidence),max(all_evidence)],
           'evidence_mass_below_1_runner_count':sum(e<1 for e in all_evidence),
           'counterfactual_predictions_computed_after_results':True,
           'independently_verified_outcomes':sum(r['entry']['independently_verified'] for r in races),
           'true_untouched_evaluation_races':0,
           'limitations':['All76 races previously examined inPhase1; chronological diagnostics are not independent validation.',
             'Single-publisher provisional outcomes; raw original publisher HTML not preserved here.',
             'Recorded capture timestamps and Git blobs do not independently attest first availability or absence of retrospective upstream edits.',
             'Race-day cluster bootstrap does not account for every repeated-horse dependency.',
             'Mixed Flat/Hurdle/Chase; target population and archive eligibility are selected, not a complete race census.',
             'Same final field as archive; no independently reconstructed pre-off withdrawal or settlement audit.',
             'No price/market data enters experiments; predictive scores do not establish betting value.']}
    write_json(out/'data_quality_audit.json',audit)
    write_json(out/'race_manifest.json',ids)
    summaries={}
    for label,ix in [('all_exploratory',list(range(len(races)))),('development',dev),('later_diagnostic_not_untouched',later)]:
        bands=paired_bands(evaluations,ix,nboot)
        summaries[label]={k:summarize([rows[i] for i in ix])|{'paired_vs_A0':bands[k]} for k,rows in evaluations.items()}
    write_json(out/'metrics_and_uncertainty.json',summaries)
    subgroups={}
    for group in ['FLAT','HURDLE','CHASE']:
        ix=[i for i,r in enumerate(races) if types[r['race_id']]==group]
        subgroups[group]={k:summarize([rows[i] for i in ix])|{'mean_log_loss_delta_vs_A0':mean(rows[i]['log_loss']-evaluations['A0_FULL'][i]['log_loss'] for i in ix),
              'mean_brier_delta_vs_A0':mean(rows[i]['brier']-evaluations['A0_FULL'][i]['brier'] for i in ix)} for k,rows in evaluations.items()}
    write_json(out/'race_type_diagnostics.json',subgroups)
    # Expanding-window algorithm uses only prior dates from the fixed14 family.
    walk=[]
    for day in sorted({r['startUTC'][:10] for r in races}):
        before=[i for i,r in enumerate(races) if r['startUTC'][:10]<day]
        if len({races[i]['startUTC'][:10] for i in before})<3:continue
        test=[i for i,r in enumerate(races) if r['startUTC'][:10]==day]
        candidate=select(fixed,evaluations,before)
        walk.append({'date':day,'previous_races':len(before),'selected':candidate,
                     'test_races':len(test),'candidate_metrics':summarize([evaluations[candidate][i] for i in test]),
                     'baseline_metrics':summarize([evaluations['A0_FULL'][i] for i in test]),
                     'race_ids':[races[i]['race_id'] for i in test]})
    testrows=[];baserows=[]
    for w in walk:
        ix=[i for i,r in enumerate(races) if r['race_id'] in w['race_ids']]
        testrows.extend(evaluations[w['selected']][i] for i in ix)
        baserows.extend(evaluations['A0_FULL'][i] for i in ix)
    walk_bands=paired_bands({'A0_FULL':baserows,'EXPANDING_SELECTION':testrows},list(range(len(testrows))),nboot)
    write_json(out/'walk_forward_diagnostic.json',{'status':'CONTAMINATED_HISTORICAL_DIAGNOSTIC_NOT_UNTOUCHED',
       'folds':walk,'selected_procedure':summarize(testrows),'same_race_baseline':summarize(baserows),
       'paired_procedure_vs_baseline':walk_bands['EXPANDING_SELECTION']})
    # Every candidate/runner probability retained for independent scoring.
    with (out/'runner_predictions.jsonl').open('w',encoding='utf-8') as f:
        for cid,rows in evaluations.items():
            for row in rows:
                f.write(json.dumps({'candidate':cid,**{k:row[k] for k in ['race_id','date','horse_ids','probabilities','outcomes','diagnostics']}})+'\n')
    fields=['candidate','race_id','date','race_type','runners','log_loss','brier','first_winner','top_probability','predicted_horse_id','winner_horse_id','delta_log_loss_vs_A0','delta_brier_vs_A0','split']
    with (out/'race_comparisons.csv').open('w',newline='',encoding='utf-8') as f:
        w=csv.DictWriter(f,fieldnames=fields);w.writeheader()
        for cid,rows in evaluations.items():
            for i,row in enumerate(rows):
                w.writerow({k:row[k] for k in fields if k in row}|{'candidate':cid,
                  'delta_log_loss_vs_A0':row['log_loss']-evaluations['A0_FULL'][i]['log_loss'],
                  'delta_brier_vs_A0':row['brier']-evaluations['A0_FULL'][i]['brier'],
                  'split':'development' if i in dev else 'later_diagnostic_not_untouched'})
    fields=['candidate','split','races','runners','log_loss','brier','first_winners','top_ece','runner_ece','top_overconfidence','delta_log_loss_vs_A0','delta_brier_vs_A0','log_loss_improved','log_loss_worsened','ll_cluster95_low','ll_cluster95_high','ll_simultaneous95_low','ll_simultaneous95_high']
    with (out/'summary.csv').open('w',newline='',encoding='utf-8') as f:
        w=csv.DictWriter(f,fieldnames=fields);w.writeheader()
        for split,metrics in summaries.items():
            for cid,m in metrics.items():
                ll=m['paired_vs_A0']['log_loss'];br=m['paired_vs_A0']['brier']
                w.writerow({'candidate':cid,'split':split,**{k:m[k] for k in ['races','runners','log_loss','brier','first_winners','top_overconfidence']},
                   'top_ece':m['top_label_calibration']['ece'],'runner_ece':m['pooled_runner_calibration']['ece'],
                   'delta_log_loss_vs_A0':ll['candidate_minus_baseline'],'delta_brier_vs_A0':br['candidate_minus_baseline'],
                   'log_loss_improved':ll['improved_races'],'log_loss_worsened':ll['worsened_races'],
                   'll_cluster95_low':ll['cluster_bootstrap_percentile_95'][0],'ll_cluster95_high':ll['cluster_bootstrap_percentile_95'][1],
                   'll_simultaneous95_low':ll['exploratory_simultaneous_max_deviation_95'][0],'ll_simultaneous95_high':ll['exploratory_simultaneous_max_deviation_95'][1]})
    write_json(out/'run_receipt.json',{'executed_at_utc':datetime.now(timezone.utc).isoformat(),
       'script_sha256':digest(Path(__file__)),'analysis_plan_sha256':digest(root/'ANALYSIS_PLAN.md'),
       'input_sha256':{p.name:digest(p) for p in inputs.iterdir() if p.is_file()},
       'python':'standard_library_only','seed':SEED,'bootstrap_resamples':nboot,
       'candidate_count':len(definitions),'phase1_16_masks_rerun':False,
       'model_validation':'UNVALIDATED','publication_gate':'BLOCKED','betting_eligible':False,
       'untouched_evaluation_races':0})
    print(json.dumps({'selection':selection,'audit':audit,
         'all':{k:{z:v for z,v in m.items() if z in ['log_loss','brier','first_winners','top_overconfidence']} for k,m in summaries['all_exploratory'].items()},
         'later':{k:{z:v for z,v in m.items() if z in ['log_loss','brier','first_winners']} for k,m in summaries['later_diagnostic_not_untouched'].items()}},indent=2))

if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('--root',type=Path,default=Path(__file__).parent);p.add_argument('--bootstrap',type=int,default=10000)
    args=p.parse_args();run(args.root,args.bootstrap)
