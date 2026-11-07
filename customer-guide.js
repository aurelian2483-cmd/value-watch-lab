/* Plain-English guide for the existing four-sport dashboard. */
(function(){
'use strict';
const source=document.getElementById('event-source-status'),list=document.getElementById('sports-event-list');if(!source||!list)return;
const guide=document.createElement('section');guide.id='customer-guide';guide.setAttribute('aria-label','How to use Value Watch');guide.style.cssText='margin:14px 0;padding:15px 17px;border:1px solid #cbd7ea;border-radius:12px;background:#f5f9ff;color:#1c3658;line-height:1.5';
const title=document.createElement('h2');title.style.cssText='font-size:1.1rem;margin:0 0 5px';guide.append(title);
const message=document.createElement('p');message.style.cssText='margin:0 0 8px';guide.append(message);
const note=document.createElement('p');note.style.cssText='margin:0;color:#52677f;font-size:.87rem';guide.append(note);
const action=document.createElement('button');action.type='button';action.textContent='Show all collected racecards';action.style.cssText='margin-top:12px;min-height:44px;border:1px solid #2855a0;border-radius:8px;background:#184da0;color:white;padding:9px 14px;cursor:pointer;font-weight:700';guide.append(action);
source.parentNode.insertBefore(guide,source);
const copy={
all:['Start here: choose a sport','Select Football, Horse racing, Tennis or NFL above. Open a card to inspect the evidence behind an experimental forecast.','Model probabilities are estimates, not promises. No qualified bet is implied.'],
football:['Football: understand the forecast','Home, draw and away percentages are the model’s estimated chances. The largest percentage is its preferred outcome, not necessarily a good-value bet.','Head-to-head results are historical context; the model has not proved that they improve its predictions.'],
racing:['Horse racing: race times, runners and favourites','Choose a meeting and race time to inspect the recorded runners. “Market favourite” is based on an observed source price; it is not the model’s predicted winner.','If no future races are collected, previous racecards may appear for reference. Past prices and runners are not current betting information.'],
tennis:['Tennis: read the match prediction','Where the data supports a forecast, the model shows estimated chances for each player.','Experimental estimates are not independently validated and do not include verified betting value.'],
nfl:['NFL: focus on the research shortlist','The shortlist shows up to five model-supported games when fresh, suitable data exists. You can switch to the full collected slate.','A stronger model preference does not automatically mean a better betting opportunity.']
};
function selected(){return document.querySelector('.sport-strip [data-sport].active')?.dataset.sport||'all';}
function update(){const sport=selected(),v=copy[sport]||copy.all;title.textContent=v[0];message.textContent=v[1];note.textContent=v[2];action.hidden=sport!=='racing';}
action.addEventListener('click',()=>{const filter=document.getElementById('race-view-filter');if(!filter)return;filter.value='all';filter.dispatchEvent(new Event('change',{bubbles:true}));action.textContent='Showing all collected racecards';});
document.addEventListener('click',e=>{if(e.target.closest('[data-sport]'))queueMicrotask(()=>{action.textContent='Show all collected racecards';update();});});
update();
})();
