'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const js=fs.readFileSync(__dirname+'/app.js','utf8'),html=fs.readFileSync(__dirname+'/index.html','utf8');
const css=fs.readFileSync(__dirname+'/style.css','utf8');
const historyJS=fs.readFileSync(__dirname+'/history.js','utf8');
assert(html.includes('./history.js?v=3')&&html.includes('./app.js?v=3')&&html.includes('./style.css?v=3'));
assert(html.includes('id="history-board"')&&html.includes('id="history-summary"')&&html.includes('id="history-warning"'));
assert(html.includes('READ-ONLY RESEARCH OVERSIGHT'));
assert(html.includes('id="action-board"')&&html.includes('id="action-summary"'));
assert(js.includes('planActions(')&&js.includes('actionRegister:actions'));

assert(!/https?:\/\//.test(js),'No external API calls or remote scripts');
assert(css.includes('@media(max-width:650px)'),'Responsive narrow layout must exist');
new vm.Script(js);new vm.Script(historyJS);
const now=new Date().toISOString(),gate={research_only:true,publication_gate:'BLOCKED',model_validation:'UNVALIDATED',generated_at_utc:now};
const data={
 '../research-dashboard-data.json':{...gate,upcoming_fixtures:[],experimental_model_forecasts:[],official_challenge:{completed:0}},
 '../racing-research-data.json':{...gate,races:[],candidate_selections:[],qualified_selections:[],coverage_verified:true},
 '../other-sports-data.json':{...gate,sports:{tennis:{events:[],collection_status:'OK',schedule_conflicts:[]},nfl:{events:[],collection_status:'OK'}},collection_errors:{}},
 '../horse-model-data.json':{...gate,form_forecasts:[]}
};
async function run(denied){
 const nodes=new Map(),requests=[],saved=new Map();
 function element(tag){return {tagName:tag,textContent:'',className:'',disabled:false,children:[],append(...xs){this.children.push(...xs)},replaceChildren(){this.children=[]},setAttribute(){},addEventListener(){},remove(){},click(){}}}
 const document={hidden:false,body:element('body'),createElement:element,getElementById(id){if(!nodes.has(id))nodes.set(id,element('div'));return nodes.get(id)},addEventListener(){}};
 const fetch=(url,opts)=>{requests.push({url,opts});return denied&&url.includes('other-sports')?Promise.reject(Error('Synthetic feed failure')):Promise.resolve({ok:true,json:async()=>data[url]})};
 const window={localStorage:{getItem:k=>saved.get(k)||null,setItem:(k,v)=>saved.set(k,v)}};
 const scope={window,document,fetch,setTimeout:()=>1,clearTimeout(){},setInterval:()=>1,AbortController:class{constructor(){this.signal={}}abort(){}},Intl,Date,Blob,URL};
 vm.runInNewContext(historyJS,scope,{timeout:5000});
 vm.runInNewContext(js,scope,{timeout:5000});
 for(let i=0;i<30;i++)await Promise.resolve();
 const val=id=>nodes.get(id)?.textContent;
 assert.equal(nodes.get('sports').children.length,4,'Four independent sport manager cards required');
 assert.equal(val('m-approved'),'0','No fabricated betting approval');
 assert.equal(nodes.get('source-table').children.length,4);
 assert(nodes.get('history-board').children.length>0,'Browser-local incident history rendered');
 assert.match(val('history-summary'),/saved on this device/);
 assert([...saved.keys()].some(k=>k.startsWith('vw-ops-control:incident-history:')),'History persisted only in its own namespace');
 assert(nodes.get('action-board').children.length>=1,'Director must provide evidence-linked actions');
 assert.match(val('action-summary'),/recommended action/);

 assert.equal(nodes.get('export').disabled,false,'Report export should become available');
 assert(requests.length===4&&requests.every(r=>r.opts.cache==='no-store'),'Only read four configured sources');
 assert(requests.every(r=>r.opts.method===undefined||r.opts.method==='GET'),'No writes');
 if(denied){assert.equal(val('m-feeds'),'3 / 4');assert.match(val('decision-title'),/ESCALATE/);assert(nodes.get('action-board').children.some(n=>n.children.some(h=>h.children?.some(c=>c.textContent==='P1'))),'Feed failure must produce P1 action')}
 else{assert.equal(val('m-feeds'),'4 / 4');assert.match(val('decision-title'),/DATA CHECKS PASSED/);assert.equal(val('m-alerts'),'0')}
}
(async()=>{await run(false);await run(true);console.log('PASS: standalone operations dashboard, four desks, read-only requests, gate protection, failure escalation, export controls and responsive markup')})().catch(error=>{console.error(error);process.exitCode=1});
