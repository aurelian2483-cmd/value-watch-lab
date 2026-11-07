'use strict';
const assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),C=require('../paper-lab/core.js');
let now=Date.parse('2026-11-08T10:00:00Z'),doc;
class Element{
 constructor(tag='div'){this.tagName=tag;this.children=[];this.dataset={};this.value='';this._text='';this.disabled=false;this.open=false;this.id=''}
 append(...rows){this.children.push(...rows)}replaceChildren(...rows){this.children=[...rows];this._text=''}
 set textContent(v){this._text=String(v);this.children=[]}get textContent(){return this._text+' '+this.children.map(c=>c.textContent).join(' ')}
 get firstElementChild(){return this.children[0]}contains(x){return this===x||this.children.some(c=>c.contains(x))}focus(){doc.activeElement=this}
 querySelectorAll(q){const all=[];const walk=e=>{for(const c of e.children){all.push(c);walk(c)}};walk(this);return all.filter(e=>q==='details[open]'?e.tagName==='details'&&e.open:q==='details'?e.tagName==='details':q==='button'?e.tagName==='button':false)}
}
const els=new Map(),intervals=[],listeners={},local=new Map();
doc={hidden:false,activeElement:null,createElement:t=>new Element(t),getElementById(id){for(const e of els.values()){const find=n=>n.id===id?n:n.children.map(find).find(Boolean);const found=find(e);if(found)return found}if(!els.has(id)){const e=new Element();e.id=id;els.set(id,e)}return els.get(id)},addEventListener:(n,f)=>listeners[n]=f};
doc.getElementById('sport').value='all';doc.getElementById('slot').value='1';
const stamp=()=>new Date(now).toISOString(),guard=()=>({schema_version:1,...C.GATES,generated_at_utc:stamp()});
const fixture=()=>({...guard(),upcoming_fixtures:[{home:'Home',away:'Away',kickoff_utc:'2026-11-08T14:00:00Z',schedule_source_receipts:[{url:'https://example.org/event',observed_at_utc:stamp()}]}]});
let count=0,fail=false,hold=false,releases=[];
const scope={document:doc,window:{addEventListener:(n,f)=>listeners[n]=f},console,Intl,URL,AbortController,structuredClone,Blob,Date:class extends Date{constructor(...a){super(...(a.length?a:[now]))}static now(){return now}},PaperLab:{...C,status:e=>C.status(e,now),addLeg:(p,s,e,c)=>C.addLeg(p,s,e,c,now),inspect:(p,e)=>C.inspect(p,e,now),freeze:p=>C.freeze(p,now)},localStorage:{getItem:k=>local.get(k)??null,setItem:(k,v)=>local.set(k,v)},setTimeout:()=>1,clearTimeout(){},setInterval:f=>{intervals.push(f);return 1},clearInterval(){},fetch:async path=>{count++;if(hold)await new Promise(r=>releases.push(r));if(fail&&path.includes('expanded'))throw Error('offline');return{ok:true,json:async()=>path.includes('dashboard')||path.includes('expanded')?fixture():path.includes('racing')?{...guard(),races:[]}:path.includes('history')?{...guard(),entries:[]}:{...guard(),sports:{}}}}};
vm.runInNewContext(fs.readFileSync(require('node:path').join(__dirname,'../paper-lab/app.js'),'utf8'),scope);
const flush=async()=>{for(let i=0;i<8;i++)await new Promise(setImmediate)};
(async()=>{
 await flush();assert.equal(count,5);assert.equal(doc.getElementById('events').children.length,1,'duplicate feed identity merged');
 const root=doc.getElementById('events'),card=root.children[0],detail=card.querySelectorAll('details')[0];detail.open=true;detail.firstElementChild.focus();
 intervals[0]();assert.equal(root.children[0],card,'clock check does not rebuild unchanged content');assert(detail.open);
 card.querySelectorAll('button')[0].onclick();assert(doc.getElementById('slips').textContent.includes('1 legs'));assert(local.size>0);
 doc.getElementById('freeze').onclick();const oldHistory=local.get('value-watch-paper-lab-v3-history');assert(oldHistory.includes('Home'));assert(oldHistory.includes('prospective_verified'));
 hold=true;const before=count;doc.getElementById('refresh').onclick();doc.getElementById('refresh').onclick();assert.equal(count,before+5,'single-flight refresh');hold=false;releases.splice(0).forEach(r=>r());await flush();
 fail=true;doc.getElementById('refresh').onclick();await flush();assert(doc.getElementById('feeds').textContent.includes('last successful snapshot retained'));
 now+=37*3600000;intervals[0]();assert(root.textContent.includes('HISTORICAL_OR_STARTING'));assert(root.children[0].querySelectorAll('button').every(b=>b.disabled));assert.equal(local.get('value-watch-paper-lab-v3-history'),oldHistory,'expiry does not rewrite frozen history');
 doc.getElementById('reasoning').value='<img src=x onerror=alert(1)> guaranteed winner';doc.getElementById('methodology').value='SECTIONALS';doc.getElementById('evidence').value='https://example.org';doc.getElementById('community').onsubmit({preventDefault(){}});const review=doc.getElementById('community-result');assert(review.textContent.includes('HIGH_RISK_CLAIM'));assert(review.textContent.includes('<img'),'untrusted claim rendered as text');assert.equal(review.querySelectorAll('details').length,1);
 listeners.storage({key:'value-watch-paper-lab-v3'});assert(doc.getElementById('storage').textContent.includes('another tab'));
 console.log('Paper lab UI: async refresh, retained snapshots, no redundant renders, additions, frozen history, expiry, safe claim rendering and cross-tab protection passed');
})().catch(e=>{console.error(e);process.exitCode=1});
