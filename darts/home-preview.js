'use strict';
// Homepage-only coverage indicator. Never converts unauthenticated fixture inputs into predictions.
(()=>{
 const count=document.getElementById('pro-darts-count'),status=document.getElementById('pro-darts-feed-status');
 if(!count||!status)return;
 const unavailable=message=>{count.textContent='—';status.textContent=message};
 async function read(){
  try{
   const response=await fetch('./darts/feed.json?preview='+Date.now(),{cache:'no-store'});
   if(!response.ok)throw Error('Source feed unavailable');
   const d=await response.json();
   if(!d||d.schema_version!==1||d.research_only!==true||d.model_validation!=='UNVALIDATED'||d.publication_gate!=='BLOCKED'||!Array.isArray(d.fixtures)||!Array.isArray(d.results))throw Error('Invalid darts research feed');
   if(d.source_verification!=='NOT_CONFIGURED'||d.fixtures.length||d.results.length)throw Error('Source authentication required before public event counts');
   count.textContent='0';
   status.textContent='No verified darts fixture feed connected yet. The D1 research laboratory is available; predictions are withheld.';
  }catch{unavailable('Darts coverage cannot be verified. No forecasts or betting selections displayed.')}
 }
 read();
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)read()});
})();
