import {test} from 'node:test';
import assert from 'node:assert/strict';
import {auditDataset,pairedScores,dateClusterIntervals,readinessGate} from './paired-audit.mjs';

const fixture=()=>({
 meta:{research_only:true,validated:false,model_publication_gate:'BLOCKED',name:'RECONSTRUCTED_TEST',outcomes_order:['home','draw','away']},
 counts:{'2024-25':{eligible:4}},
 rows:[
  {id:'A|2024-10-01|A|B',season:'2024-25',date:'2024-10-01',ft:[1,0],winner_index:0,p_unadjusted:[.5,.25,.25],p_recent_form_alpha_0_025:[.6,.2,.2]},
  {id:'B|2024-10-01|C|D',season:'2024-25',date:'2024-10-01',ft:[1,1],winner_index:1,p_unadjusted:[.2,.4,.4],p_recent_form_alpha_0_025:[.3,.5,.2]},
  {id:'C|2024-10-02|E|F',season:'2024-25',date:'2024-10-02',ft:[0,2],winner_index:2,p_unadjusted:[.5,.25,.25],p_recent_form_alpha_0_025:[.4,.2,.4]},
  {id:'D|2024-10-02|G|H',season:'2024-25',date:'2024-10-02',ft:[1,0],winner_index:0,p_unadjusted:[.4,.4,.2],p_recent_form_alpha_0_025:[.5,.3,.2]}
 ]
});

test('validates the event census and outcome identities',()=>{
 const data=fixture();
 assert.deepEqual(auditDataset(data).seasons,{'2024-25':4});
 assert.equal(pairedScores(data.rows).baseline.n,4);
});
test('rejects publication opening, false provenance and changed outcomes',()=>{
 const a=fixture();a.meta.model_publication_gate='OPEN';assert.throws(()=>auditDataset(a));
 const b=fixture();b.meta.name='AS_ISSUED';assert.throws(()=>auditDataset(b));
 const c=fixture();c.rows[1].winner_index=0;assert.throws(()=>auditDataset(c));
});
test('rejects duplicate IDs and unsafe 1X2 vectors',()=>{
 const a=fixture();a.rows[1].id=a.rows[0].id;assert.throws(()=>auditDataset(a));
 const b=fixture();b.rows[0].p_unadjusted=[.7,.2,.2];assert.throws(()=>auditDataset(b));
 const c=fixture();c.rows[0].p_unadjusted=[.9,.2,-.1];assert.throws(()=>auditDataset(c));
});
test('paired scores have stable definitions and interval draws are deterministic',()=>{
 const data=fixture();auditDataset(data);
 const s=pairedScores(data.rows);
 assert(s.challenger.log_loss<s.baseline.log_loss);
 const x=dateClusterIntervals(data.rows,{replicates:200,seed:42});
 assert.deepEqual(x,dateClusterIntervals(data.rows,{replicates:200,seed:42}));
 assert.equal(x.unique_date_clusters,2);
});
test('catalogue threshold alone never unlocks tournament or betting',()=>{
 assert.equal(readinessGate(286,0).reason,'CATALOGUE_BELOW_AGREED_THRESHOLD');
 const x=readinessGate(1000,8);
 assert.equal(x.experiment_tournament,'BLOCKED');
 assert.equal(x.reason,'REQUIRES_SCHEMA_PROVENANCE_REVIEW_AND_USER_APPROVAL');
 assert.equal(x.live_betting_publication,'BLOCKED');
 assert.throws(()=>readinessGate(1000,1001));
});
