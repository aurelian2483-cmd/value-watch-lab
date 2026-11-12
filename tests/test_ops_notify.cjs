'use strict';
const assert=require('node:assert/strict');
const {publish,TITLE}=require('../ops-control/github-notify.cjs');
const markdown='# Operations Director — scheduled briefing\nP1 gate blocked.';
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
 let s=mock();let result=await publish({...s,context,reportMarkdown:markdown});assert.equal(result.status,'CREATED');assert.equal(s.events.filter(e=>e[0]==='create').length,1);
 result=await publish({...s,context,reportMarkdown:markdown});assert.equal(result.status,'DUPLICATE');assert.equal(s.events.filter(e=>e[0]==='comment').length,0);
 result=await publish({...s,context:{...context,runId:124},reportMarkdown:markdown});assert.equal(result.status,'UPDATED');assert.equal(s.events.filter(e=>e[0]==='comment').length,1);
 s=mock([{number:18,title:TITLE,state:'closed',body:'old'}]);
 result=await publish({...s,context,reportMarkdown:markdown});assert.equal(result.status,'CLOSED_OPT_OUT');assert.equal(s.events.some(e=>e[0]==='create'),false);
 s=mock([{number:15,title:'Some other issue',state:'open',body:''}]);
 result=await publish({...s,context,reportMarkdown:markdown});assert.equal(result.status,'CREATED');
 await assert.rejects(()=>publish({...s,context,reportMarkdown:'untrusted'}),/Missing or oversized/);
 console.log('PASS: one alert issue, per-run deduplication, comments, closed-issue opt out, non-operations issue isolation');
})().catch(e=>{console.error(e);process.exitCode=1});
