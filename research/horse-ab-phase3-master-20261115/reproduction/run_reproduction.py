"""Independent Phase 1/2 arithmetic reproduction; never changes original packages.

Run from this directory: python run_reproduction.py
The included phase2_snapshot is the complete original Phase 2 review ZIP.
"""
import csv
import hashlib
import json
import math
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path
from statistics import mean

P = Path(__file__).resolve().parent
S = P / 'phase2_snapshot'
OUT = P / 'executed'

def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()

def dump(name, obj):
    (OUT / name).write_text(json.dumps(obj, indent=2, allow_nan=False) + '\n', encoding='utf-8')

def reproduce_phase1():
    races = json.loads((S/'inputs/derived_inputs.json').read_text())['races']
    reference = json.loads((S/'inputs/phase1_ablation_results.json').read_text())['variants']
    indexed = {v['mask']: v for v in reference}
    assert set(indexed) == set(range(16))
    factors = [('distance',1), ('going',1), ('class',.5), ('course',.5)]
    output=[]
    max_error={'mean_log_loss':0.,'mean_brier':0.,'race_log_loss':0.,'race_brier':0.}
    for mask in range(16):
        records=[]
        for race in races:
            logits=[]
            target_date=datetime.fromisoformat(race['startUTC']).date()
            for runner in race['runners']:
                rs=[]; ws=[]; ys=[]
                for h in runner['history']:
                    age=(target_date-datetime.fromisoformat(h['date']).date()).days
                    r=math.pow(2.,-age/90.)
                    assert abs(r-h['recency_weight'])<1e-14
                    context=1.+sum(coef*(h['similarities'][key] or 0.) for i,(key,coef) in enumerate(factors) if mask & (1<<i))
                    rs.append(r);ws.append(r*context);ys.append(h['finish_percentile'])
                m=sum(w*y for w,y in zip(ws,ys))/sum(ws)
                evidence=sum(rs)
                q=(5*.5+evidence*m)/(5+evidence)
                logits.append(2*q)
            ex=[math.exp(z-max(logits)) for z in logits]
            prob=[v/sum(ex) for v in ex]
            win=next(i for i,r in enumerate(race['runners']) if r['horse_id']==race['entry']['winner_horse_id'])
            records.append({'race_id':race['race_id'], 'log_loss':-math.log(prob[win]),
                'brier':sum((p-int(i==win))**2 for i,p in enumerate(prob)),
                'top1':int(prob.index(max(prob))==win)})
        result={'mask':mask,'factors':[k for i,(k,c) in enumerate(factors) if mask & (1<<i)],
                'n':len(records),'runners':sum(len(r['runners']) for r in races),
                'log_loss':mean(x['log_loss'] for x in records),
                'brier':mean(x['brier'] for x in records),
                'top1':sum(x['top1'] for x in records),'rows':records}
        ref=indexed[mask]
        assert result['n']==ref['n']==76
        assert result['top1']==ref['top1']
        max_error['mean_log_loss']=max(max_error['mean_log_loss'],abs(result['log_loss']-ref['log_loss']))
        max_error['mean_brier']=max(max_error['mean_brier'],abs(result['brier']-ref['brier']))
        refs={x['race_id']:x for x in ref['rows']}
        assert len(refs)==76 and set(refs)=={x['race_id'] for x in records}
        for row in records:
            rr=refs[row['race_id']]
            assert row['top1']==rr['top1']
            for metric in ['log_loss','brier']:
                error=abs(row[metric]-rr[metric])
                max_error['race_'+metric]=max(max_error['race_'+metric],error)
                assert error<1e-12
        output.append(result)
    assert max(max_error.values())<1e-12
    dump('phase1_reproduced_all16.json', {'status':'PASS','purpose':'Audit reproduction only; no new selection/search',
          'variants':output,'maximum_absolute_discrepancies':max_error})
    with (OUT/'phase1_summary.csv').open('w',newline='',encoding='utf-8') as f:
        w=csv.DictWriter(f,fieldnames=['mask','factors','n','runners','log_loss','brier','top1']);w.writeheader()
        for r in output:w.writerow({k:r[k] for k in w.fieldnames})
    return max_error

def verify_phase2_probabilities():
    scored={}
    for line in (S/'results/runner_predictions.jsonl').read_text().splitlines():
        x=json.loads(line)
        ps=x['probabilities'];ys=x['outcomes']
        assert len(ps)==len(ys)==len(x['horse_ids']) and len(set(x['horse_ids']))==len(ps)
        assert abs(sum(ps)-1)<1e-12 and sum(ys)==1 and all(math.isfinite(p) and p>0 for p in ps)
        winner=ys.index(1)
        scored.setdefault(x['candidate'],[]).append({'race_id':x['race_id'],'date':x['date'],
            'runners':len(ps),'log_loss':-math.log(ps[winner]),
            'brier':sum((p-y)**2 for p,y in zip(ps,ys)),
            'first_winners':int(ps.index(max(ps))==winner)})
    metrics=json.loads((S/'results/metrics_and_uncertainty.json').read_text())
    assert len(scored)==21
    errs=[]
    counts={}
    for split, candidates in metrics.items():
        for cid, expected in candidates.items():
            rows=[r for r in scored[cid] if split=='all_exploratory' or
                  (split=='development' and r['date']<='2026-11-10') or
                  (split=='later_diagnostic_not_untouched' and r['date']>'2026-11-10')]
            assert len(rows)==expected['races']
            assert sum(r['runners'] for r in rows)==expected['runners']
            assert sum(r['first_winners'] for r in rows)==expected['first_winners']
            for metric in ['log_loss','brier']:
                error=abs(mean(r[metric] for r in rows)-expected[metric]);errs.append(error);assert error<1e-12
            counts[split]={'races':expected['races'],'runners':expected['runners']}
    assert all(len({r['race_id'] for r in rows})==76 for rows in scored.values())
    result={'status':'PASS','configurations':len(scored),'race_vectors':sum(map(len,scored.values())),
            'split_counts':counts,'maximum_independently_scored_mean_error':max(errs),
            'notes':'Independent probability scoring, not independent outcome/source verification.'}
    dump('phase2_independent_probability_scoring.json',result)
    return result

def main():
    OUT.mkdir(exist_ok=True)
    started=datetime.now(timezone.utc).isoformat()
    names=['candidate_definitions.json','metrics_and_uncertainty.json','race_comparisons.csv',
           'race_type_diagnostics.json','runner_predictions.jsonl','summary.csv','walk_forward_diagnostic.json']
    reference={name:sha(S/'results'/name) for name in names}
    dump('before_reference_hashes.json',reference)
    input_names=['derived_inputs.json','phase1_ablation_results.json','history_outcomes.json','race_types.json']
    inputs={name:sha(S/'inputs'/name) for name in input_names}
    commands=[['run_phase2.py','--root','.', '--bootstrap','10000'],
              ['methods/check_foundations.py'],['methods/independent_review.py']]
    executions=[]
    for i,args in enumerate(commands):
        cmd=[sys.executable,*args]
        began=datetime.now(timezone.utc).isoformat()
        cp=subprocess.run(cmd,cwd=S,capture_output=True,text=True,encoding='utf-8')
        (OUT/f'command_{i+1}_stdout.txt').write_text(cp.stdout,encoding='utf-8')
        (OUT/f'command_{i+1}_stderr.txt').write_text(cp.stderr,encoding='utf-8')
        executions.append({'command':cmd,'portable_command':['python',*args],'cwd':'phase2_snapshot',
          'started_at_utc':began,'ended_at_utc':datetime.now(timezone.utc).isoformat(),'returncode':cp.returncode})
        dump('execution_commands.json',executions)
        assert cp.returncode==0, f'Command failed: {args}'
    checks={name:sha(S/'results'/name)==v for name,v in reference.items()}
    assert all(checks.values())
    assert {name:sha(S/'inputs'/name) for name in input_names}==inputs
    phase1=reproduce_phase1()
    phase2=verify_phase2_probabilities()
    dump('REPRODUCTION_RECEIPT.json',{'status':'PASS','started_at_utc':started,
       'completed_at_utc':datetime.now(timezone.utc).isoformat(),'python':sys.version,
       'input_sha256':inputs,'phase2_deterministic_output_byte_matches':checks,
       'phase1_maximum_absolute_errors':phase1,'phase2_independent_checks':phase2,
       'phase1_variants':16,'phase2_variants':21,'races':76,'runner_appearances':730,
       'untouched_races':0,'independently_verified_outcomes':0,
       'limitations':'Reproduction and arithmetic correctness do not validate data provenance, calibration or prospective performance.'})
    print('PASS: Phase1 all16; Phase2 all21; 76 races/730 runners; deterministic output hashes match.')

if __name__=='__main__':main()
