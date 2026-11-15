'use strict';
(()=>{
 const Model=window.ValueWatchDarts, $=id=>document.getElementById(id);
 const feed='./feed.json', allowedKeys=new Set(['results','fixtures']);
 let local=null;
 const element=(parent,tag,text,cls)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=String(text);if(cls)n.className=cls;parent.append(n);return n};
 function clear(){ $('matches').replaceChildren();$('fixtures-count').textContent='0';$('historic-count').textContent='0';$('forecast-count').textContent='0'; }
 function display(report,kind){
  clear();
  $('historic-count').textContent=String(report.training_matches);
  $('fixtures-count').textContent=String(report.fixtures.length);
  const eligible=report.fixtures.filter(x=>x.status==='EXPERIMENTAL_UNCALIBRATED');
  $('forecast-count').textContent=String(eligible.length);
  $('feed-status').textContent=kind+' · '+eligible.length+' experimental forecasts / '+report.fixtures.length+' upcoming fixtures · UNVALIDATED / BLOCKED. '+(kind.startsWith('Local')?'Uploaded values are not independently authenticated.':'Published source receipts are required.');
  if(!report.fixtures.length){element($('matches'),'p','No source-confirmed upcoming darts fixtures currently available. The research module is active, but no predictions are invented.');return}
  for(const f of report.fixtures){
   const card=element($('matches'),'article',undefined,'match');
   element(card,'small',f.competition+' · '+new Date(f.start_utc).toLocaleString('en-GB',{timeZone:'Europe/London',dateStyle:'medium',timeStyle:'short'})+' UK');
   element(card,'h3',f.player_a.name+' vs '+f.player_b.name);
   if(f.prob_a===null){element(card,'p','PASS · Insufficient source history. Requires at least '+Model.MIN_MATCHES+' historical matches per player.');continue}
   element(card,'strong',f.player_a.name+' '+(100*f.prob_a).toFixed(1)+'% · '+f.player_b.name+' '+(100*f.prob_b).toFixed(1)+'%');
   const meter=element(card,'div',undefined,'meter'),fill=element(meter,'div',undefined,'fill');fill.style.width=(100*f.prob_a)+'%';
   element(card,'small','Elo: '+f.rating_a.toFixed(1)+' vs '+f.rating_b.toFixed(1)+' · previous matches '+f.prior_a+'/'+f.prior_b+' · NOT CALIBRATED');
  }
 }
 function loadDocument(doc,kind){
  if(!doc||typeof doc!=='object'||Array.isArray(doc)||Object.keys(doc).some(k=>!allowedKeys.has(k)&&k!=='schema_version'&&k!=='research_only'&&k!=='model_validation'&&k!=='publication_gate'&&k!=='source_verification'&&k!=='generated_at_utc'))throw Error('Unexpected data schema');
  if(kind==='Published feed'){
   if(doc.schema_version!==1||doc.research_only!==true||doc.model_validation!=='UNVALIDATED'||doc.publication_gate!=='BLOCKED'||doc.source_verification!=='NOT_CONFIGURED')throw Error('Published source has not passed the required feed contract');
   if(doc.results.length||doc.fixtures.length)throw Error('Published populated feed requires a separately reviewed source collector and verification status');
  }
  if(!Array.isArray(doc.results)||!Array.isArray(doc.fixtures))throw Error('Expected results and fixtures arrays');
  const at=new Date().toISOString().replace(/\.\d{3}Z$/,'Z');
  const r=Model.model(doc.results,doc.fixtures,at);
  display(r,kind);
 }
 async function refresh(){
  if(local)return;
  try{
   const response=await fetch(feed+'?v='+Date.now(),{cache:'no-store'});
   if(!response.ok)throw Error('Research feed unavailable');
   const doc=await response.json();loadDocument(doc,'Published feed');
  }catch(error){clear();$('feed-status').textContent='Darts research feed unavailable ('+(error?.message||'unknown error')+'). No predictions displayed.'}
 }
 $('refresh').addEventListener('click',()=>{local=null;$('import-json').value='';$('import-status').textContent='Local experiment cleared; loading the published feed.';refresh()});
 $('reset').addEventListener('click',()=>{local=null;$('import-json').value='';$('import-status').textContent='Local experiment cleared.';refresh()});
 $('import-json').addEventListener('change',async()=>{
  const file=$('import-json').files?.[0];if(!file)return;
  if(file.size>3000000){$('import-status').textContent='File exceeds the 3MB local-import limit.';return}
  try{
   const doc=JSON.parse(await file.text());
   // Validate before replacing an active local experiment.
   const now=new Date().toISOString().replace(/\.\d{3}Z$/,'Z');
   Model.model(doc.results,doc.fixtures,now);
   local=doc;loadDocument(doc,'Local illustrative research');
   $('import-status').textContent='Local JSON processed in this browser only. No source verification, market odds or betting recommendation.';
  }catch(error){$('import-status').textContent='Import rejected: '+(error?.message||'Invalid JSON')+'. Previous published data remain unchanged.'}
 });
 refresh();
})();
