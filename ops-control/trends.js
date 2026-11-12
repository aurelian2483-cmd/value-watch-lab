(()=>{
'use strict';
// Public read-only data: GitHub Issue #27 central audit marker. No model or repository writes.
const URL='https://api.github.com/repos/aurelian2483-cmd/value-watch-lab/issues/27';
const NS='http://www.w3.org/2000/svg',MAX=90;
const $=id=>document.getElementById(id);
function el(tag,parent,txt,cls){const x=document.createElement(tag);if(cls)x.className=cls;if(txt!==undefined)x.textContent=String(txt);parent.append(x);return x}
function svgEl(parent,tag,props){const x=document.createElementNS(NS,tag);for(const [k,v] of Object.entries(props||{}))x.setAttribute(k,String(v));parent.append(x);return x}
function parse(body){
 const content=String(body||'');
 const markers=[...content.matchAll(/<!-- ops-director-history-v1:([A-Za-z0-9+/=]+) -->/g)];
 if(content.includes('<!-- ops-director-history-v1:')&&markers.length!==1)throw Error('Central history marker is malformed or duplicated');
 if(!markers.length)return [];
 const bytes=atob(markers[0][1]);if(bytes.length>50000)throw Error('History payload exceeds limit');
 const payload=JSON.parse(bytes);
 if(payload?.version!==1||!Array.isArray(payload.records)||payload.records.length>MAX)throw Error('Unsupported Director history');
 const seen=new Set();
 const result=[];
 for(const r of payload.records){
   if(!r||typeof r.runId!=='string'||seen.has(r.runId)||typeof r.at!=='string'||!Number.isFinite(Date.parse(r.at))||!Number.isInteger(r.p1)||!Number.isInteger(r.p2)||r.p1<0||r.p2<0||r.p1>500||r.p2>500||!Array.isArray(r.bad)||!Array.isArray(r.codes)||typeof r.secondary!=='string')throw Error('Invalid central audit observation');
   if(r.bad.some(x=>typeof x!=='string'||x.length>60)||r.codes.some(x=>typeof x!=='string'||x.length>110))throw Error('Invalid audit status labels');
   seen.add(r.runId);result.push(r);
 }
 return result.sort((a,b)=>Date.parse(a.at)-Date.parse(b.at)).slice(-MAX);
}
function dateLabel(date){return new Intl.DateTimeFormat('en-GB',{day:'2-digit',month:'short',timeZone:'UTC'}).format(new Date(date))}
function path(parent,points,color){svgEl(parent,'polyline',{points:points.map(p=>p.join(',')).join(' '),fill:'none',stroke:color,'stroke-width':2.5,'stroke-linecap':'round','stroke-linejoin':'round'})}
function label(parent,x,y,text,anchor='middle'){const p=svgEl(parent,'text',{x,y,fill:'#9bb3ce','font-size':10,'text-anchor':anchor});p.textContent=text}
function chart(root,records,mode){
 root.replaceChildren();
 const width=660,height=208,left=36,right=14,top=15,bottom=31;
 const canvas=svgEl(root,'svg',{viewBox:'0 0 '+width+' '+height,role:'img','aria-label':mode==='issues'?'P1 and P2 warning counts by recorded audit':'Four-source availability by recorded audit',preserveAspectRatio:'xMidYMid meet'});
 const rows=records.slice(-24),N=rows.length;
 const maxVal=mode==='issues'?Math.max(2,...rows.map(r=>r.p1+r.p2)):4;
 const X=i=>left+(N===1?(width-left-right)/2:i*(width-left-right)/(N-1));
 const Y=v=>top+(maxVal-v)*(height-top-bottom)/maxVal;
 for(let t=0;t<=4;t++){
  const val=maxVal*t/4,y=Y(val);
  svgEl(canvas,'line',{x1:left,y1:y,x2:width-right,y2:y,stroke:'#31445c','stroke-width':1});
  label(canvas,left-8,y+3,mode==='issues'?String(Math.round(val*10)/10):String(val),'end');
 }
 label(canvas,X(0),height-12,dateLabel(rows[0].at),'start');
 if(N>1)label(canvas,X(N-1),height-12,dateLabel(rows[N-1].at),'end');
 if(mode==='issues'){
  // P1 and P2 are discrete counts; show two line series, not a fabricated daily average.
  const a=rows.map((r,i)=>[X(i),Y(r.p1)]),b=rows.map((r,i)=>[X(i),Y(r.p2)]);
  if(N>1){path(canvas,a,'#fa8b85');path(canvas,b,'#f2c06d')}
  for(const [pts,color,which] of [[a,'#fa8b85','P1'],[b,'#f2c06d','P2']]){
   pts.forEach((p,i)=>{const dot=svgEl(canvas,'circle',{cx:p[0],cy:p[1],r:4,fill:color});svgEl(dot,'title').textContent=which+': '+rows[i][which.toLowerCase()]+' • '+rows[i].at});
  }
 }else{
  const series=rows.map((r,i)=>[X(i),Y(4-r.bad.length)]);
  if(N>1)path(canvas,series,'#5edbc4');
  series.forEach((p,i)=>{const dot=svgEl(canvas,'circle',{cx:p[0],cy:p[1],r:4,fill:'#5edbc4'});svgEl(dot,'title').textContent=(4-rows[i].bad.length)+'/4 available • '+rows[i].at});
 }
}
function render(rows){
 const recent=rows.at(-1),days=new Set(rows.map(r=>r.at.slice(0,10))).size;
 $('central-trend-summary').textContent=rows.length+' recorded audit'+(rows.length===1?'':'s')+' • '+days+' observed UTC day'+(days===1?'':'s')+' • latest '+new Date(recent.at).toLocaleString('en-GB',{timeZone:'Europe/London',day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'})+' UK';
 $('central-p1').textContent=String(recent.p1);$('central-p2').textContent=String(recent.p2);
 $('central-feeds').textContent=(4-recent.bad.length)+'/4';
 const statuses={MEETING_LIST_MATCHED_NOT_CERTIFIED:'Lists matched · not certified',DISCREPANCY:'Discrepancy',SECONDARY_UNAVAILABLE:'Unavailable',PRIMARY_UNVERIFIED:'Primary unverified',PRIMARY_DATE_MISMATCH:'Date mismatch'};
 $('central-racing').textContent=statuses[recent.secondary]||'Unverified';
 chart($('trend-issues-plot'),rows,'issues');chart($('trend-feeds-plot'),rows,'feeds');
 const names={MEETING_LIST_MATCHED_NOT_CERTIFIED:'Matched · not certified',DISCREPANCY:'Discrepancy',SECONDARY_UNAVAILABLE:'Unavailable'};
 const tally={};for(const r of rows)tally[r.secondary]=(tally[r.secondary]||0)+1;
 const status=$('central-racing-breakdown');status.replaceChildren();
 for(const [key,count] of Object.entries(tally)){const item=el('div',status,undefined,'trend-status-item');el('span',item,names[key]||key);el('strong',item,count)}
 $('central-trend-note').textContent=rows.length===1?'One historical audit recorded. Multi-day trends require additional scheduled runs.':'Displaying the latest '+Math.min(24,rows.length)+' recorded audits on the charts. Counts are observations, not independently verified incidents or human performance.';
}
async function load(){
 const root=$('central-trend-summary');root.textContent='Loading central GitHub audit history…';
 for(const id of ['trend-issues-plot','trend-feeds-plot','central-racing-breakdown'])$(id).replaceChildren();
 for(const id of ['central-p1','central-p2','central-feeds','central-racing'])$(id).textContent='—';
 $('central-trend-note').textContent='Awaiting confirmed central audit history.';
 const ctrl=new AbortController(),timer=setTimeout(()=>ctrl.abort(),12000);
 try{
  const response=await fetch(URL,{cache:'no-store',headers:{Accept:'application/vnd.github+json'},signal:ctrl.signal});
  if(!response.ok)throw Error('GitHub history request returned HTTP '+response.status);
  const doc=await response.json();
  if(!doc||typeof doc.body!=='string')throw Error('Issue has no readable report body');
  const rows=parse(doc.body);
  if(!rows.length){root.textContent='No central audit history yet. Run a successful Director scheduled audit to create the baseline.';return}
  render(rows);
 }catch(err){root.textContent='Central history unavailable: '+String(err.message||err).slice(0,130)+'. Open Director Issue #27 for the source report.'}
 finally{clearTimeout(timer)}
}
$('central-trend-refresh').addEventListener('click',load);load();
})();