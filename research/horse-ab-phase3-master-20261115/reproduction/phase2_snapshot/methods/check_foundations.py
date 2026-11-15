"""Independent identity/structural invariants; no prediction search or fitting."""
from pathlib import Path
import json, math, collections
P=Path(__file__).resolve().parents[1]
data=json.loads((P/'inputs'/'derived_inputs.json').read_text())['races']
original=json.loads((P/'inputs'/'history_outcomes.json').read_text())
lookup={r['race_id']:r for r in original}
counts=collections.Counter(); max_error=0.; repeat=collections.Counter()
for race in data:
    other=lookup[race['race_id']]
    assert len(other['runners'])==len(race['runners'])
    runners={r['horse_id']:r for r in other['runners']}
    for runner in race['runners']:
        repeat[runner['horse_id']]+=1
        rhs=runners[runner['horse_id']]['history']
        assert len(rhs)==len(runner['history'])
        for a,b in zip(runner['history'],rhs):
            assert a['race_id']==b['race_id']
            assert a['finish_percentile']==b['finish_percentile']
            counts[b['outcome']]+=1
            if b['outcome']=='NUMERIC_FINISH':
                n,pos=b['field_size'],b['position']
                assert n>=2 and 1<=pos<=n
                err=abs((n-pos)/(n-1)-a['finish_percentile'])
                max_error=max(err,max_error)
                assert err<1e-12
                midpoint=(n-pos+.5)/n
                assert 0<midpoint<1
            else:
                assert a['finish_percentile']==0
for n in range(2,101):
    mids=[(n-p+.5)/n for p in range(1,n+1)]
    assert abs(sum(mids)/n-.5)<1e-12
    assert all(abs(a+b-1)<1e-12 for a,b in zip(mids,reversed(mids)))
eps=1e-6
z=lambda q:.5*math.log(q/(1-q))
assert abs((z(.5+eps)-z(.5-eps))/(2*eps)-2)<1e-8
ess=lambda w:sum(w)**2/sum(x*x for x in w)
assert abs(ess([1,1,1])-ess([.001,.001,.001]))<1e-12
out={'races':len(data),'dates':len(set(x['startUTC'][:10] for x in data)),
     'runner_appearances':sum(repeat.values()),'unique_horses':len(repeat),
     'repeated_horses':sum(v>1 for v in repeat.values()),
     'history_outcomes':dict(counts),'max_original_percentile_reconstruction_error':max_error,
     'checks':'PASS: ordered history identities, field ranks, original percentile, midpoint symmetry/interiority, central logit slope, ESS scaling invariance'}
(P/'methods'/'foundation_checks.json').write_text(json.dumps(out,indent=2)+'\n')
print(json.dumps(out,indent=2))
