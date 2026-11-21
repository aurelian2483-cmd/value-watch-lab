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
  const main=document.getElementById('main-content');
  main?.scrollIntoView({block:'start'});
  main?.focus({preventScroll:true});
 }));
 const showSlips=()=>{
  const open=document.getElementById('paper-open'),panel=document.getElementById('slip-panel');
  if(open&&window.matchMedia?.('(max-width: 1000px)').matches){open.click();return}
  panel?.scrollIntoView({block:'start'});
  panel?.focus({preventScroll:true});
 };
 const dropdown=document.getElementById('preview-slip-dropdown');
 const panel=document.getElementById('slip-panel');
 const mobileOpen=document.getElementById('paper-open');
 const inline=dropdown && panel && document.documentElement.classList.contains('visual-preview');
 const cards=Array.from(root.querySelectorAll('[data-pro-slot], .pro-slip-grid .pro-wildcard-card'));
 let expanded=null;
 const originalPosition=document.createComment('Paper slips');
 if(inline){
  document.documentElement.classList.add('preview-inline-slips');
  panel.before(originalPosition);
 }
 function closeInline(restoreFocus=false){
  if(!expanded)return;
  const trigger=expanded;
  expanded=null;
  originalPosition.after(panel);
  dropdown.hidden=true;
  delete dropdown.dataset.mode;
  trigger.setAttribute('aria-expanded','false');
  mobileOpen?.setAttribute('aria-expanded','false');
  if(restoreFocus)trigger.focus({preventScroll:true});
 }
 function openInline(card){
  expanded?.setAttribute('aria-expanded','false');
  expanded=card;
  card.setAttribute('aria-expanded','true');
  const slot=card.dataset.proSlot;
  mobileOpen?.setAttribute('aria-expanded',String(Boolean(slot)));
  dropdown.dataset.mode=slot?'slip':'gold';
  dropdown.append(panel);
  dropdown.hidden=false;
  if(slot)panel.querySelector('#slip-tabs button[data-slot="'+slot+'"]')?.click();
 }
 function openFromShortcut(){
  const selected=panel.querySelector('#slip-tabs [aria-pressed="true"]')?.dataset.slot;
  const card=cards.find(item=>item.dataset.proSlot && item.dataset.proSlot===selected) || cards[0];
  if(!card)return;
  openInline(card);
  dropdown.scrollIntoView({block:'start'});
  dropdown.querySelector('.preview-close-slip').focus({preventScroll:true});
 }
 if(inline){
  dropdown.querySelector('.preview-close-slip').addEventListener('click',()=>closeInline(true));
  mobileOpen?.addEventListener('click',event=>{
   event.stopImmediatePropagation();
   if(expanded?.dataset.proSlot){closeInline();mobileOpen.focus({preventScroll:true});return}
   openFromShortcut();
  },true);
  dropdown.addEventListener('keydown',event=>{
   if(event.key==='Escape'&&!event.defaultPrevented){event.preventDefault();closeInline(true)}
  });
 }
 for(const card of cards){
  const slot=card.dataset.proSlot;
  if(inline){
   card.setAttribute('aria-controls',dropdown.id);
   card.setAttribute('aria-expanded','false');
  }
  card.addEventListener('click',event=>{
   if(inline && (event.metaKey||event.ctrlKey||event.shiftKey||event.altKey))return;
   if(inline){
    event.preventDefault();
    if(expanded===card){closeInline(true);return}
    openInline(card);
    return;
   }
   if(!slot)return;
   panel.querySelector('#slip-tabs button[data-slot="'+slot+'"]')?.click();
   showSlips();
  });
 }
 root.querySelector('[data-open-paper]')?.addEventListener('click',event=>{event.preventDefault();if(inline)openFromShortcut();else showSlips()});
 root.querySelectorAll('[data-open-events]').forEach(link=>link.addEventListener('click',event=>{
  event.preventDefault();
  document.querySelector('#app-tabs [data-view="events"]')?.click();
  queueMicrotask(()=>{
   document.getElementById('events-view')?.scrollIntoView({block:'start'});
   document.getElementById('main-content')?.focus({preventScroll:true});
  });
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
  const label={football:'⚽ Football',racing:'♞ Horse racing',tennis:'🎾 Tennis',nfl:'🏈 NFL',darts:'🎯 Darts',rugby:'🏉 Rugby'}[item.sport]||item.sport;
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
 const now=Date.now(),ids=Sources.SOURCES.filter(source=>source.id!=='history').map(source=>source.id);
 try{
  const feeds=await Promise.all(ids.map(id=>Sources.load(id,'./',window.fetch.bind(window),now)));
  const summary=Sources.summarize(feeds,now),invalid=feeds.filter(x=>x.state!=='OBSERVED');
  for(const sport of Sources.sports)document.querySelectorAll('[data-pro-count="'+sport+'"]').forEach(el=>{el.textContent=summary.counts[sport]===null?'—':String(summary.counts[sport])});
  const all=document.querySelector('[data-pro-count="all"]');if(all)all.textContent=summary.available.length?String(summary.totalAvailable):'—';
  featured=Sources.featuredOrder(summary.upcoming);page=0;
  health.textContent=feeds.filter(x=>x.state==='OBSERVED').length+'/'+feeds.length+' current source groups'+(invalid.length?' · review needed':'');
  const stamps=feeds.filter(x=>x.fresh&&Number.isFinite(x.generatedAt)).map(x=>x.generatedAt);
  const updated=stamps.length?new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/London',day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'}).format(new Date(Math.min(...stamps))):'unavailable';
  status.textContent=summary.upcoming.length+' upcoming events with start times · '+summary.available.length+'/'+Sources.sports.length+' sports with usable feeds · oldest source snapshot '+updated+' UK'+(invalid.length?' · '+invalid.map(x=>x.id+': '+x.state).join(', '):'')+'. No verified bookmaker odds, EV or qualifying bets.';
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
