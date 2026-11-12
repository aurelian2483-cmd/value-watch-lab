'use strict';
const fs=require('fs'),vm=require('vm'),assert=require('assert/strict');
const html=fs.readFileSync('ops-control/index.html','utf8');
const css=fs.readFileSync('ops-control/style.css','utf8');
const code=fs.readFileSync('ops-control/app.js','utf8');
const ids=['clock','refresh','export','director-badge','decision-title','decision-summary','decision-tag','audit-time','m-feeds','m-sports','m-alerts','m-approved','sports','issues','source-table','it-status','it-summary'];
for(const id of ids)assert(html.includes('id="'+id+'"'), 'Missing audited dashboard element: '+id);
for(const needle of ['../research-dashboard-data.json','../racing-research-data.json','../other-sports-data.json','../horse-model-data.json',"publication_gate","UNVALIDATED","BLOCKED","independentExpertSignoff:false"])assert(code.includes(needle),'Missing expected read-only control: '+needle);
assert(html.includes('app.js?v=1')&&html.includes('style.css?v=1'));
assert(css.includes('.sport-grid')&&css.includes('@media'));
function node(tag='div'){
 return {tag,children:[],style:{},disabled:false,className:'',textContent:'',listeners:{},classList:{add(){}},append(...x){this.children.push(...x)},replaceChildren(...x){this.children=x},addEventListener(type,handler){this.listeners[type]=handler},remove(){},click(){},setAttribute(){},getAttribute(){return null}};
}
const el=Object.fromEntries(ids.map(id=>[id,node()]));
const document={getElementById:id=>el[id]||null,createElement:node,body:node(),hidden:false,addEventListener(){}};
const schemas={
 football:{generated_at_utc:new Date().toISOString(),research_only:true,publication_gate:'BLOCKED',model_validation:'UNVALIDATED',upcoming_fixtures:[{id:1}],experimental_model_forecasts:[],official_challenge:{completed:0}},
 racing:{generated_at_utc:new Date().toISOString(),research_only:true,publication_gate:'BLOCKED',model_validation:'UNVALIDATED',races:[{id:2}],candidate_selections:[],qualified_selections:[],coverage_verified:false},
 sports:{generated_at_utc:new Date().toISOString(),research_only:true,publication_gate:'BLOCKED',model_validation:'UNVALIDATED',sports:{tennis:{events:[{id:3}],schedule_conflicts:[]},nfl:{events:[{id:4}]}}},
 horse:{generated_at_utc:new Date().toISOString(),research_only:true,publication_gate:'BLOCKED',model_validation:'UNVALIDATED',form_forecasts:[]}
};
const uriToKey={'../research-dashboard-data.json':'football','../racing-research-data.json':'racing','../other-sports-data.json':'sports','../horse-model-data.json':'horse'};
let failHorse=false;
const fetch=async url=>{
 const key=uriToKey[url];if(!key)throw Error('Unexpected fetch '+url);
 if(key==='horse'&&failHorse)throw Error('Simulated provider failure');
 return {ok:true,json:async()=>schemas[key]};
};
const context={document,fetch,AbortController,setTimeout,clearTimeout,setInterval:()=>null,console,Date,Intl,URL,Blob};
vm.runInNewContext(code,context,{filename:'ops-control/app.js',timeout:1500});
const sleep=()=>new Promise(resolve=>setTimeout(resolve,30));
(async()=>{
 await sleep();
 assert.equal(el['m-feeds'].textContent,'4 / 4');
 assert.equal(el['m-approved'].textContent,'0');
 assert.equal(el.sports.children.length,4);
 assert.equal(el.export.disabled,false);
 assert.match(el['decision-summary'].textContent,/publication remains blocked/i);
 assert(el.issues.children.length>0,'Racing incomplete coverage should be reported');
 failHorse=true;
 await el.refresh.listeners.click();
 await sleep();
 assert.equal(el['m-feeds'].textContent,'3 / 4','Unavailable specialist feed must be reported');
 assert.match(el['director-badge'].textContent,/ATTENTION/i);
 assert.equal(el['m-approved'].textContent,'0','Missing data must never certify a bet');
 console.log('Operations Control Centre: independent data sources, fail-closed gates, four desks, incident detection and safe exported reporting passed');
})().catch(e=>{console.error(e);process.exitCode=1});
