'use strict';
// Diagnostic for PUBLIC source markup only; do not collect credentials, scripts or form data.
(async()=>{
 const u='https://racingontv.co.uk/?day=today';
 const c=new AbortController();const timer=setTimeout(()=>c.abort(),12000);
 try{
  const r=await fetch(u,{signal:c.signal,redirect:'error',headers:{'user-agent':'ValueWatchOps/1.0 public research check'}});
  const h=await r.text();console.log('secondary HTTP',r.status,'bytes',h.length);
  for(const venue of ['Thurles','Market Rasen','Hereford','All meetings today','21 races']){
   const at=h.toLowerCase().indexOf(venue.toLowerCase());
   const slice=at<0?'NOT PRESENT':h.slice(Math.max(0,at-380),Math.min(h.length,at+650)).replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'[SCRIPT OMITTED]').replace(/[\r\n]+/g,' ').slice(0,1100);
   console.log('MARKUP EXCERPT',venue,JSON.stringify(slice));
  }
 }catch(e){console.log('Public page inspection not available:',e.message)}
 finally{clearTimeout(timer)}
})();
