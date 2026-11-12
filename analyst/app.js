(()=>{'use strict';
const $=id=>document.getElementById(id);
const Sources=window.ValueWatchProSources;
let records=[],feeds=[],archive=null;
const safeTime=Sources.stamp;
const text=(id,v)=>{$(id).textContent=String(v)};
const add=(parent,tag,v,className)=>{const e=document.createElement(tag);if(v!==undefined)e.textContent=String(v);if(className)e.className=className;parent.append(e);return e};
const ukTime=ts=>{const ms=safeTime(ts);return ms===null?'Unavailable':new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/London',day:'2-digit',month:'short',hour:'2-digit'}).format(new Date(ms))};
function apply(){
 const sport=$('filter-sport').value,range=$('filter-range').value,evidence=$('filter-evidence').value,now=Date.now();
 const found=records.filter(x=>(sport==='all'||sport===x.sport)&&(range==='all'||(range==='upcoming'?(x.startMs??-1)>=now:(safeTime(x.time)??Infinity)<now))&&(evidence==='all'||(evidence==='model'?x.hasModel:!x.hasModel)));
 const tbody=$('analyst-events');tbody.replaceChildren();
 for(const x of found.slice(0,80)){
  const tr=add(tbody,'tr');
  add(tr,'td',x.sport==='racing'?'Horse Racing':x.sport==='nfl'?'NFL':x.sport[0].toUpperCase()+x.sport.slice(1));
  add(tr,'td',x.name);add(tr,'td',ukTime(x.startUTC));
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
 if(!archive?.fresh){add(node,'p','Verified historical model results unavailable from source.','muted');return}
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
  add(line,'strong',f.state==='OBSERVED'?'SOURCE OBSERVED':f.state);
  if(f.generatedAt!==null){const ageHours=Math.max(0,(Date.now()-f.generatedAt)/3600000);add(line,'small','Updated '+ageHours.toFixed(1)+'h ago')}
 }
 const note=$('takeaways');note.replaceChildren();
 for(const msg of ['Model calibration and verified bookmaker prices remain unavailable.','Four independent sport research feeds are assessed without inventing a Grade A/B selection.','Your original paper slips and weekly wildcard remain in the homepage workspace.']){
  add(note,'p',msg);
 }
}
async function refresh(){
 text('analyst-state','Checking source snapshots…');
 try{
  const now=Date.now();
  feeds=await Promise.all(Sources.SOURCES.map(s=>Sources.load(s.id,'../',window.fetch.bind(window),now)));
  archive=feeds.find(f=>f.id==='history');
  const summary=Sources.summarize(feeds,now);
  records=summary.events;
  apply();sources();historic();
  const problematic=feeds.filter(f=>f.state!=='OBSERVED');
  text('analyst-state',problematic.length?'Source warning: '+problematic.map(f=>f.id+' '+f.state).join('; '):'4 source groups checked · models unvalidated');
  text('selection-note',problematic.length?'Only fresh, gated records displayed. Excluded sources: '+problematic.map(f=>f.id+' ('+f.state+')').join(', ')+'. No result is a qualified betting recommendation.':'Only fresh, gated source records displayed; no result is a qualified betting recommendation.');
 }catch(e){
  records=[];feeds=[];archive=null;
  apply();sources();historic();
  text('analyst-state','Analysis unavailable: '+String(e?.message||e).slice(0,90));
 }
}
$('reload').addEventListener('click',refresh);$('filter-apply').addEventListener('click',apply);refresh();
})();