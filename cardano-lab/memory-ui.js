'use strict';
(function(){
const $=id=>document.getElementById(id);
const list=$('records'),message=$('message'),sport=$('sport'),status=$('status'),exportButton=$('export');
let archive,records=[];
function text(tag,value,parent){const e=document.createElement(tag);e.textContent=value;parent.appendChild(e);return e}
function render(){
 list.replaceChildren();
 const filtered=records.filter(r=>(sport.value==='all'||r.sport===sport.value)&&(status.value==='all'||r.status===status.value));
 for(const r of filtered){
  const card=document.createElement('article');card.className='entry';
  text('h2',r.hypothesis,card);
  text('p',r.id+' · '+r.sport+' · '+r.lane,card);
  const pill=text('span',r.status,card);pill.className='pill';
  text('p','Recorded: '+r.created_at_utc+' | Updated: '+r.updated_at_utc,card);
  text('p','Method: '+r.method_version+' | Seed: '+r.seed,card);
  if(r.result_summary)text('p','Reported result: '+r.result_summary,card);
  text('small','Sources: '+r.sources.length+' | dataset SHA-256: '+r.dataset_sha256,card);
  list.appendChild(card);
 }
 if(!filtered.length)text('p',records.length?'No records match these filters.':'No experiments in this browser archive.',list);
}
function refresh(){
 try{
  archive=window.CardanoExperimentStore.store(window.localStorage);
  records=archive.load();
  $('total').textContent=String(records.length);
  $('rejected').textContent=String(records.filter(r=>r.status==='REJECTED').length);
  $('completed').textContent=String(records.filter(r=>r.status==='COMPLETED').length);
  $('active').textContent=String(records.filter(r=>r.status==='PROPOSED'||r.status==='RUNNING').length);
  exportButton.disabled=false;message.className='';
  message.textContent=records.length+' locally stored record(s). Nothing has been synchronised to a server.';
  render();
 }catch(e){
  records=[];list.replaceChildren();
  for(const id of ['total','rejected','completed','active'])$(id).textContent='—';
  exportButton.disabled=true;message.className='error';
  message.textContent='Archive unavailable: '+e.message+' No data has been overwritten.';
 }
}
for(const control of [sport,status])control.addEventListener('change',render);
$('refresh').addEventListener('click',refresh);
exportButton.addEventListener('click',()=>{
 try{
  const blob=new Blob([archive.exportJSON()],{type:'application/json'});
  const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='cardano-research-memory.json';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
 }catch(e){message.className='error';message.textContent='Export failed: '+e.message}
});
refresh();
})();
