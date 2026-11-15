'use strict';
// Betting Hub presentation only: delegates to the existing research desk and saved slips.
(()=>{
const Sources=window.ValueWatchProSources;
function ready(){
 const root=document.querySelector('.pro-landing');if(!root)return;
 root.querySelectorAll('[data-pro-sport]').forEach(btn=>btn.addEventListener('click',()=>{
  const sport=btn.getAttribute('data-pro-sport');
  const target=document.querySelector('#sport-nav button[data-sport="'+sport+'"]');
  if(target)target.click();
  root.querySelectorAll('[data-pro-sport]').forEach(b=>b.setAttribute('aria-pressed',String(b.getAttribute('data-pro-sport')===sport)));
  document.getElementById('main-content')?.scrollIntoView({behavior:'smooth',block:'start'});
 }));
 root.querySelectorAll('[data-pro-slot]').forEach(btn=>btn.addEventListener('click',()=>{
  const n=btn.getAttribute('data-pro-slot');
  document.querySelector('#slip-tabs button[data-slot="'+n+'"]')?.click();
  const open=document.getElementById('paper-open');
  if(open&&window.matchMedia?.('(max-width: 1000px)').matches)open.click();
  document.getElementById('slip-panel')?.scrollIntoView({behavior:'smooth',block:'start'});
 }));
}
function cell(parent,label){const td=document.createElement('td');td.textContent=String(label);parent.append(td)}
const FEATURE_PAGE_SIZE=6;
let featured=[],page=0,loading=false;
function renderFeatured(){
 const body=document.getElementById('pro-featured-rows'),counter=document.getElementById('pro-feature-page');
 const prev=document.getElementById('pro-feature-prev'),next=document.getElementById('pro-feature-next');
 if(!body)return;
 const pages=Math.ceil(featured.length/FEATURE_PAGE_SIZE);
 page=Math.max(0,Math.min(page,Math.max(0,pages-1)));
 body.replaceChildren();
 for(const item of featured.slice(page*FEATURE_PAGE_SIZE,(page+1)*FEATURE_PAGE_SIZE)){
  const tr=document.createElement('tr');tr.className='pro-feature-event';
  const label={football:'⚽ Football',racing:'♞ Horse racing',tennis:'🎾 Tennis',nfl:'🏈 NFL'}[item.sport]||item.sport;
  const when=new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/London',day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'}).format(new Date(item.startMs));
  for(const value of [label,item.name,when,item.hasModel?'Experimental model record':'No model record'])cell(tr,value);
  body.append(tr);
 }
 if(!featured.length){const tr=document.createElement('tr');const td=document.createElement('td');td.colSpan=4;td.textContent='No future events from the currently usable source feeds.';tr.append(td);body.append(tr)}
 if(counter)counter.textContent=pages?'Page '+(page+1)+' of '+pages+' · '+featured.length+' events':'No events';
 if(prev)prev.disabled=loading||page===0;
 if(next)next.disabled=loading||page>=pages-1;
}
async function showFeatured(){
 const status=document.getElementById('pro-featured-status'),health=document.getElementById('pro-market-feeds'),refresh=document.getElementById('pro-feature-refresh');
 if(!Sources||!status||!health||loading)return;
 loading=true;if(refresh)refresh.disabled=true;
 const now=Date.now(),ids=['football','racing','other'];
 try{
  const feeds=await Promise.all(ids.map(id=>Sources.load(id,'./',window.fetch.bind(window),now)));
  const summary=Sources.summarize(feeds,now),invalid=feeds.filter(x=>x.state!=='OBSERVED');
  for(const sport of Sources.sports)document.querySelectorAll('[data-pro-count="'+sport+'"]').forEach(el=>{el.textContent=summary.counts[sport]===null?'—':String(summary.counts[sport])});
  const all=document.querySelector('[data-pro-count="all"]');if(all)all.textContent=summary.allSportsAvailable?String(summary.totalAvailable):'—';
  featured=Sources.featuredOrder(summary.upcoming);page=0;
  health.textContent=feeds.filter(x=>x.state==='OBSERVED').length+'/3 source groups fully checked'+(invalid.length?' · review needed':'');
  const stamps=feeds.filter(x=>x.fresh&&Number.isFinite(x.generatedAt)).map(x=>x.generatedAt);
  const updated=stamps.length?new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/London',day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'}).format(new Date(Math.min(...stamps))):'unavailable';
  status.textContent=summary.upcoming.length+' monitored upcoming events · '+summary.available.length+'/4 sports with usable feeds · oldest source snapshot '+updated+' UK'+(invalid.length?' · '+invalid.map(x=>x.id+': '+x.state).join(', '):'')+'. No verified bookmaker odds, EV or qualifying bets.';
 }catch{
  featured=[];page=0;status.textContent='Source check unavailable; no events confirmed.';health.textContent='Unavailable';
 }finally{loading=false;if(refresh)refresh.disabled=false;renderFeatured()}
}
function wireFeatured(){
 document.getElementById('pro-feature-prev')?.addEventListener('click',()=>{if(page>0){page--;renderFeatured()}});
 document.getElementById('pro-feature-next')?.addEventListener('click',()=>{if((page+1)*FEATURE_PAGE_SIZE<featured.length){page++;renderFeatured()}});
 document.getElementById('pro-feature-refresh')?.addEventListener('click',showFeatured);
}
function init(){ready();wireFeatured();showFeatured()}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();