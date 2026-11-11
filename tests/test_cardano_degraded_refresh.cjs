'use strict';
const assert=require('node:assert/strict');
const {createSnapshotClient}=require('../paper-lab/transport.js');
const now=Date.parse('2026-11-11T12:00:00Z');
const doc=generated=>({schema_version:1,research_only:true,model_validation:'UNVALIDATED',publication_gate:'BLOCKED',generated_at_utc:generated});
let fail=false;
let older=false;
const updates=[];
const client=createSnapshotClient({
  clock:()=>now,maxRetries:0,
  fetch:async path=>{
    if(path==='football.json'&&fail)throw Error('offline football feed');
    return {ok:true,status:200,headers:{get:()=>null},text:async()=>JSON.stringify(doc(older&&path==='football.json'?'2026-11-11T11:00:00Z':'2026-11-11T11:59:00Z'))};
  },
  onUpdate:state=>updates.push(state)
});
(async()=>{
  const specs=[{kind:'football',path:'football.json'},{kind:'other',path:'other.json'}];
  const first=await client.refresh(specs);
  assert.equal(first.status,'ready');
  assert.equal(first.snapshots.length,2);
  fail=true;
  const second=await client.refresh(specs);
  assert.equal(second.status,'degraded');
  assert.equal(second.snapshots.length,2,'Last-good football snapshot must be retained');
  assert.equal(second.errors.length,1);
  assert.equal(second.errors[0].path,'football.json');
  assert.equal(second.errors[0].retained,true);
  assert.equal(updates.at(-1).status,'degraded');
  assert.equal(second.errors.length>0,true,'Fresh slip generation must treat this as failed refresh');
  fail=false;
  older=true;
  const third=await client.refresh(specs);
  assert.equal(third.status,'degraded','Older source snapshots must not silently replace newer snapshots');
  assert.equal(third.errors[0].retained,true);
  assert.match(third.errors[0].message,/Older snapshot rejected/);
  assert.equal(third.snapshots.find(s=>s.path==='football.json').document.generated_at_utc,'2026-11-11T11:59:00Z');
  client.dispose();
  console.log('PASS transport retains last-good data but explicitly marks degraded refresh');
})().catch(error=>{console.error(error);process.exitCode=1;client.dispose();});
