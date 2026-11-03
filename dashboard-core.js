(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.DashboardCore=factory()})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 function restoreTrial(defaults,raw){
  const fallback=()=>({data:defaults.map(x=>({...x,sample:false})),selected:[],loadError:false});
  if(raw===null||raw===undefined||raw==='')return fallback();
  try{
   const saved=JSON.parse(raw);if(!saved||typeof saved!=='object'||Array.isArray(saved))throw Error();
   if(saved.data!==undefined&&(!Array.isArray(saved.data)||saved.data.length>100||saved.data.some(x=>!x||['id','selection','sport','event'].some(k=>typeof x[k]!=='string'||!x[k].trim()))||new Set(saved.data.map(x=>x.id)).size!==saved.data.length))throw Error();
   if(saved.selected!==undefined&&(!Array.isArray(saved.selected)||saved.selected.some(x=>typeof x!=='string')))throw Error();
   const data=(saved.data===undefined?defaults:saved.data).map(x=>({...x,sample:false})),ids=new Set(data.map(x=>x.id));
   return {data,selected:[...new Set(saved.selected||[])].filter(id=>ids.has(id)),loadError:false};
  }catch{return {...fallback(),loadError:true}}
 }
 function recordTiming(x,now=Date.now()){
  let start=NaN;
  const iso=x.startUTC||x.eventStartUTC||x.kickoffUTC;
  if(typeof iso==='string'&&/(?:Z|[+-]\d{2}:\d{2})$/.test(iso))start=Date.parse(iso);
  else{
   const m=String(x.event||'').match(/(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\w*\s+(\d{4})\s*[·,]?\s*(?:at\s*)?(\d{1,2}):(\d{2})\s*(GMT|UTC)/i);
   if(m){const month=['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'].indexOf(m[2].toLowerCase()),v=new Date(Date.UTC(+m[3],month,+m[1],+m[4],+m[5]));if(v.getUTCMonth()===month&&v.getUTCDate()===+m[1]&&+m[4]<24&&+m[5]<60)start=v.getTime()}
  }
  return !Number.isFinite(start)?'TIME_UNCONFIRMED':start<=now?'ARCHIVED':'UPCOMING';
 }
 return {restoreTrial,recordTiming};
});
