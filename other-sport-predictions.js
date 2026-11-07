/* Four-sport research forecast summaries. No fabricated forecasts or betting claims. */
(function(){
'use strict';
const main=document.getElementById('main-content'),strip=document.querySelector('.sport-strip');if(!main||!strip)return;
const panel=document.createElement('section');panel.id='other-sport-predictions';panel.setAttribute('aria-label','Sport-specific experimental research forecasts');panel.style.cssText='max-width:1450px;margin:18px auto;padding:clamp(14px,2vw,24px);border:1px solid #49637d;border-radius:16px;background:#10223a;color:#f2f7ff;font:inherit;overflow-wrap:anywhere';
const title=document.createElement('h2');title.style.cssText='margin:0 0 8px;font-size:clamp(1.25rem,2vw,1.7rem)';panel.append(title);
const status=document.createElement('p');status.setAttribute('role','status');status.style.cssText='color:#c2d3e8;font-size:.9rem';panel.append(status);
const cards=document.createElement('div');cards.style.cssText='display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,250px),1fr));gap:14px';panel.append(cards);
const note=document.createElement('p');note.style.cssText='color:#f3c98b;font-size:.85rem;margin-top:12px';note.textContent='Research only · models UNVALIDATED · no verified betting odds · publication BLOCKED.';panel.append(note);
main.parentNode.insertBefore(panel,main);
let data=null,horse=null;
function add(parent,tag,value,style){const el=document.createElement(tag);el.textContent=value;if(style)el.style.cssText=style;parent.append(el);return el;}
function date(v){const t=Date.parse(v);return Number.isFinite(t)?new Date(t).toLocaleString('en-GB',{timeZone:'Europe/London',day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'})+' UK':'Time unavailable';}
function fresh(v){const t=Date.parse(v),now=Date.now();return Number.isFinite(t)&&t<=now+300000&&now-t<=36*3600000;}
function currentSport(){return strip.querySelector('[data-sport].active')?.getAttribute('data-sport')||'all';}
function card(event,i,sport){
 const outcomes=event.forecast?.outcomes||[];if(outcomes.length<2||outcomes.some(o=>!Number.isFinite(o.probability)||o.probability<0||o.probability>1)||Math.abs(outcomes.reduce((n,o)=>n+o.probability,0)-1)>.002)return;
 const box=add(cards,'article','','background:#192f4b;border:1px solid #4a647e;border-radius:14px;padding:16px;min-width:0');
 add(box,'div','FORECAST '+(i+1)+' · '+(event.competition||sport),'color:#a9c5e5;font-size:.78rem;font-weight:700');
 add(box,'h3',event.name||'Upcoming event','font-size:1.08rem;margin:8px 0');
 add(box,'p',date(event.startUTC),'color:#c2d3e8;font-size:.85rem');
 const top=[...outcomes].sort((a,b)=>b.probability-a.probability)[0];
 add(box,'strong','Model favours: '+top.name+' · '+(top.probability*100).toFixed(1)+'%','display:block;font-size:1.1rem;margin:10px 0');
 for(const o of outcomes){const line=add(box,'div','','margin:9px 0');add(line,'div',o.name+' · '+(o.probability*100).toFixed(1)+'%','font-size:.86rem');const track=add(line,'div','','height:7px;background:#38516c;border-radius:8px;overflow:hidden;margin-top:4px');add(track,'div','','height:100%;background:#83bbed;width:'+(o.probability*100)+'%');}
 const details=add(box,'details','','margin-top:12px;font-size:.85rem;color:#d7e4f2');add(details,'summary','How was this estimated?','cursor:pointer;font-weight:650');
 add(details,'p','Fixed historical Elo rating baseline. It does not include every injury, lineup, surface or other match-day factor. The probabilities have not been independently calibrated.');
 add(details,'p','Model: '+event.forecast.model+'. No verified odds or expected value.');
}
function render(){
 const sport=currentSport(),visible=sport==='tennis'||sport==='nfl'||sport==='racing';panel.hidden=!visible;panel.style.display=visible?'':'none';if(!visible)return;
 cards.replaceChildren();title.textContent=sport==='racing'?'Horse racing · upcoming research':sport==='tennis'?'Three tennis predictions':'Three NFL predictions';
 if(sport==='racing'){
  if(!horse){status.textContent='Horse racing data unavailable.';return;}
  const upcoming=Number(horse.race_cycle_audit?.upcoming_observed_races)||0,forecasts=Array.isArray(horse.form_forecasts)?horse.form_forecasts:[];
  status.textContent='Racecard snapshot '+(horse.race_date_uk||'unknown')+' · '+upcoming+' upcoming observed races · '+forecasts.length+' pre-race form forecasts.';
  if(!fresh(horse.generated_at_utc)){add(cards,'p','The racing snapshot is outdated. New racecards and predictions must be collected before showing upcoming selections.');return;}
  if(!forecasts.length){add(cards,'p','No eligible pre-race horse forecasts in the current snapshot. The model currently covers qualifying all-weather races and must capture runners before the off. Racecards and historical results remain available below.');return;}
  const now=Date.now();
  const eligible=forecasts.filter(f=>Date.parse(f.startUTC)>now+300000&&Date.parse(f.generated_at_utc)<Date.parse(f.startUTC)-300000&&Array.isArray(f.runners)&&f.runners.length>=2&&f.runners.every(x=>typeof x.name==='string'&&Number.isFinite(x.model_probability)&&x.model_probability>=0&&x.model_probability<=1)&&Math.abs(f.runners.reduce((a,x)=>a+x.model_probability,0)-1)<.002&&f.publication_gate==='BLOCKED'&&f.model_validation==='UNVALIDATED').sort((a,b)=>Date.parse(a.startUTC)-Date.parse(b.startUTC)).slice(0,3);
  status.textContent+=' · '+eligible.length+' upcoming research previews shown.';
  eligible.forEach((f,i)=>{
   const box=add(cards,'article','','background:#192f4b;border:1px solid #4a647e;border-radius:14px;padding:16px;min-width:0');
   add(box,'div','RACE '+(i+1)+' · '+f.racecourse,'color:#a9c5e5;font-size:.78rem;font-weight:700');
   add(box,'h3',f.race_name,'font-size:1.08rem;margin:8px 0');
   add(box,'p',date(f.startUTC)+' · '+f.runners.length+' runners','color:#c2d3e8;font-size:.85rem');
   const top=[...f.runners].sort((a,b)=>b.model_probability-a.model_probability).slice(0,3);
   add(box,'strong','Form model ranks: '+top[0].name,'display:block;font-size:1.05rem;margin:10px 0');
   top.forEach((x,n)=>{const line=add(box,'div','','margin:9px 0');add(line,'div',(n+1)+'. '+x.name+' · '+(100*x.model_probability).toFixed(1)+'% model estimate','font-size:.86rem');const track=add(line,'div','','height:7px;background:#38516c;border-radius:8px;overflow:hidden;margin-top:4px');add(track,'div','','height:100%;background:#83bbed;width:'+(100*x.model_probability)+'%');});
   const detail=add(box,'details','','margin-top:12px;font-size:.84rem;color:#d7e4f2');add(detail,'summary','How was this estimated?','cursor:pointer;font-weight:650');add(detail,'p','Experimental, uncalibrated historical finishing-form heuristic. Does not incorporate going, draw, weight, jockey, trainer, class or distance. These are NOT validated winning probabilities, odds, value bets or recommendations.');
   add(detail,'p','Recorded '+date(f.generated_at_utc)+' · Runner snapshot '+date(f.runner_observed_at_utc)+' · Independent timestamp not attested.');
  });
  if(!eligible.length)add(cards,'p','No current pre-race forecast passes the display checks. Existing racecards are available below.');
  return;
 }
 const section=data?.sports?.[sport],events=Array.isArray(section?.events)?section.events:[];
 if(!fresh(section?.generated_at_utc)){status.textContent='Published '+sport.toUpperCase()+' research is outdated or unavailable.';add(cards,'p','No current forecasts displayed. The feed needs refreshing.');return;}
 const now=Date.now();const selected=events.filter(e=>Date.parse(e.startUTC)>now+300000&&e.forecast&&e.forecast.calibrated===false&&e.forecast.odds==null&&Array.isArray(e.forecast.outcomes)).sort((a,b)=>Math.max(...b.forecast.outcomes.map(o=>o.probability))-Math.max(...a.forecast.outcomes.map(o=>o.probability))).slice(0,3);
 status.textContent='Research updated '+date(section.generated_at_utc)+' · '+selected.length+' of 3 upcoming experimental forecasts available.';
 selected.forEach((e,i)=>card(e,i,sport));
 if(!selected.length)add(cards,'p','No upcoming forecasts currently pass the research data checks.');
}
async function load(){try{const [a,b]=await Promise.all([fetch('./other-sports-data.json?cards='+Date.now(),{cache:'no-store'}),fetch('./horse-model-data.json?cards='+Date.now(),{cache:'no-store'})]);if(a.ok)data=await a.json();if(b.ok)horse=await b.json();}catch(e){}render();}
const observer=new MutationObserver(render);observer.observe(strip,{subtree:true,attributes:true,attributeFilter:['class','aria-pressed']});document.addEventListener('click',e=>{if(e.target.closest('.sport-strip [data-sport]'))setTimeout(render,0);});render();load();document.addEventListener('visibilitychange',()=>{if(!document.hidden)load();});
})();
