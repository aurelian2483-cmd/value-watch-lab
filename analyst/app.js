(()=>{'use strict';
const $=id=>document.getElementById(id);
const SOURCES=[
 {id:'football',path:'../research-dashboard-data.json',limit:24},
 {id:'racing',path:'../racing-research-data.json',limit:6},
 {id:'other',path:'../other-sports-data.json',limit:24},
 {id:'history',path:'../research-history.json',limit:168}
];
let records=[],feeds=[],archive=null;
const safeTime=value=>typeof value==='string'&&Number.isFinite(Date.parse(value))?Date.parse(value):null;
const text=(id,v)=>{$(id).textContent=String(v)};
const add=(parent,tag,v,className)=>{const e=document.createElement(tag);if(v!==undefined)e.textContent=String(v);if(className)e.className=className;parent.append(e);return e};
function valid(d){return d&&typeof d==='object'&&!Array.isArray(d)&&d.research_only===true&&d.model_validation==='UNVALIDATED'&&d.publication_gate==='BLOCKED'}
async function getSource(spec){
 const ctrl=new AbortController(),timer=setTimeout(()=>ctrl.abort(),12000);
 try{const r=await fetch(spec.path,{cache:'no-store',signal:ctrl.signal});if(!r.ok)throw Error('HTTP '+r.status);
 const d=await r.json();if(!d||typeof d!=='object'||Array.isArray(d))throw Error('Invalid source format');
 const ts=safeTime(d.generated_at_utc),age=ts===null?null:Date.now()-ts;
 return {id:spec.id,ok:true,valid:valid(d),stale:age===null||age<0||age>spec.limit*3600000,data:d,stamp:ts};
 }catch(e){return {id:spec.id,ok:false,valid:false,stale:true,error:String(e?.message||e)}}finally{clearTimeout(timer)}
}
const ukTime=ts=>{const ms=safeTime(ts);return ms===null?'Unavailable':new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/London',day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'}).format(new Date(ms))};
const row=(sport,name,time,hasModel,sourceStatus,modelName)=>({sport,name:String(name||'Unnamed source record'),time,hasModel:!!hasModel,sourceStatus,modelName:modelName||null});
function gather(s){
 const output=[];
 const f=s.find(x=>x.id==='football');
 if(f?.ok&&f.valid){
  for(const x of (Array.isArray(f.data.upcoming_fixtures)?f.data.upcoming_fixtures:[]).slice(0,100)){
   const found=Array.isArray(f.data.experimental_model_forecasts)&&f.data.experimental_model_forecasts.some(m=>(m.home===x.home&&m.away===x.away)||(m.fixture_id&&m.fixture_id===x.fixture_id));
   output.push(row('football',x.home+' vs '+x.away,x.kickoff_utc,found||x.has_experimental_model_forecast,'SCHEDULE CROSS-CHECK',found?'Experimental model':null));
  }
 }
 const r=s.find(x=>x.id==='racing');
 if(r?.ok&&r.valid){
  for(const x of (Array.isArray(r.data.races)?r.data.races:[]).slice(0,120)){
   output.push(row('racing',x.racecourse+' · '+(x.name||'Race '+x.race_id),x.startUTC,x.forecast_eligible&&x.prediction!=null,x.verification||'SINGLE SOURCE',null));
  }
 }
 const other=s.find(x=>x.id==='other');
 if(other?.ok&&other.valid)for(const sport of ['tennis','nfl']){
  const items=other.data.sports?.[sport]?.events;
  for(const x of (Array.isArray(items)?items:[]).slice(0,100))output.push(row(sport,x.name,x.startUTC,!!x.forecast?.outcomes?.length,x.source?'SOURCE-OBSERVED':'UNVERIFIED',x.forecast?.model));
 }
 return output.sort((a,b)=>(safeTime(a.time)??Infinity)-(safeTime(b.time)??Infinity));
}
function apply(){
 const sport=$('filter-sport').value,range=$('filter-range').value,evidence=$('filter-evidence').value,now=Date.now();
 const found=records.filter(x=>(sport==='all'||sport===x.sport)&&(range==='all'||(range==='upcoming'?(safeTime(x.time)??-1)>=now:(safeTime(x.time)??Infinity)<now))&&(evidence==='all'||(evidence==='model'?x.hasModel:!x.hasModel)));
 const tbody=$('analyst-events');tbody.replaceChildren();
 for(const x of found.slice(0,80)){
  const tr=add(tbody,'tr');
  add(tr,'td',x.sport==='racing'?'Horse Racing':x.sport==='nfl'?'NFL':x.sport[0].toUpperCase()+x.sport.slice(1));
  add(tr,'td',x.name);add(tr,'td',ukTime(x.time));
  add(tr,'td',x.hasModel?'Experimental · uncalibrated':'Unavailable');
  add(tr,'td','Not verified');add(tr,'td','Unavailable');add(tr,'td','PASS / UNGRADED');
 }
 if(!found.length){const tr=add(tbody,'tr');const cell=add(tr,'td','No source-backed observations meet these filters.');cell.colSpan=7}
 text('results-count',found.length+' matching source observations'+(found.length>80?' · first 80 shown':''));
 const overview=$('sport-overview');overview.replaceChildren();
 for(const name of ['football','racing','tennis','nfl']){
  const n=records.filter(x=>x.sport===name).length,entry=add(overview,'div',undefined,'overview-row');
  add(entry,'span',name==='racing'?'♞ Horse Racing':name==='nfl'?'◆ NFL':name==='tennis'?'◉ Tennis':'⚽ Football');add(entry,'strong',n+' records');
 }
 text('metric-events',records.length);
 const bars=$('sport-bars');bars.replaceChildren();const top=Math.max(1,...['football','racing','tennis','nfl'].map(x=>records.filter(r=>r.sport===x).length));
 for(const name of ['football','racing','tennis','nfl']){
  const count=records.filter(r=>r.sport===name).length,line=add(bars,'div',undefined,'sport-bar-row');
  add(line,'span',name==='racing'?'Racing':name==='nfl'?'NFL':name[0].toUpperCase()+name.slice(1));
  const track=add(line,'div',undefined,'sport-bar-track'),fill=add(track,'div',undefined,'sport-bar-fill');fill.style.width=(100*count/top).toFixed(1)+'%';add(line,'strong',count);
 }
}
function historic(){
 const node=$('history-output');node.replaceChildren();
 if(!archive?.ok||!archive.valid){add(node,'p','Verified historical model results unavailable from source.','muted');return}
 const entries=Array.isArray(archive.data.entries)?archive.data.entries:[];
 if(!entries.length){add(node,'p','No archived research results available.','muted');return}
 const flag=archive.data.metrics_status||'UNVALIDATED';
 add(node,'p',entries.length+' archived model observations · '+flag+'. No audited ROI or paper-slip profit inferred.','muted');
 for(const x of entries.slice(-5).reverse()){
  const line=add(node,'div',undefined,'history-row');
  add(line,'span',String(x.home||'?')+' vs '+String(x.away||'?'));
  add(line,'strong',x.actual_outcome?'Observed: '+x.actual_outcome:'Outcome unavailable');
 }
}
function sources(){
 const node=$('source-status');node.replaceChildren();
 for(const f of feeds){
  const line=add(node,'div',undefined,'source-row');
  add(line,'span',f.id==='other'?'Tennis / NFL':f.id==='history'?'Research archive':f.id==='racing'?'Horse racing':'Football');
  add(line,'strong',!f.ok?'UNAVAILABLE':!f.valid?'GATES UNVERIFIED':f.stale?'STALE':'SOURCE OBSERVED');
 }
 const note=$('takeaways');note.replaceChildren();
 for(const msg of ['Model calibration and verified bookmaker prices remain unavailable.','Four independent sport research feeds are assessed without inventing a Grade A/B selection.','Your original paper slips and weekly wildcard remain in the homepage workspace.']){
  add(note,'p',msg);
 }
}
async function refresh(){
 text('analyst-state','Checking source snapshots…');
 try{
  feeds=await Promise.all(SOURCES.map(getSource));archive=feeds.find(f=>f.id==='history');
  records=gather(feeds);
  apply();sources();historic();
  const all=feeds.every(f=>f.ok&&f.valid&&!f.stale);
  text('analyst-state',all?'Published sources checked · models unvalidated':'Source warning · inspect evidence status');
 }catch(e){text('analyst-state','Analysis unavailable: '+String(e?.message||e).slice(0,90))}
}
$('reload').addEventListener('click',refresh);$('filter-apply').addEventListener('click',apply);refresh();
})();