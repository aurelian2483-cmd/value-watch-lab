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
function showFeatured(){
 const body=document.getElementById('pro-featured-rows'),status=document.getElementById('pro-featured-status'),health=document.getElementById('pro-market-feeds');
 if(!Sources||!body||!status||!health)return;
 const now=Date.now(),ids=['football','racing','other'];
 Promise.all(ids.map(id=>Sources.load(id,'./',window.fetch.bind(window),now))).then(feeds=>{
  const summary=Sources.summarize(feeds,now),invalid=feeds.filter(x=>x.state!=='OBSERVED');
  for(const sport of Sources.sports){
   document.querySelectorAll('[data-pro-count="'+sport+'"]').forEach(el=>{el.textContent=summary.counts[sport]===null?'—':String(summary.counts[sport])});
  }
  const all=document.querySelector('[data-pro-count="all"]');
  if(all)all.textContent=summary.allSportsAvailable?String(summary.totalAvailable):'—';
  body.replaceChildren();
  for(const item of summary.upcoming.slice(0,6)){
   const row=document.createElement('tr');
   const display=item.sport==='racing'?'Horse Racing':item.sport==='nfl'?'NFL':item.sport[0].toUpperCase()+item.sport.slice(1);
   const time=new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/London',day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'}).format(new Date(item.startMs));
   for(const text of [display,item.name,time,'Not verified','Unavailable','Ungraded'])cell(row,text);
   body.append(row);
  }
  if(!summary.upcoming.length){const row=document.createElement('tr');const td=document.createElement('td');td.colSpan=6;td.textContent=invalid.length?'No upcoming events from usable sources. Some feeds are stale or unavailable.':'No future events found in the current checked sources.';row.append(td);body.append(row)}
  health.textContent=feeds.filter(x=>x.state==='OBSERVED').length+'/3 source groups fully checked'+(invalid.length?' · review needed':'');
  status.textContent=summary.upcoming.length+' upcoming source-observed records · '+(summary.allSportsAvailable?'4/4 sports available':'some sports unavailable')+(invalid.length?' · '+invalid.map(x=>x.id+': '+x.state).join(', '):'')+'. No verified betting prices or EV.';
 }).catch(()=>{body.replaceChildren();const row=document.createElement('tr'),td=document.createElement('td');td.colSpan=6;td.textContent='Sources unavailable. No events confirmed.';row.append(td);body.append(row);status.textContent='Source check unavailable';health.textContent='Unavailable'});
}
function init(){ready();showFeatured()}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();