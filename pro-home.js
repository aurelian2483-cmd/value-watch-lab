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
  queueMicrotask(()=>{
   const destination=document.getElementById(sport==='all'?'main-content':'sport-evidence');
   destination?.scrollIntoView({block:'start'});
   destination?.focus({preventScroll:true});
  });
 }));
 const showSlips=()=>{
  const open=document.getElementById('paper-open'),panel=document.getElementById('slip-panel');
  if(open?.getClientRects().length){open.click();return}
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
  const range=link.closest('.pro-featured') && document.getElementById('pro-feature-range')?.value;
  if(range==='today'||range==='tomorrow')document.querySelector('#range-presets [data-range="'+range+'"]')?.click();
  queueMicrotask(()=>{
   document.getElementById('events-view')?.scrollIntoView({block:'start'});
   document.getElementById('main-content')?.focus({preventScroll:true});
  });
 }));
}
function cell(parent,label){const td=document.createElement('td');td.textContent=String(label);parent.append(td)}
const FEATURE_PAGE_SIZE=6;
const feedLabels={football:'Football',racing:'Horse racing',other:'Tennis/NFL',darts:'Darts',rugby:'Rugby'};
const stateLabels={UNAVAILABLE:'unavailable',STALE_OR_UNDATED:'stale or undated',PARTIAL_RECORDS:'partial coverage',
 GATE_UNVERIFIED:'safeguards unverified',SCHEMA_UNVERIFIED:'format unverified'};
let featured=[],page=0,loading=false,football,racing,publishedPrices,quoteExpiry;
let featureClock=Date.now();
const ukDay=new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/London',dateStyle:'short'});
function visibleFeatured(){
 const range=document.getElementById('pro-feature-range')?.value;
 const today=ukDay.format(featureClock);
 const day=range==='today'?today:range==='tomorrow'
  ?new Date(Date.parse(today+'T12:00:00Z')+86400000).toISOString().slice(0,10):null;
 const sport=document.getElementById('pro-feature-sport')?.value || 'all';
 const query=document.getElementById('pro-feature-query')?.value.trim().toLocaleLowerCase('en-GB') || '';
 return featured.filter(event=>(sport==='all'||event.sport===sport)
  && (!day||ukDay.format(event.startMs)===day)
  && (!query||event.name.toLocaleLowerCase('en-GB').includes(query)));
}
function manualPrice(panel,item,line){
 const identity=item.fixtureKey||Sources.detailKey(item);
 if(!identity||item.startMs<=Date.now()||document.documentElement.classList.contains('visual-preview'))return;
 const wrapper=document.createElement('details'), summary=document.createElement('summary');
 summary.textContent='Record an unverified price privately';
 wrapper.append(summary);panel.append(wrapper);
 const form=document.createElement('form');
 wrapper.append(form);
 function input(label,type,max,value=''){
  const group=document.createElement('label'),field=document.createElement('input');
  group.textContent=label;field.type=type;field.maxLength=max;field.value=value;field.required=true;
  group.append(field);form.append(group);return field;
 }
 const bookmaker=input('Bookmaker','text',80,'Sky Bet');
 const isRace=item.sport==='racing';
 const market=input(isRace?'Market (Win, Place or Each-way)':'Market and line','text',100,
  isRace?'Win':item.sport==='football'?'Regulation-time 1X2':'');
 const outcome=input(isRace?'Runner':'Outcome','text',100);
 const price=input('Decimal price','number',20);
 price.min='1.01';price.step='any';
 const source=input('HTTPS source URL','url',600);
 const raceFields=isRace?[
  input('Places paid (when applicable)','number',3),
  input('Field size (when applicable)','number',3),
  input('Each-way fraction (for example 1/5)','text',9)
 ]:[];
 for(const field of raceFields)field.required=false;
 const save=document.createElement('button'),status=document.createElement('p');
 save.textContent='Save observation now';status.role='status';
 form.append(save,status);
 const key='value-watch-private-price-observations-v1';
 const read=()=>{
  const rows=JSON.parse(localStorage.getItem(key)||'[]');
  return Array.isArray(rows)?rows:[];
 };
 function showSaved(){
  try{
   const last=read().find(row=>row.identity===identity&&row.sport===item.sport);
   if(last)status.textContent='Latest unverified observation: '+last.bookmaker+' · '+last.market+' · '+last.outcome+' · '+last.price+' · '+last.observedAt+
    (last.racingTerms?.places?' · '+last.racingTerms.places+' places / '+last.racingTerms.fieldSize+' runners':'')+
    (last.racingTerms?.eachWayFraction?' · '+last.racingTerms.eachWayFraction+' each-way (quoted win leg)':'');
  }catch{status.textContent='Private storage is unavailable.';}
 }
 showSaved();
 form.addEventListener('submit',event=>{
  event.preventDefault();
  const now=Date.now(),decimal=Number(price.value);
  let url;
  try{url=new URL(source.value);}catch{}
  if(now>=item.startMs||!url||url.protocol!=='https:'||url.username||url.password||
     !Number.isFinite(decimal)||decimal<=1||![bookmaker,market,outcome].every(field=>field.value.trim())){
   status.textContent='Use an upcoming fixture, an HTTPS receipt, market, outcome and decimal price above 1.';return;
  }
  let racingTerms;
  if(isRace){
   const type=market.value.trim().toLowerCase(),[places,fieldSize,fraction]=raceFields.map(field=>field.value.trim());
   const skyBet=bookmaker.value.trim().toLowerCase()==='sky bet'&&/(?:^|\.)skybet\.com$/.test(url.hostname);
   const placeTerms=Number.isInteger(Number(places))&&Number(places)>0&&Number.isInteger(Number(fieldSize))&&Number(fieldSize)>Number(places);
   const eachWay=/^[1-9]\d?\/[1-9]\d?$/.test(fraction)&&Number(fraction.split('/')[0])<Number(fraction.split('/')[1]);
   if(!skyBet||!['win','place','each-way'].includes(type)||
      (type!=='win'&&!placeTerms)||(type==='each-way'&&!eachWay)||(type!=='each-way'&&fraction)){
    status.textContent='Use a Sky Bet receipt. Place and each-way observations need the published places and field size. Each-way also needs the published fraction.';return;
   }
   racingTerms={market:type,places:type==='win'?null:Number(places),fieldSize:type==='win'?null:Number(fieldSize),
    eachWayFraction:type==='each-way'?fraction:null,priceBasis:type==='each-way'?'QUOTED_WIN_LEG':'QUOTED_MARKET'};
  }
  try{
   const row={sport:item.sport,identity,event:item.name,startUTC:item.startUTC,bookmaker:bookmaker.value.trim(),
    market:market.value.trim(),outcome:outcome.value.trim(),price:decimal,source:url.href,
    observedAt:new Date(now).toISOString(),verification:'USER_RECORDED_UNVERIFIED',...(racingTerms?{racingTerms}:{})};
   localStorage.setItem(key,JSON.stringify([row,...read()].slice(0,100)));
   showSaved();
  }catch{status.textContent='Could not save this observation in private browser storage.';}
 });
 line(wrapper,isRace?'For each-way, enter the quoted win-leg price. Record a separately quoted place price as a Place observation.':'Saved in this browser. Manual observations cannot enter EV or qualification.');
 if(isRace)line(wrapper,'Saved in this browser. Manual racing observations cannot enter EV or qualification.');
}
function evidenceCell(tr,item,index){
 const cell=document.createElement('td');
 tr.append(cell);
 const core=window.FootballMatchEvidence;
 const now=Date.now();
 const evidence=Sources.cardEvidence(item,football,core,now,racing);
 const current=publishedPrices?.get(item);
 const hasCurrent=Boolean(current&&current.expires>now&&item.startMs>now);
 const line=(parent,text)=>{
  const p=document.createElement('p');p.textContent=text;parent.append(p);
 };
 const pct=p=>(p*100).toFixed(1)+'%';
 const hasEvidence=evidence.models.length||evidence.unverified.length||evidence.quotes.length||hasCurrent;
 const compact=document.documentElement.classList.contains('visual-preview');
 if(!hasEvidence&&(compact||!(item.fixtureKey||Sources.detailKey(item)))){
  line(cell,evidence.reason);return null;
 }
 const detailRow=document.createElement('tr'),panel=document.createElement('td');
 detailRow.className='pro-fixture-evidence';detailRow.hidden=true;
 detailRow.id='pro-fixture-evidence-'+index;
 panel.colSpan=4;detailRow.append(panel);
 const toggle=document.createElement('button');toggle.type='button';
 toggle.className='pro-fixture-evidence-toggle';
 toggle.setAttribute('aria-expanded','false');toggle.setAttribute('aria-controls',detailRow.id);
 toggle.textContent=evidence.models.length?(item.sport==='football' ? window.ResearchAudit.footballEstimateBasis(evidence.models[0].name) : 'Experimental model')+' · '+(item.sport==='racing'?evidence.models[0].outcomes.length+' runners':evidence.models[0].outcomes.map(o=>pct(o.probability)).join(' / ')):
  hasCurrent?'Sky Bet prices':evidence.quotes.length?'Recorded market prices':evidence.unverified.length?'Unverified experimental estimate':'Evidence unavailable';
 if(hasCurrent&&evidence.models.length)toggle.textContent+=' · Sky Bet prices';
 toggle.addEventListener('click',()=>{
  detailRow.hidden=!detailRow.hidden;
  toggle.setAttribute('aria-expanded',String(!detailRow.hidden));
 });
 cell.append(toggle);
 if(hasCurrent){
  const summary=document.createElement('div');summary.className='pro-current-price-summary';
  const heading=document.createElement('strong');heading.textContent='Sky Bet · 1X2';summary.append(heading);
  const outcomes=document.createElement('div');outcomes.className='pro-current-price-outcomes';
  for(const entry of current.markup.querySelectorAll('li')){
   const match=entry.textContent.trim().match(/^(Home|Draw|Away)[ ]+([0-9]+([.][0-9]+)?)$/);
   if(match){const value=document.createElement('span');value.textContent=match[1]+' '+Number(match[2]).toFixed(2);outcomes.append(value);}
  }
  if(outcomes.children.length===3){summary.append(outcomes);const times=[...current.markup.querySelectorAll('time')];
   const observed=Date.parse(times[0]?.dateTime),checked=Date.parse(times[1]?.dateTime);
   if(Number.isFinite(observed)&&Number.isFinite(checked)){const stamp=document.createElement('small');stamp.textContent='Observed '+new Date(observed).toISOString()+' · checked '+new Date(checked).toISOString()+' · EV withheld';summary.append(stamp);}
   cell.append(summary);
  }
 }
 if(!evidence.models.length)line(panel,evidence.reason);
 line(panel,'Models UNVALIDATED · Publication BLOCKED · Fixture cutoff '+item.startUTC);
 for(const model of [...evidence.models,...evidence.unverified]){
  line(panel,model.name+' · '+model.market+' · observed '+model.observed);
  line(panel,model.reason||('Training cutoff '+model.training+(model.sample?' · '+model.sample+' training matches':'')));
  if(model.hash)line(panel,(model.hashLabel||'Training SHA-256')+' '+model.hash);
  if(model.limitation)line(panel,model.limitation);
  for(const outcome of model.outcomes)
   line(panel,outcome.name+' '+pct(outcome.probability)+(model.reason||outcome.probability===0?'':' · fair odds '+(1/outcome.probability).toFixed(2)));
 }
 if(hasCurrent)panel.append(current.markup.cloneNode(true));
 else if(!evidence.quotes.length)line(panel,evidence.priceReason);
 manualPrice(panel,item,line);
 for(const quote of evidence.quotes){
  const receipt=document.createElement('a');receipt.href=quote.url.href;
  receipt.textContent=quote.name+' · '+(quote.marketLabel||'Regulation-time 1X2')+' · observed '+new Date(quote.observed).toISOString();
  panel.append(receipt);
  if(quote.captured)line(panel,'Checked '+new Date(quote.captured).toISOString());
  if(quote.sourceEndpoint)line(panel,'Receipt SHA-256 '+quote.hash);
  if(quote.comparisonReason)line(panel,quote.comparisonReason);
  for(const side of ['home','draw','away'].filter(side=>Object.hasOwn(quote.prices,side))){
   const price=quote.prices[side];
   line(panel,side+' '+price.toFixed(2)+' · implied '+pct(quote.metrics.implied[side])+
    ' · proportional no-vig '+pct(quote.metrics.proportionalNoVig[side]));
   for(const comparison of quote.comparisons)
    line(panel,comparison.model+' · research EV '+pct(comparison.values[side]));
  }
 }
 return detailRow;
}
function schedulePriceExpiry(){
 clearTimeout(quoteExpiry);
 const now=Date.now(),deadlines=[];
 for(const [item,price] of publishedPrices??[]){
  const until=Math.min(item.startMs,price.expires);
  if(until>now)deadlines.push(until);
 }
 if(deadlines.length)quoteExpiry=setTimeout(()=>{
  renderFeatured();
  schedulePriceExpiry();
 },Math.min(...deadlines)-now);
}
function readPublishedPrices(fixtures,now){
 const template=document.getElementById('vw-published-prices');
 const nodes=new Map(),ambiguous=new Set(),matches=new Map(),fixtureCounts=new Map();
 for(const markup of template?.content.children??[]){
  const key=markup.dataset.fixture,expires=Number(markup.dataset.expires);
  if(!key||!Number.isSafeInteger(expires)||expires<=now||expires>now+30*60000)continue;
  if(nodes.has(key))ambiguous.add(key);
  nodes.set(key,{markup,expires});
 }
 for(const item of fixtures){
  const key=Sources.providerFixtureKey(item,football,now);
  if(key)fixtureCounts.set(key,(fixtureCounts.get(key)||0)+1);
 }
 for(const item of fixtures){
  const key=Sources.presentationKey(item,football,now);
  if(nodes.has(key)&&!ambiguous.has(key)&&fixtureCounts.get(Sources.providerFixtureKey(item,football,now))===1)
   matches.set(item,nodes.get(key));
 }
 return matches;
}
function publishFootballMarketModels(now){
 const comparisons=new Map();
 for(const [fixtureKey,fixture] of football?.events??[]){
  const {models}=Sources.cardEvidence({sport:'football',fixtureKey,startMs:fixture.start},football,window.FootballMatchEvidence,now);
  // Every displayed fair-odds figure uses the same accepted model as the fixture evidence view.
  if(models.length===1)comparisons.set(fixtureKey,{...models[0],cutoff:fixture.marketCutoff});
 }
 window.ValueWatchFootballMarketModels=comparisons;
}
function publishCardPrices(now){
 const rows=[];
 for(const [item,entry] of publishedPrices??[]){
  if(item.sport!=='football'||entry.expires<=now||item.startMs<=now)continue;
  const prices={};
  for(const line of entry.markup.querySelectorAll('li')){
   const match=line.textContent.trim().match(/^(Home|Draw|Away)\s+([0-9]+(?:\.[0-9]+)?)$/);
   if(match)prices[match[1].toLowerCase()]=Number(match[2]);
  }
  const sides=['home','draw','away'];
  const stamps=[...entry.markup.querySelectorAll('time')].map(node=>Date.parse(node.dateTime));
  if(Object.keys(prices).length!==sides.length||!sides.every(side=>Number.isFinite(prices[side])&&prices[side]>1)||
     stamps.length<2||!stamps.slice(0,2).every(Number.isFinite)||stamps[0]>stamps[1]||stamps[1]>now||now-stamps[0]>30*60000)continue;
  const identity=item.sport==='football'?football?.events.get(item.fixtureKey)?.identity:null;
  rows.push({sport:item.sport,name:item.name,home:identity?.[1]||null,away:identity?.[2]||null,
   startMs:item.startMs,expires:entry.expires,observed:stamps[0],checked:stamps[1],market:entry.markup.querySelector('p')?.textContent||'1X2',
   prices,bookmaker:'Sky Bet'});
 }
 window.ValueWatchCurrentOddsForCards=rows;
 window.dispatchEvent(new Event('valuewatch:published-card-odds'));
}
async function optionalEvidence(path){
 try{
  const response=await fetch(path,{cache:'no-store',signal:AbortSignal.timeout(8000)});
  if(response.ok)return await response.json();
 }catch{}
 return null;
}
function renderFeatured(){
 const body=document.getElementById('pro-featured-rows'),counter=document.getElementById('pro-feature-page');
 const prev=document.getElementById('pro-feature-prev'),next=document.getElementById('pro-feature-next');
 if(!body)return;
 const visible=visibleFeatured(),pages=Math.ceil(visible.length/FEATURE_PAGE_SIZE);
 page=Math.max(0,Math.min(page,Math.max(0,pages-1)));
 body.replaceChildren();
 for(const [index,item] of visible.slice(page*FEATURE_PAGE_SIZE,(page+1)*FEATURE_PAGE_SIZE).entries()){
  const tr=document.createElement('tr');tr.className='pro-feature-event';
  const label={football:'⚽ Football',racing:'♞ Horse racing',tennis:'🎾 Tennis',nfl:'🏈 NFL',darts:'🎯 Darts',rugby:'🏉 Rugby'}[item.sport]||item.sport;
  const when=new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/London',day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'}).format(new Date(item.startMs));
  cell(tr,label);
  const fixture=document.createElement('td');
  const compact=document.documentElement.classList.contains('visual-preview');
  const exact=Sources.detailKey(item);
  if(!compact && item.startMs>Date.now() && (item.fixtureKey||exact)){
   const link=document.createElement('a');
   link.href=item.fixtureKey
    ?'./football-match/?'+new URLSearchParams({event:'fixture:'+item.fixtureKey,overview:'1'})
    :'./fixture-detail/?'+new URLSearchParams({sport:item.sport,event:exact});
   link.textContent=item.name;
   fixture.append(link);
  }else fixture.textContent=item.name;
  tr.append(fixture);
  cell(tr,when);
  const detailRow=evidenceCell(tr,item,index);
  body.append(tr);
  if(detailRow)body.append(detailRow);
 }
 if(!visible.length){const tr=document.createElement('tr');const td=document.createElement('td');td.colSpan=4;td.textContent=featured.length?'No timed events match these filters.':'No future events from the currently usable source feeds.';tr.append(td);body.append(tr)}
 if(counter)counter.textContent=pages?'Page '+(page+1)+' of '+pages+' · '+visible.length+' events':'No events';
 if(prev)prev.disabled=loading||page===0;
 if(next)next.disabled=loading||page>=pages-1;
}
async function showFeatured(){
 const status=document.getElementById('pro-featured-status'),health=document.getElementById('pro-market-feeds'),refresh=document.getElementById('pro-feature-refresh');
 if(!Sources||!status||!health||loading)return;
 loading=true;if(refresh)refresh.disabled=true;
 status.textContent='Checking published research sources…';
 const now=Date.now();featureClock=now;
 const ids=Sources.SOURCES.filter(source=>source.id!=='history').map(source=>source.id);
 try{
  const [feeds,expanded,prices,horseModels]=await Promise.all([
   Promise.all(ids.map(id=>Sources.load(id,'./',window.fetch.bind(window),now))),
   optionalEvidence('./football-expanded-data.json'),optionalEvidence('./paper-lab/hybrid-market-data.json'),optionalEvidence('./horse-model-data.json')
  ]);
  const core=window.FootballMatchEvidence;
  football=core?Sources.footballEvidence([feeds.find(feed=>feed.id==='football')?.data,expanded],prices,core,now):null;
  const summary=Sources.summarize(feeds,now),invalid=feeds.filter(x=>x.state!=='OBSERVED');
  for(const sport of Sources.sports)document.querySelectorAll('[data-pro-count="'+sport+'"]').forEach(el=>{el.textContent=summary.counts[sport]===null?'—':String(summary.counts[sport])});
  publishedPrices=readPublishedPrices(summary.upcoming,now);
  publishFootballMarketModels(now);
  publishCardPrices(now);
  schedulePriceExpiry();
  racing=Sources.racingEvidence(summary.upcoming,feeds.find(feed=>feed.id==='racing'),horseModels,now);
  const all=document.querySelector('[data-pro-count="all"]');if(all)all.textContent=summary.available.length?String(summary.totalAvailable):'—';
  featured=Sources.featuredOrder(summary.upcoming);page=0;
  health.textContent=feeds.filter(x=>x.state==='OBSERVED').length+'/'+feeds.length+' current source groups'+(invalid.length?' · review needed':'');
  const stamps=feeds.filter(x=>x.fresh&&Number.isFinite(x.generatedAt)).map(x=>x.generatedAt);
  const updated=stamps.length?new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/London',day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'}).format(new Date(Math.min(...stamps))):'unavailable';
  status.textContent=summary.upcoming.length+' upcoming events with start times · '+summary.available.length+'/'+Sources.sports.length+' timed-feed sports with usable data · oldest usable source snapshot '+(updated==='unavailable'?updated:updated+' UK')+(invalid.length?' · '+invalid.map(x=>feedLabels[x.id]+' '+stateLabels[x.state]).join(', '):'')+'. No verified bookmaker odds are assumed. Recorded prices and research EV require matched evidence. No qualifying bets.';
 }catch{
  featured=[];page=0;
  for(const count of document.querySelectorAll('[data-pro-count]'))count.textContent='—';
  status.textContent='Source check unavailable; no events confirmed.';health.textContent='Unavailable';
 }finally{loading=false;if(refresh)refresh.disabled=false;renderFeatured()}
}
function wireFeatured(){
 const compact=document.documentElement.classList.contains('visual-preview');
 const guide=document.getElementById('pro-feature-link-guide');
 if(compact&&guide)guide.textContent='Use the sport lanes to explore schedule and source coverage.';
 document.getElementById('pro-feature-prev')?.addEventListener('click',()=>{if(page>0){page--;renderFeatured()}});
 document.getElementById('pro-feature-next')?.addEventListener('click',()=>{if((page+1)*FEATURE_PAGE_SIZE<visibleFeatured().length){page++;renderFeatured()}});
 document.getElementById('pro-feature-refresh')?.addEventListener('click',showFeatured);
 const controls=[['pro-feature-range','fdate'],['pro-feature-sport','fsport'],['pro-feature-query','fq']];
 function restoreFilters(){
  if(document.documentElement.classList.contains('visual-preview'))return;
  const params=new URLSearchParams(location.search);
  for(const [id,key] of controls){
   const control=document.getElementById(id);
   if(!control)continue;
   const value=params.get(key)||'';
   control.value=control.tagName==='SELECT'
    ?([ ...control.options ].some(option=>option.value===value)?value:'all'):value.slice(0,80);
  }
 }
 function redraw(save=true){
  if(save){
   const url=new URL(location.href);
   for(const [id,key] of controls){
    const value=document.getElementById(id)?.value;
    if(value&&value!=='all')url.searchParams.set(key,value);
    else url.searchParams.delete(key);
   }
   history.replaceState(history.state,'',url);
  }
  const link=document.querySelector('.pro-featured [data-open-events]');
  if(link)link.textContent=document.getElementById('pro-feature-range')?.value==='all'?'Explore all ↗':'Explore selected date ↗';
  page=0;
  renderFeatured();
 }
 restoreFilters();
 if(!document.documentElement.classList.contains('visual-preview')){
  window.addEventListener('popstate',()=>{restoreFilters();redraw(false)});
  window.addEventListener('pageshow',event=>{if(event.persisted){restoreFilters();void showFeatured()}});
 }
 document.getElementById('pro-feature-sport')?.addEventListener('change',redraw);
 document.getElementById('pro-feature-query')?.addEventListener('input',redraw);
 document.getElementById('pro-feature-range')?.addEventListener('change',redraw);
 const range=document.getElementById('pro-feature-range');
 if(range && range.value!=='all')document.querySelector('.pro-featured [data-open-events]').textContent='Explore selected date ↗';
}
function init(){ready();wireFeatured();showFeatured()}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
