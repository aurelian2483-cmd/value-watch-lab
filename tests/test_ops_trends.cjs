'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const html=fs.readFileSync('ops-control/index.html','utf8');
const js=fs.readFileSync('ops-control/trends.js','utf8');
const css=fs.readFileSync('ops-control/style.css','utf8');
assert(html.includes('https://api.github.com')&&html.includes('trends.js?v=7'));
assert(html.includes('id="trend-issues-plot"')&&html.includes('id="trend-feeds-plot"'));
assert(css.includes('.trend-charts')&&css.includes('@media(max-width:650px)'));
new vm.Script(js);
const sample=(records)=>'<!-- ops-director-history-v1:'+Buffer.from(JSON.stringify({version:1,records})).toString('base64')+' -->';
const row=(n,p1,p2,secondary='MEETING_LIST_MATCHED_NOT_CERTIFIED')=>({at:new Date(Date.UTC(2026,10,12+n,12)).toISOString(),runId:String(n),p1,p2,codes:p2?['racing:COVERAGE_UNVERIFIED']:[],bad:n===2?['football']:[],secondary,mismatchCount:0});
function runtime(body,status=200){
 const elements=new Map(),requests=[],created=[];
 const element=(name)=>({name,children:[],attributes:{},textContent:'',className:'',append(...items){this.children.push(...items)},replaceChildren(){this.children=[]},setAttribute(k,v){this.attributes[k]=String(v)},addEventListener(name,fn){this['on'+name]=fn}});
 const document={getElementById(id){if(!elements.has(id))elements.set(id,element(id));return elements.get(id)},createElement:element,createElementNS(ns,tag){assert.equal(ns,'http://www.w3.org/2000/svg');const e=element(tag);created.push(e);return e}};
 const fetch=(url,opts)=>{requests.push({url,opts});return Promise.resolve({ok:status===200,status,json:async()=>({body})})};
 const scope={document,fetch,Date,Intl,AbortController:class{constructor(){this.signal={}}abort(){}},setTimeout:()=>1,clearTimeout(){},atob:s=>Buffer.from(s,'base64').toString('binary'),console};
 vm.runInNewContext(js,scope,{timeout:1000});
 return {elements,requests,created};
}
async function flush(){for(let i=0;i<12;i++)await Promise.resolve()}
(async()=>{
 const e=runtime(sample([row(0,0,1),row(1,0,1),row(2,1,2,'SECONDARY_UNAVAILABLE')]));await flush();
 assert.equal(e.requests.length,1);
 assert.equal(e.requests[0].url,'https://api.github.com/repos/aurelian2483-cmd/value-watch-lab/issues/27');
 assert.equal(e.requests[0].opts.cache,'no-store');
 assert.equal(e.elements.get('central-p1').textContent,'1');
 assert.equal(e.elements.get('central-p2').textContent,'2');
 assert.equal(e.elements.get('central-feeds').textContent,'3/4');
 assert.match(e.elements.get('central-trend-summary').textContent,/3 recorded audits/);
 assert.equal(e.elements.get('trend-issues-plot').children[0].name,'svg');
 assert.equal(e.elements.get('trend-feeds-plot').children[0].name,'svg');
 assert(e.created.some(x=>x.name==='circle'));
 assert.match(e.elements.get('central-trend-note').textContent,/latest 3 recorded audits/);
 const empty=runtime('No shared issue marker');await flush();
 assert.match(empty.elements.get('central-trend-summary').textContent,/No central audit history yet/);
 const malformed=runtime('<!-- ops-director-history-v1:INVALID= -->');await flush();
 assert.match(malformed.elements.get('central-trend-summary').textContent,/Central history unavailable/);
 const failed=runtime(sample([row(0,0,1)]),403);await flush();
 assert.match(failed.elements.get('central-trend-summary').textContent,/HTTP 403/);
 assert.equal(failed.elements.get('trend-issues-plot')?.children.length||0,0,'Must not draw fabricated data after failed response');
 const singleton=runtime(sample([row(0,0,1)]));await flush();
 assert.match(singleton.elements.get('central-trend-note').textContent,/One historical audit/);
 console.log('PASS: central Director SVG trends, four source health, accurate issue series, one-record baseline, fail-closed API and malformed-history handling');
})().catch(e=>{console.error(e);process.exitCode=1});
