'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),C=require('../paper-lab/core.js');
const now=Date.parse('2026-11-08T10:00:00Z'),observed='2026-11-08T09:59:00Z';
const doc={schema_version:1,...C.GATES,generated_at_utc:observed,upcoming_fixtures:[{home:'A',away:'B',kickoff_utc:'2026-11-08T14:00:00Z',schedule_source_receipts:[{url:'https://example.org/event',observed_at_utc:observed}]}]};
const [e]=C.normalize('football',doc);let p=C.create('2026-11-08');
p=C.addLeg(p,1,e,'home',now);assert.equal(p.slots.length,4);assert.equal(p.slots[0].legs.length,1);assert.equal(C.create('2026-11-08').slots[0].legs.length,0);
assert.throws(()=>C.addLeg(p,1,e,'away',now));assert.throws(()=>C.addLeg(p,2,e,'bogus',now));assert.throws(()=>C.addLeg(C.create('2026-11-09'),1,e,'home',now));
assert.throws(()=>C.addLeg(p,2,e,'home',now+48*3600000));assert.throws(()=>C.addLeg(p,2,{...e,observed:'2026-11-08T10:01:00Z'},'home',now));
assert.throws(()=>C.addLeg(p,2,{...e,sources:[]},'home',now));assert.throws(()=>C.normalize('football',{...doc,publication_gate:'OPEN'}));
assert.equal(C.inspect(p,[],now)[0].legs[0].currentStatus,'EVENT_MISSING');
assert.equal(C.inspect(p,[{...e,choices:[]}],now)[0].legs[0].currentStatus,'OUTCOME_REMOVED');
assert.equal(C.inspect(p,[e],now)[0].combinedOdds,null);assert.equal(C.quote(e,'home',now).decimal,null);
const h=C.freeze(p,now),original=JSON.stringify(h);p.slots[0].legs[0].label='Changed';assert.equal(JSON.stringify(h),original);assert.equal(h.prospective_verified,false);assert.equal(h.roi,null);
assert.deepEqual(C.restore(JSON.stringify(h)),h);assert.throws(()=>C.restore(JSON.stringify({...h,slots:[]})));
assert.throws(()=>C.create('2026-02-31'));assert.equal(C.day('2026-06-01T23:30:00Z'),'2026-06-02');
assert.equal(C.url('javascript:alert(1)'),null);assert.equal(C.url('https://user:secret@example.org'),null);
assert.equal(C.community('guaranteed winner','SECTIONALS','https://example.org').classification,'HIGH_RISK_CLAIM');
assert.equal(C.community('stable secret','BREEDING','https://example.org').verifiedROI,null);
assert.equal(C.community('analysis','fake','').methodology,'UNVERIFIED_HEARSAY');
for(let i=0;i<12;i++)p=C.addLeg(i? p:C.create('2026-11-08'),3,{...e,id:'event-'+i},'home',now);
assert.throws(()=>C.addLeg(p,3,{...e,id:'overflow'},'home',now));
for(const [kind,path]of [['football','research-dashboard-data.json'],['football','football-expanded-data.json'],['racing','racing-research-data.json'],['other','other-sports-data.json']]){
 const rows=C.normalize(kind,JSON.parse(fs.readFileSync(path,'utf8')));assert.ok(rows.length);assert.equal(new Set(rows.map(r=>r.id)).size,rows.length);for(const r of rows){assert.ok(r.choices.length);assert.equal(C.quote(r,r.choices[0].id,Date.parse(r.start)+1000).executable,false)}
}
console.log('Paper lab: four slots, variable legs, provenance, expiry, history, date/DST, safety gates, community claims and real-feed adapters passed');
