'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {assessMatchContext}=require('../research/match-intelligence/squad-context.js');
const fixture={home:'Chelsea',away:'Arsenal',kickoff_utc:'2026-12-01T20:00:00Z'};
const base={fixture,as_of_utc:'2026-12-01T12:00:00Z',records:[]};
const evidence=(over={})=>({
 record_id:'record1',type:'INJURY',team:'Chelsea',subject:'Test Player',status:'DOUBTFUL',
 source_type:'CLUB',source_url:'https://example.org/announcement',
 first_known_at_utc:'2026-12-01T11:00:00Z',observed_at_utc:'2026-12-01T11:00:00Z',...over
});
test('missing squad context never invents a team adjustment',()=>{
 const a=assessMatchContext(base);
 assert.equal(a.accepted_records.length,0);
 assert.ok(a.teams.every(t=>t.squad_strength_delta===null&&t.lineup_status==='NOT_CERTIFIED'));
 assert.equal(a.publication_gate,'BLOCKED');
});
test('dated doubtful information stays doubtful, not confirmed absence',()=>{
 const a=assessMatchContext({...base,records:[evidence()]});
 assert.equal(a.teams[0].confirmed_out.length,0);
 assert.deepEqual(a.teams[0].questionable,['Test Player']);
 assert.equal(a.probability_adjustment,null);
});
test('an explicit sourced suspension can be reported as confirmed out',()=>{
 const a=assessMatchContext({...base,records:[evidence({type:'SUSPENSION',status:'CONFIRMED_OUT'})]});
 assert.deepEqual(a.teams[0].confirmed_out,['Test Player']);
 assert.equal(a.teams[0].squad_strength_delta,null);
});
test('post-snapshot announcements are rejected even when pre-kickoff',()=>{
 const a=assessMatchContext({...base,records:[evidence({first_known_at_utc:'2026-12-01T13:00:00Z'})]});
 assert.equal(a.accepted_records.length,0);
 assert.equal(a.rejected_records[0].reason,'NOT_KNOWN_BEFORE_SNAPSHOT');
});
test('no source, duplicate IDs, invalid dates and wrong teams fail closed',()=>{
 assert.throws(()=>assessMatchContext({...base,records:[evidence({source_url:'http://unsecured.example'})]}));
 assert.throws(()=>assessMatchContext({...base,records:[evidence(),evidence()]}));
 assert.throws(()=>assessMatchContext({...base,records:[evidence({team:'Liverpool'})]}));
 assert.throws(()=>assessMatchContext({...base,as_of_utc:'2026-12-01T20:00:00Z'}));
});
test('lineup records alone do not certify a complete starting XI',()=>{
 const a=assessMatchContext({...base,records:[evidence({type:'LINEUP',status:'CONFIRMED_AVAILABLE'})]});
 assert.equal(a.teams[0].lineup_items,1);
 assert.equal(a.teams[0].lineup_status,'NOT_CERTIFIED');
});
