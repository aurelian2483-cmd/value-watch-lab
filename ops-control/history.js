/* Read-only incident journal: local to this browser, separate from Value Watch storage. */
(function(root){
 'use strict';
 const KEY='vw-ops-control:incident-history:v1';
 const MAX_ITEMS=250;
 function validDate(s){return typeof s==='string'&&Number.isFinite(Date.parse(s))?Date.parse(s):null}
 function normalize(s){return String(s||'').toLowerCase().replace(/\\b\\d{4}-\\d{2}-\\d{2}t[^\\s]+\\b/g,'<date>').replace(/\\b\\d+(?:\\.\\d+)?\\b/g,'#').replace(/\\s+/g,' ').trim().slice(0,250)}
 function identity(a){const input=String(a.owner||'')+'|'+String(a.recommendedAction||'');let hash=2166136261;for(let i=0;i<input.length;i++){hash^=input.charCodeAt(i);hash=Math.imul(hash,16777619)}return 'ops-'+(hash>>>0).toString(16).padStart(8,'0')}
 function blank(){return {schemaVersion:1,incidents:[],lastAuditAt:null,revision:0}}
 function load(storage){if(!storage)return {state:blank(),available:false,warning:'Browser storage unavailable; history cannot be saved.'};try{const raw=storage.getItem(KEY);if(!raw)return {state:blank(),available:true,warning:null};const d=JSON.parse(raw);if(!d||d.schemaVersion!==1||!Array.isArray(d.incidents))throw Error('Invalid local history schema');return {state:{schemaVersion:1,incidents:d.incidents.filter(x=>x&&typeof x.key==='string'&&['ACTIVE','RESOLVED'].includes(x.state)).slice(0,MAX_ITEMS),lastAuditAt:d.lastAuditAt||null,revision:Number.isInteger(d.revision)?d.revision:0},available:true,warning:null}}catch(_){return {state:blank(),available:false,warning:'Stored incident history could not be read. Nothing has been overwritten.'}}}
 function reconcile(previous,actions,nowISO,complete){
  const when=validDate(nowISO);if(when===null)throw Error('Invalid audit timestamp');
  const out={schemaVersion:1,incidents:previous.incidents.map(x=>({...x})),lastAuditAt:previous.lastAuditAt||null,revision:previous.revision||0};
  const active=new Set();
  for(const action of actions){if(action.priority==='P3'&&action.observations?.length===1&&/^No source/i.test(String(action.observations[0])))continue;
    const key=identity(action);active.add(key);let entry=out.incidents.find(x=>x.key===key);
    if(!entry){entry={key,owner:action.owner,priority:action.priority,action:action.recommendedAction,state:'ACTIVE',firstSeen:nowISO,lastSeen:nowISO,resolvedAt:null,occurrences:1,reopenCount:0,observations:(action.observations||[]).slice(0,8),firstSeenInThisBrowser:true};out.incidents.unshift(entry);}
    else{const oldTime=validDate(entry.lastSeen);if(entry.state==='RESOLVED'){entry.reopenCount=(entry.reopenCount||0)+1;entry.resolvedAt=null;entry.state='ACTIVE'}if(oldTime===null||when>=oldTime){entry.lastSeen=nowISO;entry.occurrences=(entry.occurrences||0)+1;entry.observations=(action.observations||[]).slice(0,8);entry.owner=action.owner;entry.action=action.recommendedAction;entry.priority=action.priority}}
  }
  /* Failed or incomplete audits must not silently resolve old incidents. */
  if(complete){for(const entry of out.incidents){if(entry.state==='ACTIVE'&&!active.has(entry.key)){entry.state='RESOLVED';entry.resolvedAt=nowISO}}}
  out.incidents.sort((a,b)=>((validDate(b.lastSeen)||0)-(validDate(a.lastSeen)||0)));
  /* Preserve active incidents, then most recent resolved incidents, within bounded storage. */
  const keepActive=out.incidents.filter(x=>x.state==='ACTIVE'),keepResolved=out.incidents.filter(x=>x.state==='RESOLVED');
  out.incidents=[...keepActive.slice(0,MAX_ITEMS),...keepResolved.slice(0,Math.max(0,MAX_ITEMS-keepActive.length))];
  out.lastAuditAt=nowISO;out.revision++;return out;
 }
 function save(storage,state){if(!storage)return false;try{storage.setItem(KEY,JSON.stringify(state));return true}catch(_){return false}}
 const api={KEY,MAX_ITEMS,load,reconcile,save,identity};
 if(typeof module!=='undefined'&&module.exports)module.exports=api;
 if(root)root.VWIncidentHistory=api;
})(typeof window!=='undefined'?window:null);
