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
   if(d.source_verification==='NOT_CONFIGURED'){
    if(d.fixtures.length||d.results.length||(d.tentative_fixtures||[]).length)throw Error('Unconfigured feed contained data');
    count.textContent='0';
    status.textContent='No verified darts fixture feed connected yet. The D1 research laboratory is available; predictions are withheld.';
    return;
   }
   if(d.source_verification!=='PROVIDER_OBSERVED_UNCORROBORATED'||!d.coverage?.sample_only||
      !Array.isArray(d.source_receipts)||d.source_receipts.length!==4||
      !d.source_receipts.every(r=>r&&/^[a-f0-9]{64}$/.test(r.sha256))||
      !Array.isArray(d.tentative_fixtures)||d.fixtures.length>12||
      d.results.length>80||d.tentative_fixtures.length>12)throw Error('Unsafe or incomplete provider research sample');
   const collected=Date.parse(d.generated_at_utc);
   if(!Number.isFinite(collected)||collected>Date.now()+300000||Date.now()-collected>172800000)throw Error('Stale provider research sample');
   const upcoming=d.fixtures.filter(f=>f?.status==='SCHEDULED'&&Date.parse(f.start_utc)>Date.now()+300000);
   const tentative=d.tentative_fixtures.filter(f=>f?.status==='DATE_ONLY_UNCONFIRMED');
   count.textContent=String(upcoming.length);
   status.textContent='Provider-observed research sample: '+upcoming.length+' confirmed-time fixture(s), '+
     tentative.length+' date-only unconfirmed fixture(s) and '+d.results.length+
     ' historical match record(s). Source not independently verified; UNVALIDATED / BLOCKED. No verified darts fixture feed for betting.';
  }catch{unavailable('Darts coverage cannot be verified. No forecasts or betting selections displayed.')}
 }
 read();
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)read()});
})();
