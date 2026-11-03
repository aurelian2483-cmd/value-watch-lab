(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.HorseAdvice=factory()})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
function name(s){return String(s||'').normalize('NFKC').replace(/[’‘`]/g,"'").replace(/[‐‑–—]/g,'-').replace(/\s+\((GB|IRE|FR|USA|GER|ITY|AUS|NZ|JPN)\)$/i,'').trim().replace(/\s+/g,' ').toLocaleLowerCase('en-GB')}
function safeURL(s){try{const u=new URL(s);return u.protocol==='https:'&&!u.username&&!u.password?u.href:null}catch{return null}}
function family(s){const u=safeURL(s);if(!u)return null;const host=new URL(u).hostname.replace(/^www\./,'');for(const suffix of ['punterslounge.com','attheraces.com','racingpost.com','thetimes.com','theracingforum.co.uk','fatjockey.com','theukbettingforum.co.uk','olbg.com','reddit.com'])if(host===suffix||host.endsWith('.'+suffix))return suffix;return host}
function normalise(e){
 if(!e||typeof e.id!=='string'||!e.id||!e.race_id||!name(e.horse)||!name(e.author)||!safeURL(e.url)||!Number.isFinite(Date.parse(e.startUTC))||!['tipster','forum'].includes(e.group))return null;
 return {...e,race_id:String(e.race_id),horseKey:name(e.horse),authorKey:family(e.url)+'|'+name(e.author),family:family(e.url),stance:['support','caution','against','mention'].includes(e.stance)?e.stance:'support',topics:Array.isArray(e.topics)?e.topics.filter(x=>['surface','distance','course','going','draw','pace','class','weight','trainer','jockey','eyecatcher','price'].includes(x)):[],key:String(e.race_id)+'|'+name(e.horse)};
}
function aggregate(entries){
 const groups=new Map(),ids=new Set();let rejected=0;
 for(const raw of entries){const e=normalise(raw);if(!e||ids.has(e.id)){rejected++;continue}ids.add(e.id);if(!groups.has(e.key))groups.set(e.key,{key:e.key,horse:e.horse,race_id:e.race_id,startUTC:e.startUTC,event:e.event,entries:[]});const g=groups.get(e.key);if(Date.parse(g.startUTC)!==Date.parse(e.startUTC)){rejected++;continue}g.entries.push(e)}
 const rows=[...groups.values()].map(g=>{
  const authors=new Set(g.entries.map(e=>e.authorKey)),publishers=new Set(g.entries.map(e=>e.family));const byStance=kind=>new Set(g.entries.filter(e=>e.stance===kind).map(e=>e.authorKey)).size;
  const topicCounts={};for(const topic of new Set(g.entries.flatMap(e=>e.topics)))topicCounts[topic]=new Set(g.entries.filter(e=>e.topics.includes(topic)).map(e=>e.authorKey)).size;
  const textGroups=new Map();for(const e of g.entries){const text=name(e.original_excerpt);if(text.length<35)continue;if(!textGroups.has(text))textGroups.set(text,new Set());textGroups.get(text).add(e.authorKey)}
  const repeatedText=[...textGroups.values()].some(s=>s.size>1),attributed=g.entries.some(e=>safeURL(e.origin_url));
  return {...g,authors:authors.size,publishers:publishers.size,support:byStance('support'),caution:byStance('caution'),against:byStance('against'),mentions:byStance('mention'),topicCounts,repeatedText,attributed,repeated:authors.size>=2,independence:'NOT_ESTABLISHED'};
 });
 const byRace=new Map();for(const g of rows){if(!byRace.has(g.race_id))byRace.set(g.race_id,[]);byRace.get(g.race_id).push(g)}
 for(const g of rows){g.otherSelections=byRace.get(g.race_id).filter(h=>h.key!==g.key&&h.support>0).map(h=>h.horse);g.divided=(g.support>0&&g.against>0)||g.otherSelections.length>0}
 return {groups:rows,rejected};
}
return {name,safeURL,family,normalise,aggregate};
});
