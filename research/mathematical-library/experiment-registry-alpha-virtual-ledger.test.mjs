import {test} from 'node:test'
import assert from 'node:assert/strict'
import {virtualLedger} from './experiment-registry-alpha-virtual-ledger.mjs'
const opts={mode:'SYNTHETIC_ACCOUNTING_TEST',initialUnits:100}
const entries=[20,-30,-20,10,60,-10].map((deltaUnits,i)=>({id:'entry-'+i,sequence:i+1,deltaUnits}))
test('reconciles supplied virtual changes and peak-to-trough losses',()=>{
 const r=virtualLedger({...opts,entries})
 assert.equal(r.finalUnits,130)
 assert.equal(r.netUnits,30)
 assert.equal(r.peakUnits,140)
 assert.equal(r.maxDrawdownUnits,50)
 assert.equal(r.maxDrawdownFraction,50/120)
 assert.equal(r.longestLossRun,2)
 assert.deepEqual(r.history.map(x=>x.balance),[120,90,70,80,140,130])
 assert.equal(r.executionAuthorized,false)
 assert.equal(r.capitalAllocationAuthorized,false)
})
test('empty ledger retains initial balance; total loss is recorded',()=>{
 const empty=virtualLedger({...opts,entries:[]})
 assert.equal(empty.finalUnits,100)
 assert.equal(empty.maxDrawdownFraction,0)
 const zero=virtualLedger({...opts,entries:[{id:'loss',sequence:1,deltaUnits:-100}]})
 assert.equal(zero.finalUnits,0)
 assert.equal(zero.maxDrawdownFraction,1)
})
test('invalid entries, duplicate identities and non-synthetic modes rejected',()=>{
 for(const input of [{...opts,mode:'REAL',entries:[]},{...opts,initialUnits:0,entries:[]},
  {...opts,entries:[entries[0],{...entries[1],id:entries[0].id}]},
  {...opts,entries:[{id:'bad',sequence:2,deltaUnits:1}]},
  {...opts,entries:[{id:'bad',sequence:1,deltaUnits:-101}]},
  {...opts,entries:[{id:'bad',sequence:1,deltaUnits:0.5}]},
  {...opts,entries:Array.from({length:251},(_,i)=>({id:'x-'+i,sequence:i+1,deltaUnits:0}))}])
   assert.throws(()=>virtualLedger(input))
})
