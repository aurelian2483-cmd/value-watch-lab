/* Value Watch: three transparent research predictions, never betting tips. */
(function(){
'use strict';
const main=document.getElementById('main-content');
if(!main)return;
const panel=document.createElement('section');
panel.id='three-predictions';
panel.setAttribute('aria-label','Three experimental football predictions');
panel.style.cssText='margin:18px auto;max-width:1450px;padding:18px;border:1px solid #49637d;border-radius:14px;background:#10223a;color:#f2f7ff;font:inherit';
const title=document.createElement('h2');title.textContent='Three football predictions · research only';title.style.cssText='margin:0 0 8px;font-size:1.3rem';panel.appendChild(title);
const status=document.createElement('p');status.textContent='Loading published model forecasts…';status.style.cssText='font-size:.9rem;color:#c2d3e8';panel.appendChild(status);
const cards=document.createElement('div');cards.style.cssText='display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:12px';panel.appendChild(cards);
main.parentNode.insertBefore(panel,main);
function el(parent,tag,text){const n=document.createElement(tag);n.textContent=text;parent.appendChild(n);return n;}
function pct(v){return (100*v).toFixed(1)+'%';}
async function refresh(){
try{
 const response=await fetch('./football-expanded-data.json?research_three='+Date.now(),{cache:'no-store'});
 if(!response.ok)throw Error('HTTP '+response.status);
 const data=await response.json();
 const now=Date.now();
 const forecasts=(data.experimental_model_forecasts||[]).filter(f=>{
  const ps=[f.prob_home,f.prob_draw,f.prob_away];
  return Date.parse(f.kickoff_utc)>now && ps.every(p=>typeof p==='number'&&Number.isFinite(p)&&p>=0&&p<=1)&&Math.abs(ps.reduce((a,b)=>a+b,0)-1)<.001;
 }).map(f=>({...f,confidence:Math.max(f.prob_home,f.prob_draw,f.prob_away)}))
 .sort((a,b)=>b.confidence-a.confidence||Date.parse(a.kickoff_utc)-Date.parse(b.kickoff_utc)).slice(0,3);
 cards.replaceChildren();
 const stamp=Date.parse(data.generated_at_utc);
 const stale=!Number.isFinite(stamp)||now-stamp>36*3600000||stamp>now+300000;
 status.textContent='Published '+(Number.isFinite(stamp)?new Date(stamp).toLocaleString('en-GB',{timeZone:'Europe/London'}):'unknown')+' UK · '+(stale?'STALE snapshot — predictions are historical research, not current selections. ':'')+'Unvalidated probabilities; no verified Sky Bet odds, EV or betting recommendations.';
 if(!forecasts.length){el(cards,'p','No future model forecasts available. Nothing has been fabricated.');return;}
 forecasts.forEach((f,i)=>{
 const card=el(cards,'article','');card.style.cssText='border:1px solid #4a647e;border-radius:12px;padding:14px;background:#192f4b;min-width:0';
 const outcomes=[['Home win',f.home,f.prob_home],['Draw','Draw',f.prob_draw],['Away win',f.away,f.prob_away]].sort((a,b)=>b[2]-a[2]);
 const h=el(card,'h3',(i+1)+'. '+f.home+' vs '+f.away);h.style.cssText='font-size:1rem;margin:0 0 9px;overflow-wrap:anywhere';
 el(card,'p',f.league_name+' · '+new Date(f.kickoff_utc).toLocaleString('en-GB',{timeZone:'Europe/London',day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'})+' UK');
 const pick=el(card,'p','Model leader: '+outcomes[0][0]+' — '+outcomes[0][1]+' ('+pct(outcomes[0][2])+')');pick.style.cssText='font-weight:700;color:#d4ebff';
 el(card,'p','Home '+pct(f.prob_home)+' · Draw '+pct(f.prob_draw)+' · Away '+pct(f.prob_away));
 const evidence=el(card,'p','Model: '+(f.model||'experimental')+' · '+(f.training_basis?.training_matches??'unknown')+' training matches');evidence.style.cssText='font-size:.85rem;color:#c2d3e8;overflow-wrap:anywhere';
 const note=el(card,'p',(stale?'STALE · ':'')+'UNVALIDATED · UNPRICED · PUBLICATION BLOCKED');note.style.cssText='font-size:.8rem;color:#f3c98b';
 });
}catch(err){cards.replaceChildren();status.textContent='Three predictions unavailable: '+err.message+'. No substitute picks shown.';}
}
refresh();
document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh();});
})();
