'use strict';
const assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
const base=path.resolve(__dirname,'..'),Audit=require('../research-audit-core.js'),RaceCards=require('../racecards-core.js');
let now=Date.parse('2026-11-04T08:00:00Z'),doc;
class Element{
 constructor(tag='div'){this.tagName=tag.toUpperCase();this.children=[];this.dataset={};this.attributes={};this.style={};this.classList={toggle(){}};this.open=false;this.hidden=false;this.value='';this.id='';this._text=''}
 append(...xs){for(const x of xs){x.parentElement=this;this.children.push(x)}}
 replaceChildren(...xs){this.children=[];this._text='';this.append(...xs)}
 set textContent(s){this._text=String(s);this.children=[]}get textContent(){return this._text+this.children.map(x=>x.textContent).join(' ')}
 get options(){return this.children.filter(x=>x.tagName==='OPTION')}get lastElementChild(){return this.children.at(-1)}
 setAttribute(k,v){this.attributes[k]=String(v)}getAttribute(k){return this.attributes[k]??null}hasAttribute(k){return k in this.attributes}
 contains(x){return this===x||this.children.some(c=>c.contains(x))}focus(){doc.activeElement=this}
 closest(selector){let x=this;while(x){if(selector==='button'&&x.tagName==='BUTTON')return x;x=x.parentElement}return null}
 querySelectorAll(selector){const all=[];function walk(x){for(const c of x.children){all.push(c);walk(c)}}walk(this);return all.filter(x=>selector==='details[open]'?x.tagName==='DETAILS'&&x.open:selector==='details'?x.tagName==='DETAILS':selector==='button,summary,a'?['BUTTON','SUMMARY','A'].includes(x.tagName):false)}
}
const els=new Map(),listeners={},intervals=[];
doc={visibilityState:'visible',activeElement:null,body:{classList:{add(){},remove(){},toggle(){return true}}},createElement:t=>new Element(t),getElementById(id){if(els.has(id))return els.get(id);for(const e of els.values()){const found=[e,...e.querySelectorAll('button,summary,a')].find(x=>x.id===id);if(found)return found}const e=new Element(id.includes('filter')||id==='other-competition'||id==='nfl-view'?'select':'div');e.id=id;els.set(id,e);return e},querySelector:s=>doc.getElementById(s),querySelectorAll:()=>[],addEventListener:(n,f)=>{(listeners[n]??=[]).push(f)}};
const stamp=n=>new Date(n).toISOString(),guard={research_only:true,model_validation:'UNVALIDATED',publication_gate:'BLOCKED',generated_at_utc:stamp(now)};
function event(sport,i){const participants=[{id:'a'+i,name:'A'+i},{id:'b'+i,name:'B'+i}],p=.5+i*.025;return{id:sport+'-'+i,name:'A'+i+' vs B'+i,competition:sport==='nfl'?'NFL · Week 9':'ATP · Paris',startUTC:stamp(now+3*86400000+i*3600000),source:'https://site.api.espn.com/apis/site/v2/sports/'+(sport==='nfl'?'football/nfl':'tennis/atp')+'/scoreboard',participants,forecast:{model:'FIXED_ELO_K24_V1',calibrated:false,odds:null,expected_value:null,training_sha256:'a'.repeat(64),training_matches:100,training_latest_start_utc:stamp(now-8*3600000),generated_at_utc:stamp(now),market:sport==='nfl'?'GAME_RESULT_INCLUDING_OVERTIME':'MATCH_WINNER',outcomes:[{...participants[0],probability:p,prior_matches:12},...(sport==='nfl'?[{id:'tie',name:'Tie after overtime',probability:.01}]:[]),{...participants[1],probability:1-p-(sport==='nfl'?.01:0),prior_matches:14}]}}}
const football={home:'Home',away:'Away',league:'PL',kickoff_utc:stamp(now+36000000),model:'test',prob_home:.4,prob_draw:.3,prob_away:.3};
const fixtures={
 './research-dashboard-data.json':{...guard,experimental_model_forecasts:[football]},
 './football-expanded-data.json':{...guard,experimental_model_forecasts:[]},
 './horse-model-data.json':{...guard,form_forecasts:[],settled_forecasts:[]},
 './racing-research-data.json':{...guard,races:[{race_id:'r1',racecourse:'Kempton',name:'Test race',startUTC:stamp(now+7200000),runners:[]}]},
 './other-sports-data.json':{...guard,sports:{tennis:{generated_at_utc:stamp(now),events:[event('tennis',1)]},nfl:{generated_at_utc:stamp(now),events:Array.from({length:7},(_,i)=>event('nfl',i+1))}}},
 './racing-research/recommendations.json':{...guard},'./research-history.json':{...guard,entries:[]},'./horse-context-data.json':{...guard,forecasts:[],skipped:[],current_field_checks:{}}
};
let fetchCalls=0,hold=false,failRacecards=false,releases=[];
const context={document:doc,console,Intl,URL,AbortController,ResearchAudit:Audit,RaceCards,Date:class extends Date{static now(){return now}},selected:[],data:[],localReadFailed:false,save(){},render(){},matchMedia:()=>({matches:false}),MutationObserver:class{observe(){}},window:{location:{reload(){}}},setTimeout:()=>1,clearTimeout(){},setInterval:f=>intervals.push(f),fetch:async url=>{fetchCalls++;if(failRacecards&&url==='./racing-research-data.json')throw new Error('offline');if(hold)await new Promise(resolve=>releases.push(resolve));return{ok:true,json:async()=>JSON.parse(JSON.stringify(fixtures[url]))}}};
// Audit helpers use their actual clock by default. Bind the test's virtual time explicitly.
context.ResearchAudit={...Audit,freshness:(s,a)=>Audit.freshness(s,a,now),validateOtherEvent:(e,s,t)=>Audit.validateOtherEvent(e,s,t,now),validateOtherForecast:(e,s,t)=>Audit.validateOtherForecast(e,s,t,now)};
vm.runInNewContext(fs.readFileSync(path.join(base,'dashboard-data.js'),'utf8'),context);
const flush=async()=>{for(let i=0;i<5;i++)await new Promise(setImmediate)};
function clickSport(sport){const b=new Element('button');b.dataset.sport=sport;for(const f of listeners.click)f({target:b})}
(async()=>{
 await flush();assert.equal(fetchCalls,8);let root=doc.getElementById('sports-event-list');assert(root.children.some(c=>c.textContent.includes('NFL')));
 clickSport('racing');assert(doc.getElementById('event-source-status').textContent.includes('Published snapshot within 30 minutes'),'fresh snapshot has a distinct status');clickSport('all');
 const first=root.children[0],details=first.querySelectorAll('details')[0],summary=details.querySelectorAll('button,summary,a')[0];details.open=true;summary.focus();const focusId=summary.id;
 intervals[0]();await flush();assert.equal(fetchCalls,16,'periodic timer fetches new snapshots');assert.equal(root.children[0],first,'unchanged cards are not destroyed');assert(details.open);
 football.prob_home=.5;football.prob_draw=.2;hold=true;intervals[0]();for(const f of listeners.visibilitychange)f();assert.equal(fetchCalls,24,'concurrent timer/foreground refresh shares one fetch batch');hold=false;releases.splice(0).forEach(f=>f());await flush();assert.notEqual(root.children[0],first);assert(root.children[0].querySelectorAll('details')[0].open,'expanded model evidence survives updated data');assert.equal(doc.activeElement.id,focusId,'focused evidence summary restored');
 clickSport('nfl');assert.equal(root.children.length,5,'NFL defaults to five strongest research candidates');assert(root.children[0].textContent.includes('A7 vs B7'),'shortlist is ranked by model confidence');const selector=doc.getElementById('nfl-view');selector.onchange({target:{value:'all'}});assert.equal(root.children.length,7,'full weekly slate remains inspectable');
 doc.visibilityState='hidden';const before=fetchCalls;intervals[0]();assert.equal(fetchCalls,before,'hidden page avoids polling');doc.visibilityState='visible';listeners.visibilitychange.forEach(f=>f());await flush();assert.equal(fetchCalls,before+8,'foreground refreshes immediately');
 now+=37*3600000;intervals[0]();await flush();assert.equal(root.children.length,1);assert(root.textContent.includes('no available events'),'stale NFL snapshot cannot keep predictions visible');
 clickSport('racing');assert(doc.getElementById('event-source-status').textContent.includes('STALE: collection or publication'),'successful polling of old JSON must expose collector/publication delay');assert(doc.getElementById('event-source-status').textContent.includes('Published files checked'),'last file check is separate from snapshot age');const priorManual=fetchCalls;doc.getElementById('refresh-dashboard').onclick();await flush();assert.equal(fetchCalls,priorManual+8,'manual refresh fetches snapshots without destroying page state');
 failRacecards=true;doc.getElementById('refresh-dashboard').onclick();await flush();assert(doc.getElementById('event-source-status').textContent.includes('racecards unavailable'),'failed refresh is visible despite retained cached cards');assert(doc.getElementById('event-source-status').textContent.includes('1 races from 1 meetings'),'failed refresh retains original observations');
 console.log('Dashboard polling, single-flight refresh, expiry, NFL shortlist, open details and focus preservation passed');
})().catch(e=>{console.error(e);process.exitCode=1});
