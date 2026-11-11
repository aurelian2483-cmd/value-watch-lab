/* Cardano local experiment archive v1: explicit, fail-closed storage adapter. */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory(require('./experiment-ledger.js'));else root.CardanoExperimentStore=factory(root.CardanoExperimentLedger)})(typeof globalThis!=='undefined'?globalThis:this,function(Ledger){
'use strict';
const KEY='cardano.experiments.v1';
const hasOwn=(o,k)=>Object.prototype.hasOwnProperty.call(o,k);
function parse(raw){
 if(raw===null)return [];
 let envelope;try{envelope=JSON.parse(raw)}catch{throw new Error('Corrupt experiment archive JSON; original data preserved')}
 if(!envelope||envelope.schema_version!==1||!Array.isArray(envelope.records))throw new Error('Unsupported experiment archive; original data preserved');
 const ids=new Set();
 for(const record of envelope.records){
  const v=Ledger.validate(record);
  if(!v.valid)throw new Error('Invalid experiment archive record; original data preserved: '+v.errors.join('; '));
  if(ids.has(record.id))throw new Error('Duplicate experiment archive record; original data preserved');
  ids.add(record.id);
 }
 return envelope.records;
}
function store(storage,key=KEY){
 if(!storage||typeof storage.getItem!=='function'||typeof storage.setItem!=='function')throw new TypeError('Storage adapter required');
 if(typeof key!=='string'||!/^cardano\.[a-z0-9.-]{1,100}$/.test(key))throw new Error('Invalid archive key');
 const load=()=>parse(storage.getItem(key)).map(r=>JSON.parse(JSON.stringify(r)));
 return Object.freeze({
  load,
  append(record){
   const before=storage.getItem(key),history=parse(before);
   const next=Ledger.append(history,record);
   // Detect changes made between the read and write; cross-tab writes still require transactional backend.
   if(storage.getItem(key)!==before)throw new Error('Archive changed during append; retry after reloading');
   storage.setItem(key,JSON.stringify({schema_version:1,records:next}));
   return next.length;
  },
  exportJSON(){return JSON.stringify({schema_version:1,records:load()},null,2)},
  importJSON(json){
   if(typeof json!=='string')throw new TypeError('JSON text required');
   const incoming=parse(json),existing=load();
   if(existing.length)throw new Error('Import into nonempty archive refused; export backup and reconcile first');
   if(storage.getItem(key)!==null)throw new Error('Existing archive key present; refusing overwrite');
   storage.setItem(key,JSON.stringify({schema_version:1,records:incoming}));
   return incoming.length;
  }
 });
}
return Object.freeze({store,parse,KEY});
});
