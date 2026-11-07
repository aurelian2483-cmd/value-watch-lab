/* Value Watch: beginner-friendly experimental forecasts; never betting recommendations. */
(function(){
'use strict';
const main=document.getElementById('main-content');if(!main)return;
const panel=document.createElement('section');panel.id='three-predictions';panel.setAttribute('aria-label','Three experimental football predictions');
panel.style.cssText='max-width:1450px;margin:18px auto;padding:clamp(14px,2vw,24px);border:1px solid #49637d;border-radius:16px;background:#10223a;color:#f2f7ff;font:inherit';
const title=document.createElement('h2');title.textContent='Three football predictions';title.style.cssText='margin:0 0 6px;font-size:clamp(1.25rem,2vw,1.7rem)';panel.append(title);
const intro=document.createElement('p');intro.textContent='What the model expects, why, and what is still uncertain.';intro.style.cssText='color:#c2d3e8;margin:0 0 10px';panel.append(intro);
const status=document.createElement('p');status.setAttribute('role','status');status.textContent='Checking published research…';status.style.cssText='font-size:.9rem;color:#c2d3e8;margin:0 0 14px';panel.append(status);
const cards=document.createElement('div');cards.style.cssText='display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,250px),1fr));gap:14px';panel.append(cards);
const explainer=document.createElement('details');explainer.style.cssText='margin-top:16px;color:#d6e4f4;font-size:.92rem';const summary=document.createElement('summary');summary.textContent='What do these percentages mean?';summary.style.cursor='pointer';explainer.append(summary);const explanation=document.createElement('p');explanation.textContent='A 55% model estimate means the model assigns that outcome 55 chances in 100. It is not a guarantee, a proven accuracy rate, or evidence that a bet is good value. Predictions are experimental until independently validated.';explainer.append(explanation);panel.append(explainer);
main.parentNode.insertBefore(panel,main);
function add(parent,tag,text,css){const n=document.createElement(tag);n.textContent=text;parent.append(n);if(css)n.style.cssText=css;return n;}
function pct(p){return (p*100).toFixed(1)+'%';}
function time(s){return new Date(s).toLocaleString('en-GB',{timeZone:'Europe/London',day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'})+' UK';}
function valid(f){const ps=[f.prob_home,f.prob_draw,f.prob_away];return f&&typeof f.home==='string'&&f.home.trim()&&typeof f.away==='string'&&f.away.trim()&&Number.isFinite(Date.parse(f.kickoff_utc))&&ps.every(p=>typeof p==='number'&&Number.isFinite(p)&&p>0&&p<1)&&Math.abs(ps.reduce((a,b)=>a+b,0)-1)<.001;}
async function refresh(){
try{
const response=await fetch('./football-expanded-data.json?research_three='+Date.now(),{cache:'no-store'});if(!response.ok)throw Error('Data request failed ('+response.status+')');
const data=await response.json(),now=Date.now(),stamp=Date.parse(data.generated_at_utc);
const fresh=Number.isFinite(stamp)&&stamp<=now+300000&&now-stamp<=36*3600000;
cards.replaceChildren();
if(!fresh){status.textContent='Latest published research is out of date or unavailable. Predictions are withheld until the data refreshes.';add(cards,'p','No current predictions can be shown safely. The previous data has not been presented as new.');return;}
const forecasts=(Array.isArray(data.experimental_model_forecasts)?data.experimental_model_forecasts:[]).filter(f=>valid(f)&&Date.parse(f.kickoff_utc)>now+300000&&f.research_only===true&&f.publication_gate==='BLOCKED'&&f.model_validation==='UNVALIDATED').map(f=>({...f,leader:Math.max(f.prob_home,f.prob_draw,f.prob_away)})).sort((a,b)=>b.leader-a.leader||Date.parse(a.kickoff_utc)-Date.parse(b.kickoff_utc)).slice(0,3);
status.textContent='Research updated '+time(data.generated_at_utc)+' · '+forecasts.length+' of 3 upcoming predictions available · Experimental, not verified betting tips.';
if(!forecasts.length){add(cards,'p','No upcoming predictions currently meet the data checks. Try again after the next research update.');return;}
forecasts.forEach((f,i)=>{
const card=add(cards,'article','', 'background:#192f4b;border:1px solid #4a647e;border-radius:14px;padding:16px;min-width:0;overflow-wrap:anywhere');
add(card,'div','PREDICTION '+(i+1)+' · '+(f.league_name||f.league||'Football'),'font-size:.75rem;letter-spacing:.06em;color:#a9c5e5;font-weight:700');
add(card,'h3',f.home+' vs '+f.away,'font-size:1.1rem;margin:8px 0');
add(card,'div',time(f.kickoff_utc),'color:#c2d3e8;font-size:.84rem;margin-bottom:12px');
const options=[{label:f.home+' to win',p:f.prob_home},{label:'Draw',p:f.prob_draw},{label:f.away+' to win',p:f.prob_away}].sort((a,b)=>b.p-a.p);
add(card,'div','MOST LIKELY RESULT','font-size:.73rem;color:#c2d3e8');
add(card,'div',options[0].label+' · '+pct(options[0].p),'font-size:1.22rem;font-weight:750;color:#d4ebff;margin:4px 0 14px');
for(const o of options){const line=add(card,'div','', 'margin:9px 0');const head=add(line,'div','', 'display:flex;justify-content:space-between;gap:8px;font-size:.86rem');add(head,'span',o.label);add(head,'strong',pct(o.p));const track=add(line,'div','', 'height:7px;background:#38516c;border-radius:8px;overflow:hidden;margin-top:5px');const bar=add(track,'div','', 'height:100%;background:#83bbed;border-radius:8px');bar.style.width=(o.p*100)+'%';}
const detail=add(card,'details','', 'margin-top:14px;font-size:.86rem;color:#d7e4f2');add(detail,'summary','Why does the model favour this result?','cursor:pointer;font-weight:650');
const training=f.training_basis?.training_matches;add(detail,'p','This is a statistical estimate based on historical league and team scoring patterns'+(Number.isFinite(training)?' ('+training+' training matches)':'')+'. It does not account for every late injury or team change.');
const h2h=(data.upcoming_fixtures||[]).find(x=>x.league===f.league&&x.home===f.home&&x.away===f.away&&x.kickoff_utc===f.kickoff_utc)?.head_to_head_research;
if(h2h&&Number.isFinite(h2h.sample_size)&&h2h.sample_size>0)add(detail,'p','Previous meetings: '+h2h.home_team_wins+' home-team wins, '+h2h.draws+' draws, '+h2h.away_team_wins+' away-team wins across '+h2h.sample_size+' recorded meetings. Historical context only; no validated H2H probability adjustment.');
add(detail,'p','Model: '+(f.model||'experimental')+'. No verified Sky Bet odds or proven positive expected value.');
add(card,'div','Experimental prediction · accuracy not yet validated','margin-top:14px;font-size:.8rem;color:#f3c98b;font-weight:650');
});
}catch(error){cards.replaceChildren();status.textContent='Prediction data could not be loaded.';add(cards,'p','Please try again later. No predictions have been invented.');}
}
refresh();document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh();});
})();
