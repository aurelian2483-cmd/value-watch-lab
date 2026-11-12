'use strict';
const assert=require('node:assert/strict');
const {publish,TITLE}=require('../ops-control/github-notify.cjs');
const I=require('../ops-control/director-intelligence.cjs');
const markdown='# Operations Director — scheduled briefing\nResearch safeguards BLOCKED.';
function report(at,issues=[],secondary='MEETING_LIST_MATCHED_NOT_CERTIFIED'){
 return {kind:'OPERATIONS_SCHEDULED_RESEARCH_AUDIT',generatedAt:at,issues:issues.map(([code,priority])=>({code,priority})),feeds:['football','racing','other','horse'].map(id=>({id,state:'OBSERVED'})),secondaryRacingCoverage:{status:secondary,missing:[],unexpected:[],raceCountMismatches:[]}};
}
function mock(initial=[]){
 const issues=initial.map(x=>({...x})),events=[],core={notice:s=>events.push(['notice',s])};
 const github={
  paginate:async(action,args)=>{assert.equal(args.state,'all');return issues},
  rest:{issues:{
   listForRepo(){},
   create:async params=>{assert.equal(params.title,TITLE);const number=99;issues.push({number,title:params.title,state:'open',body:params.body});events.push(['create',params]);return{data:{number}}},
   update:async params=>{issues.find(x=>x.number===params.issue_number).body=params.body;events.push(['update',params])},
   createComment:async params=>events.push(['comment',params])
  }}
 };
 return {github,issues,events,core};
}
(async()=>{
 const context={repo:{owner:'owner',repo:'test'},runId:123};
 const initial=report('2026-11-12T10:00:00Z',[['racing:COVERAGE_UNVERIFIED','P2']]);
 let s=mock();let result=await publish({...s,context,reportMarkdown:markdown,reportJson:initial});
 assert.equal(result.status,'CREATED');assert.equal(s.events.filter(e=>e[0]==='create').length,1);
 result=await publish({...s,context,reportMarkdown:markdown,reportJson:initial});
 assert.equal(result.status,'DUPLICATE');assert.equal(s.events.filter(e=>e[0]==='comment').length,0);
 const same=report('2026-11-12T19:00:00Z',[['racing:COVERAGE_UNVERIFIED','P2']]);
 result=await publish({...s,context:{...context,runId:124},reportMarkdown:markdown,reportJson:same});
 assert.equal(result.status,'UPDATED_SILENT');assert.equal(s.events.filter(e=>e[0]==='comment').length,0,'Stable P2 must not spam comments');
 assert.equal(I.read(s.issues.find(x=>x.number===99).body).length,2);
 const newWarning=report('2026-11-13T10:00:00Z',[['racing:COVERAGE_UNVERIFIED','P2'],['football:FEED_UNAVAILABLE','P1']]);
 result=await publish({...s,context:{...context,runId:125},reportMarkdown:markdown,reportJson:newWarning});
 assert.equal(result.status,'UPDATED_ALERT');assert.equal(s.events.filter(e=>e[0]==='comment').length,1);
 assert.match(s.issues.find(x=>x.number===99).body,/Director Intelligence V6/);
 s=mock([{number:18,title:TITLE,state:'closed',body:'old'}]);
 result=await publish({...s,context,reportMarkdown:markdown,reportJson:initial});
 assert.equal(result.status,'CLOSED_OPT_OUT');assert.equal(s.events.some(e=>e[0]==='create'||e[0]==='update'),false);
 s=mock([{number:15,title:'Some other issue',state:'open',body:''}]);
 result=await publish({...s,context,reportMarkdown:markdown,reportJson:initial});
 assert.equal(result.status,'CREATED');
 s=mock([{number:27,title:TITLE,state:'open',body:'<!-- ops-director-history-v1:not-base64 -->'}]);
 await assert.rejects(()=>publish({...s,context,reportMarkdown:markdown,reportJson:initial}),/Cannot safely read existing Director history/);
 assert.equal(s.events.some(e=>e[0]==='update'),false,'Corrupt history must never be silently replaced');
 await assert.rejects(()=>publish({...s,context,reportMarkdown:'untrusted',reportJson:initial}),/Missing or oversized/);
 console.log('PASS: persistent Director issue history, stable-issue quiet mode, new P1 alert, per-run dedup, explicit opt-out, corrupt state safety');
})().catch(e=>{console.error(e);process.exitCode=1});
