(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.ResearchTrack=factory()})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const stamp=x=>{const n=Date.parse(x);if(typeof x!=='string'||!Number.isFinite(n))throw Error('Valid UTC timestamp required');return n};
function url(s){try{const u=new URL(s);return u.protocol==='https:'&&!u.username&&!u.password?u.href:null}catch{return null}}
function canonical(x){if(x===null||typeof x!=='object')return JSON.stringify(x);if(Array.isArray(x))return '['+x.map(canonical).join(',')+']';return '{'+Object.keys(x).sort().map(k=>JSON.stringify(k)+':'+canonical(x[k])).join(',')+'}'}
async function digest(x){if(!crypto.subtle)throw Error('The price ledger requires HTTPS with Web Crypto support.');const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(canonical(x)));return Array.from(new Uint8Array(bytes),b=>b.toString(16).padStart(2,'0')).join('')}
function text(s,max=250){return typeof s==='string'&&s.trim().length>0&&s.length<=max}
function validateEvent(e,prior){
if(!e||!text(e.id,80)||prior.some(x=>x.id===e.id)||!['QUOTE','CLOSE','RESULT'].includes(e.type)||!e.payload||typeof e.payload!=='object')throw Error('Invalid or duplicate ledger event');
const time=stamp(e.recordedAtUTC),p=e.payload;if(prior.length&&time<stamp(prior[prior.length-1].recordedAtUTC))throw Error('Ledger times must be chronological');
if(e.type==='QUOTE'){
 if(!text(p.event)||!text(p.selection)||!['WIN','FULL_TIME_1X2'].includes(p.market)||!text(p.bookmaker,80)||!url(p.sourceURL)||typeof p.odds!=='number'||!Number.isFinite(p.odds)||p.odds<=1||p.odds>10000)throw Error('Complete event, selection, source and decimal odds required');
 const start=stamp(p.startUTC),seen=stamp(p.observedAtUTC);if(start<=time+300000||seen>time||time-seen>1800000)throw Error('Capture before the five-minute cutoff, with a quote observed within 30 minutes');
}else{
 const q=prior.find(x=>x.id===p.quoteId&&x.type==='QUOTE');if(!q)throw Error('Original quote not found');if(!url(p.sourceURL))throw Error('HTTPS evidence source required');
 if(e.type==='RESULT'){if(!['WIN','LOSS','VOID'].includes(p.outcome)||time<stamp(q.payload.startUTC))throw Error('A result can only be recorded after the event starts');}
 else{if(typeof p.odds!=='number'||!Number.isFinite(p.odds)||p.odds<=1||p.odds>10000||stamp(p.observedAtUTC)>=stamp(q.payload.startUTC)||stamp(p.observedAtUTC)<stamp(q.payload.observedAtUTC)||stamp(p.observedAtUTC)>time||p.bookmaker!==q.payload.bookmaker)throw Error('Closing quote must follow the opening observation, precede the start and use the same bookmaker');}
}
}
async function verify(events,now=Date.now()){
if(!Array.isArray(events)||events.length>2000)throw Error('Ledger must contain at most 2,000 events');let previous='GENESIS',prior=[];
for(const e of events){validateEvent(e,prior);if(stamp(e.recordedAtUTC)>now+300000)throw Error('Future ledger timestamp');const {hash,...body}=e;if(e.previousHash!==previous||hash!==await digest(body))throw Error('Ledger hash chain does not match');prior.push(e);previous=hash;}return true;
}
async function append(events,type,payload,now=new Date().toISOString()){
await verify(events);if(!crypto.subtle||!crypto.randomUUID)throw Error('The price ledger requires HTTPS with Web Crypto support.');const e={id:crypto.randomUUID(),type,recordedAtUTC:now,previousHash:events.at(-1)?.hash||'GENESIS',payload};validateEvent(e,events);e.hash=await digest(e);return [...events,e];
}
function stats(events){let profit=0,peak=0,drawdown=0,wins=0,losses=0,voids=0;const quotes=events.filter(e=>e.type==='QUOTE'),latest=new Map();for(const e of events)if(e.type==='RESULT')latest.set(e.payload.quoteId,e);
const settled=[...latest.values()].sort((a,b)=>a.recordedAtUTC.localeCompare(b.recordedAtUTC));for(const e of settled){const q=quotes.find(q=>q.id===e.payload.quoteId);if(!q)continue;const s=e.payload.outcome;if(s==='WIN'){wins++;profit+=q.payload.odds-1}else if(s==='LOSS'){losses++;profit--}else voids++;peak=Math.max(peak,profit);drawdown=Math.max(drawdown,peak-profit)}const stakes=wins+losses;return {quotes:quotes.length,wins,losses,voids,pending:quotes.length-latest.size,profit,stakes,yield:stakes?profit/stakes:null,hitRate:stakes?wins/stakes:null,drawdown};
}
function vector(r){const ps=[r.prob_home,r.prob_draw,r.prob_away];return ps.every(p=>typeof p==='number'&&Number.isFinite(p)&&p>0&&p<1)&&Math.abs(ps.reduce((a,b)=>a+b,0)-1)<1e-8}
function context(r){const active=(r.runners||[]).filter(h=>h.active_runner===true&&h.runner_status==='RUNNER');const count=k=>active.filter(h=>h[k]!==null&&h[k]!==undefined&&h[k]!=='').length;return {active:active.length,official_rating:count('official_rating'),weight:count('weight'),draw:count('draw'),trainer:count('trainer'),jockey:count('jockey'),prior_runs:active.filter(h=>(h.previous_results||[]).length>=3).length}}
function paired(baseline,challenger){
 const latest=rows=>{const m=new Map();for(const r of rows||[]){const key=r.race_id+'|'+r.startUTC,prev=m.get(key);if(!prev||stamp(r.generated_at_utc)>stamp(prev.generated_at_utc))m.set(key,r)}return m};
 const a=latest(baseline),b=latest(challenger),rows=[];let excluded=0;
 for(const [key,x] of a){const y=b.get(key);if(!y)continue;const ids=r=>(r.runners||[]).map(h=>h.horse_id).sort();const ps=r=>(r.runners||[]).map(h=>h.model_probability);
 if(canonical(ids(x))!==canonical(ids(y))||x.winner_horse_id!==y.winner_horse_id||!x.winner_horse_id||[x,y].some(r=>stamp(r.generated_at_utc)>=stamp(r.startUTC)-300000||new Set(ids(r)).size!==ids(r).length||ps(r).some(p=>typeof p!=='number'||!Number.isFinite(p)||p<=0||p>=1)||Math.abs(ps(r).reduce((a,b)=>a+b,0)-1)>1e-8)){excluded++;continue}
 const score=r=>{const w=r.runners.find(h=>h.horse_id===r.winner_horse_id);if(!w)return null;return {log:-Math.log(w.model_probability),brier:r.runners.reduce((s,h)=>s+(h.model_probability-Number(h.horse_id===r.winner_horse_id))**2,0)}};
 const sa=score(x),sb=score(y);if(!sa||!sb){excluded++;continue}rows.push({race_id:x.race_id,logDelta:sb.log-sa.log,brierDelta:sb.brier-sa.brier});
 }return {n:rows.length,excluded,logDelta:rows.length?rows.reduce((s,r)=>s+r.logDelta,0)/rows.length:null,brierDelta:rows.length?rows.reduce((s,r)=>s+r.brierDelta,0)/rows.length:null};
}
return {paired,stamp,url,canonical,digest,verify,append,stats,vector,context};
});
